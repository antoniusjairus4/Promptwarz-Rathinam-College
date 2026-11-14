"""Attributable external facts, separate from inferred learner skills."""
from typing import Literal
from pydantic import BaseModel


class ProviderStatus(BaseModel):
    provider: str
    status: Literal["ok", "error", "disabled", "not_configured", "rate_limited"]
    cached: bool = False
    fetched_at: str | None = None
    detail: str | None = None
    retry_after_seconds: int | None = None


class Attribution(BaseModel):
    source: str
    source_url: str
    application_url: str


class JobListing(BaseModel):
    id: str
    title: str
    company: str
    location: str | None = None
    employment_type: str | None = None
    summary: str
    tags: list[str]
    published_at: str | None = None
    expires_at: str | None = None
    application_url: str
    sources: list[Attribution]


class JobsResponse(BaseModel):
    jobs: list[JobListing]
    providers: list[ProviderStatus]
    returned_count: int
    note: str = "Provider-limited search, not an exhaustive job-market search. Display all source links; application URLs must remain unchanged. Remotive listings are delayed by the provider."


class LearningResource(BaseModel):
    id: str
    title: str
    provider: str
    url: str
    kind: Literal["course", "documentation", "video"]
    topics: list[str]
    provenance: Literal["curated_official", "youtube_api"]
    reviewed_on: str | None = None
    channel: str | None = None


class LearningResponse(BaseModel):
    resources: list[LearningResource]
    providers: list[ProviderStatus]


class RepositoryMetadata(BaseModel):
    full_name: str
    url: str
    description: str | None
    language: str | None
    stars: int
    forks: int
    default_branch: str
    pushed_at: str | None
    license: str | None
    evidence_note: str = "Public repository metadata is verified source data; it does not prove this learner authored the code or has any skill."


class SourceFile(BaseModel):
    path: str
    url: str | None = None
    sha: str | None = None
    content: str | None = None
    status: Literal["ok", "error", "too_large", "unsupported"]
    detail: str | None = None


class RepositoryResponse(BaseModel):
    repository: RepositoryMetadata | None
    files: list[SourceFile]
    providers: list[ProviderStatus]
