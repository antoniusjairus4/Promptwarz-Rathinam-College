# Maximus on Vercel Hobby

## Feasibility and deployment

The existing FastAPI service can run as a single Vercel Python function. Use a **separate backend project** with Root Directory **`backend`**, Framework **FastAPI**, Python **3.14**, and Fluid compute enabled. Leave the build command at its framework default. `pyproject.toml` explicitly selects `index:app`; `index.py` exports the actual application and `vercel.json` configures that entrypoint for 300 seconds. Dependencies remain pinned in `requirements.txt`. No catch-all rewrite or `/api` prefix stripping is needed: all 28 existing API operations, `/docs`, and `/openapi.json` retain their paths. The frontend project and files are untouched.

Import this Git repository in Vercel under your personal **Hobby** account and select those settings. Hobby is free, intended for personal noncommercial projects, and has usage caps. Do not select a paid plan or paid add-ons. An account/login is still required. See [Hobby](https://vercel.com/docs/plans/hobby), [pricing](https://vercel.com/pricing), and the [FastAPI deployment guide](https://vercel.com/docs/frameworks/backend/fastapi).

Add credentials as Vercel project environment variables for the intended deployment environments. Never upload the private local `.env`. The deployment entrypoint ignores dotenv files, and upload/bundle exclusions omit private environment files, virtualenvs and caches. The sanitized `.env.example` lists integration configuration names; credentials stay server-side.

Required for a reliable full journey:

- `MONGODB_URI`, `MONGODB_DATABASE=maximus`, `STORAGE_BACKEND=mongodb`, `ALLOW_MEMORY_FALLBACK=false`.
- `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `PRIMARY_LLM_PROVIDER=nvidia`; configure `GEMINI_API_KEY`/`GEMINI_MODEL` and `OPENAI_API_KEY`/`OPENAI_MODEL` for existing fallbacks.
- `FRONTEND_ORIGIN=https://your-frontend.vercel.app` (comma-separated exact origins supported).
- `EXTERNAL_CACHE_DIR=/tmp/maximus-cache` (deployment default).

Existing `GITHUB_TOKEN`, `YOUTUBE_API_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY` and provider enable flags remain supported. Missing optional providers fail independently. No business service, inference implementation, endpoint or request/response model was changed.

Once deployed, verify the **actual URL**, not just the Vercel build status:

```sh
curl --fail https://YOUR-BACKEND.vercel.app/api/health
curl --fail https://YOUR-BACKEND.vercel.app/api/v1/status
backend/.venv/bin/python backend/verify_journey.py --base-url https://YOUR-BACKEND.vercel.app
```

The status endpoint must report `mode=mongodb` and `durable=true` before relying on session persistence. The journey command creates real test data and consumes hosted inference/API quota. Configure the frontend's backend URL through its owner, Bot A.

## Limits and blockers

The standard Python bundle limit is 500 MB, Hobby memory is 2 GB, request/response bodies are limited to 4.5 MB, and Hobby Fluid compute allows **300 seconds per request**. Python 3.14 is supported. Sources: [function limits](https://vercel.com/docs/functions/limitations), [Python versions](https://vercel.com/docs/functions/runtimes/python/python-version).

All 66 pinned requirements have downloadable binary wheels for the local Linux/Python 3.14 environment. Their combined uncompressed contents measured **172.9 MiB**; the existing installed site-packages directory occupies approximately **277 MB** including bytecode. This suggests sufficient headroom, but is not a measurement of Vercel's final function artifact. PyMuPDF remains included to preserve the requested dependency set. A Vercel build must confirm its native-wheel compatibility and final bundle size.

**AI budget:** `LLM_TIMEOUT_SECONDS=30` is now the default per-provider wall-clock limit (configuration permits 1–60 seconds). `AI_REQUEST_BUDGET_SECONDS=120` is shared across sequential agents in one HTTP request and is capped at 240 seconds. Every configured provider is attempted once, with SDK retries disabled. Each network call is asynchronously cancelled at the smaller of its provider limit and remaining request budget. An existing blueprint avoids the assessment's extra career-context generation. Budget exhaustion returns the existing structured 503 rather than fabricated output; database and response serialization overhead remain outside the model-call cancellation scope. These changes leave headroom under Hobby's 300-second limit. Slow upstream providers can still make a request fail; exceeding five minutes would require a separate asynchronous job workflow or another hosting service.

**Storage:** Atlas connections from this development environment have been refused before authentication. Vercel uses a different network, so connectivity there remains unverified. Atlas must accept connections from the deployed function. The deployment defaults to MongoDB without memory fallback: health stays available, while storage-dependent requests return 503 if Atlas cannot connect. Explicit `STORAGE_BACKEND=memory` is possible for a disposable single-instance smoke test, but sessions can disappear or return 404 across cold starts/scaled instances and are unsuitable for a reliable multi-request demo. No migration or silent data replacement is performed.

**Caching/provider terms:** `/tmp` and memory are ephemeral and not shared across function instances. Remotive defaults to disabled in this entrypoint because six-hour per-instance feed caches cannot enforce its provider-wide fetch guidance under scaling. Its endpoint integration remains available via explicit `REMOTIVE_ENABLED=true`, but enable it only after coordinating a durable shared feed cache/fetch schedule. Other provider caches and rate limits are also per-instance; monitor upstream quotas. No shared cache service was introduced.

**Cold starts:** model SDKs and LangGraph add import work, and the bounded startup Mongo ping adds latency. Local fresh-process simulations measured 0.93 seconds of imports in the existing environment and 2.69 seconds in a fresh wheel installation; these are **not** Vercel cold-start benchmarks. Actual cold/warm latency, native runtime compatibility, quotas and timeouts require a live deployment test.

## Local verification

```sh
cd backend
.venv/bin/python -m pytest -q
.venv/bin/python verify_serverless.py
.venv/bin/python -m pip check
```

The smoke script copies only application source and the entrypoint to a temporary read-only directory, strips credentials from the child environment, imports provider SDKs, runs FastAPI lifespan, and checks health/status/OpenAPI. It simulates key serverless constraints; it does not use Vercel's deployed runtime. Original private local configuration is preserved.

Verification performed in phase 2: 37 tests pass, all 28 API operations match the original OpenAPI schema, read-only/no-credential ASGI startup passes, and `pip check` passes. The suite now covers wall-clock cancellation and a request budget shared across HTTP agents. No live Vercel URL has been deployed or verified by this change. Vercel account authentication/project linkage is required for cloud build/deployment verification.
