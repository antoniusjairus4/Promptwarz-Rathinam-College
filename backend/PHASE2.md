# Phase 2: intelligence and reliability

## Changes

NVIDIA remains primary, followed by configured Gemini and OpenAI providers. Provider attempts and SDK retries are bounded: one attempt per configured provider, default 30 seconds per network operation, and a default 120-second AI deadline shared across agents in one HTTP request. Async SDK requests are cancelled at their wall-clock limit. Authentication, rate limits, invalid schema output and timeouts retain safe provider/category/status diagnostics; prompts, keys, response text and driver exception strings are not logged. Diagnostics are context-local instead of shared between concurrent requests.

Career Architect blueprints accept arbitrary goals and personalize from experience, self-reports, interests, source observations and time availability. Blueprint skill names are distinct and an explicit goal remains authoritative. Assessment preparation reuses a real existing blueprint instead of another model call. Retakes include recent question prompts and results; normalized exact duplicates and unrelated skill categories are rejected without clearing the previous valid assessment/result/roadmap. There is no guarantee of detecting semantic paraphrases or independently validating every AI-written question's factual correctness.

Skill Detective/profile and mentor contexts explicitly separate declarations, GitHub observations, quiz knowledge and learner-reported practice. Stale profile analyses are cleared after quiz changes. Roadmap ordering puts measured quiz gaps before unassessed skills and quiz strengths. No score is invented for an unassessed skill; its priority is medium. Refresh/retake prompts retain completed practice; exact repetitions of completed tasks are rejected while existing progress remains intact. Mentor conversation history, genuine agent events and safe source provenance remain part of the learner record.

Job overlap uses only declared/quiz-observed skills, not blueprint aspirations. Quiz-supported terms use the current quiz only and do not imply certification or employability. Source job text and original application URLs remain authoritative. Learning recommendations still select the active roadmap skill when no explicit query is supplied. Optional providers remain isolated, bounded, deduplicated and honestly labeled.

MongoDB continues to persist the complete session document: learner, blueprint, profile, GitHub observations, private assessment, actual results/history, roadmap, practice progress, mentor messages and events. Pools are bounded to 10 connections with a bounded wait queue. Versioned updates preserve conflict detection. Runtime database failures return 503 and never replace existing data with an empty memory store. Explicit temporary fallback now states that it is process-local, lost on restart and unshared between serverless instances.

## Actual verification on November 14, 2026

- Latest main was pulled before implementation and checked again with a fast-forward pull before delivery; both checks reported up to date.
- **37 pytest tests pass** with 13 existing upstream LangSmith deprecation warnings. Coverage includes both onboarding tracks, blueprint reuse, source evidence, deterministic scoring/private-key isolation, retakes, adaptive priority, completed practice, contextual mentor, resource/job matching, duplicate rejection, time-budget exhaustion/cancellation, safe provider failures/recovery, and failed storage reads/writes.
- A BSON-round-tripping **test driver** exercises the real MongoRepository across two app instances and restores the complete public session, including source observations and completed progress. Injected network failure gives 503; recovery restores the same data. This tests repository behavior, **not real Atlas durability**.
- NVIDIA model listing contains the selected `nvidia/nemotron-3.5-lightning-30b-a3b`; minimal inference passes. Live HTTP profile, blueprint, assessment, roadmap and mentor calls also use actual hosted inference.
- The previous configured `gemini-2.5-flash` appeared in model listing but inference returned HTTP 404. `gemini-3.5-flash` passed structured inference and is now the private local setting and sanitized-template fallback. One standalone forced-primary-failure probe at a 25-second fallback limit timed out; a later full HTTP mentor request successfully used Gemini under the 30-second limit. Provider availability and response latency remain variable. OpenAI is unconfigured.
- An early live assessment attempt rejected NVIDIA's extra schema metadata and the old Gemini model returned 404: HTTP 503, no fabricated assessment. After the configuration and prompt/structured-output improvements, **both full live journeys passed without automatic client retries**: career-first **113.2 seconds**, skills-first **104.1 seconds** across multiple requests. Scores were actual grading of option-zero smoke submissions, not proficiency claims.
- Those live journeys covered source inspection (one public repository, six findings), profile/blueprint, MCQ/grading, roadmap/progress, eight real curated/YouTube resources, 16 real jobs from Adzuna, mentor context and session restoration. GitHub, YouTube and Adzuna worked; Himalayas and Arbeitnow reported errors independently; Remotive was explicitly disabled. These are provider observations from that run, not ongoing guarantees.
- Atlas now uses a `mongodb+srv://` URI with TLS. DNS resolves; TCP 27017 is refused on all three resolved hosts. PyMongo reports **ServerSelectionTimeoutError**; authentication is not reached. Verify current Atlas cluster status, the actual Atlas Connect URI, network access rules and outbound TCP 27017 from the deployment network. Keep certificate verification enabled. The live journeys therefore used explicitly labeled temporary storage; **no successful Atlas persistence is claimed**.
- `pip check` passes. The read-only-source/no-credential serverless simulation starts FastAPI and all provider SDKs, returns health/status, and exposes all **28 operations**. OpenAPI was regenerated with no structural change. No dependencies were added.
- Vercel configuration remains Python 3.14, backend root, one FastAPI function, 300-second duration. No Vercel cloud build, deployed cold-start benchmark or live public URL has been verified. Account/project linkage and working remote Atlas connectivity remain deployment blockers. See [VERCEL.md](VERCEL.md).

## Reproduce

```sh
cd backend
.venv/bin/python -m pytest -q
.venv/bin/python verify_serverless.py
.venv/bin/python -m pip check
.venv/bin/python export_openapi.py
.venv/bin/python diagnose_integrations.py --nvidia --mongodb
# Against an already started server; makes real hosted calls and creates test sessions:
.venv/bin/python verify_journey.py --base-url http://127.0.0.1:8000 --track both
```

The isolated live checks used a temporary server on port 8011 with `STORAGE_BACKEND=memory`, `LLM_TIMEOUT_SECONDS=30`, `AI_REQUEST_BUDGET_SECONDS=120`, and `REMOTIVE_ENABLED=false`. Original private credential values and the pre-existing development server were preserved. Restart an existing process to pick up new private configuration. No automatic migration of memory sessions is performed.

Frontend coordination: [phase 2 handoff](../contracts/PHASE2_HANDOFF.md). Public endpoint/model shapes remain unchanged; no frontend files are part of this delivery.
