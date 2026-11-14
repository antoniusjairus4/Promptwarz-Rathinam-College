# Maximus complete backend handoff — Bot A

Base URL: **http://localhost:8000**. CORS allows **http://localhost:5173** by default. All fields are snake_case. The requested `/api/...` journey endpoints are implemented; existing `/api/v1/...` clients remain supported against the same repository. No frontend files were modified.

**Exact schemas:** [openapi.json](openapi.json). **Complete JSON request/response examples for all 28 implemented operations:** [api_examples.json](api_examples.json). Those examples are explicitly synthetic documentation fixtures, not claims about live AI/provider output. Tokens are redacted. Use actual IDs and the token returned by your own session, never the example UUIDs. Provider integration rules are in [BOT_A_INTEGRATIONS.md](BOT_A_INTEGRATIONS.md).

## Integration order and session lifecycle

1. `POST /api/sessions`. Career-first requires any nonempty `target_role`; there is no career whitelist. Skills-first requires at least one skill **or interest**, and target_role may be omitted. Store returned `session_id` and private `session_token` for the browser session. The server stores only the token hash. Do not place the token in URLs, logs or analytics.
2. Add `Authorization: Bearer <session_token>` to every session mutation and session read. Supply `session_id` in POST bodies. `GET /api/sessions/{session_id}` restores the complete public state: learner, blueprint, GitHub observations, current assessment, result, roadmap, mentor messages, events and storage status. It never includes token hashes, answer indices or private rationale records.
3. Optionally inspect GitHub with `/api/github/analyze`; analyze the profile with `/api/profile/analyze`. Inspect before generating an assessment so questions can use source evidence. GitHub is optional; a failure does not erase earlier findings or block self-reported-skill onboarding.
4. Generate `/api/career/blueprint`. Career Architect makes an actual model call and creates skill categories for the declared goal, or infers a direction from skills/interests. Inferred directions are not jobs or verified learner skills. Blueprint generation is idempotent once a blueprint exists; start a new session to change the goal.
5. Generate `/api/assessment/generate`; render questions/options, collect zero-based option indices, then submit `/api/assessment/evaluate`. Require one answer for every returned question ID. Explanations are available **only after submission**. Correct indices/private keys are never sent. Strengths/gaps come from the actual score: ≥70% passes a skill's current quiz check. This is limited MCQ evidence, not professional accreditation, authored-code verification, or execution of learner code.
6. Generate `/api/roadmap/generate`. Milestones are created by the LLM from the actual assessment, blueprint and retained progress; lower-scoring or unassessed skills are prioritized. Render difficulty, estimated_hours, objective, practice_task, prerequisites, gap_priority and status. `/api/progress/update` marks an available step completed and unlocks its successor. Completion is explicitly learner-reported. A new assessment invalidates the current result and roadmap; a new roadmap uses the new scores and retained completed-practice context. `refresh:true` regenerates a plan after changed progress; this increments revision and does not pretend a newly generated exercise was already completed.
7. Call `/api/resources/search` with session_id (and optionally step_id) to search for the actual active roadmap skill. Public calls without session context remain available. Original official course links and real YouTube search results only.
8. Call `/api/jobs/search` with session_id for transparent keyword matching to actual source text. Matches distinguish overlap terms from terms supported by a passed current quiz check. No hiring probabilities, fabricated job requirements or invented salaries are returned. Always render original application links and all source attributions.
9. `/api/mentor/chat` uses the actual goal, GitHub source observations, quiz results/gaps, roadmap, completed practice and recent conversation. It calls the configured hosted model and persists the reply; it never falls back to canned advice. Mentor input excludes all private answer keys and token hashes. It is instructed not to solve active assessments.

Memory sessions disappear on backend restart; Mongo sessions survive while their database is available. Every response includes `storage`, or a full session containing it. Show a visible temporary-session warning whenever `storage.durable` is false. Memory mode is not mock data: it stores genuine user input and genuine model/provider output. Existing port-8000 development server uses reload, so backend source edits will discard memory sessions. For a stable demo use one worker without `--reload`. Session tokens have no recovery/expiry flow in this MVP; losing the token requires a new session.

## Core endpoint JSON examples

Bodies below are concrete schema examples; replace placeholders with returned IDs. Full response payloads for each endpoint are in `api_examples.json`.

| Endpoint | Request JSON | Response JSON shape |
|---|---|---|
| `GET /api/health` | No body | `{"status":"ok"}` |
| `POST /api/sessions` | `{"full_name":"Learner","track":"career_first","target_role":"Wildlife Conservation Planner","skills":["Python"],"interests":["Conservation"],"weekly_hours":5}` | `{"session_id":"UUID","session_token":"PRIVATE_TOKEN","session":{},"storage":{"mode":"memory","durable":false,"reason":"..."}}` |
| `GET /api/sessions/{session_id}` | No body; bearer required | `{"session_id":"UUID","learner":{},"blueprint":null,"profile_analysis":null,"github_repositories":[],"assessment":null,"result":null,"roadmap":null,"messages":[],"events":[],"storage":{}}` |
| `POST /api/career/blueprint` | `{"session_id":"UUID"}` | `{"blueprint":{"target_role":"...","rationale":"...","skills":[],"provider":"nvidia","model":"...","source":"ai_generated","generated_at":"..."},"storage":{}}` |
| `POST /api/profile/analyze` | `{"session_id":"UUID"}` | `{"profile":{"summary":"...","inferred_skills":[],"suggested_roles":[],"gaps_to_assess":[],"provider":"nvidia","model":"...","generated_at":"...","evidence_note":"..."},"storage":{}}` |
| `POST /api/github/analyze` | `{"session_id":"UUID","target":"https://github.com/psf/requests"}` (or a public username) | `{"session_id":"UUID","repositories":[],"providers":[],"storage":{}}` |
| `POST /api/assessment/generate` | `{"session_id":"UUID"}` | `{"assessment":{"id":"UUID","learner_id":"UUID","target_role":"...","target_role_source":"learner_selected","questions":[],"source":"ai_generated","provider":"nvidia","model":"...","created_at":"...","submitted":false},"storage":{}}` |
| `POST /api/assessment/evaluate` | `{"session_id":"UUID","assessment_id":"UUID","answers":{"QUESTION_UUID":0,"QUESTION_UUID_2":2,"QUESTION_UUID_3":1}}` | `{"result":{"assessment_id":"UUID","score":0,"correct":0,"total":3,"skill_scores":{},"explanations":[],"demonstrated_strengths":[],"gaps":[],"quiz_verification":[],"evidence_note":"...","submitted_at":"..."},"storage":{}}` |
| `POST /api/roadmap/generate` | `{"session_id":"UUID","refresh":false}` | `{"roadmap":{"id":"UUID","learner_id":"UUID","assessment_id":"UUID","target_role":"...","summary":"...","steps":[],"provider":"nvidia","model":"...","source":"ai_generated","created_at":"...","revision":1,"progress_source":"learner_reported"},"storage":{}}` |
| `POST /api/progress/update` | `{"session_id":"UUID","step_id":"UUID","completed":true}` | `{"roadmap":{},"storage":{}}` |
| `POST /api/mentor/chat` | `{"session_id":"UUID","message":"Based on my gaps and completed step, what should I practice next?"}` | `{"message":{"id":"UUID","user_message":"...","reply":"...","next_actions":[],"provider":"nvidia","model":"...","created_at":"..."},"storage":{}}` |
| `GET /api/resources/search` | Query: `session_id=UUID&include_youtube=true`; optional `q`/`step_id`. No body. | `{"resources":[],"providers":[],"recommended_for":[]}` |
| `GET /api/jobs/search` | Query: `q=python&session_id=UUID&provider=all&limit=20`. No body. | `{"jobs":[],"providers":[],"returned_count":0,"note":"...","matches":[],"session_id":"UUID"}` |

For skills-first use `{"track":"skills_first","skills":["Python"],"interests":["Ecology"]}`. `full_name` defaults to `Learner` on the session endpoint. Actual AI responses contain the generated content required by the schemas; empty arrays in this table illustrate envelope shape only.

GitHub inspection supports one repository URL or up to two recently updated non-fork public repositories from a username. It samples at most six bounded UTF-8 files per repository: manifest, implementation source, tests, CI and documentation where available. `architecture_paths` records observed eligible paths, not an executed architecture audit. Findings include file_path, source_url, blob SHA, excerpt and `verified:false`. Never render source excerpts as executable code or unescaped HTML. Private repositories are rejected even when the backend token could access them. Repository text is untrusted evidence, not instructions. A partial failure is exposed in providers/limitations; previous genuine session findings remain available.

## Existing API v1 operations

These routes share the same sessions and data. `learner_id` equals `session_id`. No frontend placeholder paths outside this document are implied aliases. Literal JSON examples for **each** operation below are included in `api_examples.json`.

| Endpoint | Request | Response envelope |
|---|---|---|
| `GET /api/v1/status` | No body | `{"mode":"memory","durable":false,"reason":"..."}` |
| `POST /api/v1/onboarding` | Same onboarding fields; `full_name` required | `{"learner":{},"session_token":"PRIVATE_TOKEN","storage":{}}` |
| `GET /api/v1/learners/{learner_id}` | Bearer; no body | `{"learner":{},"storage":{}}` |
| `POST /api/v1/learners/{learner_id}/assessments` | Bearer; no body | `{"assessment":{},"storage":{}}` |
| `GET /api/v1/learners/{learner_id}/assessment` | Bearer; no body | `{"assessment":{},"storage":{}}` |
| `POST /api/v1/learners/{learner_id}/assessments/{assessment_id}/submit` | Bearer; `{"answers":{"QUESTION_UUID":0}}` (all question IDs required) | `{"result":{},"storage":{}}` |
| `GET /api/v1/learners/{learner_id}/result` | Bearer; no body | `{"result":{},"storage":{}}` |
| `POST /api/v1/learners/{learner_id}/roadmap` | Bearer; no body | `{"roadmap":{},"storage":{}}` |
| `GET /api/v1/learners/{learner_id}/roadmap` | Bearer; no body | `{"roadmap":{},"storage":{}}` |
| `PATCH /api/v1/learners/{learner_id}/roadmap/steps/{step_id}` | Bearer; `{"completed":true}` | `{"roadmap":{},"storage":{}}` |
| `GET /api/v1/learners/{learner_id}/events` | Bearer; no body | `{"events":[],"storage":{}}` |
| `GET /api/v1/jobs/search` | Query: `q=python&provider=both&limit=20`; no body | `{"jobs":[],"providers":[],"returned_count":0,"note":"..."}` |
| `GET /api/v1/learning/resources` | Query: `q=python&include_youtube=true`; no body | `{"resources":[],"providers":[]}` |
| `GET /api/v1/learning/youtube` | Query: `q=python`; no body | `{"resources":[],"providers":[]}` |
| `GET /api/v1/integrations/github/{owner}/{repo}` | Query: repeated `paths=src/requests/api.py`; no body | `{"repository":null,"files":[],"providers":[]}` |

Core generation calls are synchronous HTTP operations backed by worker threads. Keep visible loading/error states. The primary model may retry once on transient or invalid structured output, then use configured hosted fallbacks. A generation endpoint can take several provider timeouts: configure a 360-second frontend timeout for assessment generation and 240 seconds for other model calls, or show recoverable request timeouts and restore state with GET session. GitHub analysis has a 100-second total deadline; use a 120-second client timeout. Public search requests run providers concurrently with individual bounded deadlines. Browser timeouts do not cancel a worker's in-flight generation: check session state before retrying.

An unsubmitted assessment/current roadmap is reused on generation POST. Calling assessment generation after submission explicitly creates a new baseline (maximum ten per learner). Duplicate submissions return 409. Progress completion is idempotent. Concurrent mutations use compare-and-swap versions: a 409 means reload the session and retry; never overwrite locally or fabricate success.

## Errors and provider states

API errors use `{"detail":"..."}`. Validation errors use FastAPI's normal `{"detail":[{"loc":["body","field"],"msg":"...","type":"..."}]}` format. Handle arrays as well as strings. 401 means missing session bearer; 404 means missing/inaccessible session or resource; 409 means prerequisites, already-submitted assessment or concurrent change; 422 invalid input; 429 demo assessment cap; 503 unavailable model/storage or invalid model output. AI 503 responses may also include `provider_failures` with safe exception categories, HTTP codes and schema error locations for diagnosis. No raw provider exception text, model response text or secrets are returned.

Optional-provider failures return HTTP 200 with an empty or partial result and explicit provider states: `ok`, `error`, `disabled`, `not_configured`, `rate_limited`. Render healthy results alongside unavailable-source notices. This is not the same as “there are no jobs/resources.” Keep all source/application links intact. No signup/email gating for public jobs. No syndication to third-party boards.

## Verification

See [backend verification](../backend/VERIFICATION.md) for actual live outcomes and limitations, separate from the synthetic JSON examples. `backend/verify_journey.py` exercises the full real HTTP journey without printing secrets, tokens or private answer keys. `pytest` uses isolated, explicitly test-only fixtures. All five logical agent names correspond to actual LangGraph node executions; start, completion and failure events have real timestamps and operation IDs.

Bot A coordination: this shared contract is the frontend handoff; no Bot A session is connected to this chat. Backend Git commits are scoped explicitly to backend/ and contracts/ and never include frontend changes or staging. Coordinate any further contract change before changing the frontend mapping.
