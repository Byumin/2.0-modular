---
name: modular-design
description: Use this skill to generate well-branded interfaces and assets for 인싸이트 2.0 모듈러 (Modular) — a FastAPI + React assessment-operations web app — either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, and admin UI kit components.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files (`colors_and_type.css`, `ui_kits/admin/*`, `preview/*`).

The Modular system has **two parallel palettes that never mix**:
- **Admin** (HSL Tailwind tokens — primary blue `hsl(215 70% 35%)`)
- **Assessment** (hex teal palette — `#175e63`)

For admin UI work (검사 운영, 내담자 관리, etc.) use Tailwind theme tokens. For 수검자 (test-taker) UI use the assessment hex palette. Never combine them on one screen.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and create static HTML files for the user to view. The admin UI kit at `ui_kits/admin/` is the reference implementation — `primitives.jsx` covers Button/Input/Select/Badge/Card/Checkbox + Tabler icons.

If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand. The source-of-truth design doc in the codebase is `2.0-modular/DESIGN.md`.

If the user invokes this skill without other guidance, ask them what they want to build/design, ask some questions (admin or assessment surface? new screen or modify existing?), and act as an expert designer who outputs HTML artifacts or production code, depending on the need.
