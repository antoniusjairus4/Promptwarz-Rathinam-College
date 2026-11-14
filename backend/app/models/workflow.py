"""Public contracts and private assessment records. Answer keys stay server-side."""
from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
LongText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
ChoiceText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=600)]


def new_id() -> str:
    return str(uuid4())


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class OnboardingRequest(StrictModel):
    full_name: Text
    track: Literal["career_first", "skills_first"] = "career_first"
    target_role: Text | None = None
    skills: list[Text] = Field(default_factory=list, max_length=20)
    interests: list[Text] = Field(default_factory=list, max_length=10)
    experience_level: Literal["entry", "mid", "senior"] = "entry"
    weekly_hours: int = Field(default=5, ge=1, le=40)

    @model_validator(mode="after")
    def validate_track(self):
        if self.track == "career_first" and not self.target_role:
            raise ValueError("Career-first onboarding requires target_role")
        if self.track == "skills_first" and not (self.skills or self.interests):
            raise ValueError("Skills-first onboarding requires at least one skill or interest")
        return self


class SkillEvidence(BaseModel):
    skill: str
    provenance: Literal["self_reported", "assessment_observed"]
    verified: bool = False
    score: float | None = None
    assessment_id: str | None = None
    note: str


class Learner(BaseModel):
    id: str
    full_name: str
    track: str
    target_role: str | None
    experience_level: str
    weekly_hours: int
    skills: list[SkillEvidence]
    interests: list[str] = Field(default_factory=list)
    created_at: str


class GeneratedQuestion(StrictModel):
    skill: Text
    prompt: LongText
    options: list[ChoiceText] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    rationale: LongText
    difficulty: Literal["beginner", "intermediate", "advanced"]

    @model_validator(mode="after")
    def distinct_options(self):
        if len(set(self.options)) != 4:
            raise ValueError("Options must be distinct")
        return self


class AssessmentDraft(StrictModel):
    questions: list[GeneratedQuestion] = Field(min_length=3, max_length=5)


class CareerContext(StrictModel):
    target_role: Text
    skills: list[Text] = Field(min_length=1, max_length=6)
    rationale: LongText


class PublicQuestion(BaseModel):
    id: str
    skill: str
    prompt: str
    options: list[ChoiceText] = Field(min_length=4, max_length=4)
    difficulty: str


class Assessment(BaseModel):
    id: str
    learner_id: str
    target_role: str
    target_role_source: Literal["learner_selected", "ai_suggested"]
    questions: list[PublicQuestion]
    source: Literal["ai_generated"] = "ai_generated"
    provider: str
    model: str
    created_at: str
    submitted: bool = False


class Submission(StrictModel):
    # Keys are question UUIDs; values are zero-based option indices.
    answers: dict[str, Annotated[int, Field(strict=True, ge=0, le=3)]] = Field(min_length=1, max_length=5)


class QuestionFeedback(BaseModel):
    question_id: str
    selected_index: int
    is_correct: bool
    explanation: str


class QuizVerification(BaseModel):
    skill: str
    score: float
    passed: bool
    evidence_scope: Literal["current_quiz_only"] = "current_quiz_only"


class AssessmentResult(BaseModel):
    assessment_id: str
    score: float
    correct: int
    total: int
    skill_scores: dict[str, float]
    evidence_note: str = "Score measures this AI-generated quiz only; it is not independent skill verification."
    submitted_at: str
    explanations: list[QuestionFeedback] = Field(default_factory=list)
    demonstrated_strengths: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    quiz_verification: list[QuizVerification] = Field(default_factory=list)


class RoadmapDraftStep(StrictModel):
    title: Text
    skill: Text
    objective: LongText
    estimated_hours: int = Field(ge=1, le=40)
    difficulty: Literal["beginner", "intermediate", "advanced"] = "beginner"
    # No invented course URLs, job postings, certifications or completion claims.
    practice_task: LongText


class RoadmapDraft(StrictModel):
    summary: LongText
    steps: list[RoadmapDraftStep] = Field(min_length=2, max_length=6)


class RoadmapStep(RoadmapDraftStep):
    gap_priority: Literal["high", "medium", "low"] = "high"
    id: str
    status: Literal["locked", "available", "completed"]
    prerequisites: list[str]


class Roadmap(BaseModel):
    id: str
    learner_id: str
    assessment_id: str
    target_role: str
    summary: str
    steps: list[RoadmapStep]
    source: Literal["ai_generated"] = "ai_generated"
    provider: str
    model: str
    created_at: str
    revision: int = 1
    progress_source: Literal["learner_reported"] = "learner_reported"


class CompletionRequest(StrictModel):
    completed: Literal[True]


class AgentEvent(BaseModel):
    id: str
    agent: str
    status: Literal["started", "completed", "failed"]
    timestamp: str
    operation_id: str


class StorageStatus(BaseModel):
    mode: Literal["memory", "mongodb", "unavailable"]
    durable: bool
    reason: str | None = None


class OnboardingResponse(BaseModel):
    learner: Learner
    session_token: str
    storage: StorageStatus


class LearnerResponse(BaseModel):
    learner: Learner
    storage: StorageStatus


class AssessmentResponse(BaseModel):
    assessment: Assessment
    storage: StorageStatus


class ResultResponse(BaseModel):
    result: AssessmentResult
    storage: StorageStatus


class RoadmapResponse(BaseModel):
    roadmap: Roadmap
    storage: StorageStatus


class EventsResponse(BaseModel):
    events: list[AgentEvent]
    storage: StorageStatus
