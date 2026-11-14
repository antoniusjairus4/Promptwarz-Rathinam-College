# AI Mock Interview — additive API handoff

Existing operations remain compatible; OpenAPI now contains 33 operations.

- `GET /api/interviews/current?session_id=...`: restore the latest interview, or null.
- `POST /api/interviews/start`: `{session_id, interview_type: technical|behavioral|mixed, difficulty: beginner|intermediate|advanced}`.
- `POST /api/interviews/answer`: `{session_id, interview_id, question_id, transcript}`. Only approved text, max 6,000 characters. Retrying an already graded current question returns saved feedback.
- `POST /api/interviews/next`: `{session_id, interview_id}`; requires the current answer and stops at five questions.
- `POST /api/interviews/summary`: `{session_id, interview_id}`; requires five answers and returns the saved summary on retry.

All require the learner bearer token and return `{interview, storage}`. A changed interview/current question returns 409. AI failure returns 503 without fabricated feedback; restore current state after a network timeout. No changes to learner proficiency are made by interview ratings.

The existing repository stores only the most recent interview in the learner document, with the same optimistic concurrency and storage-durability reporting. Memory is temporary. Starting another interview replaces the previous one only after a genuine first question succeeds. Browser recognition may use a vendor speech service; Maximus receives no audio. Unsupported/denied speech recognition falls back to editable text. Speech synthesis is user-triggered by Replay Question.

Frontend: `/interview`, linked in desktop and mobile navigation. Existing API calls keep their 25-second timeout. New interview generation calls allow 60 seconds for provider fallback; current-state restoration keeps 25 seconds. Slow backend work can still outlast the client. Use restore/retry rather than claiming a failed request succeeded. Host microphone permissions and HTTPS affect browser voice availability.

Release gate: the production UI is disabled unless `VITE_ENABLE_INTERVIEWS=true` at build time. Development exposes it for testing. Backend real-NVIDIA five-question flow and restoration passed; a live browser attempt stopped before question five despite passing fixture UI/accessibility regressions. Do not enable the production flag until that browser flow is reliable. Existing microphone Permissions-Policy is unchanged and may force text fallback on deployment. No deployment infrastructure was changed.
