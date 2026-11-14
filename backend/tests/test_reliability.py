"""Regression coverage; synthetic model/driver fixtures are never runtime fallback."""
import asyncio
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
import json
import time
from threading import Barrier, Event
from types import SimpleNamespace

from bson import BSON
from fastapi.testclient import TestClient
from pymongo.errors import AutoReconnect
import pytest
import httpx

from app.core.config import Settings
from app.db.repository import MongoRepository, MemoryRepository, StorageUnavailable
from app.main import create_app
from app.models.workflow import AssessmentDraft, CareerContext, RoadmapDraft
from app.services.inference import HostedGenerator, InferenceUnavailable, inference_deadline
from test_journey import JourneyGenerator, new_session, client, github_handler, NoWait
from app.services.external import ExternalServices


def configured(**updates):
    return Settings(_env_file=None, nvidia_api_key="synthetic-nvidia", nvidia_model="synthetic-primary",
                    gemini_api_key="synthetic-gemini", gemini_model="synthetic-fallback", **updates)


def test_provider_wall_clock_timeout_cancels_work(monkeypatch):
    generator = HostedGenerator(configured())
    closed = []
    async def slow(*args):
        try:
            await asyncio.sleep(10)
        finally:
            closed.append(True)
    monkeypatch.setattr(generator, "_completion", slow)
    started = time.monotonic()
    with pytest.raises(TimeoutError):
        generator._request("nvidia", "synthetic", "test", "test", {}, 0.03, CareerContext)
    assert time.monotonic() - started < 1
    assert closed == [True]


def test_request_budget_is_shared_between_http_agents(monkeypatch):
    generator = HostedGenerator(configured(ai_request_budget_seconds=5))
    clock = [time.monotonic()]
    calls = []
    fixture = JourneyGenerator()
    def request(provider, key, model, system, payload, timeout, schema):
        calls.append((provider, timeout))
        clock[0] += 3
        return fixture.generate("test", payload, schema)[0].model_dump_json()
    monkeypatch.setattr("app.services.inference.time", SimpleNamespace(monotonic=lambda: clock[0]))
    monkeypatch.setattr(generator, "_request", request)
    with TestClient(create_app(configured(ai_request_budget_seconds=5), MemoryRepository(), generator)) as instance:
        sid, headers = new_session(instance)
        result = instance.post("/api/assessment/generate", headers=headers, json={"session_id": sid})
        assert result.status_code == 503
        assert result.json()["provider_failures"][-1]["category"] == "RequestBudgetExceeded"
        assert [provider for provider, _ in calls] == ["nvidia", "nvidia"]
        assert 0 < calls[1][1] < calls[0][1]
        state = instance.get("/api/sessions/" + sid, headers=headers).json()
        assert state["assessment"] is None
        assert state["events"][-1]["status"] == "failed"


def test_expired_budget_skips_all_providers(monkeypatch):
    generator = HostedGenerator(configured())
    monkeypatch.setattr(generator, "_request", lambda *args: pytest.fail("Must not call a provider"))
    token = inference_deadline.set(time.monotonic() - 1)
    try:
        with pytest.raises(InferenceUnavailable) as raised:
            generator.generate("test", {}, CareerContext)
        assert raised.value.diagnostics[0]["category"] == "RequestBudgetExceeded"
    finally:
        inference_deadline.reset(token)


def test_provider_errors_are_safe_and_recovery_has_no_stale_failures(monkeypatch):
    generator = HostedGenerator(configured())
    class RateLimit(Exception):
        code = 429
    monkeypatch.setattr(generator, "_request", lambda *args: (_ for _ in ()).throw(RateLimit("private response")))
    with pytest.raises(InferenceUnavailable) as raised:
        generator.generate("test", {}, CareerContext)
    assert [f["provider"] for f in raised.value.diagnostics] == ["nvidia", "gemini"]
    assert all(f["http_status"] == 429 for f in raised.value.diagnostics)
    assert "private response" not in json.dumps(raised.value.diagnostics)
    result = CareerContext(target_role="Test role", skills=["Python"], rationale="Synthetic test")
    monkeypatch.setattr(generator, "_request", lambda *args: result.model_dump_json())
    assert generator.generate("test", {}, CareerContext)[1] == "nvidia"
    assert generator.last_failures == []
    failed = Event()
    both_finished = Barrier(2)
    def isolated_request(provider, key, model, system, payload, *args):
        if payload["fail"]:
            raise RateLimit("private response")
        return result.model_dump_json()
    monkeypatch.setattr(generator, "_request", isolated_request)
    def worker(should_fail):
        if not should_fail:
            assert failed.wait(timeout=3)
        try:
            generator.generate("test", {"fail": should_fail}, CareerContext)
        except InferenceUnavailable:
            failed.set()
        both_finished.wait(timeout=3)
        return generator.last_failures
    with ThreadPoolExecutor(max_workers=2) as pool:
        failure = pool.submit(worker, True)
        success = pool.submit(worker, False)
        assert len(failure.result(timeout=5)) == 2
        assert success.result(timeout=5) == []


def evaluated(instance, sid, headers, answer=0):
    assessment = instance.post("/api/assessment/generate", headers=headers, json={"session_id": sid}).json()["assessment"]
    response = instance.post("/api/assessment/evaluate", headers=headers, json={
        "session_id": sid, "assessment_id": assessment["id"],
        "answers": {q["id"]: answer for q in assessment["questions"]},
    })
    assert response.status_code == 200
    return assessment


def test_retake_uses_history_and_refresh_adapts_to_new_results(client):
    sid, headers = new_session(client)
    action = {"session_id": sid}
    assert client.post("/api/career/blueprint", headers=headers, json=action).status_code == 200
    first = evaluated(client, sid, headers)
    old = client.post("/api/roadmap/generate", headers=headers, json=action).json()["roadmap"]
    assert old["steps"][0]["skill"] == "HTTP"
    assert client.post("/api/progress/update", headers=headers, json=action | {"step_id": old["steps"][0]["id"], "completed": True}).status_code == 200
    assert client.post("/api/profile/analyze", headers=headers, json=action).status_code == 200
    second = evaluated(client, sid, headers, answer=1)
    assert {q["prompt"] for q in first["questions"]}.isdisjoint(q["prompt"] for q in second["questions"])
    view = client.get("/api/sessions/" + sid, headers=headers).json()
    assert view["profile_analysis"] is None and view["roadmap"] is None
    new = client.post("/api/roadmap/generate", headers=headers, json=action).json()["roadmap"]
    assert new["assessment_id"] == second["id"]
    assert new["steps"][0]["skill"] == "Python"
    refreshed = client.post("/api/roadmap/generate", headers=headers, json=action | {"refresh": True}).json()["roadmap"]
    assert refreshed["revision"] == new["revision"] + 1
    payloads = client.app.state.workflow.generator.payloads
    latest_assessment = [payload for schema, payload in payloads if schema is AssessmentDraft][-1]
    assert latest_assessment["previous_questions"]
    assert latest_assessment["previous_results"][0]["gaps"] == ["HTTP", "SQL"]
    latest_roadmap = [payload for schema, payload in payloads if schema is RoadmapDraft][-1]
    assert latest_roadmap["evidence"]["completed_practice"]


def test_duplicate_assessment_rejected_without_erasing_previous_result(client):
    sid, headers = new_session(client)
    old = evaluated(client, sid, headers)
    generator = client.app.state.workflow.generator
    generator.assessments = 0  # Deliberately force the fixture to repeat its first draft.
    response = client.post("/api/assessment/generate", headers=headers, json={"session_id": sid})
    assert response.status_code == 503
    state = client.get("/api/sessions/" + sid, headers=headers).json()
    assert state["assessment"]["id"] == old["id"]
    assert state["result"]["assessment_id"] == old["id"]
    assert state["events"][-1]["status"] == "failed"


class DriverCollection:
    """BSON round-trip fixture for MongoRepository; not a real Atlas availability test."""
    def __init__(self):
        self.documents = {}
        self.failed = False

    def find_one(self, query):
        if self.failed:
            raise AutoReconnect("Synthetic network failure")
        return deepcopy(self.documents.get(query["_id"]))

    def insert_one(self, document):
        self.documents[document["_id"]] = BSON.encode(document).decode()

    def replace_one(self, query, document):
        if self.failed:
            raise AutoReconnect("Synthetic network failure")
        previous = self.documents.get(query["_id"])
        matched = previous is not None and previous["version"] == query["version"]
        if matched:
            self.insert_one(document)
        return SimpleNamespace(matched_count=int(matched))


class DriverClient:
    def __init__(self, collection):
        self.collection = collection

    def __getitem__(self, name):
        return {"learners": self.collection}

    def close(self):
        pass


def test_mongo_repository_restores_complete_memory_across_app_instances():
    collection = DriverCollection()
    def app():
        return create_app(Settings(_env_file=None), MongoRepository(DriverClient(collection), "synthetic"), JourneyGenerator())
    with TestClient(app()) as instance:
        instance.portal.call(instance.app.state.external.close)
        external_settings = Settings(_env_file=None, github_token="test-token")
        instance.app.state.external = ExternalServices(external_settings, httpx.AsyncClient(transport=httpx.MockTransport(github_handler)))
        instance.app.state.external.next_request = NoWait()
        sid, headers = new_session(instance)
        action = {"session_id": sid}
        instance.post("/api/github/analyze", headers=headers, json=action | {"target": "test/repo"}).raise_for_status()
        instance.post("/api/career/blueprint", headers=headers, json=action).raise_for_status()
        evaluated(instance, sid, headers)
        roadmap = instance.post("/api/roadmap/generate", headers=headers, json=action).json()["roadmap"]
        instance.post("/api/progress/update", headers=headers, json=action | {"step_id": roadmap["steps"][0]["id"], "completed": True}).raise_for_status()
        instance.post("/api/mentor/chat", headers=headers, json=action | {"message": "What next?"}).raise_for_status()
        instance.post("/api/profile/analyze", headers=headers, json=action).raise_for_status()
        before = instance.get("/api/sessions/" + sid, headers=headers).json()
    with TestClient(app()) as restored:
        after = restored.get("/api/sessions/" + sid, headers=headers).json()
        assert after == before
        assert after["storage"]["durable"] is True  # Repository mode, backed by a test-only driver.
        assert after["roadmap"]["steps"][0]["status"] == "completed"
        assert after["blueprint"] and after["messages"] and after["result"]
        assert after["github_repositories"] and after["profile_analysis"]
        collection.failed = True
        assert restored.get("/api/sessions/" + sid, headers=headers).status_code == 503
        assert restored.get("/api/health").status_code == 200
        collection.failed = False
        assert restored.get("/api/sessions/" + sid, headers=headers).json() == before


def test_failed_mongo_save_never_creates_memory_replacement():
    collection = DriverCollection()
    repo = MongoRepository(DriverClient(collection), "synthetic")
    repo.create({"_id": "one", "version": 0, "value": "real test value"})
    document = repo.get("one")
    collection.failed = True
    with pytest.raises(StorageUnavailable):
        repo.save(document, 0)
    assert repo.status.mode == "unavailable"
    assert repo.status.durable is False
    collection.failed = False
    assert repo.get("one")["value"] == "real test value"
    assert repo.status.mode == "mongodb" and repo.status.durable is True


def test_quiz_gaps_precede_unassessed_skills_without_fake_scores(client):
    sid, headers = new_session(client)
    evaluated(client, sid, headers)
    svc = client.app.state.workflow
    doc = svc.document(sid, headers["Authorization"].split()[1])
    doc["blueprint"] = {"skills": [{"name": "Design"}]}
    svc._save(doc)
    original = svc.generator.generate
    def generate(instruction, payload, schema):
        if schema is RoadmapDraft:
            return schema.model_validate({"summary": "Synthetic roadmap", "steps": [
                {"title": skill, "skill": skill, "objective": "Synthetic practice", "practice_task": skill + " test practice", "estimated_hours": 1}
                for skill in ["Python", "Design", "HTTP"]
            ]}), "test_provider", "test_model"
        return original(instruction, payload, schema)
    svc.generator.generate = generate
    response = client.post("/api/roadmap/generate", headers=headers, json={"session_id": sid})
    assert response.status_code == 200
    steps = response.json()["roadmap"]["steps"]
    assert [s["skill"] for s in steps] == ["HTTP", "Design", "Python"]
    assert steps[1]["gap_priority"] == "medium"
    assert "Design" not in svc.document(sid, headers["Authorization"].split()[1])["result"]["skill_scores"]


def test_completed_practice_is_not_silently_reissued(client):
    sid, headers = new_session(client)
    action = {"session_id": sid}
    evaluated(client, sid, headers)
    old = client.post("/api/roadmap/generate", headers=headers, json=action).json()["roadmap"]
    completed = client.post("/api/progress/update", headers=headers, json=action | {"step_id": old["steps"][0]["id"], "completed": True}).json()["roadmap"]
    response = client.post("/api/roadmap/generate", headers=headers, json=action | {"refresh": True})
    assert response.status_code == 503
    assert client.get("/api/sessions/" + sid, headers=headers).json()["roadmap"] == completed


def test_active_resources_and_jobs_do_not_claim_blueprint_targets(client):
    sid, headers = new_session(client)
    action = {"session_id": sid}
    client.post("/api/career/blueprint", headers=headers, json=action).raise_for_status()
    # HTTP is a target in the blueprint but has not been declared or assessed.
    def handler(request):
        if request.url.host == "remotive.com":
            return httpx.Response(200, json={"jobs": [{"id": 1, "title": "Python HTTP developer", "company_name": "Synthetic test", "url": "https://remotive.com/test-original", "tags": ["Python", "HTTP"]}]})
        raise httpx.ConnectError("Synthetic unavailable", request=request)
    external = client.app.state.external
    client.portal.call(external.client.aclose)
    external.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    jobs = client.get("/api/jobs/search", params={"session_id": sid, "q": "Python", "provider": "remotive"}, headers=headers).json()
    assert jobs["matches"][0]["matched_terms"] == ["Python"]
    assert jobs["matches"][0]["assessment_supported_terms"] == []
    assert jobs["jobs"][0]["application_url"] == "https://remotive.com/test-original"
    evaluated(client, sid, headers)
    roadmap = client.post("/api/roadmap/generate", headers=headers, json=action).json()["roadmap"]
    resources = client.get("/api/resources/search", params={"session_id": sid, "include_youtube": False}, headers=headers).json()
    assert resources["recommended_for"] == [roadmap["steps"][0]["skill"]]
