# Production recovery evidence — November 14, 2026

## Confirmed causes and changes

- **Atlas:** all three hosts resolved, but TCP 27017 was refused before TLS/authentication. Following the operator's network-access change, all three TCP checks and authenticated ping passed. URI is SRV, database `maximus`, auth source `admin`; certificate and hostname verification remain enabled. Pool maximum 10/minimum 0 and bounded selection/connect/socket timeouts remain. No credentials were printed or database records deleted. Actual Atlas dashboard rules were not inspected.
- **Persistence:** `backend/.venv/bin/python backend/verify_persistence.py` created one real labeled learner in Atlas, exited that Python process, and restored the identical learner in a fresh process with `durable: true`. Existing document storage also includes blueprints, assessments, roadmaps, source observations, mentor history and the latest interview. Status now pings an active Mongo repository and reports unavailable/non-durable during outages; failures never replace durable data with an empty memory repository.
- **GitHub:** the browser previously called public inspection and then a second session import. Backend requests were serialized under one provider lock, enumerated recursive trees and allowed 100 seconds against a 25-second browser deadline. Active learner import now uses one authorized call, three bounded upstream slots, shared same-key cache locks, shallow root/two-directory sampling, four selected files and a 20-second total deadline. Genuine partial results and prior successful observations are retained with source SHAs. No code is executed. Username discovery samples two non-fork repositories from the first ten recent entries; it is intentionally not exhaustive.
- **Restoration/AI:** onboarding no longer blocks on implicit blueprint generation. Same-session restore requests are coalesced; writes invalidate older restore snapshots. Failure retains credentials and offers an explicit retry. Restoring state is separate from AI activity. GitHub observations restore into the UI. Profile operations reject stale/canceled responses and use existing genuine NVIDIA/Gemini inference. Ordinary requests stay at 25 seconds; single AI calls allow 60 seconds, multi-agent assessment/roadmap calls 120 seconds. No unbounded retries or background job claims were added.

## Verification boundaries

- Backend regression suite: 50 passing tests in the final backend run (13 existing dependency deprecation warnings).
- Fixture browser regression suite: 19 passing tests, with three opt-in live tests skipped in the default run; tests cover failed restoration/retry, one-request GitHub import and restoration, onboarding independence, UI journey, microphone denial and editable text, keyboard/mobile layout and selected automated accessibility states. Fixtures are not live-service evidence.
- Real local backend: both Career-First (51.4 s) and Skills-First (50.5 s) complete journeys passed with MongoDB durability. Real GitHub observations, profile/blueprint/assessment/roadmap, grading, progress, resources, jobs and mentor were exercised. NVIDIA was primary; one contextual mentor response genuinely used Gemini fallback. Provider statuses were reported, not invented.
- Real local browser: five-question interview, feedback, summary and refresh restoration passed with `durable: true` (49.7 s). The test now waits for each actual saved response. Production UI can expose the verified feature; same-origin microphone permission still requires browser/user consent, with text fallback.
- Deployed tunnel: health, MongoDB status, session creation and GitHub import passed. An earlier full tunnel journey received HTTP 504 at AI profile analysis while the equivalent localhost workflow passed. This is an observed external availability limitation, not a fixed application bug.
- Final production frontend/deployed-site outcome will be recorded after push and inspection. No successful Vercel deployment or uninterrupted tunnel availability is assumed from local tests.

Reproduce real checks explicitly; they create labeled learner data and consume provider quota:

```sh
backend/.venv/bin/python backend/verify_persistence.py
backend/.venv/bin/python backend/verify_journey.py --base-url http://127.0.0.1:8000 --track both
cd frontend
PLAYWRIGHT_CHANNEL=chrome LIVE_API_URL=http://127.0.0.1:8014 npm test -- tests/interview.spec.ts --grep 'live AI interview' --workers=1
PRODUCTION_SITE_URL=https://maximus-chi-indol.vercel.app PLAYWRIGHT_CHANNEL=chrome npm test -- tests/production.spec.ts --workers=1
```

The local browser command requires a backend allowing the test origin `http://127.0.0.1:4175`. Production checks run against the supplied public site and make no mocked successful responses. MongoDB persistence requires its actual bearer session token as well as the session ID. No automatic migration of lost, process-local demo sessions is claimed.
