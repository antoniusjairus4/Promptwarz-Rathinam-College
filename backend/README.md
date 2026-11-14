# Maximus backend

FastAPI + Pydantic + LangGraph MVP for onboarding → AI assessment → adaptive roadmap. Hosted NVIDIA inference is primary, with configured Gemini and OpenAI fallbacks. No local LLMs, unsandboxed code execution, fake AI output, or fabricated learning resources are used.

From the repository root:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
cd backend
.venv/bin/python -m pytest -q
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Use one worker without reload for a memory-backed demo. Open `/docs` for interactive API calls. Health: `GET /api/health`. Frontend integration guide: `../contracts/FRONTEND_HANDOFF.md`. The frontend owner must wire those routes; existing frontend placeholders are not automatically connected.

Configuration loads `backend/.env` independently of the working directory. If missing, optionally create it from the sanitized `.env.example`. Private configuration is ignored by Git. `NVIDIA_API_KEY` and `NVIDIA_MODEL` are needed for NVIDIA inference; the health endpoint and startup require no credentials. Configure `FRONTEND_ORIGIN` for CORS. No hosted credentials are embedded in source files.

## Persistence and failure behavior

`STORAGE_BACKEND=auto` performs one bounded Atlas connection check at startup. With `ALLOW_MEMORY_FALLBACK=true`, startup uses a temporary in-memory repository if Atlas cannot connect; every response reports non-durable storage explicitly. Memory stores real user inputs and real generated results, not fixture data. Data is lost on restart. Use `STORAGE_BACKEND=memory` to select it explicitly. Use `STORAGE_BACKEND=mongodb` or disable fallback to require durable storage: health still starts, but workflow requests return 503 when storage is unavailable.

Both repositories use versioned compare-and-swap updates. Concurrent workflow changes return 409 rather than silently overwrite results. After a Mongo repository is selected, any later database failure returns 503; the service never replaces durable data with an empty memory store. No automatic migration of demo data between memory and Mongo is performed.

Opaque bearer session tokens protect individual learner resources; only token hashes are persisted. This MVP does not implement account registration, recovery, global abuse protection or production identity management. Assessment keys are stored privately and excluded from public responses and public OpenAPI schemas. Quiz scores are calculated from submitted answers, and all skill evidence includes provenance. Progress completion is explicitly learner-reported. No user code is executed.

Assessment and roadmap generation use small LangGraph workflows. Genuine node events are retained (latest 200). Bounded inference uses configured hosted providers, validates JSON with Pydantic and fails with 503 if no valid output is available. It never substitutes canned content. Real provider names/model IDs accompany generated artifacts.

## Integration diagnostics

Run explicitly; these commands contact hosted services without printing secrets:

```sh
# From backend/
.venv/bin/python diagnose_integrations.py --nvidia --mongodb
.venv/bin/python export_openapi.py
```

On November 14, 2026 the selected NVIDIA model was present in the accessible model list, a minimal completion returned `OK`, and a live onboarding/assessment/grading/roadmap/progress API flow succeeded using NVIDIA. The latter used explicit non-durable memory storage and completed in approximately 24 seconds. Test-created data was discarded with the test process.

Atlas diagnostics: the supplied `mongodb://` replica-set URI parses, names resolve for all three Atlas hosts, ports are 27017, and `ssl=true` enables TLS. TCP connection attempts to all three nodes were refused (`ConnectionRefusedError`, errno 111). PyMongo reports `ServerSelectionTimeoutError` with `AutoReconnect` connection-refused server errors. TLS negotiation and authentication were never reached; this does **not** establish an authentication failure.

Corrective action: confirm that the Atlas cluster is running, compare the URI with Atlas Connect → Drivers, allow the current client's public IP in Atlas Network Access, and check local/network outbound TCP 27017 rules. Atlas account access is needed to inspect its actual IP access list; it was not available to this check. Keep TLS certificate verification enabled. Changing credentials or disabling TLS cannot fix a refused TCP connection. See [Atlas connection troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/) and [Atlas client connections](https://www.mongodb.com/docs/atlas/driver-connection/).

The current repository is the only working location for future Maximus changes. The former standalone setup is retained only as an archive. Tests use deterministic, explicitly test-only fixtures; the opt-in integration checks use real configured services. Dependencies are pinned in requirements.txt; known LangSmith dependency deprecation warnings do not fail tests.
