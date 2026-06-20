export const usStates = [
  { name: "Alabama", code: "AL" },
  { name: "Alaska", code: "AK" },
  { name: "Arizona", code: "AZ" },
  { name: "Arkansas", code: "AR" },
  { name: "California", code: "CA" },
  { name: "Colorado", code: "CO" },
  { name: "Connecticut", code: "CT" },
  { name: "Delaware", code: "DE" },
  { name: "District of Columbia", code: "DC" },
  { name: "Florida", code: "FL" },
  { name: "Georgia", code: "GA" },
  { name: "Hawaii", code: "HI" },
  { name: "Idaho", code: "ID" },
  { name: "Illinois", code: "IL" },
  { name: "Indiana", code: "IN" },
  { name: "Iowa", code: "IA" },
  { name: "Kansas", code: "KS" },
  { name: "Kentucky", code: "KY" },
  { name: "Louisiana", code: "LA" },
  { name: "Maine", code: "ME" },
  { name: "Maryland", code: "MD" },
  { name: "Massachusetts", code: "MA" },
  { name: "Michigan", code: "MI" },
  { name: "Minnesota", code: "MN" },
  { name: "Mississippi", code: "MS" },
  { name: "Missouri", code: "MO" },
  { name: "Montana", code: "MT" },
  { name: "Nebraska", code: "NE" },
  { name: "Nevada", code: "NV" },
  { name: "New Hampshire", code: "NH" },
  { name: "New Jersey", code: "NJ" },
  { name: "New Mexico", code: "NM" },
  { name: "New York", code: "NY" },
  { name: "North Carolina", code: "NC" },
  { name: "North Dakota", code: "ND" },
  { name: "Ohio", code: "OH" },
  { name: "Oklahoma", code: "OK" },
  { name: "Oregon", code: "OR" },
  { name: "Pennsylvania", code: "PA" },
  { name: "Rhode Island", code: "RI" },
  { name: "South Carolina", code: "SC" },
  { name: "South Dakota", code: "SD" },
  { name: "Tennessee", code: "TN" },
  { name: "Texas", code: "TX" },
  { name: "Utah", code: "UT" },
  { name: "Vermont", code: "VT" },
  { name: "Virginia", code: "VA" },
  { name: "Washington", code: "WA" },
  { name: "West Virginia", code: "WV" },
  { name: "Wisconsin", code: "WI" },
  { name: "Wyoming", code: "WY" }
] as const;

export function normalizeStateInput(input: string) {
  const value = input.trim();
  if (!value) return "";

  const upper = value.toUpperCase();
  const exactCode = usStates.find((state) => state.code === upper);
  if (exactCode) return exactCode.code;

  const lower = value.toLowerCase();
  const exactName = usStates.find((state) => state.name.toLowerCase() === lower);
  if (exactName) return exactName.code;

  const prefixName = usStates.find((state) => state.name.toLowerCase().startsWith(lower));
  if (prefixName) return prefixName.code;

  return upper.slice(0, 2);
}

export type FundingGoal = "AI training" | "AI pilot" | "automation/software";
export type NarrativeSection =
  | "Statement of Need"
  | "Project Description"
  | "Budget Summary"
  | "Expected Outcomes";

export type AgencyProfile = {
  agencyName: string;
  state: string;
  areaType: "rural" | "urban";
  modes: string[];
  federalGrantee: boolean;
  fundingGoal: FundingGoal;
  aiIdea: string;
  annualRidership?: string;
  requestedAmount?: string;
  localMatchSource?: string;
};

export type GrantProgram = {
  id: string;
  name: string;
  administeredBy: string;
  eligibleRecipients: string;
  funds: string;
  federalShare: string;
  localMatch: string;
  aiFit: "High" | "Medium-High" | "Medium" | "Low";
  narrativeSections: NarrativeSection[];
};

export type GrantMatch = {
  program: GrantProgram;
  eligible: boolean;
  reason: string;
  aiFit: GrantProgram["aiFit"];
  score: number;
};

export const grantPrograms: GrantProgram[] = [
  {
    id: "section-5311-rtap",
    name: "Section 5311 + RTAP",
    administeredBy: "State DOT",
    eligibleRecipients: "Rural agencies in areas under 50,000 population.",
    funds: "Operating, training, and technical assistance.",
    federalShare: "Up to 80% for capital; training often higher.",
    localMatch: "Typically at least 20% for capital; training match may be lower depending on RTAP rules.",
    aiFit: "High",
    narrativeSections: [
      "Statement of Need",
      "Project Description",
      "Budget Summary",
      "Expected Outcomes"
    ]
  },
  {
    id: "wa-consolidated",
    name: "WA Consolidated Grant",
    administeredBy: "WSDOT (state DOT)",
    eligibleRecipients:
      "Rural and small-urban agencies in Washington; bundles 5311, 5310, 5339(a), and state funds.",
    funds: "Capital, operating, and mobility projects.",
    federalShare: "Varies by sub-program.",
    localMatch: "Varies by bundled federal/state sub-program and WSDOT award terms.",
    aiFit: "Medium-High",
    narrativeSections: [
      "Statement of Need",
      "Project Description",
      "Budget Summary",
      "Expected Outcomes"
    ]
  },
  {
    id: "section-5312-emi",
    name: "Section 5312 / EMI",
    administeredBy: "FTA (direct)",
    eligibleRecipients: "Agencies pursuing demonstrations and innovation.",
    funds: "Research, demonstrations, and demand-response software.",
    federalShare: "Varies.",
    localMatch: "Varies by FTA notice of funding opportunity and project type.",
    aiFit: "High",
    narrativeSections: [
      "Statement of Need",
      "Project Description",
      "Budget Summary",
      "Expected Outcomes"
    ]
  }
];

export function matchGrants(profile: AgencyProfile): GrantMatch[] {
  return grantPrograms
    .map((program) => matchProgram(profile, program))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}

function matchProgram(profile: AgencyProfile, program: GrantProgram): GrantMatch {
  if (program.id === "section-5311-rtap") {
    const eligible = profile.areaType === "rural";
    const goalBoost = profile.fundingGoal === "AI training" ? 45 : 10;

    return {
      program,
      eligible,
      reason: eligible
        ? "Rural agencies are eligible, and RTAP can support training and technical assistance."
        : "Section 5311 is limited to rural agencies; non-rural agencies are not eligible.",
      aiFit: profile.fundingGoal === "AI training" ? "High" : "Medium",
      score: eligible ? 80 + goalBoost : 0
    };
  }

  if (program.id === "wa-consolidated") {
    const isWashington = normalizeStateInput(profile.state) === "WA";
    const eligible = isWashington && ["rural", "urban"].includes(profile.areaType);
    const ruralSmallUrbanBoost = profile.areaType === "rural" ? 18 : 10;

    return {
      program,
      eligible,
      reason: eligible
        ? "Washington rural and small-urban agencies can pursue this WSDOT-administered program."
        : "This program is specific to Washington agencies.",
      aiFit: "Medium-High",
      score: eligible ? 70 + ruralSmallUrbanBoost : isWashington ? 30 : 0
    };
  }

  const wantsPilotOrAutomation =
    profile.fundingGoal === "AI pilot" || profile.fundingGoal === "automation/software";

  return {
    program,
    eligible: true,
    reason: wantsPilotOrAutomation
      ? "Innovation and demonstration projects are a fit for AI pilots and automation."
      : "Eligible, though training-only projects may be a weaker fit than pilot or automation work.",
    aiFit: wantsPilotOrAutomation ? "High" : "Medium",
    score: wantsPilotOrAutomation ? 105 : 45
  };
}

export function getProgramById(id: string): GrantProgram | undefined {
  return grantPrograms.find((program) => program.id === id);
}
