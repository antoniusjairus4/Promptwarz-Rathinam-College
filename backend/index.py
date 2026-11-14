"""Vercel ASGI entrypoint; local development keeps using app.main:app."""
from pathlib import Path

from app.core.config import Settings
from app.main import create_app


def deployment_settings() -> Settings:
    # Hosted secrets come only from environment variables, never a bundled .env.
    settings = Settings(_env_file=None)
    defaults = {
        "external_cache_dir": Path("/tmp/maximus-cache"),
        "storage_backend": "mongodb",
        "allow_memory_fallback": False,
        # Per-instance /tmp cannot enforce Remotive's global daily fetch guidance.
        "remotive_enabled": False,
    }
    return settings.model_copy(update={
        name: value for name, value in defaults.items()
        if name not in settings.model_fields_set
    })


app = create_app(deployment_settings())
