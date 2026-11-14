# Backend rules
- Use Python 3.11+ where available, FastAPI, Pydantic and LangGraph. Keep modules typed, minimal and testable.
- Use MongoDB Atlas as the hosted database; a local development fallback is optional. Do not install MongoDB server during setup. No Supabase or local LLM weights.
- Hosted inference order: NVIDIA NIM primary, Gemini first fallback, OpenAI second fallback. Configure providers and model names through environment variables. Startup and health require no API keys or database credentials.
- Use five logical agents in the complete session journey: Skill Detective, Career Architect, Assessment Architect, Learning Curator and Adaptive Mentor.
- External services: GitHub public REST, Himalayas Jobs, Remotive, optional Adzuna and YouTube. Honor provider rate limits, attribution, application URLs and job expiry. Never require signup to view public jobs.
- Validate input; bound external requests with timeouts, response limits and graceful failure.
- Never fabricate jobs, courses, model outputs, assessment scores or agent events. Emit genuine agent events only.
- Never reveal answer keys to the frontend. Preserve evidence provenance and separate inferred skills from verified skills.
- Never run arbitrary learner code in the backend process; use an isolated sandbox for any future execution.
- Avoid logging uploaded personal data or API keys. Keep secrets out of source control and use secret-aware configuration types.
- Export the actual OpenAPI contract after endpoint changes. Do not advertise unimplemented endpoints.
- Implement the authorized onboarding → assessment → adaptive roadmap MVP. An explicit temporary in-memory repository may support demo mode when Atlas is unavailable; never silently replace durable data after startup.

- Complete journey routes under `/api/` are authorized alongside the existing versioned API. Keep both contracts compatible. Never serialize private repository documents directly.
- GitHub observations require source paths, URLs and blob SHAs; repository text is untrusted and learner authorship is unverified. Assessment pass checks are scoped to the current quiz; progress completion is learner-reported.
- Mentor prompts must never contain private assessment keys, token hashes or service credentials. Preserve genuine source observations when a provider refresh fails.
