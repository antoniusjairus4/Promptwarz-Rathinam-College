"""Provider-shaped fixtures test failure isolation without consuming live quotas."""
import asyncio
import base64
from datetime import datetime, timedelta, timezone
import time

from fastapi.testclient import TestClient
import httpx

from app.core.config import Settings
from app.db.repository import MemoryRepository
from app.main import create_app
from app.services.external import ExternalServices


def settings(tmp_path, **kwargs):
    return Settings(_env_file=None, storage_backend="memory", external_cache_dir=tmp_path, **kwargs)


def himalaya(**kwargs):
    row = {"guid": "https://himalayas.app/companies/test/jobs/python-engineer", "title": "Python Engineer", "companyName": "Test Company", "applicationLink": "https://careers.example/jobs/123?utm_source=himalayas", "locationRestrictions": [], "categories": ["Python"], "excerpt": "<p>Build Python APIs</p>", "expiryDate": int((datetime.now(timezone.utc) + timedelta(days=1)).timestamp())}
    return row | kwargs


def remotive(**kwargs):
    return {"id": 123, "title": "Python Engineer", "company_name": "Test Company", "url": "https://remotive.com/remote-jobs/software-dev/python-123", "candidate_required_location": "Worldwide", "tags": ["Python"], "description": "<p>Build Python APIs</p>", "publication_date": "2026-11-01T12:00:00"} | kwargs


def test_job_search_deduplicates_preserves_links_and_expiry(tmp_path):
    calls = []
    def handler(request):
        calls.append(request)
        if request.url.host == "himalayas.app":
            return httpx.Response(200, json={"jobs": [himalaya(), himalaya(guid="expired", expiryDate=1)]})
        return httpx.Response(200, json={"jobs": [remotive(), remotive(id=456, title="Rust Developer", url="https://remotive.com/rust", description="Build Rust services", tags=["Rust"])]})
    async def run():
        svc = ExternalServices(settings(tmp_path), httpx.AsyncClient(transport=httpx.MockTransport(handler)))
        result = await svc.jobs("Python", "both", 20)
        assert len(result.jobs) == 1
        job = result.jobs[0]
        assert job.application_url == himalaya()["applicationLink"]
        assert len(job.sources) == 2
        assert {source.source for source in job.sources} == {"himalayas", "remotive"}
        assert "<p>" not in job.summary
        assert all(status.status == "ok" for status in result.providers)
        again = await svc.jobs("Python", "both", 20)
        assert all(status.cached for status in again.providers)
        # New local search must not create another Remotive request.
        result = await svc.jobs("Rust", "remotive", 20)
        assert result.jobs[0].title == "Rust Developer"
        assert len([r for r in calls if r.url.host == "remotive.com"]) == 1
        await svc.close()
        # Cache survives restart to respect the six-hour feed fetch interval.
        svc = ExternalServices(settings(tmp_path), httpx.AsyncClient(transport=httpx.MockTransport(lambda r: (_ for _ in ()).throw(AssertionError("Unexpected request")))))
        assert (await svc.jobs("Python", "remotive", 20)).providers[0].cached
        await svc.close()
    asyncio.run(run())


def test_failure_and_rate_limit_isolation(tmp_path):
    def handler(request):
        if request.url.host == "himalayas.app":
            raise httpx.ConnectError("Test connection failure", request=request)
        return httpx.Response(200, json={"jobs": [remotive()]})
    async def run():
        svc = ExternalServices(settings(tmp_path), httpx.AsyncClient(transport=httpx.MockTransport(handler)))
        result = await svc.jobs("Python", "both", 20)
        assert len(result.jobs) == 1
        assert result.providers[0].status == "error"
        assert result.providers[1].status == "ok"
        await svc.close()
        count = 0
        def limited(request):
            nonlocal count
            count += 1
            return httpx.Response(403, headers={"x-ratelimit-remaining": "0", "x-ratelimit-reset": str(int(time.time()) + 600)}, json={"message": "rate limited"})
        svc = ExternalServices(settings(tmp_path), httpx.AsyncClient(transport=httpx.MockTransport(limited)))
        result = await svc.github("psf", "requests", [])
        assert result.repository is None
        assert result.providers[0].status == "rate_limited"
        await svc.github("pallets", "flask", [])
        assert count == 1
        await svc.close()
    asyncio.run(run())


def test_github_metadata_and_selected_source_files(tmp_path):
    def handler(request):
        assert "authorization" not in request.headers
        if "/contents/" not in request.url.path:
            return httpx.Response(200, json={"private": False, "full_name": "test/repo", "html_url": "https://github.com/test/repo", "default_branch": "main", "description": "Test", "language": "Python"})
        if request.url.path.endswith("big.py"):
            return httpx.Response(200, json={"type": "file", "encoding": "base64", "size": 70000})
        return httpx.Response(200, json={"type": "file", "encoding": "base64", "size": 9, "sha": "abc123", "content": base64.b64encode(b"print(1)\n").decode(), "html_url": "https://github.com/test/repo/blob/main/app.py"})
    async def run():
        svc = ExternalServices(settings(tmp_path), httpx.AsyncClient(transport=httpx.MockTransport(handler)))
        result = await svc.github("test", "repo", ["app.py", "big.py"])
        assert result.repository.language == "Python"
        assert "does not prove" in result.repository.evidence_note
        assert result.files[0].content == "print(1)\n"
        assert result.files[0].sha == "abc123"
        assert result.files[1].status == "too_large"
        await svc.close()
    asyncio.run(run())


def test_learning_routes_keep_catalog_when_youtube_fails(tmp_path):
    with TestClient(create_app(settings(tmp_path), MemoryRepository())) as client:
        async def fail(query):
            raise RuntimeError("provider failed")
        client.app.state.external.youtube = fail
        response = client.get("/api/v1/learning/resources", params={"q": "Python", "include_youtube": True})
        assert response.status_code == 200
        data = response.json()
        assert len(data["resources"]) == 3
        assert data["providers"][-1]["status"] == "error"
        assert all(item["provenance"] == "curated_official" for item in data["resources"])
        assert client.get("/api/health").status_code == 200
        for path in ["../app.py", ".env", "https://example.com/a.py", "secrets.json", "foo//bar.py"]:
            assert client.get("/api/v1/integrations/github/test/repo", params={"paths": path}).status_code == 422
        assert client.get("/api/v1/jobs/search", params={"limit": 1000}).status_code == 422
        assert client.get("/api/v1/learning/youtube", params={"q": " "}).status_code == 422


def test_youtube_real_response_normalization_and_cache(tmp_path):
    count = 0
    def handler(request):
        nonlocal count
        count += 1
        assert request.url.params["type"] == "video"
        return httpx.Response(200, json={"items": [{"id": {"videoId": "abcdefghijk"}, "snippet": {"title": "Python &amp; APIs", "channelTitle": "Test channel"}}]})
    async def run():
        svc = ExternalServices(settings(tmp_path, youtube_api_key="test-only-key"), httpx.AsyncClient(transport=httpx.MockTransport(handler)))
        resources, status = await svc.youtube("Python")
        assert resources[0].title == "Python & APIs"
        assert resources[0].url == "https://www.youtube.com/watch?v=abcdefghijk"
        assert resources[0].provenance == "youtube_api"
        assert (await svc.youtube("Python"))[1].cached
        assert count == 1
        await svc.close()
    asyncio.run(run())


def test_disabled_providers_and_invalid_bounded_json(tmp_path):
    async def run():
        svc = ExternalServices(settings(tmp_path, himalayas_enabled=False, youtube_enabled=False), httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, content=b"not json"))))
        result = await svc.jobs("", "both", 10)
        assert result.jobs == []
        assert [s.status for s in result.providers] == ["disabled", "error"]
        assert (await svc.youtube("Python"))[1].status == "disabled"
        data, status = await svc.fetch("github", "oversize", "https://api.github.com/test", max_bytes=2)
        assert data is None and "size limit" in status.detail
        await svc.close()
    asyncio.run(run())
