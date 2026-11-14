"""Maximus API: credential-independent liveness and a versioned learning workflow."""
from contextlib import asynccontextmanager
from typing import Literal
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.api.workflow import router
from app.api.integrations import router as integrations_router
from app.services.external import ExternalServices
from app.core.config import Settings
from app.db.repository import Conflict, Repository, StorageUnavailable, build_repository
from app.services.inference import Generator, HostedGenerator, InferenceUnavailable, inference_deadline
from app.services.journey import JourneyService
from app.api.journey import router as journey_router


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


def create_app(settings: Settings | None = None, repository: Repository | None = None, generator: Generator | None = None) -> FastAPI:
    settings = settings if settings is not None else Settings()

    @asynccontextmanager
    async def lifespan(application):
        repo = repository if repository is not None else await run_in_threadpool(build_repository, settings)
        application.state.workflow = JourneyService(repo, generator if generator is not None else HostedGenerator(settings))
        application.state.external = ExternalServices(settings)
        try:
            yield
        finally:
            await application.state.external.close()
            repo.close()

    application = FastAPI(title="Maximus API", version="0.4.0", lifespan=lifespan)

    @application.middleware("http")
    async def bound_ai_work(request: Request, call_next):
        # Context propagates into FastAPI's worker threads and all sequential agents.
        token = inference_deadline.set(time.monotonic() + settings.ai_request_budget_seconds)
        try:
            return await call_next(request)
        finally:
            inference_deadline.reset(token)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Content-Type", "Authorization"],
    )

    @application.exception_handler(StorageUnavailable)
    async def storage_error(request: Request, exc: StorageUnavailable):
        return JSONResponse(status_code=503, content={"detail": "Storage unavailable; no data was replaced with demo data"})

    @application.exception_handler(Conflict)
    async def conflict_error(request: Request, exc: Conflict):
        return JSONResponse(status_code=409, content={"detail": "Learner changed during this request; reload and retry"})

    @application.exception_handler(InferenceUnavailable)
    async def inference_error(request: Request, exc: InferenceUnavailable):
        return JSONResponse(status_code=503, content={"detail": "Hosted AI unavailable or returned invalid output; retry later. No assessment or roadmap was fabricated.", "provider_failures": getattr(exc, "diagnostics", [])})

    @application.get("/api/health", response_model=HealthResponse, tags=["health"])
    def health() -> HealthResponse:
        """Liveness only. See /api/v1/status for storage durability."""
        return HealthResponse()

    application.include_router(router)
    application.include_router(integrations_router)
    application.include_router(journey_router)
    return application


app = create_app()
