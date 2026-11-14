"""Public repository inspection. No clone, execution, or trust in repository instructions."""
import asyncio
import json
from pathlib import PurePosixPath
import re
from urllib.parse import quote, urlsplit

from fastapi import HTTPException
from langgraph.graph import StateGraph, START, END

from app.models.integrations import ProviderStatus
from app.models.journey import RepositoryInspection, SourceFinding
from app.models.workflow import AgentEvent, new_id, now
from app.services.external import ExternalServices


def parse_target(target):
    target = target.strip().rstrip("/")
    if target.startswith("https://"):
        parsed = urlsplit(target)
        if parsed.hostname != "github.com" or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise HTTPException(422, "Use a public github.com repository URL or username")
        target = parsed.path.strip("/")
    parts = target.split("/")
    if len(parts) not in {1, 2} or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]{0,38}", parts[0]):
        raise HTTPException(422, "Invalid GitHub username or repository")
    if len(parts) == 2:
        repo = parts[1].removesuffix(".git")
        if not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", repo) or repo in {".", ".."}:
            raise HTTPException(422, "Invalid repository")
        return parts[0], repo
    return parts[0], None


def eligible(path):
    if len(path) > 200 or any(part in {"", ".", "..", "node_modules", "vendor", "dist", "build", ".git"} for part in path.split("/")):
        return False
    if any(word in path.casefold() for word in [".env", "secret", "credential", "private_key", "package-lock", "yarn.lock"]):
        return False
    return PurePosixPath(path).suffix.lower() in {".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".java", ".cs", ".rb", ".md", ".json", ".mod", ".toml", ".yaml", ".yml", ".txt", ".html", ".css"}


def select_paths(entries):
    candidates = [entry["path"] for entry in entries[:4000] if entry.get("type") == "blob" and entry.get("size", 65537) <= 65536 and eligible(entry.get("path", ""))]
    def kind(path):
        name = PurePosixPath(path).name.lower()
        if name in {"package.json", "pyproject.toml", "requirements.txt", "cargo.toml", "go.mod"}:
            return "manifest"
        if "/test" in "/" + path.lower() or name.startswith("test_") or ".test." in name:
            return "test"
        if path.startswith(".github/workflows/"):
            return "ci"
        if name.startswith("readme"):
            return "documentation"
        if PurePosixPath(path).suffix in {".py", ".ts", ".tsx", ".js", ".go", ".rs", ".java"}:
            return "source"
        return "other"
    selected = []
    for category, count in [("manifest", 1), ("source", 2), ("test", 1), ("ci", 1), ("documentation", 1)]:
        def rank(path):
            name = PurePosixPath(path).name
            preferred = path.startswith(("src/", "app/", "lib/")) if category == "source" else (name.startswith("test_") or ".test." in name) if category == "test" else False
            return (not preferred, len(path.split("/")), len(path))
        selected += sorted((p for p in candidates if kind(p) == category), key=rank)[:count]
    return list(dict.fromkeys(selected))[:6], candidates


def findings_for(file):
    if file.status != "ok" or not file.content or not file.sha or not file.url:
        return []
    findings = []
    def add(label, statement, excerpt):
        findings.append(SourceFinding(label=label, statement=statement, file_path=file.path, source_url=file.url, sha=file.sha, excerpt=excerpt[:350]))
    suffix = PurePosixPath(file.path).suffix
    language = {".py": "Python", ".ts": "TypeScript", ".tsx": "TypeScript/React", ".js": "JavaScript", ".go": "Go", ".rs": "Rust", ".java": "Java"}.get(suffix)
    if language:
        add(language, "Source file observed; authorship and competence are not established", file.content[:350])
    patterns = {"FastAPI": r"\b(?:from fastapi|import fastapi)\b", "Flask": r"\b(?:from flask|import flask)\b", "React": r"(?:from\s*['\"]react['\"]|require\(['\"]react)", "Tests": r"\b(?:def test_|describe\(|it\(|test\(|pytest|unittest)", "Continuous integration": r"(?:runs-on:|\bjobs:)", "SQL": r"\b(?:SELECT .+ FROM|CREATE TABLE)\b"}
    for label, pattern in patterns.items():
        match = re.search(pattern, file.content, re.I)
        if match:
            add(label, "Relevant source construct observed; no code or tests were executed", file.content[max(0, match.start() - 50):match.end() + 200])
    if PurePosixPath(file.path).name == "package.json":
        try:
            manifest = json.loads(file.content)
            for key in ["dependencies", "devDependencies"]:
                for dependency in list(manifest.get(key, {}))[:10]:
                    add(dependency, "Declared dependency in manifest; runtime usage is not verified", f'{key}: {dependency}')
        except (ValueError, TypeError, AttributeError):
            pass
    return findings[:20]


class GithubInspector:
    def __init__(self, external: ExternalServices):
        self.external = external

    async def inspect(self, target, events, requested_paths=None):
        owner, repo = parse_target(target)
        requested_paths = list(dict.fromkeys(requested_paths or []))
        if any(not eligible(path) for path in requested_paths):
            raise HTTPException(422, "Selected paths must be bounded public source files; secrets and traversal are forbidden")
        result = {"repositories": [], "providers": []}
        operation_id = new_id()

        async def inspect_repository(repo_owner, repo_name):
            metadata = await self.external.github(repo_owner, repo_name, [])
            result["providers"].extend(metadata.providers)
            if not metadata.repository:
                return
            inspection = RepositoryInspection(repository=metadata.repository, tree_sha=None,
                inspected_paths=[], architecture_paths=[], findings=[], files=[],
                limitations=["Inspection is a bounded sample; repository ownership and test execution are not verified"])
            # Keep genuine metadata even if later tree/file requests time out.
            result["repositories"].append(inspection)
            base = "https://api.github.com/repos/" + quote(repo_owner, safe="") + "/" + quote(repo_name, safe="")
            tree, status = await self.external.fetch("github", ("tree-root", repo_owner, repo_name, metadata.repository.default_branch),
                base + "/git/trees/" + quote(metadata.repository.default_branch, safe=""), headers=self.external.github_headers(), ttl=1800)
            result["providers"].append(status)
            entries = (tree or {}).get("tree", [])[:4000]
            inspection.tree_sha = (tree or {}).get("sha")
            if tree is None or (tree or {}).get("truncated"):
                inspection.limitations.append("Tree enumeration unavailable or truncated")
            # Inspect at most two shallow source/test directories, never a recursive full tree.
            directories = [row for row in entries if row.get("type") == "tree" and row.get("path") in {"src", "app", "lib", "tests"}][:2]
            async def directory(row):
                child, child_status = await self.external.fetch("github", ("tree-child", repo_owner, repo_name, row["sha"]),
                    base + "/git/trees/" + quote(row["sha"], safe=""), headers=self.external.github_headers(), ttl=1800)
                result["providers"].append(child_status)
                return [{**entry, "path": row["path"] + "/" + entry.get("path", "")} for entry in (child or {}).get("tree", [])[:1000]]
            for child in await asyncio.gather(*(directory(row) for row in directories)):
                entries.extend(child)
            selected, candidates = select_paths(entries)
            inspection.architecture_paths = candidates[:100]
            paths = list(dict.fromkeys([*requested_paths, *selected]))[:4]
            async def read(path):
                content = await self.external.github(repo_owner, repo_name, [path])
                result["providers"].extend(content.providers)
                for file in content.files:
                    inspection.files.append(file)
                    if file.status == "ok":
                        inspection.inspected_paths.append(file.path)
                        inspection.findings.extend(findings_for(file))
                    else:
                        inspection.limitations.append(f"Selected file unavailable: {file.path}")
                inspection.findings = inspection.findings[:40]
            await asyncio.gather(*(read(path) for path in paths))

        async def action(state):
            events.append(AgentEvent(id=new_id(), agent="Skill Detective", status="started", timestamp=now(), operation_id=operation_id).model_dump())
            targets = [(owner, repo)] if repo else []
            if not repo:
                data, status = await self.external.fetch("github", ("user", owner), "https://api.github.com/users/" + quote(owner, safe="") + "/repos",
                    params={"per_page": 10, "page": 1, "sort": "updated", "type": "owner"}, headers=self.external.github_headers(), ttl=1800)
                result["providers"].append(status)
                targets = [(row["owner"]["login"], row["name"]) for row in (data or {}).get("items", [])[:10]
                    if row.get("private") is False and not row.get("fork")][:2]
            outcomes = await asyncio.gather(*(inspect_repository(o, r) for o, r in targets), return_exceptions=True)
            if any(isinstance(outcome, Exception) for outcome in outcomes):
                result["providers"].append(ProviderStatus(provider="github", status="error", detail="Some repositories could not be inspected; available observations were retained"))
            events.append(AgentEvent(id=new_id(), agent="Skill Detective", status="completed" if any(r.inspected_paths for r in result["repositories"]) else "failed", timestamp=now(), operation_id=operation_id).model_dump())
            return state

        graph = StateGraph(dict)
        graph.add_node("Skill Detective", action)
        graph.add_edge(START, "Skill Detective")
        graph.add_edge("Skill Detective", END)
        try:
            async with asyncio.timeout(20):
                await graph.compile().ainvoke({})
        except (TimeoutError, ValueError, KeyError, TypeError):
            events.append(AgentEvent(id=new_id(), agent="Skill Detective", status="failed", timestamp=now(), operation_id=operation_id).model_dump())
            result["providers"].append(ProviderStatus(provider="github", status="error", detail="20-second inspection deadline reached; available metadata and source observations were retained"))
            for inspection in result["repositories"]:
                inspection.limitations.append("Inspection incomplete: retry to use cached results and complete the sample")
        return result
