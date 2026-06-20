# GrantPilot Transit Notes

## What I built

I built a small end-to-end web app for a transit agency to:

1. Enter an agency profile.
2. See ranked grant matches from the three starter programs, including eligibility, AI fit, federal share, local match, and administrator.
3. Select a program and draft one narrative section.
4. Export the draft as Markdown for agency review.

I also added small UX improvements after the first working pass: the state field accepts state names or abbreviations and normalizes entries like `Ind` / `Indiana` to `IN`; state and mode selections start blank so the first-load view does not imply agency facts; grant cards then show ranking labels such as `#1 Recommended`; and each grant card includes a short `Why this match` explanation.

The app stops at drafting/export. It does not submit anything and does not frame the work around contingency fees.

## What I cut

- User accounts and persistence: not needed for the one-day slice.
- More grant research: the project scope was intentionally limited to the provided starter grant data.
- DOCX/PDF export: Markdown keeps the implementation dependable for this scoped prototype.
- Full application packet generation: the requirement was one narrative section.

## AI usage

I used AI coding assistance to break down the requirements, scaffold the React/Express app, write the matcher and drafting guardrails, and create focused tests around the highest-risk behavior.

I used Codex as the coding assistant and followed structured agent workflows for planning, TDD-style implementation, debugging, browser verification, and final verification. The main workflow aids were `grill-with-docs` for reading the requirements, `tdd` for focused behavior tests, `diagnose` for runtime failures, browser verification for the local UI, and `verification-before-completion` before final claims and pushes.

The draft prompt was tightened during review to use the agency's AI idea when provided, keep placeholders when the idea is missing, and avoid implying that other application sections or attachments already exist.

The Anthropic call keeps the static grant program context in the system prompt and marks it with prompt caching:

```ts
cache_control: { type: "ephemeral" }
```

That is intentionally included because prompt caching is a good fit for stable grant-program context. The grant program data is stable across draft requests, while the agency profile changes per request, so it is a good fit for caching.

## Cite-or-skip rule

The draft prompt explicitly tells the model:

- Do not invent facts, numbers, outcomes, dollar figures, partnerships, dates, or prior results.
- Use only the grant program data and agency-provided facts.
- If a useful fact is missing, insert a placeholder such as `[AGENCY TO PROVIDE: annual ridership]`.

The fallback draft generator follows the same rule deterministically when `ANTHROPIC_API_KEY` is not set or the API fails.

The backend also validates model drafts for common unsupported specificity, including invented rider demographics, dollar amounts when requested amount is blank, annual ridership numbers when ridership is blank, and unsupported service-mode exclusivity. If validation flags a risky draft, the app returns the deterministic cite-or-skip fallback instead of showing the risky model output.

## How I tested it

The automated tests cover:

- Rural agency + AI training ranks `Section 5311 + RTAP` first.
- Washington agencies surface the `WA Consolidated Grant`.
- Non-rural agencies are marked ineligible for `Section 5311`.
- Automation projects rank `Section 5312 / EMI` first.
- Missing factual inputs become placeholders instead of invented ridership, dollar amounts, or match sources.
- Model drafts containing unsupported rider demographic claims are flagged before they reach the user.
- State normalization maps typed names and prefixes like `Ind` / `Indiana` to `IN`.
- Prompt construction includes a provided AI idea and explicitly avoids claims that other sections are already completed.

## What I would do next with another week

- Add authenticated agency workspaces and saved drafts.
- Add a reviewer checklist for missing placeholders before export.
- Add DOCX export with clean formatting.
- Add source annotations for each sentence in the narrative.
- Add admin-editable grant program data in Postgres/Supabase.
- Add a queue for longer drafting jobs and prompt evaluation tests.
