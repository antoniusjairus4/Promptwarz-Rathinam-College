"""Optional public-data routes. Never gate jobs behind onboarding or sign-up."""
from pathlib import PurePosixPath
import re
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.models.integrations import JobsResponse, LearningResponse, ProviderStatus, RepositoryResponse
from app.services.catalog import search_catalog
from app.services.external import ExternalServices

router = APIRouter(prefix="/api/v1", tags=["optional integrations"])


def external(request: Request) -> ExternalServices:
    return request.app.state.external


External = Annotated[ExternalServices, Depends(external)]
Search = Annotated[str, Query(max_length=100)]


@router.get("/jobs/search", response_model=JobsResponse)
async def jobs(svc: External, q: Search = "", provider: Literal["both", "himalayas", "remotive"] = "both", limit: Annotated[int, Query(ge=1, le=40)] = 20):
    return await svc.jobs(" ".join(q.split()), provider, limit)


@router.get("/learning/resources", response_model=LearningResponse)
async def learning(svc: External, q: Search = "", include_youtube: bool = False):
    query = " ".join(q.split())
    resources = search_catalog(query)
    statuses = [ProviderStatus(provider="curated_catalog", status="ok")]
    if include_youtube and query:
        try:
            videos, status = await svc.youtube(query)
            resources.extend(videos)
            statuses.append(status)
        except Exception:
            statuses.append(ProviderStatus(provider="youtube", status="error", detail="Provider processing failure"))
    return LearningResponse(resources=resources, providers=statuses)


@router.get("/learning/youtube", response_model=LearningResponse)
async def youtube(svc: External, q: Annotated[str, Query(min_length=1, max_length=100)]):
    query = " ".join(q.split())
    if not query:
        raise HTTPException(422, "Search query must not be blank")
    try:
        resources, status = await svc.youtube(query)
        return LearningResponse(resources=resources, providers=[status])
    except Exception:
        return LearningResponse(resources=[], providers=[ProviderStatus(provider="youtube", status="error", detail="Provider processing failure")])


def validate_source_path(path: str):
    suffixes = {".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".java", ".c", ".h", ".cpp", ".cs", ".rb", ".md", ".json", ".toml", ".yaml", ".yml", ".html", ".css"}
    if len(path) > 200 or path.startswith("/") or "\\" in path or "%" in path or not path or any(part in {"", ".", ".."} for part in path.split("/")) or any(ord(c) < 32 for c in path):
        raise HTTPException(422, "Invalid relative source path")
    parts = PurePosixPath(path)
    if parts.suffix.lower() not in suffixes or any(part.startswith(".") for part in parts.parts) or any(word in parts.name.casefold() for word in ["credential", "secret", "private_key"]):
        raise HTTPException(422, "Only non-sensitive source/documentation paths are allowed")


@router.get("/integrations/github/{owner}/{repo}", response_model=RepositoryResponse)
async def github(owner: str, repo: str, svc: External, paths: Annotated[list[str] | None, Query(max_length=3)] = None):
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})", owner) or not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", repo) or repo in {".", ".."}:
        raise HTTPException(422, "Invalid GitHub owner or repository name")
    selected = list(dict.fromkeys(paths or []))
    for path in selected:
        validate_source_path(path)
    try:
        return await svc.github(owner, repo, selected)
    except Exception:
        return RepositoryResponse(repository=None, files=[], providers=[ProviderStatus(provider="github", status="error", detail="Provider processing failure")])
