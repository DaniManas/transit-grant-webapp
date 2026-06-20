import Anthropic from "@anthropic-ai/sdk";
import {
  buildDraftPrompt,
  createDeterministicDraft,
  validateCiteOrSkipDraft,
  type DraftRequest
} from "./draft.js";
import { getProgramById } from "./domain.js";

export type DraftApiResult = {
  status: number;
  body: Record<string, unknown>;
};

export async function handleDraftRequest(body: any): Promise<DraftApiResult> {
  const profile = body?.profile;
  const program = getProgramById(body?.programId);
  const section = body?.section;

  if (!profile || !program || !section) {
    return { status: 400, body: { error: "Missing profile, programId, or section." } };
  }

  const request: DraftRequest = { profile, program, section };
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      status: 200,
      body: {
        draft: createDeterministicDraft(request),
        source: "fallback",
        note: "ANTHROPIC_API_KEY was not set, so the app used the deterministic cite-or-skip fallback."
      }
    };
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const { staticContext, userPrompt } = buildDraftPrompt(request);
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 1200,
      temperature: 0,
      system: [
        {
          type: "text",
          text: staticContext,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [{ role: "user", content: userPrompt }]
    });

    const draft = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n\n");
    const validation = validateCiteOrSkipDraft(draft, profile);

    if (!validation.ok) {
      return {
        status: 200,
        body: {
          draft: createDeterministicDraft(request),
          source: "fallback-after-validation",
          validationIssues: validation.issues,
          note: "Claude returned unsupported specificity, so the app used the deterministic cite-or-skip fallback."
        }
      };
    }

    return {
      status: 200,
      body: {
        draft,
        source: "anthropic",
        usage: response.usage
      }
    };
  } catch (error) {
    console.error(error);
    return {
      status: 200,
      body: {
        draft: createDeterministicDraft(request),
        source: "fallback-after-error",
        note: "Claude request failed, so the app used the deterministic cite-or-skip fallback."
      }
    };
  }
}
