# Frontend Architecture & Implementation Guidelines — Maximus

## 1. Product Identity
- **Product Name**: Maximus
- **Tagline**: Discover what you know. Prove what you can do. Build what comes next.
- **Ownership**: Antigravity exclusively owns `frontend/`. Do not modify `backend/`, `contracts/`, or root `AGENTS.md`.

---

## 2. Design System & Aesthetics
Maximus avoids generic SaaS dashboard templates in favor of disciplined, high-density editorial product design inspired by Linear, Vercel, and Raycast.

### Dark Mode — True Black
- Main Background: `#000000`
- Sidebar: `#050505`
- Elevated Surfaces / Cards: `#101010` or `#111111`
- Subtle Borders: `#222222`
- Primary Text: `#FAFAFA`
- Secondary Text: `#A3A3A3`
- Accent: `#8B5CF6`, used sparingly and intentionally
- Supporting Accent: `#22D3EE`, only when semantically useful
- Strict rule: No purple-tinted dashboard surfaces, no page gradients, no glassmorphism, no generic neon cyberpunk styling. True black dominates.

### Light Mode — Natural White
- Main Background: `#FFFFFF`
- Sidebar: `#FAFAFA`
- Elevated Surfaces / Cards: `#F7F7F7`
- Subtle Borders: `#E5E5E5`
- Primary Text: `#171717`
- Secondary Text: `#666666`
- Accent: `#7C3AED`
- Strict rule: Must look like a genuinely designed light interface, not an inverted dark theme.

### Theme Persistence
- Three-way preference: `dark`, `light`, `system`.
- Persisted locally under `maximus_theme` in `localStorage`.
- System preference listener dynamically updates when OS appearance changes.

---

## 3. Typography Scale & Discipline
- **Primary Typeface**: Geist / Inter (sans-serif) for high legibility.
- **Monospace**: JetBrains Mono exclusively for code, technical indicators, and developer metadata.
- **Type Scale**:
  - Page Titles: 28–36px (`text-2xl` / `text-3xl font-semibold tracking-tight`)
  - Section Headings: 18–22px (`text-base` / `text-lg font-medium tracking-tight`)
  - Body: 14–16px (`text-xs` / `text-sm text-[#666666] dark:text-[#A3A3A3]`)
  - Metadata: 11–13px (`text-[11px]` / `text-xs font-mono`)

---

## 4. Composition & Layout Principles
- **No Repetitive Card Grids**: Avoid four identical KPI cards across pages. Use asymmetric, editorial layouts with clear visual hierarchy.
- **Meaningful Empty States**: Never fill empty layouts with fake statistics, simulated percentages, or dummy graphs. Display authentic empty states with actionable next steps.
- **Restrained Motion**: 150–250ms transitions, visible focus indicators, full keyboard accessibility, respecting `prefers-reduced-motion`.

---

## 5. Security & Architectural Boundaries
- **No Direct LLM Invocations**: Under NO circumstances should the browser directly call NVIDIA NIM, Google Gemini, OpenAI, or third-party AI APIs. All AI interactions route through backend agent orchestrators (`POST /api/mentor/chat`).
- **No Secrets in Frontend**: Zero API keys, JWT secrets, database connection strings, or private credentials in client code.
- **Backend as Source of Truth**: Centralized Axios client (`src/services/api.ts`) communicates with FastAPI endpoints through versioned contracts.
- **Anti-Fabrication**: Never synthesize fake jobs, mock test results, or hallucinated external URLs when live backend integration is active.
