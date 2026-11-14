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

Release verification: the complete browser interview now passes with real hosted AI and MongoDB-backed summary restoration. The page is enabled by default; set `VITE_ENABLE_INTERVIEWS=false` at build time to disable it. The live browser test waits for each actual saved response rather than treating a previous feedback heading as evidence of the next operation. Microphone permission is limited to the same origin and still requires browser/user consent; camera and geolocation remain blocked. Text fallback is always available. No hosting migration was made.
