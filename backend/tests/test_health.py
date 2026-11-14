from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_health_without_credentials(monkeypatch):
    for key in ("NVIDIA_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "MONGODB_URI"):
        monkeypatch.delenv(key, raising=False)
    with TestClient(create_app(Settings(_env_file=None))) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_configured_cors():
    settings = Settings(_env_file=None, frontend_origin="http://localhost:5173,http://localhost:3000")
    with TestClient(create_app(settings)) as client:
        response = client.options("/api/health", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        })
        rejected = client.options("/api/health", headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "GET",
        })
        deployed = client.options("/api/sessions", headers={
            "Origin": "https://maximus-ch-indol.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-origin" not in rejected.headers
    assert deployed.status_code == 200
    assert deployed.headers["access-control-allow-origin"] == "https://maximus-ch-indol.vercel.app"
    assert deployed.headers["access-control-allow-credentials"] == "true"
