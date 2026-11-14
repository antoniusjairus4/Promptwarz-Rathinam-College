"""Typed interview practice contracts; AI ratings are not skill verification."""
from typing import Annotated, Literal
from pydantic import BaseModel, Field
from app.models.journey import SessionAction
from app.models.workflow import StrictModel, Text, LongText, StorageStatus

InterviewType = Literal["technical", "behavioral", "mixed"]
Difficulty = Literal["beginner", "intermediate", "advanced"]


class InterviewStart(SessionAction):
    interview_type: InterviewType = "mixed"
    difficulty: Difficulty = "intermediate"


class InterviewAction(SessionAction):
    interview_id: Text


class InterviewAnswer(InterviewAction):
    question_id: Text
    transcript: Annotated[str, Field(min_length=1, max_length=6000)]


class QuestionDraft(StrictModel):
    question: LongText
    focus: Text


class FeedbackDraft(StrictModel):
    technical_accuracy: int = Field(ge=0, le=10)
    clarity: int = Field(ge=0, le=10)
    completeness: int = Field(ge=0, le=10)
    relevance: int = Field(ge=0, le=10)
    feedback: LongText
    improvements: list[Text] = Field(min_length=1, max_length=4)
    stronger_answer: LongText


class SummaryDraft(StrictModel):
    summary: LongText
    strengths: list[Text] = Field(min_length=1, max_length=4)
    improvement_areas: list[Text] = Field(min_length=1, max_length=4)
    next_steps: list[Text] = Field(min_length=1, max_length=4)


class InterviewQuestion(QuestionDraft):
    id: str
    number: int = Field(ge=1, le=5)
    provider: str
    model: str


class InterviewFeedback(FeedbackDraft):
    question_id: str
    transcript: str
    provider: str
    model: str


class InterviewSummary(SummaryDraft):
    provider: str
    model: str


class Interview(BaseModel):
    id: str
    interview_type: InterviewType
    difficulty: Difficulty
    created_at: str
    questions: list[InterviewQuestion] = Field(max_length=5)
    answers: list[InterviewFeedback] = Field(default_factory=list, max_length=5)
    summary: InterviewSummary | None = None
    evidence_note: str = "AI practice feedback only; not verified proficiency or a hiring prediction. Only approved text is sent; no raw audio is uploaded by Maximus."


class InterviewResponse(BaseModel):
    interview: Interview | None
    storage: StorageStatus
