# Maximus backend verification — November 14, 2026

The final complete live HTTP journey ran against the development backend at `http://127.0.0.1:8000` and passed in **73.3 seconds**. It used real NVIDIA inference and genuine external data, not test fixtures or runtime fake fallbacks.

| Check | Actual final outcome |
|---|---|
| GET health and localhost:5173 CORS | PASS |
| POST session creation | 201; opaque session token, explicit memory storage |
| Public GitHub source analysis | 200; one actual repository, six source findings; manifest, implementation source, tests, CI and documentation inspected with blob references |
| Profile analysis | 200; NVIDIA inference |
| Career blueprint | 200; NVIDIA inference, six generated skill categories |
| Personalized MCQ generation | 200; no private answer fields returned |
| Server-side MCQ evaluation | 200; actual calculated score and post-submission explanations; fixed option-zero smoke-test answers scored 0%, not a fabricated learner result |
| Adaptive roadmap | 200; generated from current quiz evidence and blueprint |
| Progress update | 200; first step completed, successor unlocked; explicitly learner-reported |
| Learning resources | 200; eight results combining official catalog links and actual YouTube search |
| Job search and keyword matching | 200; twenty normalized real listings; Remotive and Arbeitnow successful |
| AI mentor | 200; NVIDIA reply using actual session context |
| GET session restoration | 200; retained result, progress, mentor message and twenty genuine agent events |
| Contract | Valid JSON; all 28 implemented operations have request/response JSON examples |
| Automated tests | **23 passed**; 13 upstream LangSmith deprecation warnings |
| Dependency consistency | `pip check`: no broken requirements |

During development, some hosted model calls returned 503 rather than valid structured output. No assessment/roadmap was fabricated on those failures. Primary inference now retries at most once for transient/invalid-output failures, then tries configured fallbacks. Authentication/rate-limit failures are not repeatedly retried. The final live run completed all operations with HTTP success and no client retry. Failure diagnostics expose only provider names, exception categories, status codes and schema error locations; never prompt text, generated answer keys or credentials. Gemini is configured as a fallback and the routing logic is tested; the final live run used NVIDIA, so this is not a claim of live Gemini success.

## Remaining environment limitations

- MongoDB Atlas remains unavailable: all three node names resolve, TLS is configured, but TCP 27017 probes timed out or were refused. PyMongo raises `ServerSelectionTimeoutError`. TLS negotiation/authentication were not reached. Check Atlas cluster status, current client IP access list and outbound firewall rules with Atlas account/network access; do not disable TLS or assume a password failure. The backend starts and serves the complete journey using a clearly labeled non-durable session repository.
- Memory sessions disappear on process restart. The existing development server uses `--reload`; for a stable demo use one worker without reload. No automatic memory-to-Mongo migration or silent replacement of durable data is implemented.
- Himalayas and Adzuna returned explicit provider errors during the final job search; working sources still returned real jobs. These optional integrations do not gate the AI journey.
- Bot A must connect the frontend to the documented routes and generation timeouts. Codex has not modified frontend files. No Bot A agent session is connected to this chat; shared contracts are the handoff, and Git changes are scoped to backend/contracts only.

Reproduce with `backend/.venv/bin/python backend/verify_journey.py`. This makes real hosted requests and creates a demo session. It prints status/count summaries without credentials or bearer tokens. `contracts/api_examples.json` is **synthetic documentation generated from test-only fixtures**; it is not the live run's response data.
