"""Complete demo journey facade. Existing API v1 remains supported."""
from typing import Annotated, Literal
import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.security import HTTPAuthorizationCredentials
from starlette.concurrency import run_in_threadpool

from app.api.workflow import Token, bearer
from app.models.integrations import ProviderStatus
from app.models.journey import (
    BlueprintResponse, EvaluateAssessmentRequest, GenerateAssessmentRequest, GithubAnalysisResponse,
    GithubRequest, JobSearchResponse, MatchedJob, MentorRequest, MentorResponse, ProfileResponse,
    ProgressRequest, ResourceSearchResponse, RoadmapRequest, SessionAction, SessionCreate, SessionCreated, SessionView,
)
from app.models.workflow import AssessmentResponse, ResultResponse, RoadmapResponse
from app.services.catalog import search_catalog
from app.services.github_analysis import GithubInspector
from app.services.journey import JourneyService

router = APIRouter(prefix="/api", tags=["complete journey"])


def service(request: Request) -> JourneyService:
    return request.app.state.workflow


Service = Annotated[JourneyService, Depends(service)]
OptionalCredential = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]


@router.post("/sessions", response_model=SessionCreated, status_code=201)
def create_session(body: SessionCreate, svc: Service):
    learner, session_token = svc.onboard(body)
    view = svc.view(svc.document(learner.id, session_token))
    return SessionCreated(session_id=learner.id, session_token=session_token, session=view, storage=svc.repository.status)


@router.get("/sessions/{session_id}", response_model=SessionView)
def session(session_id: str, svc: Service, credential: Token):
    return svc.view(svc.document(session_id, credential))


@router.post("/career/blueprint", response_model=BlueprintResponse)
def blueprint(body: SessionAction, svc: Service, credential: Token):
    return BlueprintResponse(blueprint=svc.blueprint(svc.document(body.session_id, credential)), storage=svc.repository.status)


@router.post("/profile/analyze", response_model=ProfileResponse)
def profile(body: SessionAction, svc: Service, credential: Token):
    return ProfileResponse(profile=svc.profile(svc.document(body.session_id, credential)), storage=svc.repository.status)


@router.post("/github/analyze", response_model=GithubAnalysisResponse)
async def github(body: GithubRequest, request: Request, svc: Service, credential: Token):
    document = await run_in_threadpool(svc.document, body.session_id, credential)
    result = await GithubInspector(request.app.state.external).inspect(body.target, document["events"])
    if result["repositories"]:
        document["github_repositories"] = [repository.model_dump() for repository in result["repositories"]]
        document["profile_analysis"] = None
    # A failed refresh does not erase previous genuine findings.
    await run_in_threadpool(svc._save, document)
    return GithubAnalysisResponse(session_id=body.session_id, repositories=result["repositories"], providers=result["providers"], storage=svc.repository.status)


@router.post("/assessment/generate", response_model=AssessmentResponse)
def assessment(body: GenerateAssessmentRequest, svc: Service, credential: Token):
    return AssessmentResponse(assessment=svc.assessment(svc.document(body.session_id, credential)), storage=svc.repository.status)


@router.post("/assessment/evaluate", response_model=ResultResponse)
def evaluate(body: EvaluateAssessmentRequest, svc: Service, credential: Token):
    return ResultResponse(result=svc.submit(svc.document(body.session_id, credential), body.assessment_id, body), storage=svc.repository.status)


@router.post("/roadmap/generate", response_model=RoadmapResponse)
def roadmap(body: RoadmapRequest, svc: Service, credential: Token):
    return RoadmapResponse(roadmap=svc.roadmap(svc.document(body.session_id, credential), refresh=body.refresh), storage=svc.repository.status)


@router.post("/progress/update", response_model=RoadmapResponse)
def progress(body: ProgressRequest, svc: Service, credential: Token):
    return RoadmapResponse(roadmap=svc.complete_step(svc.document(body.session_id, credential), body.step_id), storage=svc.repository.status)


@router.post("/mentor/chat", response_model=MentorResponse)
def mentor(body: MentorRequest, svc: Service, credential: Token):
    return MentorResponse(message=svc.mentor(svc.document(body.session_id, credential), body.message), storage=svc.repository.status)


def recommendations(document, step_id=None):
    if step_id:
        step = next((s for s in (document.get("roadmap") or {}).get("steps", []) if s["id"] == step_id), None)
        if step is None:
            raise HTTPException(404, "Roadmap step not found")
        return [step["skill"]]
    roadmap = document.get("roadmap") or {}
    active = [s["skill"] for s in roadmap.get("steps", []) if s["status"] == "available"]
    if active:
        return active[:2]
    scores = (document.get("result") or {}).get("skill_scores", {})
    if scores:
        return sorted(scores, key=scores.get)[:2]
    blueprint_skills = [s["name"] for s in (document.get("blueprint") or {}).get("skills", [])]
    return blueprint_skills[:2] or [s["skill"] for s in document["learner"]["skills"]][:2] or [document["learner"].get("target_role") or ""]


async def optional_document(credentials, svc, session_id):
    if not session_id:
        return None
    # Public search remains public; session context is protected when explicitly requested.
    if credentials is None:
        raise HTTPException(401, "Bearer session token required")
    return await run_in_threadpool(svc.document, session_id, credentials.credentials)


@router.get("/resources/search", response_model=ResourceSearchResponse, openapi_extra={"security": [{"HTTPBearer": []}, {}]})
async def resources(request: Request, svc: Service, credentials: OptionalCredential, q: Annotated[str, Query(max_length=100)] = "", session_id: Annotated[str | None, Query(max_length=100)] = None, step_id: Annotated[str | None, Query(max_length=100)] = None, include_youtube: bool = True):
    document = await optional_document(credentials, svc, session_id)
    if step_id and not document:
        raise HTTPException(422, "step_id requires session_id")
    topics = [q.strip()] if q.strip() else recommendations(document, step_id) if document else []
    found = {}
    for query in topics or [""]:
        for resource in search_catalog(query):
            found[resource.id] = resource
    statuses = [ProviderStatus(provider="curated_catalog", status="ok")]
    if include_youtube and topics and topics[0]:
        try:
            videos, status = await request.app.state.external.youtube(topics[0][:100])
            statuses.append(status)
            for video in videos:
                found[video.id] = video
        except Exception:
            statuses.append(ProviderStatus(provider="youtube", status="error", detail="Optional provider failed"))
    return ResourceSearchResponse(resources=list(found.values()), providers=statuses, recommended_for=topics)


@router.get("/jobs/search", response_model=JobSearchResponse, openapi_extra={"security": [{"HTTPBearer": []}, {}]})
async def jobs(request: Request, svc: Service, credentials: OptionalCredential, q: Annotated[str, Query(max_length=100)] = "", session_id: Annotated[str | None, Query(max_length=100)] = None, provider: Literal["all", "both", "himalayas", "remotive", "arbeitnow", "adzuna"] = "all", limit: Annotated[int, Query(ge=1, le=40)] = 20):
    document = await optional_document(credentials, svc, session_id)
    query = q.strip() or (recommendations(document)[0] if document else "")
    result = await request.app.state.external.jobs(query[:100], provider, limit)
    matches = []
    if document:
        skills = list(dict.fromkeys([s["skill"] for s in document["learner"]["skills"]] + [s["name"] for s in (document.get("blueprint") or {}).get("skills", [])]))
        scores = (document.get("result") or {}).get("skill_scores", {})
        for job in result.jobs:
            text = " ".join([job.title, job.summary, *job.tags]).casefold()
            matched = [skill for skill in skills if re.search(r"(?<!\w)" + re.escape(skill.casefold()) + r"(?!\w)", text)]
            matches.append(MatchedJob(job_id=job.id, matched_terms=matched, assessment_supported_terms=[s for s in matched if scores.get(s, 0) >= 70]))
        ranks = {m.job_id: len(m.matched_terms) for m in matches}
        result.jobs.sort(key=lambda j: ranks[j.id], reverse=True)
        matches.sort(key=lambda m: len(m.matched_terms), reverse=True)
    return JobSearchResponse(**result.model_dump(), matches=matches, session_id=session_id)
