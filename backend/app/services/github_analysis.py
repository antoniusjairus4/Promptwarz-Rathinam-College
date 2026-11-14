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

    async def inspect(self, target, events):
        owner, repo = parse_target(target)
        result = {"repositories": [], "providers": []}
        operation_id = new_id()
        async def action(state):
            def event(status):
                events.append(AgentEvent(id=new_id(), agent="Skill Detective", status=status, timestamp=now(), operation_id=operation_id).model_dump())
            event("started")
            try:
                targets = [(owner, repo)] if repo else []
                if not repo:
                    data, status = await self.external.fetch("github", ("user", owner), "https://api.github.com/users/" + quote(owner, safe="") + "/repos", params={"per_page": 3, "sort": "updated", "type": "owner"}, headers=self.external.github_headers(), ttl=1800)
                    result["providers"].append(status)
                    for row in (data or {}).get("items", [])[:3]:
                        if row.get("private") is False and not row.get("fork"):
                            targets.append((row["owner"]["login"], row["name"]))
                    targets = targets[:2]
                for repo_owner, repo_name in targets:
                    metadata = await self.external.github(repo_owner, repo_name, [])
                    result["providers"].extend(metadata.providers)
                    if not metadata.repository:
                        continue
                    base = "https://api.github.com/repos/" + quote(repo_owner, safe="") + "/" + quote(repo_name, safe="")
                    tree, status = await self.external.fetch("github", ("tree", repo_owner, repo_name, metadata.repository.default_branch), base + "/git/trees/" + quote(metadata.repository.default_branch, safe=""), params={"recursive": "1"}, headers=self.external.github_headers(), ttl=1800)
                    result["providers"].append(status)
                    paths, candidates = select_paths((tree or {}).get("tree", []))
                    content = await self.external.github(repo_owner, repo_name, paths) if paths else metadata
                    result["providers"].extend(content.providers if paths else [])
                    limitations = ["Inspection is a bounded sample; repository ownership and test execution are not verified"]
                    if tree is None or (tree or {}).get("truncated"):
                        limitations.append("Tree enumeration unavailable or truncated")
                    if any(file.status != "ok" for file in content.files):
                        limitations.append("Some selected files were unavailable or exceeded size limits")
                    result["repositories"].append(RepositoryInspection(repository=metadata.repository, tree_sha=(tree or {}).get("sha"), inspected_paths=[file.path for file in content.files if file.status == "ok"], architecture_paths=candidates[:100], findings=[finding for file in content.files for finding in findings_for(file)][:40], limitations=limitations))
                event("completed" if any(repo.inspected_paths for repo in result["repositories"]) else "failed")
            except (TimeoutError, ValueError, KeyError, TypeError):
                result["providers"].append(ProviderStatus(provider="github", status="error", detail="Bounded source inspection failed or timed out"))
                event("failed")
            return state
        graph = StateGraph(dict)
        graph.add_node("Skill Detective", action)
        graph.add_edge(START, "Skill Detective")
        graph.add_edge("Skill Detective", END)
        try:
            async with asyncio.timeout(100):
                await graph.compile().ainvoke({})
        except TimeoutError:
            # A timed-out operation must never be shown as completed.
            events.append(AgentEvent(id=new_id(), agent="Skill Detective", status="failed", timestamp=now(), operation_id=operation_id).model_dump())
            result["providers"].append(ProviderStatus(provider="github", status="error", detail="Source inspection reached its total deadline"))
        return result
