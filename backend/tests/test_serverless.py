"""Exercise the deployment boundary without hosted credentials or .env files."""
import importlib
import json
from pathlib import Path
import tomllib

from fastapi.testclient import TestClient

from app.main import create_app
from app.core.config import Settings


def test_serverless_entrypoint_preserves_routes_and_starts(monkeypatch, tmp_path):
    import sys
    monkeypatch.syspath_prepend(str(Path(__file__).resolve().parents[1]))
    for name in Settings.model_fields:
        monkeypatch.delenv(name.upper(), raising=False)
    monkeypatch.chdir(tmp_path)
    sys.modules.pop("index", None)
    entry = importlib.import_module("index")
    settings = entry.deployment_settings()
    assert settings.mongodb_uri.get_secret_value() == ""
    assert settings.nvidia_api_key.get_secret_value() == ""
    assert settings.storage_backend == "mongodb"
    assert not settings.allow_memory_fallback
    assert not settings.remotive_enabled
    assert str(settings.external_cache_dir).startswith("/tmp/")
    baseline = create_app(Settings(_env_file=None))
    assert entry.app.openapi() == baseline.openapi()
    with TestClient(entry.app) as client:
        assert client.get("/api/health").json() == {"status": "ok"}
        status = client.get("/api/v1/status")
        assert status.status_code == 200
        assert status.json()["mode"] == "unavailable"


def test_serverless_environment_overrides(monkeypatch):
    import index
    monkeypatch.setenv("STORAGE_BACKEND", "memory")
    monkeypatch.setenv("REMOTIVE_ENABLED", "true")
    monkeypatch.setenv("EXTERNAL_CACHE_DIR", "/tmp/custom-cache")
    settings = index.deployment_settings()
    assert settings.storage_backend == "memory"
    assert settings.remotive_enabled
    assert settings.external_cache_dir == Path("/tmp/custom-cache")


def test_vercel_config_targets_entrypoint():
    root = Path(__file__).resolve().parents[1]
    config = json.loads((root / "vercel.json").read_text())
    assert tomllib.loads((root / "pyproject.toml").read_text())["tool"]["vercel"]["entrypoint"] == "index:app"
    assert config["functions"]["index.py"]["maxDuration"] == 300
    assert ".env" in config["functions"]["index.py"]["excludeFiles"]
