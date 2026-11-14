"""Versioned demo API. Session tokens are required for learner-owned resources."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.workflow import (
    AssessmentResponse, CompletionRequest, EventsResponse, LearnerResponse,
    OnboardingRequest, OnboardingResponse, ResultResponse, RoadmapResponse,
    StorageStatus, Submission,
)
from app.services.workflow import WorkflowService

router = APIRouter(prefix="/api/v1", tags=["workflow"])
bearer = HTTPBearer(auto_error=False)


def service(request: Request) -> WorkflowService:
    return request.app.state.workflow


Service = Annotated[WorkflowService, Depends(service)]


def token(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Bearer session token required", headers={"WWW-Authenticate": "Bearer"})
    return credentials.credentials


Token = Annotated[str, Depends(token)]


@router.get("/status", response_model=StorageStatus)
def status(svc: Service):
    return svc.repository.status


@router.post("/onboarding", response_model=OnboardingResponse, status_code=201)
def onboard(body: OnboardingRequest, svc: Service):
    learner, session_token = svc.onboard(body)
    return OnboardingResponse(learner=learner, session_token=session_token, storage=svc.repository.status)


@router.get("/learners/{learner_id}", response_model=LearnerResponse)
def learner(learner_id: str, svc: Service, session: Token):
    document = svc.document(learner_id, session)
    return LearnerResponse(learner=document["learner"], storage=svc.repository.status)


@router.post("/learners/{learner_id}/assessments", response_model=AssessmentResponse)
def create_assessment(learner_id: str, svc: Service, session: Token):
    return AssessmentResponse(assessment=svc.assessment(svc.document(learner_id, session)), storage=svc.repository.status)


@router.get("/learners/{learner_id}/assessment", response_model=AssessmentResponse)
def current_assessment(learner_id: str, svc: Service, session: Token):
    document = svc.document(learner_id, session)
    if not document["assessment"]:
        raise HTTPException(404, "No assessment generated")
    return AssessmentResponse(assessment=document["assessment"]["public"], storage=svc.repository.status)


@router.post("/learners/{learner_id}/assessments/{assessment_id}/submit", response_model=ResultResponse)
def submit(learner_id: str, assessment_id: str, body: Submission, svc: Service, session: Token):
    return ResultResponse(result=svc.submit(svc.document(learner_id, session), assessment_id, body), storage=svc.repository.status)


@router.get("/learners/{learner_id}/result", response_model=ResultResponse)
def result(learner_id: str, svc: Service, session: Token):
    document = svc.document(learner_id, session)
    if not document["result"]:
        raise HTTPException(404, "No submitted assessment result")
    return ResultResponse(result=document["result"], storage=svc.repository.status)


@router.post("/learners/{learner_id}/roadmap", response_model=RoadmapResponse)
def generate_roadmap(learner_id: str, svc: Service, session: Token):
    return RoadmapResponse(roadmap=svc.roadmap(svc.document(learner_id, session)), storage=svc.repository.status)


@router.get("/learners/{learner_id}/roadmap", response_model=RoadmapResponse)
def roadmap(learner_id: str, svc: Service, session: Token):
    document = svc.document(learner_id, session)
    if not document["roadmap"]:
        raise HTTPException(404, "No roadmap generated")
    return RoadmapResponse(roadmap=document["roadmap"], storage=svc.repository.status)


@router.patch("/learners/{learner_id}/roadmap/steps/{step_id}", response_model=RoadmapResponse)
def progress(learner_id: str, step_id: str, body: CompletionRequest, svc: Service, session: Token):
    return RoadmapResponse(roadmap=svc.complete_step(svc.document(learner_id, session), step_id), storage=svc.repository.status)


@router.get("/learners/{learner_id}/events", response_model=EventsResponse)
def events(learner_id: str, svc: Service, session: Token):
    document = svc.document(learner_id, session)
    return EventsResponse(events=document["events"], storage=svc.repository.status)
