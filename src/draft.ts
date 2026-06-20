import type { AgencyProfile, GrantProgram, NarrativeSection } from "./domain.js";

export type DraftRequest = {
  profile: AgencyProfile;
  program: GrantProgram;
  section: NarrativeSection;
};

export type DraftValidation = {
  ok: boolean;
  issues: string[];
};

export const factualFields = [
  { key: "agencyName", label: "agency name" },
  { key: "state", label: "state" },
  { key: "areaType", label: "urban or rural status" },
  { key: "modes", label: "modes operated" },
  { key: "federalGrantee", label: "federal grantee status" },
  { key: "fundingGoal", label: "funding goal" },
  { key: "aiIdea", label: "AI idea" },
  { key: "annualRidership", label: "annual ridership" },
  { key: "requestedAmount", label: "requested funding amount" },
  { key: "localMatchSource", label: "local match source" }
] as const;

export function buildDraftPrompt({ profile, program, section }: DraftRequest) {
  const knownFacts = [
    `Agency name: ${valueOrPlaceholder(profile.agencyName, "agency name")}`,
    `State: ${valueOrPlaceholder(profile.state, "state")}`,
    `Service area: ${profile.areaType}`,
    `Modes operated: ${
      profile.modes.length ? profile.modes.join(", ") : "[AGENCY TO PROVIDE: modes operated]"
    }`,
    `Federal grantee: ${profile.federalGrantee ? "Yes" : "No"}`,
    `Funding goal: ${profile.fundingGoal}`,
    `AI idea: ${valueOrPlaceholder(profile.aiIdea, "AI idea")}`,
    `Annual ridership: ${valueOrPlaceholder(profile.annualRidership, "annual ridership")}`,
    `Requested amount: ${valueOrPlaceholder(profile.requestedAmount, "requested funding amount")}`,
    `Local match source: ${valueOrPlaceholder(profile.localMatchSource, "local match source")}`
  ];

  return {
    staticContext: [
      "You draft grant narrative sections for small and rural public transit agencies.",
      "Non-negotiable cite-or-skip rule: do not invent facts, numbers, outcomes, dollar figures, partnerships, dates, or prior results.",
      "Use only the grant program data and agency-provided facts in the request.",
      "If a useful fact is missing, insert a bracketed placeholder in this exact style: [AGENCY TO PROVIDE: annual ridership].",
      "Do not infer rider demographics, service-area communities, staff counts, vendors, timelines, local match percentages, prior outcomes, or operational exclusivity from transit mode or rural status.",
      "Do not write claims such as elderly riders, riders with disabilities, limited transportation alternatives, exclusive service mode, or primary/critical operational role unless those exact facts were entered by the agency.",
      "The app drafts only. Do not imply that the application has been submitted or certified.",
      "Use the AI idea when it is provided. If the AI idea is a placeholder, do not invent an idea; keep the placeholder.",
      "Do not reference other application sections as already completed or attached. You may say the agency should add details in another section, but not that those details are already provided.",
      "Before finalizing each sentence, check whether every specific claim is present in the agency facts or grant data. Replace unsupported claims with placeholders.",
      "",
      "Grant program data:",
      JSON.stringify(program, null, 2)
    ].join("\n"),
    userPrompt: [
      `Draft this narrative section: ${section}.`,
      "",
      "Agency-provided facts:",
      knownFacts.map((fact) => `- ${fact}`).join("\n"),
      "",
      "Write 4-6 concise paragraphs for a grant reviewer.",
      "Use the provided AI idea as the center of the project description when it is not a placeholder.",
      "Use plain, conservative language. Include placeholders for missing specifics instead of guessing.",
      "Do not say a budget, outcomes, schedule, partner list, or other narrative section is already provided unless it appears in the agency facts.",
      "If placeholders remain, end with a short Missing agency inputs list containing the most important placeholders to resolve.",
      "If you are tempted to add helpful context that the agency did not provide, skip it or use a placeholder."
    ].join("\n")
  };
}

export function valueOrPlaceholder(value: string | undefined, label: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : `[AGENCY TO PROVIDE: ${label}]`;
}

export function createDeterministicDraft({ profile, program, section }: DraftRequest) {
  const agencyName = valueOrPlaceholder(profile.agencyName, "agency name");
  const idea = valueOrPlaceholder(profile.aiIdea, "AI idea");
  const modes = profile.modes.length
    ? profile.modes.join(", ")
    : "[AGENCY TO PROVIDE: modes operated]";
  const ridership = valueOrPlaceholder(profile.annualRidership, "annual ridership");
  const amount = valueOrPlaceholder(profile.requestedAmount, "requested funding amount");
  const match = valueOrPlaceholder(profile.localMatchSource, "local match source");

  return [
    `# ${section}`,
    "",
    `${agencyName} seeks support through ${program.name}, administered by ${program.administeredBy}, to advance ${profile.fundingGoal.toLowerCase()} for its ${profile.areaType} transit service in ${profile.state || "[AGENCY TO PROVIDE: state]"}. The agency operates ${modes} and has identified the following AI-related need: ${idea}.`,
    "",
    `The proposed work is aligned with the program's eligible uses: ${program.funds} The agency will use the grant-supported activity to improve staff capability, service planning, rider communication, or operational decision-making without replacing the agency's responsibility to review and approve final grant materials.`,
    "",
    `The application should be strengthened with agency-specific evidence. Current annual ridership is ${ridership}. The requested funding amount is ${amount}. The local match source is ${match}. If these details are not available today, they should remain as placeholders until the agency can verify them.`,
    "",
    `Expected outcomes should be stated conservatively and tied to information the agency can verify. At review time, the agency should add measurable targets such as [AGENCY TO PROVIDE: staff trained], [AGENCY TO PROVIDE: pilot timeline], and [AGENCY TO PROVIDE: success metric] before submission through the official program portal.`
  ].join("\n");
}

export function validateCiteOrSkipDraft(draft: string, profile: AgencyProfile): DraftValidation {
  const issues: string[] = [];
  const agencyText = [
    profile.agencyName,
    profile.state,
    profile.areaType,
    profile.modes.join(" "),
    String(profile.federalGrantee),
    profile.fundingGoal,
    profile.aiIdea,
    profile.annualRidership,
    profile.requestedAmount,
    profile.localMatchSource
  ]
    .join(" ")
    .toLowerCase();

  const unsupportedDemographics = [
    "elderly",
    "seniors",
    "senior",
    "disabled",
    "disabilities",
    "low-income",
    "veterans",
    "students",
    "limited transportation alternatives"
  ];

  for (const term of unsupportedDemographics) {
    if (draft.toLowerCase().includes(term) && !agencyText.includes(term)) {
      issues.push(`Unsupported rider demographic claim: ${term}`);
    }
  }

  if (/\bexclusively\b/i.test(draft) && profile.modes.length <= 1) {
    issues.push("Unsupported exclusivity claim about service mode.");
  }

  if (!profile.requestedAmount?.trim() && /\$[0-9]/.test(draft)) {
    issues.push("Unsupported dollar amount when requested amount was blank.");
  }

  if (!profile.annualRidership?.trim() && /\bannual ridership (is|of|at|totals?)\s+[0-9]/i.test(draft)) {
    issues.push("Unsupported annual ridership number when ridership was blank.");
  }

  if (!profile.localMatchSource?.trim() && /\blocal match (source|will come from|is provided by)\b/i.test(draft)) {
    const hasPlaceholder = /\[AGENCY TO PROVIDE: local match/i.test(draft);
    if (!hasPlaceholder) {
      issues.push("Unsupported local match source when local match source was blank.");
    }
  }

  return { ok: issues.length === 0, issues };
}
