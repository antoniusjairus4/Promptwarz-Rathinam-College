# Maximus
Agentic personalized career learning platform. Build a deadline-driven MVP for submission by 1 PM IST on November 14, 2026. Favor working end-to-end behavior over overengineering; keep code modular, typed, testable and minimal.

## Structure and ownership
- `backend/`: Codex owns the FastAPI service and backend tests.
- `contracts/`: Codex owns versioned API contracts exported from the actual backend.
- `frontend/`: Antigravity exclusively owns the React frontend. Codex must not create, edit, delete or format files here.
- Root `AGENTS.md`: Codex owns persistent project instructions. Preserve the existing root README. Merge .gitignore rules without removing existing rules when authorized.
- No shared file modifications without coordination. No repository-wide Git operations during simultaneous work.

React communicates with FastAPI through versioned API contracts. The backend is the source of truth for assessments, learner profiles, roadmaps, progress and agent activity. Export contracts after endpoint changes; coordinate breaking changes with Antigravity. Health remains `/api/health`; workflow contracts use `/api/v1`. Publish frontend handoff documentation in `contracts/`.

Real data must never be silently replaced with fake data. Never expose secrets or commit .env files. Never execute user-submitted code unsandboxed. No Supabase and no locally installed large language models. Implementation of onboarding, AI assessment, adaptive roadmaps and repository persistence is authorized. Optional public Himalayas, Remotive, GitHub REST, YouTube and curated learning integrations are authorized. Keep them independent of the core AI workflow.

## Active repository
Use this repository (`~/Antonius Jairus/Hackathons/Promptwarz-Rathinam-College`) as the ONLY working directory for future Maximus implementation. The prior standalone setup is an archive; do not implement there. Do not copy private environment files, virtual environments or caches into source content.
