"""Session journey contracts; private repository documents are never serialized directly."""
from typing import Annotated, Literal
from pydantic import BaseModel, Field

from app.models.workflow import (
    AgentEvent, Assessment, AssessmentResult, Learner, LongText, OnboardingRequest,
    Roadmap, StorageStatus, StrictModel, Submission, Text,
)
from app.models.integrations import JobsResponse, LearningResponse, ProviderStatus, RepositoryMetadata


class SessionCreate(OnboardingRequest):
    full_name: Text = "Learner"


class SessionAction(StrictModel):
    session_id: Annotated[str, Field(min_length=1, max_length=100)]


class BlueprintSkill(StrictModel):
    name: Text
    priority: Literal["core", "supporting"]
    rationale: LongText
    difficulty: Literal["beginner", "intermediate", "advanced"]


class BlueprintDraft(StrictModel):
    target_role: Text
    rationale: LongText
    skills: list[BlueprintSkill] = Field(min_length=3, max_length=8)


class Blueprint(BlueprintDraft):
    provider: str
    model: str
    generated_at: str
    source: Literal["ai_generated"] = "ai_generated"


class ProfileDraft(StrictModel):
    summary: LongText
    inferred_skills: list[Text] = Field(max_length=15)
    suggested_roles: list[Text] = Field(min_length=1, max_length=5)
    gaps_to_assess: list[Text] = Field(max_length=10)


class ProfileAnalysis(ProfileDraft):
    provider: str
    model: str
    generated_at: str
    evidence_note: str = "AI inference from self-reports and referenced source observations; not verified competence or authorship."


class SourceFinding(BaseModel):
    label: str
    statement: str
    file_path: str
    source_url: str
    sha: str
    excerpt: str
    verified: Literal[False] = False


class RepositoryInspection(BaseModel):
    repository: RepositoryMetadata
    tree_sha: str | None = None
    inspected_paths: list[str]
    architecture_paths: list[str]
    findings: list[SourceFinding]
    limitations: list[str]


class GithubRequest(SessionAction):
    target: Annotated[str, Field(min_length=1, max_length=250)]


class GithubAnalysisResponse(BaseModel):
    session_id: str
    repositories: list[RepositoryInspection]
    providers: list[ProviderStatus]
    storage: StorageStatus


class BlueprintResponse(BaseModel):
    blueprint: Blueprint
    storage: StorageStatus


class ProfileResponse(BaseModel):
    profile: ProfileAnalysis
    storage: StorageStatus


class GenerateAssessmentRequest(SessionAction):
    pass


class EvaluateAssessmentRequest(SessionAction, Submission):
    assessment_id: Annotated[str, Field(min_length=1, max_length=100)]


class RoadmapRequest(SessionAction):
    refresh: bool = False


class ProgressRequest(SessionAction):
    step_id: Annotated[str, Field(min_length=1, max_length=100)]
    completed: Literal[True]


class MentorRequest(SessionAction):
    message: LongText


class MentorDraft(StrictModel):
    reply: LongText
    next_actions: list[Text] = Field(max_length=5)


class MentorMessage(MentorDraft):
    user_message: str
    id: str
    provider: str
    model: str
    created_at: str


class MentorResponse(BaseModel):
    message: MentorMessage
    storage: StorageStatus


class SessionView(BaseModel):
    session_id: str
    learner: Learner
    blueprint: Blueprint | None = None
    profile_analysis: ProfileAnalysis | None = None
    github_repositories: list[RepositoryInspection] = Field(default_factory=list)
    assessment: Assessment | None = None
    result: AssessmentResult | None = None
    roadmap: Roadmap | None = None
    messages: list[MentorMessage] = Field(default_factory=list)
    events: list[AgentEvent]
    storage: StorageStatus


class SessionCreated(BaseModel):
    session_id: str
    session_token: str
    session: SessionView
    storage: StorageStatus


class MatchedJob(BaseModel):
    job_id: str
    matched_terms: list[str]
    assessment_supported_terms: list[str]
    note: str = "Keyword overlap with source text, not an AI hiring probability or a complete requirements analysis."


class JobSearchResponse(JobsResponse):
    matches: list[MatchedJob] = Field(default_factory=list)
    session_id: str | None = None


class ResourceSearchResponse(LearningResponse):
    recommended_for: list[str] = Field(default_factory=list)
