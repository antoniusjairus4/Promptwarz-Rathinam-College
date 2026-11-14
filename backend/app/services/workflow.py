"""Ownership-checked workflow orchestration and deterministic quiz scoring."""
import hashlib
import hmac
import secrets

from fastapi import HTTPException

from app.agents.workflow import assessment_graph, roadmap_graph, tracked
from app.db.repository import Repository
from app.models.workflow import (
    Assessment, AssessmentResult, Learner, OnboardingRequest, PublicQuestion,
    Roadmap, RoadmapStep, SkillEvidence, Submission, new_id, now,
)
from app.services.inference import Generator, InferenceUnavailable


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class WorkflowService:
    def __init__(self, repository: Repository, generator: Generator):
        self.repository = repository
        self.generator = generator

    def onboard(self, request: OnboardingRequest):
        learner = Learner(
            id=new_id(), full_name=request.full_name, track=request.track,
            target_role=request.target_role, experience_level=request.experience_level,
            weekly_hours=request.weekly_hours, created_at=now(),
            skills=[SkillEvidence(skill=skill, provenance="self_reported", note="Declared by learner; not independently verified") for skill in dict.fromkeys(request.skills)],
        )
        token = secrets.token_urlsafe(32)
        self.repository.create({"_id": learner.id, "learner": learner.model_dump(), "token_hash": digest(token), "version": 0, "events": [], "assessment": None, "result": None, "roadmap": None, "assessment_count": 0})
        return learner, token

    def document(self, learner_id: str, token: str):
        document = self.repository.get(learner_id)
        if not document or not hmac.compare_digest(document["token_hash"], digest(token)):
            raise HTTPException(404, "Learner not found or session invalid")
        return document

    def _save(self, document):
        document["events"] = document["events"][-200:]
        self.repository.save(document, document["version"])

    def assessment(self, document):
        if document["assessment"] and not document["result"]:
            return document["assessment"]["public"]
        if document["assessment_count"] >= 10:
            raise HTTPException(429, "Demo limit: 10 assessments per learner")
        operation_id = new_id()
        try:
            state = assessment_graph(self.generator, document["events"], operation_id).invoke({"learner": document["learner"]})
        except InferenceUnavailable:
            self._save(document)
            raise
        questions = []
        keys = {}
        for generated in state["draft"].questions:
            question_id = new_id()
            questions.append(PublicQuestion(id=question_id, **generated.model_dump(exclude={"correct_index", "rationale"})))
            keys[question_id] = generated.correct_index
        public = Assessment(id=operation_id, learner_id=document["_id"], target_role=state["context"]["target_role"], target_role_source="learner_selected" if document["learner"]["target_role"] else "ai_suggested", questions=questions, provider=state["provider"], model=state["model"], created_at=now()).model_dump()
        document["assessment"] = {"public": public, "keys": keys}
        document["assessment_count"] += 1
        document["result"] = None
        document["roadmap"] = None
        self._save(document)
        return public

    def submit(self, document, assessment_id: str, submission: Submission):
        assessment = document["assessment"]
        if not assessment or assessment["public"]["id"] != assessment_id:
            raise HTTPException(404, "Current assessment not found")
        if document["result"]:
            raise HTTPException(409, "Assessment already submitted; create a new assessment to retake")
        keys = assessment["keys"]
        if set(submission.answers) != set(keys) or any(type(v) is not int or v not in range(4) for v in submission.answers.values()):
            raise HTTPException(422, "Provide exactly one zero-based option index (0-3) for every question")
        counts = {}
        correct = 0
        for question in assessment["public"]["questions"]:
            passed = int(submission.answers[question["id"]] == keys[question["id"]])
            correct += passed
            pair = counts.setdefault(question["skill"], [0, 0])
            pair[0] += passed
            pair[1] += 1
        scores = {skill: round(100 * hits / total, 2) for skill, (hits, total) in counts.items()}
        result = AssessmentResult(assessment_id=assessment_id, score=round(100 * correct / len(keys), 2), correct=correct, total=len(keys), skill_scores=scores, submitted_at=now())
        document["result"] = result.model_dump()
        document["assessment"]["public"]["submitted"] = True
        document["learner"]["skills"] = [s for s in document["learner"]["skills"] if s["provenance"] == "self_reported"] + [SkillEvidence(skill=skill, provenance="assessment_observed", score=score, assessment_id=assessment_id, note="Observed on this AI-generated quiz only; not independent verification").model_dump() for skill, score in scores.items()]
        self._save(document)
        return result

    def roadmap(self, document):
        if document["roadmap"]:
            return document["roadmap"]
        if not document["result"]:
            raise HTTPException(409, "Submit the current assessment before generating a roadmap")
        operation_id = new_id()
        try:
            state = roadmap_graph(self.generator, document["events"], operation_id).invoke({"learner": document["learner"], "context": {"target_role": document["assessment"]["public"]["target_role"]}, "result": document["result"]})
        except InferenceUnavailable:
            self._save(document)
            raise
        steps = []
        for step in state["draft"].steps:
            steps.append(RoadmapStep(**step.model_dump(), id=new_id(), status="locked" if steps else "available", prerequisites=[steps[-1].id] if steps else []))
        roadmap = Roadmap(id=operation_id, learner_id=document["_id"], assessment_id=document["result"]["assessment_id"], target_role=document["assessment"]["public"]["target_role"], summary=state["draft"].summary, steps=steps, provider=state["provider"], model=state["model"], created_at=now())
        document["roadmap"] = roadmap.model_dump()
        self._save(document)
        return roadmap

    def complete_step(self, document, step_id):
        roadmap = document["roadmap"]
        if not roadmap:
            raise HTTPException(404, "Roadmap not found")
        step = next((s for s in roadmap["steps"] if s["id"] == step_id), None)
        if step is None:
            raise HTTPException(404, "Step not found")
        if step["status"] == "locked":
            raise HTTPException(409, "Complete prerequisites first")
        if step["status"] == "completed":
            return roadmap

        def adapt(_):
            step["status"] = "completed"
            completed = {s["id"] for s in roadmap["steps"] if s["status"] == "completed"}
            for item in roadmap["steps"]:
                if item["status"] == "locked" and set(item["prerequisites"]) <= completed:
                    item["status"] = "available"
            roadmap["revision"] += 1
            return {}

        tracked("Adaptive Mentor", document["events"], new_id(), adapt)({})
        self._save(document)
        return roadmap
