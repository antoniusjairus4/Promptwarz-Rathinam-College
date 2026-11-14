"""Full journey tests use clearly synthetic provider/model fixtures, never runtime fallback."""
import base64
import json

from fastapi.testclient import TestClient
import httpx
import pytest

from app.core.config import Settings
from app.db.repository import MemoryRepository
from app.main import create_app
from app.models.journey import BlueprintDraft, MentorDraft, ProfileDraft
from app.models.workflow import CareerContext
from app.services.external import ExternalServices
from app.services.inference import InferenceUnavailable
from test_workflow import TestGenerator


class JourneyGenerator(TestGenerator):
    def __init__(self):
        self.payloads = []

    def generate(self, instruction, payload, schema):
        self.payloads.append((schema, payload))
        if schema is BlueprintDraft:
            result = {"target_role": "Backend Engineer", "rationale": "Synthetic test rationale", "skills": [{"name": skill, "priority": "core", "rationale": "Synthetic test priority", "difficulty": "beginner"} for skill in ["Python", "HTTP", "SQL"]]}
        elif schema is ProfileDraft:
            result = {"summary": "Synthetic inferred profile", "inferred_skills": ["Python"], "suggested_roles": ["Backend Engineer"], "gaps_to_assess": ["HTTP"]}
        elif schema is MentorDraft:
            assert "keys" not in json.dumps(payload) and "token_hash" not in json.dumps(payload)
            result = {"reply": "Practice HTTP based on the current quiz gap and active roadmap step.", "next_actions": ["Complete the available HTTP exercise"]}
        else:
            return super().generate(instruction, payload, schema)
        return schema.model_validate(result), "test_provider", "test_model"


class NoWait(dict):
    def get(self, key, default=0):
        return 0


def github_handler(request):
    assert request.headers.get("authorization") == "Bearer test-token"
    if "/contents/" in request.url.path:
        code = "from fastapi import FastAPI\n\ndef test_endpoint():\n    assert True\n\nraise RuntimeError('Never execute this source')\n"
        return httpx.Response(200, json={"type": "file", "encoding": "base64", "size": len(code), "sha": "test-sha", "content": base64.b64encode(code.encode()).decode(), "html_url": "https://github.com/test/repo/blob/main/app.py"})
    if "/git/trees/" in request.url.path:
        return httpx.Response(200, json={"sha": "tree-sha", "truncated": False, "tree": [{"path": "app.py", "size": 100, "type": "blob"}, {"path": "tests/test_app.py", "size": 100, "type": "blob"}, {"path": ".env", "size": 40, "type": "blob"}]})
    if request.url.path.startswith("/users/"):
        return httpx.Response(200, json=[{"private": False, "fork": False, "owner": {"login": "test"}, "name": "repo"}])
    return httpx.Response(200, json={"private": False, "full_name": "test/repo", "html_url": "https://github.com/test/repo", "default_branch": "main", "description": "Synthetic fixture", "language": "Python"})


@pytest.fixture
def client(tmp_path):
    settings = Settings(_env_file=None, storage_backend="memory", github_token="test-token", external_cache_dir=tmp_path)
    generator = JourneyGenerator()
    with TestClient(create_app(settings, MemoryRepository(), generator)) as instance:
        instance.portal.call(instance.app.state.external.close)
        instance.app.state.external = ExternalServices(settings, httpx.AsyncClient(transport=httpx.MockTransport(github_handler)))
        instance.app.state.external.next_request = NoWait()
        yield instance


def new_session(client, **overrides):
    body = {"full_name": "Test learner", "target_role": "Wildlife Conservation Planner", "skills": ["Python"]}
    body.update(overrides)
    response = client.post("/api/sessions", json=body)
    assert response.status_code == 201
    data = response.json()
    return data["session_id"], {"Authorization": "Bearer " + data["session_token"]}


def test_complete_session_journey(client):
    sid, headers = new_session(client)
    response = client.post("/api/github/analyze", headers=headers, json={"session_id": sid, "target": "https://github.com/test/repo"})
    assert response.status_code == 200
    repositories = response.json()["repositories"]
    assert repositories[0]["tree_sha"] == "tree-sha"
    assert ".env" not in repositories[0]["inspected_paths"]
    assert {f["label"] for f in repositories[0]["findings"]} >= {"Python", "FastAPI", "Tests"}
    assert all(f["verified"] is False and f["source_url"] and f["sha"] for f in repositories[0]["findings"])
    profile = client.post("/api/profile/analyze", headers=headers, json={"session_id": sid})
    assert profile.status_code == 200 and "not verified" in profile.json()["profile"]["evidence_note"]
    blueprint = client.post("/api/career/blueprint", headers=headers, json={"session_id": sid})
    assert blueprint.status_code == 200
    # Explicit arbitrary career remains authoritative, rather than a fixed role catalog.
    assert blueprint.json()["blueprint"]["target_role"] == "Wildlife Conservation Planner"
    assessment = client.post("/api/assessment/generate", headers=headers, json={"session_id": sid})
    assert assessment.status_code == 200
    assert "correct_index" not in assessment.text and "rationale" not in assessment.text
    a = assessment.json()["assessment"]
    before = client.get("/api/sessions/" + sid, headers=headers)
    assert "keys" not in before.text and "rationales" not in before.text and "token_hash" not in before.text
    evaluated = client.post("/api/assessment/evaluate", headers=headers, json={"session_id": sid, "assessment_id": a["id"], "answers": {q["id"]: 0 for q in a["questions"]}})
    assert evaluated.status_code == 200
    result = evaluated.json()["result"]
    assert result["score"] == 33.33 and len(result["explanations"]) == 3
    assert result["demonstrated_strengths"] == ["Python"]
    assert result["gaps"] == ["HTTP", "SQL"]
    assert result["quiz_verification"][0]["evidence_scope"] == "current_quiz_only"
    response = client.post("/api/roadmap/generate", headers=headers, json={"session_id": sid})
    assert response.status_code == 200
    roadmap = response.json()["roadmap"]
    assert roadmap["steps"][0]["skill"] == "HTTP"
    assert roadmap["steps"][0]["difficulty"] == "beginner"
    assert roadmap["steps"][0]["gap_priority"] == "high"
    updated = client.post("/api/progress/update", headers=headers, json={"session_id": sid, "step_id": roadmap["steps"][0]["id"], "completed": True})
    assert updated.status_code == 200
    assert updated.json()["roadmap"]["steps"][1]["status"] == "available"
    mentor = client.post("/api/mentor/chat", headers=headers, json={"session_id": sid, "message": "What should I practice next?"})
    assert mentor.status_code == 200
    assert mentor.json()["message"]["next_actions"]
    state = client.get("/api/sessions/" + sid, headers=headers).json()
    assert state["result"]["score"] == 33.33
    assert len(state["messages"]) == 1
    assert state["storage"]["mode"] == "memory"
    assert {e["agent"] for e in state["events"]} == {"Skill Detective", "Career Architect", "Assessment Architect", "Learning Curator", "Adaptive Mentor"}
    assert all(e["status"] in {"started", "completed"} for e in state["events"])
    payloads = client.app.state.workflow.generator.payloads
    assessment_context = next(payload for schema, payload in payloads if schema is CareerContext)
    assert assessment_context["additional_evidence"]["github_repositories"]
    mentor_context = next(payload for schema, payload in payloads if schema is MentorDraft)
    assert mentor_context["completed_practice"] and mentor_context["github_evidence"]
    assert mentor_context["assessment_result"]["gaps"] == ["HTTP", "SQL"]


def test_skills_first_interests_and_ownership(client):
    sid, headers = new_session(client, track="skills_first", target_role=None, skills=[], interests=["Wildlife conservation"])
    assert client.get("/api/sessions/" + sid).status_code == 401
    assert client.get("/api/sessions/" + sid, headers={"Authorization": "Bearer wrong"}).status_code == 404
    assert client.post("/api/career/blueprint", headers=headers, json={"session_id": sid}).status_code == 200
    assert client.post("/api/roadmap/generate", headers=headers, json={"session_id": sid}).status_code == 409
    assert client.get("/api/jobs/search", params={"session_id": sid}).status_code == 401
    assert client.get("/api/resources/search", params={"step_id": "fake"}).status_code == 422
    assert client.post("/api/github/analyze", headers=headers, json={"session_id": sid, "target": "https://evil.example/a/b"}).status_code == 422


def test_public_username_is_supported(client):
    sid, headers = new_session(client)
    response = client.post("/api/github/analyze", headers=headers, json={"session_id": sid, "target": "test"})
    assert response.status_code == 200 and response.json()["repositories"]


def test_failed_refresh_preserves_genuine_evidence(client):
    sid, headers = new_session(client)
    body = {"session_id": sid, "target": "test/repo"}
    assert client.post("/api/github/analyze", headers=headers, json=body).json()["repositories"]
    svc = client.app.state.external
    svc.cache.clear()
    svc.client = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(403, headers={"x-ratelimit-remaining": "0"})))
    assert client.post("/api/github/analyze", headers=headers, json=body).json()["repositories"] == []
    state = client.get("/api/sessions/" + sid, headers=headers).json()
    assert state["github_repositories"]
    assert state["events"][-1]["status"] == "failed"


def test_mentor_failure_has_no_canned_reply(client):
    sid, headers = new_session(client)
    class Failed:
        def generate(self, *args):
            raise InferenceUnavailable()
    client.app.state.workflow.generator = Failed()
    response = client.post("/api/mentor/chat", headers=headers, json={"session_id": sid, "message": "Help me plan"})
    assert response.status_code == 503
    state = client.get("/api/sessions/" + sid, headers=headers).json()
    assert state["messages"] == []
    assert state["events"][-1]["status"] == "failed"


def test_resources_and_matching_use_actual_session_skills(client):
    sid, headers = new_session(client)
    def handler(request):
        if request.url.host == "remotive.com":
            return httpx.Response(200, json={"jobs": [{"id": 1, "title": "Python developer", "company_name": "Test company", "url": "https://remotive.com/test", "tags": ["Python"], "description": "Python APIs"}]})
        if request.url.host == "www.arbeitnow.com":
            return httpx.Response(200, json={"data": [{"slug": "python-test", "title": "Python engineer", "company_name": "Another test", "url": "https://www.arbeitnow.com/jobs/test", "location": "Berlin", "tags": ["Python"], "created_at": 1700000000}]})
        raise httpx.ConnectError("Test unavailable", request=request)
    client.app.state.external.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    resources = client.get("/api/resources/search", params={"session_id": sid, "include_youtube": False}, headers=headers)
    assert resources.status_code == 200 and resources.json()["recommended_for"] == ["Python"]
    assert len(resources.json()["resources"]) == 3
    response = client.get("/api/jobs/search", params={"session_id": sid}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["returned_count"] == 2
    assert all(m["matched_terms"] == ["Python"] for m in data["matches"])
    assert all(m["assessment_supported_terms"] == [] for m in data["matches"])
    assert next(p for p in data["providers"] if p["provider"] == "adzuna")["status"] == "not_configured"


def test_primary_inference_retry_and_configured_fallback(monkeypatch):
    from app.services.inference import HostedGenerator
    from app.models.workflow import CareerContext
    settings = Settings(_env_file=None, nvidia_api_key="test-nvidia", nvidia_model="test-model", gemini_api_key="test-gemini", gemini_model="test-fallback", primary_llm_provider="nvidia")
    generator = HostedGenerator(settings)
    calls = []
    content = json.dumps({"target_role": "Test role", "skills": ["Python"], "rationale": "Test rationale"})
    def transient(provider, *args):
        calls.append(provider)
        if len(calls) == 1:
            raise TimeoutError()
        return content
    monkeypatch.setattr(generator, "_request", transient)
    monkeypatch.setattr("app.services.inference.time.sleep", lambda _: None)
    result, provider, _ = generator.generate("test", {}, CareerContext)
    assert provider == "nvidia" and calls == ["nvidia", "nvidia"]
    assert generator.last_failures == [{"provider": "nvidia", "category": "TimeoutError", "http_status": None}]
    calls.clear()
    class Denied(Exception):
        status_code = 401
    def denied(provider, *args):
        calls.append(provider)
        if provider == "nvidia":
            raise Denied()
        return content
    monkeypatch.setattr(generator, "_request", denied)
    assert generator.generate("test", {}, CareerContext)[1] == "gemini"
    assert calls == ["nvidia", "gemini"]
