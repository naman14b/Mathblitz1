# MathBlitz 60s Product Requirements

## Problem statement
Build a polished, friendly Android-first maths game where a player selects an age group, answers validated timed multiple-choice questions, improves through adaptive difficulty, and returns daily for streak challenges. Version 1 is single-player, offline-first, and does not require an account.

## Architecture
- Expo SDK 57 React Native mobile app with a stack-style internal screen flow.
- Local gameplay engine in `frontend/src/game/engine.ts` with age-based templates, validated answers, distractors, adaptive levels, scoring, combos, lives, and speed bonuses.
- AsyncStorage-backed local profile in `frontend/src/game/storage.ts` for age, settings, streak, XP, and personal best.
- FastAPI + MongoDB admin service under `/api/admin/*` for owner login, question management, streak challenges, and configurable monetization settings.
- Environment-configured admin credentials and backend URL; gameplay does not depend on backend availability.

## User personas
- Young learner: needs large, clear targets and age-appropriate arithmetic.
- Student or adult: wants a quick mental-maths challenge and visible improvement.
- Owner/admin: needs simple private tools to maintain the question bank, streak challenges, and monetization configuration.

## Core requirements (static)
- First-launch age selection for six age groups: 6–7, 8–10, 11–13, 14–16, 17–20, and 21+.
- One polished 60-Second Challenge with timer, multiple-choice answers, instant feedback, score, combo, lives, speed bonus, adaptive difficulty, results, replay, XP, and personal best.
- Validated local question templates, plausible distractors, no immediate repetition, and age-appropriate topics.
- Daily streak tracking with 3-day and 7-day challenge milestones.
- Local settings for sound preference, vibration, age switching, privacy/about, and reset progress.
- Separate owner admin login and CRUD/configuration controls.
- Modular monetization configuration with gameplay remaining usable offline.
- Portrait responsive layout, large touch targets, accessible contrast, and tactile feedback.

## Implemented

### 2026-09-18 — Version 1 foundation
- Built MathBlitz 60s onboarding, home hub, streak banner, 60-second gameplay, feedback state, results, replay, and settings screens.
- Added six age-group question pools with adaptive difficulty and validated numeric distractors.
- Added local profile persistence for streak, personal best, XP, selected age, and preferences.
- Added FastAPI admin authentication with environment credentials, Mongo-backed questions/challenges, and monetization settings.
- Added owner admin UI with login, question authoring/deletion, challenge controls, and monetization configuration.
- Added tactile light visual system from the approved design guidelines, Ionicons, safe-area handling, haptics, loading state, and touch feedback.
- Verified with TypeScript, frontend lint, Python lint, curl API checks, Expo preview screenshots, and two full mobile/backend regression passes.

### 2026-09-18 — Pacing and attribution enhancement
- Added visible 60-second starting pace and age-specific per-level time deductions across all six age cards.
- Added actual countdown pressure on combo-based level-ups with level labels, deduction notices, and speed benchmark copy during gameplay.
- Added “Presented by Bansal Tutorials” to the Home dashboard with the supplied Instagram link.
- Revalidated the updated mobile flow and backend regression with a third full test pass.

## Prioritized backlog

### P0 — Before production release
- Add production privacy policy URL and finalize child-directed data/ad policy review.
- Replace development admin credentials and configure production secrets.
- Add production AdMob SDK/test-to-live configuration only after Families policy review.
- Add release icon/screenshots, target-audience declarations, data-safety declaration, and signed Android App Bundle configuration.

### P1 — Next product improvements
- Add real sound effects while preserving the existing sound preference and offline behavior.
- Add stable admin question-editor testIDs and a deeper UI regression suite.
- Add server-side question validation and an admin edit flow for existing question records.
- Add configurable game duration, lives, base points, and combo rules from admin settings.

### P2 — Future expansion
- Daily challenge content authored from the admin service.
- Rewarded continue and natural-break interstitial adapters.
- Cloud profiles, leaderboards, parent/teacher dashboard, more maths categories, and cosmetic progression.

## Next tasks
1. Replace development admin credentials before any external release.
2. Complete privacy, child-safety, and advertising compliance review.
3. Add production sound assets and validate on physical Android devices.
4. Prepare store metadata and release build verification.