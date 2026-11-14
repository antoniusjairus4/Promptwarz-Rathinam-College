"""Opt-in real Atlas restart check. Leaves one labeled verification learner; deletes no DB data."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile

from fastapi.testclient import TestClient
from app.core.config import Settings
from app.main import create_app


def verify(phase, state_path):
    settings = Settings(storage_backend="mongodb", allow_memory_fallback=False)
    with TestClient(create_app(settings)) as client:
        status = client.get("/api/v1/status").json()
        if not status["durable"]:
            raise RuntimeError("Durable storage unavailable; restart verification cannot pass")
        if phase == "create":
            result = client.post("/api/sessions", json={"full_name": "Atlas restart verification", "track": "skills_first", "skills": ["Python"], "interests": ["APIs"]})
            result.raise_for_status()
            data = result.json()
            state_path.write_text(json.dumps({"session_id": data["session_id"], "session_token": data["session_token"], "learner": data["session"]["learner"]}))
            state_path.chmod(0o600)
            print("PASS: genuine MongoDB profile created; durable=true", flush=True)
        else:
            state = json.loads(state_path.read_text())
            result = client.get("/api/sessions/" + state["session_id"], headers={"Authorization": "Bearer " + state["session_token"]})
            result.raise_for_status()
            assert result.json()["learner"] == state["learner"]
            assert result.json()["storage"]["durable"] is True
            print("PASS: identical learner restored in a fresh Python process; durable=true", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", choices=["create", "restore"])
    parser.add_argument("--state")
    args = parser.parse_args()
    if args.phase:
        verify(args.phase, Path(args.state))
    else:
        # Separate processes have separate app startup, pools and memory.
        with tempfile.TemporaryDirectory(prefix="maximus-persistence-") as directory:
            state_path = str(Path(directory) / "private-session.json")
            for phase in ("create", "restore"):
                subprocess.run([sys.executable, __file__, "--phase", phase, "--state", state_path], check=True)
