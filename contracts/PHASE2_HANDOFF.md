# Phase 2 backend handoff for Bot A

All 28 API operations, public models and authentication remain unchanged. The exported OpenAPI schema is regenerated and should have no structural diff. No frontend implementation changes are required by this phase.

Behavior refinements:

- AI calls share `AI_REQUEST_BUDGET_SECONDS` (default 120 seconds) across sequential agents in an HTTP request. Each configured provider is attempted once; the default provider wall-clock timeout is 30 seconds. Keep existing handling of structured HTTP 503 with safe `provider_failures`; do not retry automatically without user action. Provider/model fields identify the actual successful provider, including fallback.
- The Career Architect reuses a persisted blueprint when preparing an assessment. Retakes include previous quiz results and recent prompts. Exact question repetition (case/spacing/punctuation normalized), unrelated skill categories and malformed output fail honestly; they do not erase the previous valid result/roadmap. Semantic paraphrases are not guaranteed to be detected.
- After a successful new assessment or grading, `profile_analysis` becomes null to avoid showing stale inferences. Request `/api/profile/analyze` when a fresh profile is needed. Prior genuine GitHub observations and mentor history are preserved.
- Roadmaps put measured quiz gaps before unassessed blueprint skills, followed by quiz strengths. Unassessed skills carry `gap_priority=medium`; their quiz scores are never invented. Identical completed practice tasks are rejected on regeneration. Existing roadmap/progress survive a failed refresh.
- `matched_terms` now includes declared or quiz-observed learner skills only. A blueprint target alone no longer counts as an existing skill. `assessment_supported_terms` still means a >=70 score on the current quiz only, not independent proficiency, certification or a hiring prediction. Job requirements matching remains keyword overlap against source title, summary and tags.
- `/api/resources/search` without an explicit query continues to recommend the available roadmap milestone's skill. Original resource URLs, original job application URLs, deduplication and provider availability statuses remain intact.
- Memory storage is explicitly process-local, lost on restart and not shared between serverless instances. Display `storage` accurately. Vercel defaults still require MongoDB for reliable sessions; explicit temporary fallback remains available through storage configuration. A runtime database failure returns 503 without replacing durable data with memory.

There is no newly deployed backend URL in this change. Use the existing backend URL until a Vercel deployment and live journey have been verified.
