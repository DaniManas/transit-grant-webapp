# GrantPilot Transit

A local-runnable web app that helps a small or rural transit agency match against starter grant programs and draft one ready-to-review grant narrative section without inventing facts.

## What It Does

The app walks a transit agency through a four-step flow:

1. **Agency profile**: capture state, rural/urban status, operated modes, federal grantee status, funding goal, and optional AI project details.
2. **Grant match**: rank the three grant programs provided in the starter grant data and explain eligibility, AI fit, federal share, local match, and administrator.
3. **Narrative draft**: generate one grant narrative section with Claude, grounded only in the selected program and agency-entered facts.
4. **Export**: download the draft as clean Markdown for agency review.

The app drafts only. It does not submit, certify, or imply that the agency has completed an official application.

## Key Features

- Hardcoded grant data from the starter grant data only.
- Ranked grant cards with `#1 Recommended` and `Why this match` explanations.
- State input normalization, so entries like `Ind`, `Indiana`, `in`, and `IN` resolve to `IN`.
- Anthropic/Claude draft generation through a backend API so the key is not exposed in browser code.
- Prompt caching on the static grant-program context.
- Deterministic cite-or-skip fallback if the model call fails or produces risky unsupported specificity.
- Markdown export.
- Focused automated tests for matching, state normalization, prompt construction, and cite-or-skip behavior.

## Cite-Or-Skip Discipline

The most important product rule is: **do not invent facts**.

The draft prompt tells Claude to use only:

- the selected grant program data
- the agency profile
- the agency's free-text AI idea
- optional agency-provided facts such as ridership, requested amount, and local match source

If a useful fact is missing, the app uses a placeholder instead of guessing:

```text
[AGENCY TO PROVIDE: annual ridership]
```

The backend also checks model output for common unsupported claims, including invented rider demographics, dollar amounts when the requested amount is blank, annual ridership numbers when ridership is blank, and unsupported service-mode exclusivity. If validation flags a risky draft, the app returns the deterministic fallback draft instead.

## Grant Programs Included

The matcher uses only the starter grant data included in the project:

- **Section 5311 + RTAP**
- **WA Consolidated Grant**
- **Section 5312 / EMI**

No additional grant research was added.

## Tech Stack

- React
- TypeScript
- Vite
- Express
- Anthropic SDK
- Vitest

## Run Locally

Prerequisites:

- Node.js installed
- Anthropic API key

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Add your key to `.env`:

```bash
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Start the app:

```bash
npm run dev
```

Open:

```bash
http://localhost:5173/
```

The dev command starts both services:

- frontend: `http://localhost:5173/`
- backend API: `http://localhost:8787/`

Keep the terminal running while using the app. If the backend stops, draft generation will fail.

## Deploy To Vercel

This project is Vercel-ready:

- Vite builds the frontend into `dist/`.
- `api/draft.ts` runs as the serverless draft endpoint.
- The Anthropic key stays in Vercel environment variables, not in browser code.

In Vercel project settings, add:

```bash
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Then deploy from GitHub or with the Vercel CLI.

Recommended Vercel settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

## Test And Build

Run tests:

```bash
npm test
```

Build production assets:

```bash
npm run build
```

## Security Notes

- `.env` is ignored by Git.
- API calls go through the Express backend; the Anthropic key is not placed in browser code.
- `.env.example` contains placeholder values only.

## Project Notes

See [`NOTES.md`](./NOTES.md) for:

- what was built and cut
- how AI was used
- how prompt caching is used
- how cite-or-skip works
- what was tested
- what would come next with another week

See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the lightweight implementation plan and verification checklist.
