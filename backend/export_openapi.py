"""Run from backend: .venv/bin/python export_openapi.py"""
import json
from pathlib import Path

from app.core.config import Settings
from app.main import create_app

if __name__ == "__main__":
    destination = Path(__file__).resolve().parent.parent / "contracts" / "openapi.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    schema = create_app(Settings(_env_file=None)).openapi()
    destination.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {destination}")
