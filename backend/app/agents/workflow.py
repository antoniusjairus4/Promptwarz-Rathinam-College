"""Small LangGraph workflows with genuine node execution events."""
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.models.workflow import AgentEvent, AssessmentDraft, CareerContext, RoadmapDraft, new_id, now
from app.services.inference import Generator


class State(TypedDict, total=False):
    learner: dict[str, Any]
    context: dict[str, Any]
    draft: Any
    provider: str
    model: str
    result: dict[str, Any]


def tracked(agent: str, events: list[dict], operation_id: str, action):
    def run(state):
        def event(status):
            events.append(AgentEvent(id=new_id(), agent=agent, status=status, timestamp=now(), operation_id=operation_id).model_dump())
        event("started")
        try:
            output = action(state)
        except Exception:
            event("failed")
            raise
        event("completed")
        return output
    return run


def assessment_graph(generator: Generator, events: list[dict], operation_id: str):
    graph = StateGraph(State)

    def detective(state):
        learner = state["learner"]
        return {"context": {"target_role": learner["target_role"], "experience_level": learner["experience_level"], "self_reported_skills": [s["skill"] for s in learner["skills"] if s["provenance"] == "self_reported"]}}

    def architect(state):
        context, _, _ = generator.generate(
            "Suggest a target role and 3-6 relevant skill categories for a short baseline assessment. "
            "Respect an explicit target role. Skills supplied by the learner are self-reports, not verified evidence. "
            "Your career suggestion is an inference, not a claim of job availability.", state["context"], CareerContext,
        )
        return {"context": context.model_dump()}

    def assessor(state):
        draft, provider, model = generator.generate(
            "Create exactly 3 multiple-choice questions appropriate for the learner's experience and suggested target role. "
            "Each has four distinct options and exactly one correct option. Cover skill categories from the context. "
            "Include a private correct_index and rationale. Do not ask for code execution.",
            {"career_context": state["context"], "experience_level": state["learner"]["experience_level"]}, AssessmentDraft,
        )
        return {"draft": draft, "provider": provider, "model": model}

    for name, action in [("Skill Detective", detective), ("Career Architect", architect), ("Assessment Architect", assessor)]:
        graph.add_node(name, tracked(name, events, operation_id, action))
    graph.add_edge(START, "Skill Detective")
    graph.add_edge("Skill Detective", "Career Architect")
    graph.add_edge("Career Architect", "Assessment Architect")
    graph.add_edge("Assessment Architect", END)
    return graph.compile()


def roadmap_graph(generator: Generator, events: list[dict], operation_id: str):
    graph = StateGraph(State)

    def curator(state):
        draft, provider, model = generator.generate(
            "Create a focused 2-4 step learning roadmap based on the actual quiz scores. "
            "Prioritize lower-scoring skills. Use skill names from skill_scores exactly. "
            "Include concrete original practice tasks, not invented courses, links or certifications. "
            "Scores are limited quiz evidence; do not assert professional competence or verified external evidence.",
            {"target_role": state["context"]["target_role"], "skill_scores": state["result"]["skill_scores"], "weekly_hours": state["learner"]["weekly_hours"]}, RoadmapDraft,
        )
        allowed = set(state["result"]["skill_scores"])
        if any(step.skill not in allowed for step in draft.steps):
            from app.services.inference import InferenceUnavailable
            raise InferenceUnavailable("Roadmap used unassessed skill categories")
        return {"draft": draft, "provider": provider, "model": model}

    def mentor(state):
        draft = state["draft"].model_copy(deep=True)
        draft.steps.sort(key=lambda step: state["result"]["skill_scores"][step.skill])
        return {"draft": draft}

    graph.add_node("Learning Curator", tracked("Learning Curator", events, operation_id, curator))
    graph.add_node("Adaptive Mentor", tracked("Adaptive Mentor", events, operation_id, mentor))
    graph.add_edge(START, "Learning Curator")
    graph.add_edge("Learning Curator", "Adaptive Mentor")
    graph.add_edge("Adaptive Mentor", END)
    return graph.compile()
