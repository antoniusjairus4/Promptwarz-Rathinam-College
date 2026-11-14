"""Interview routes reuse the existing bearer authorization and session repository."""
from typing import Annotated
from fastapi import APIRouter, Query
from app.api.journey import Service
from app.api.workflow import Token
from app.models.interview import InterviewAction, InterviewAnswer, InterviewResponse, InterviewStart
from app.services.interview import InterviewService

router = APIRouter(prefix="/api/interviews", tags=["interview practice"])


@router.get("/current", response_model=InterviewResponse)
def current(svc: Service, credential: Token, session_id: Annotated[str, Query(min_length=1, max_length=100)]):
    document = svc.document(session_id, credential)
    return InterviewResponse(interview=InterviewService(svc).current(document), storage=svc.repository.status)


@router.post("/start", response_model=InterviewResponse)
def start(body: InterviewStart, svc: Service, credential: Token):
    return InterviewResponse(interview=InterviewService(svc).start(svc.document(body.session_id, credential), body), storage=svc.repository.status)


@router.post("/answer", response_model=InterviewResponse)
def answer(body: InterviewAnswer, svc: Service, credential: Token):
    return InterviewResponse(interview=InterviewService(svc).answer(svc.document(body.session_id, credential), body), storage=svc.repository.status)


@router.post("/next", response_model=InterviewResponse)
def next_question(body: InterviewAction, svc: Service, credential: Token):
    return InterviewResponse(interview=InterviewService(svc).next(svc.document(body.session_id, credential), body), storage=svc.repository.status)


@router.post("/summary", response_model=InterviewResponse)
def summary(body: InterviewAction, svc: Service, credential: Token):
    return InterviewResponse(interview=InterviewService(svc).summarize(svc.document(body.session_id, credential), body), storage=svc.repository.status)
