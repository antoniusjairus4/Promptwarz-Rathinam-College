"""Deterministic fixtures are test-only; runtime never substitutes them for AI."""
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.repository import Conflict, MemoryRepository, StorageUnavailable, build_repository
from app.main import create_app
from app.models.workflow import AssessmentDraft, CareerContext, RoadmapDraft
from app.services.inference import HostedGenerator, InferenceUnavailable


class TestGenerator:
    __test__ = False

    def generate(self, instruction, payload, schema):
        if schema is CareerContext:
            data = {"target_role": "Backend Engineer", "skills": ["Python", "HTTP", "SQL"], "rationale": "Test fixture"}
        elif schema is AssessmentDraft:
            data = {"questions": [{"skill": skill, "prompt": f"Test question about {skill}", "options": ["A", "B", "C", "D"], "correct_index": index, "rationale": "Private fixture rationale", "difficulty": "beginner"} for index, skill in enumerate(["Python", "HTTP", "SQL"])]}
        else:
            data = {"summary": "Test roadmap", "steps": [{"title": skill + " practice", "skill": skill, "objective": "Practice this skill", "practice_task": "Complete the practice exercise", "estimated_hours": 2} for skill in ["Python", "HTTP", "SQL"]]}
        return schema.model_validate(data), "test_provider", "test_model"


@pytest.fixture
def client():
    settings = Settings(_env_file=None, storage_backend="memory")
    with TestClient(create_app(settings, MemoryRepository(), TestGenerator())) as instance:
        yield instance


def onboard(client, **overrides):
    body = {"full_name": "Test learner", "target_role": "Backend Engineer", "skills": ["Python"]}
    body.update(overrides)
    response = client.post("/api/v1/onboarding", json=body)
    assert response.status_code == 201
    data = response.json()
    assert data["storage"]["durable"] is False
    return "/api/v1/learners/" + data["learner"]["id"], {"Authorization": "Bearer " + data["session_token"]}


def test_full_flow_and_private_answers(client):
    base, headers = onboard(client)
    response = client.post(base + "/assessments", headers=headers)
    assert response.status_code == 200
    assert "correct_index" not in response.text
    assert "rationale" not in response.text
    assessment = response.json()["assessment"]
    # Creating an unsubmitted assessment twice is idempotent.
    assert client.post(base + "/assessments", headers=headers).json()["assessment"]["id"] == assessment["id"]
    answers = {q["id"]: 0 for q in assessment["questions"]}
    result = client.post(base + "/assessments/" + assessment["id"] + "/submit", headers=headers, json={"answers": answers})
    assert result.status_code == 200
    assert result.json()["result"]["score"] == 33.33
    assert result.json()["result"]["skill_scores"] == {"Python": 100.0, "HTTP": 0.0, "SQL": 0.0}
    assert client.post(base + "/assessments/" + assessment["id"] + "/submit", headers=headers, json={"answers": answers}).status_code == 409
    roadmap = client.post(base + "/roadmap", headers=headers).json()["roadmap"]
    assert roadmap["steps"][0]["skill"] == "HTTP"
    steps = roadmap["steps"]
    assert client.patch(base + "/roadmap/steps/" + steps[1]["id"], headers=headers, json={"completed": True}).status_code == 409
    completed = client.patch(base + "/roadmap/steps/" + steps[0]["id"], headers=headers, json={"completed": True})
    assert completed.status_code == 200
    assert completed.json()["roadmap"]["steps"][1]["status"] == "available"
    assert completed.json()["roadmap"]["revision"] == 2
    assert client.get(base + "/roadmap", headers=headers).json()["roadmap"] == completed.json()["roadmap"]
    profile = client.get(base, headers=headers).json()["learner"]
    assert all(skill["verified"] is False for skill in profile["skills"])
    assert {skill["provenance"] for skill in profile["skills"]} == {"self_reported", "assessment_observed"}
    events = client.get(base + "/events", headers=headers).json()["events"]
    assert {event["agent"] for event in events} == {"Skill Detective", "Career Architect", "Assessment Architect", "Learning Curator", "Adaptive Mentor"}
    assert [event["status"] for event in events] == ["started", "completed"] * 6
    # A new assessment invalidates the old result and roadmap.
    assert client.post(base + "/assessments", headers=headers).json()["assessment"]["id"] != assessment["id"]
    assert client.get(base + "/roadmap", headers=headers).status_code == 404


def test_session_isolation_and_validation(client):
    base, headers = onboard(client)
    _, other = onboard(client)
    assert client.get(base).status_code == 401
    assert client.get(base, headers=other).status_code == 404
    assert client.post(base + "/roadmap", headers=headers).status_code == 409
    assert client.post("/api/v1/onboarding", json={"full_name": "Test", "track": "career_first"}).status_code == 422
    assert client.post("/api/v1/onboarding", json={"full_name": "Test", "track": "skills_first"}).status_code == 422
    onboard(client, track="skills_first", target_role=None)
    a = client.post(base + "/assessments", headers=headers).json()["assessment"]
    submit_url = base + "/assessments/" + a["id"] + "/submit"
    assert client.post(submit_url, headers=headers, json={"answers": {a["questions"][0]["id"]: 0}}).status_code == 422
    assert client.post(submit_url, headers=headers, json={"answers": {q["id"]: True for q in a["questions"]}}).status_code == 422
    assert client.post(submit_url, headers=headers, json={"answers": {q["id"]: 4 for q in a["questions"]}}).status_code == 422


def test_ai_failure_records_real_failure_without_fabrication(client):
    class FailedGenerator:
        def generate(self, *args):
            raise InferenceUnavailable()
    client.app.state.workflow.generator = FailedGenerator()
    base, headers = onboard(client)
    assert client.post(base + "/assessments", headers=headers).status_code == 503
    assert client.get(base + "/assessment", headers=headers).status_code == 404
    events = client.get(base + "/events", headers=headers).json()["events"]
    assert events[-1]["agent"] == "Career Architect"
    assert events[-1]["status"] == "failed"
    assert not any(event["agent"] == "Assessment Architect" for event in events)


def test_startup_survives_atlas_failure(monkeypatch):
    def refused(*args, **kwargs):
        raise ConnectionRefusedError()
    monkeypatch.setattr("app.db.repository.MongoClient", refused)
    settings = Settings(_env_file=None, mongodb_uri="mongodb://example.invalid", storage_backend="auto")
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/health").status_code == 200
        status = client.get("/api/v1/status").json()
        assert status["mode"] == "memory" and not status["durable"]
        assert "ConnectionRefusedError" in status["reason"]
    settings = settings.model_copy(update={"storage_backend": "mongodb"})
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/v1/status").json()["mode"] == "unavailable"
        assert client.post("/api/v1/onboarding", json={"full_name": "Test", "target_role": "Engineer"}).status_code == 503


def test_repository_conflicts_and_copy_isolation():
    repo = MemoryRepository()
    repo.create({"_id": "one", "version": 0, "value": []})
    a, b = repo.get("one"), repo.get("one")
    a["value"].append("change")
    assert repo.get("one")["value"] == []
    repo.save(a, 0)
    with pytest.raises(Conflict):
        repo.save(b, 0)


def test_runtime_storage_failure_does_not_switch_to_fake_memory(client):
    base, headers = onboard(client)
    def failed_read(*args):
        raise StorageUnavailable()
    client.app.state.workflow.repository.get = failed_read
    response = client.get(base, headers=headers)
    assert response.status_code == 503
    assert "no data was replaced" in response.json()["detail"]


def test_no_provider_does_not_fabricate(monkeypatch):
    for name in ["NVIDIA_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY"]:
        monkeypatch.delenv(name, raising=False)
    generator = HostedGenerator(Settings(_env_file=None))
    with pytest.raises(InferenceUnavailable):
        generator.generate("test", {}, CareerContext)


def test_public_openapi_has_no_answer_key(client):
    schema = client.get("/openapi.json").json()
    assert "GeneratedQuestion" not in schema["components"]["schemas"]
    assert "correct_index" not in str(schema)
    assert "/api/v1/onboarding" in schema["paths"]
