import { describe, expect, it } from "vitest";
import { matchGrants, normalizeStateInput, type AgencyProfile } from "../src/domain.js";
import { buildDraftPrompt, createDeterministicDraft, validateCiteOrSkipDraft, valueOrPlaceholder } from "../src/draft.js";
import { handleDraftRequest } from "../src/draftApi.js";
import { grantPrograms } from "../src/domain.js";

const baseProfile: AgencyProfile = {
  agencyName: "Valley Transit",
  state: "OR",
  areaType: "rural",
  modes: ["fixed-route bus", "paratransit"],
  federalGrantee: true,
  fundingGoal: "AI training",
  aiIdea: "Train dispatchers and planners on safe AI use."
};

describe("grant matching", () => {
  it("ranks Section 5311 + RTAP first for a rural agency seeking AI training", () => {
    const matches = matchGrants(baseProfile);

    expect(matches[0].program.name).toBe("Section 5311 + RTAP");
    expect(matches[0].eligible).toBe(true);
  });

  it("surfaces the WA Consolidated Grant for a Washington agency", () => {
    const matches = matchGrants({ ...baseProfile, state: "WA" });

    expect(matches.some((match) => match.program.name === "WA Consolidated Grant")).toBe(true);
    expect(matches.find((match) => match.program.name === "WA Consolidated Grant")?.eligible).toBe(
      true
    );
  });

  it("marks non-rural agencies ineligible for Section 5311", () => {
    const matches = matchGrants({ ...baseProfile, areaType: "urban" });
    const section5311 = matches.find((match) => match.program.name === "Section 5311 + RTAP");

    expect(section5311?.eligible).toBe(false);
    expect(section5311?.reason).toContain("non-rural agencies are not eligible");
  });

  it("ranks Section 5312 / EMI first for automation projects", () => {
    const matches = matchGrants({ ...baseProfile, fundingGoal: "automation/software" });

    expect(matches[0].program.name).toBe("Section 5312 / EMI");
    expect(matches[0].aiFit).toBe("High");
  });


  it("normalizes typed state names and abbreviations", () => {
    expect(normalizeStateInput("Ind")).toBe("IN");
    expect(normalizeStateInput("Indiana")).toBe("IN");
    expect(normalizeStateInput("wa")).toBe("WA");
    expect(normalizeStateInput("Washington")).toBe("WA");
  });

  it("includes federal share and local match information for every program", () => {
    const matches = matchGrants(baseProfile);

    for (const match of matches) {
      expect(match.program.federalShare).toBeTruthy();
      expect(match.program.localMatch).toBeTruthy();
    }
  });
});

describe("cite-or-skip drafting", () => {

  it("tells Claude to use a provided AI idea and avoid pretending other sections already exist", () => {
    const prompt = buildDraftPrompt({
      profile: {
        ...baseProfile,
        aiIdea: "Add an AI assistant in the BT app for route and service questions."
      },
      program: grantPrograms[0],
      section: "Project Description"
    });

    expect(prompt.userPrompt).toContain("Add an AI assistant in the BT app");
    expect(prompt.staticContext).toContain("Use the AI idea when it is provided");
    expect(prompt.staticContext).toContain("Do not reference other application sections as already completed");
  });

  it("uses placeholders when factual inputs are missing", () => {
    expect(valueOrPlaceholder("", "annual ridership")).toBe(
      "[AGENCY TO PROVIDE: annual ridership]"
    );
  });

  it("does not invent ridership, dollar amounts, or match sources in fallback drafts", () => {
    const draft = createDeterministicDraft({
      profile: baseProfile,
      program: grantPrograms[0],
      section: "Project Description"
    });

    expect(draft).toContain("[AGENCY TO PROVIDE: annual ridership]");
    expect(draft).toContain("[AGENCY TO PROVIDE: requested funding amount]");
    expect(draft).toContain("[AGENCY TO PROVIDE: local match source]");
    expect(draft).not.toMatch(/\$[0-9]/);
  });

  it("flags unsupported rider demographics in model drafts", () => {
    const validation = validateCiteOrSkipDraft(
      "The agency serves many elderly riders and riders with disabilities.",
      baseProfile
    );

    expect(validation.ok).toBe(false);
    expect(validation.issues.join(" ")).toContain("elderly");
  });

  it("allows rider demographics when the agency provided them", () => {
    const validation = validateCiteOrSkipDraft(
      "The agency serves elderly riders through demand-response service.",
      {
        ...baseProfile,
        aiIdea: "Train staff on AI-assisted communication for elderly riders."
      }
    );

    expect(validation.ok).toBe(true);
  });

  it("returns a cite-or-skip fallback draft when no Anthropic key is configured", async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const result = await handleDraftRequest({
      profile: baseProfile,
      programId: grantPrograms[0].id,
      section: "Project Description"
    });

    if (originalKey) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }

    expect(result.status).toBe(200);
    expect(result.body.source).toBe("fallback");
    expect(String(result.body.draft)).toContain("[AGENCY TO PROVIDE: annual ridership]");
  });
});
