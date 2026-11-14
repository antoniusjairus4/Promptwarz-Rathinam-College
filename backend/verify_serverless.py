"""Local serverless simulation, not proof of a successful Vercel deployment."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def main() -> None:
    root = Path(__file__).resolve().parent
    with tempfile.TemporaryDirectory(prefix="maximus-serverless-") as directory:
        bundle = Path(directory) / "bundle"
        bundle.mkdir()
        shutil.copytree(root / "app", bundle / "app", ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        shutil.copyfile(root / "index.py", bundle / "index.py")
        files = list(bundle.rglob("*"))
        for path in files:
            path.chmod(0o555 if path.is_dir() else 0o444)
        bundle.chmod(0o555)
        try:
            subprocess.run(
                [sys.executable, "-c", '''
import time
started = time.perf_counter()
import index
import fastapi, langgraph, openai, google.genai, pymongo, httpx, pymupdf
from fastapi.testclient import TestClient
import_seconds = time.perf_counter() - started
with TestClient(index.app) as client:
    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/api/v1/status").json()["mode"] == "unavailable"
    schema = client.get("/openapi.json").json()
    operations = sum(method in {"get", "post", "patch", "put", "delete"} for path in schema["paths"].values() for method in path)
print(f"Read-only source, no credentials: PASS; {operations} API operations")
print(f"Fresh-process local imports: {import_seconds:.2f}s (not a Vercel cold-start measurement)")
'''],
                cwd=bundle,
                env={"PATH": os.defpath, "PYTHONDONTWRITEBYTECODE": "1", "PYTHONPATH": str(bundle)},
                check=True,
                timeout=30,
            )
        finally:
            bundle.chmod(0o755)
            for path in files:
                path.chmod(0o755 if path.is_dir() else 0o644)


if __name__ == "__main__":
    main()
