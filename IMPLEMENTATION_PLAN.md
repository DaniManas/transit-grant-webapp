# Implementation Plan

This project follows the provided requirements as the product spec. The goal is a small, working end-to-end slice rather than a broad production system.

## Scope

1. Build a four-step grant-writing flow:
   - Agency profile
   - Grant match
   - Narrative draft
   - Markdown export
2. Use only the three grant programs provided in the brief.
3. Enforce cite-or-skip discipline in both the LLM prompt and fallback draft generator.
4. Keep the app local-runnable with one command.
5. Document scope decisions, AI usage, prompt caching, testing, and next steps in `NOTES.md`.

## Key Decisions

- React/Vite frontend for fast UI iteration.
- Express backend so the Anthropic API key is not exposed in browser code.
- Hardcoded grant data because the scope explicitly uses only the provided starter grant data.
- Markdown export because Markdown export is acceptable for this scoped build and it is dependable within the one-day timebox.
- Prompt caching on the static grant/system context because the static grant/system context is a good fit for Claude prompt caching.
- Deterministic fallback draft if the API key is missing or the model call fails, preserving the cite-or-skip behavior.
- Server-side validation checks model drafts for common unsupported specificity and falls back to the deterministic draft if needed.

## Verification Checklist

- `npm test`
- `npm run build`
- Browser check at `http://localhost:5173/`
- Draft generation with missing facts produces `[AGENCY TO PROVIDE: ...]` placeholders.
- `.env` is ignored and not committed.
