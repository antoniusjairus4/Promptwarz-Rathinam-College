"""Opt-in live verification; creates a demo session and uses real configured services.

Run from repository root: backend/.venv/bin/python backend/verify_journey.py
No keys, session tokens, question keys or private learner data are printed.
"""
import argparse
import time
import httpx


def verify(base_url, track="career_first"):
    start = time.monotonic()
    with httpx.Client(base_url=base_url, timeout=180) as client:
        def call(method, path, **kwargs):
            response = client.request(method, path, **kwargs)
            print(f"{method} {path.split('?')[0]}: HTTP {response.status_code}", flush=True)
            if response.status_code == 503:
                print("AI/storage unavailable; no automatic client retry.", flush=True)
                print("Safe provider diagnostics:", response.json().get("provider_failures", []), flush=True)
            if not response.is_success:
                # Do not dump request/response data or SDK exceptions.
                raise RuntimeError(f"Live verification failed: HTTP {response.status_code}")
            return response.json()
        call("GET", "/api/health")
        preflight = client.options("/api/sessions", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
        assert preflight.headers.get("access-control-allow-origin") == "http://localhost:5173"
        created = call("POST", "/api/sessions", json={"full_name": "Integration verification", "track": track, "target_role": "Python Backend Engineer" if track == "career_first" else None, "skills": ["Python"], "interests": ["APIs"], "weekly_hours": 5})
        sid = created["session_id"]
        client.headers["Authorization"] = "Bearer " + created["session_token"]
        action = {"session_id": sid}
        print("Storage:", created["storage"]["mode"], "durable:", created["storage"]["durable"], flush=True)
        github = call("POST", "/api/github/analyze", json=action | {"target": "https://github.com/psf/requests"})
        print("GitHub repositories:", len(github["repositories"]), "source findings:", sum(len(r["findings"]) for r in github["repositories"]), flush=True)
        if not github["repositories"]:
            print("GitHub unavailable states:", [(p["status"], p.get("detail")) for p in github["providers"]], flush=True)
        profile = call("POST", "/api/profile/analyze", json=action)
        print("Profile inference provider:", profile["profile"]["provider"], flush=True)
        blueprint = call("POST", "/api/career/blueprint", json=action)
        print("Blueprint inference provider:", blueprint["blueprint"]["provider"], "skill categories:", len(blueprint["blueprint"]["skills"]), flush=True)
        assessment = call("POST", "/api/assessment/generate", json=action)["assessment"]
        assert all("correct_index" not in question and "rationale" not in question for question in assessment["questions"])
        result = call("POST", "/api/assessment/evaluate", json=action | {"assessment_id": assessment["id"], "answers": {q["id"]: 0 for q in assessment["questions"]}})["result"]
        assert len(result["explanations"]) == len(assessment["questions"])
        print("Actual quiz score:", result["score"], "(fixed option-zero smoke-test submission)", flush=True)
        roadmap = call("POST", "/api/roadmap/generate", json=action)["roadmap"]
        updated = call("POST", "/api/progress/update", json=action | {"step_id": roadmap["steps"][0]["id"], "completed": True})["roadmap"]
        assert updated["steps"][0]["status"] == "completed"
        resources = call("GET", "/api/resources/search", params={"session_id": sid, "q": "Python", "include_youtube": True})
        print("Learning resources:", len(resources["resources"]), "provider states:", [(p["provider"], p["status"]) for p in resources["providers"]], flush=True)
        jobs = call("GET", "/api/jobs/search", params={"session_id": sid, "q": "python"})
        print("Real jobs:", jobs["returned_count"], "provider states:", [(p["provider"], p["status"]) for p in jobs["providers"]], flush=True)
        mentor = call("POST", "/api/mentor/chat", json=action | {"message": "Based on my quiz gaps and the roadmap step I just completed, what should I practice next?"})
        assert mentor["message"]["reply"] and mentor["message"]["next_actions"]
        print("Contextual mentor inference provider:", mentor["message"]["provider"], flush=True)
        session = call("GET", "/api/sessions/" + sid)
        assert "token_hash" not in session and "keys" not in session
        assert session["roadmap"]["steps"][0]["status"] == "completed"
        print("Genuine agent events:", len(session["events"]), flush=True)
        print("LIVE JOURNEY PASS; track:", track, "duration seconds:", round(time.monotonic() - start, 1), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--track", choices=["career_first", "skills_first", "both"], default="career_first")
    args = parser.parse_args()
    for track in (["career_first", "skills_first"] if args.track == "both" else [args.track]):
        verify(args.base_url, track)
