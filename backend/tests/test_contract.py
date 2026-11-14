"""Documented synthetic responses must remain valid for every real API operation."""
import json
from pathlib import Path

from fastapi.routing import APIRoute
from app.core.config import Settings
from app.main import create_app
from app.api import workflow, integrations, journey


def test_all_documented_operations_match_actual_models_and_export():
    contracts = Path(__file__).resolve().parents[2] / "contracts"
    app = create_app(Settings(_env_file=None))
    routes = {
        (method, route.path): route
        for route in [*app.routes, *workflow.router.routes, *integrations.router.routes, *journey.router.routes]
        if isinstance(route, APIRoute) and route.path.startswith("/api/")
        for method in route.methods
    }
    examples = json.loads((contracts / "api_examples.json").read_text())["operations"]
    assert len(routes) == 28
    assert {(method.upper(), path) for path, methods in app.openapi()["paths"].items() for method in methods} == set(routes)
    assert {(item["method"], item["route"]) for item in examples} == set(routes)
    for item in examples:
        model = routes[item["method"], item["route"]].response_model
        model.model_validate(item["response_json"])
    assert app.openapi() == json.loads((contracts / "openapi.json").read_text())
