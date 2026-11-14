import asyncio

from fastapi.testclient import TestClient
from app.core.config import Settings
from app.core.limits import RequestLimits
from app.main import create_app


def test_large_request_has_cors_and_does_not_reach_workflow():
    with TestClient(create_app(Settings(_env_file=None, storage_backend="memory"))) as client:
        response = client.post("/api/sessions", content=b"x" * 262145, headers={"Origin": "https://maximus-ch-indol.vercel.app"})
        assert response.status_code == 413
        assert response.headers["access-control-allow-origin"] == "https://maximus-ch-indol.vercel.app"
        assert client.get("/api/health").status_code == 200


def test_chunked_body_is_bounded_without_content_length():
    with TestClient(create_app(Settings(_env_file=None, storage_backend="memory"))) as client:
        response = client.post("/api/sessions", content=iter([b"x" * 150000, b"x" * 150000]))
        assert response.status_code == 413


def test_write_rate_limit_and_health_recovery(monkeypatch):
    from types import SimpleNamespace
    now = [100.0]
    monkeypatch.setattr("app.core.limits.time", SimpleNamespace(monotonic=lambda: now[0]))
    with TestClient(create_app(Settings(_env_file=None, storage_backend="memory"))) as client:
        for _ in range(30):
            assert client.post("/api/sessions", json={"target_role": "Test"}).status_code == 201
        response = client.post("/api/sessions", json={"target_role": "Test"})
        assert response.status_code == 429 and response.headers["retry-after"] == "60"
        assert client.get("/api/health").status_code == 200
        now[0] += 61
        assert client.post("/api/sessions", json={"target_role": "Test"}).status_code == 201


def test_backpressure_rejects_excess_without_cancelling_active_request():
    async def scenario():
        started, release = asyncio.Event(), asyncio.Event()
        async def application(scope, receive, send):
            started.set()
            await release.wait()
        middleware = RequestLimits(application, max_inflight=1)
        scope = {"type": "http", "method": "POST", "client": ("test", 1), "headers": []}
        async def receive():
            return {"type": "http.request", "body": b""}
        sent = []
        async def send(message):
            sent.append(message)
        first = asyncio.create_task(middleware(scope, receive, send))
        await started.wait()
        await middleware(scope, receive, send)
        assert sent[0]["status"] == 429
        release.set()
        await first
        assert middleware.inflight == 0
    asyncio.run(scenario())
