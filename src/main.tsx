import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Download, FileText, Loader2, Route, Sparkles } from "lucide-react";
import {
  grantPrograms,
  matchGrants,
  normalizeStateInput,
  usStates,
  type AgencyProfile,
  type GrantMatch,
  type NarrativeSection
} from "./domain";
import "./styles.css";

const initialProfile: AgencyProfile = {
  agencyName: "",
  state: "",
  areaType: "rural",
  modes: [],
  federalGrantee: true,
  fundingGoal: "AI training",
  aiIdea: "",
  annualRidership: "",
  requestedAmount: "",
  localMatchSource: ""
};

const modeOptions = [
  "fixed-route bus",
  "paratransit",
  "demand-response",
  "microtransit",
  "vanpool"
];

function App() {
  const [profile, setProfile] = useState<AgencyProfile>(initialProfile);
  const [selectedProgramId, setSelectedProgramId] = useState(grantPrograms[0].id);
  const [section, setSection] = useState<NarrativeSection>("Project Description");
  const [draft, setDraft] = useState("");
  const [draftSource, setDraftSource] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const canRankGrants = normalizeStateInput(profile.state) !== "";
  const matches = useMemo(() => matchGrants(profile), [profile]);
  const recommendedProgramId = canRankGrants ? matches[0]?.program.id : "";
  const selectedMatch = matches.find((match) => match.program.id === selectedProgramId) ?? matches[0];

  useEffect(() => {
    if (!canRankGrants) {
      setSelectedProgramId("");
      setDraft("");
      setDraftSource("");
      setStatus("idle");
      return;
    }

    if (!recommendedProgramId) return;
    setSelectedProgramId(recommendedProgramId);
    setDraft("");
    setDraftSource("");
    setStatus("idle");
  }, [canRankGrants, recommendedProgramId]);

  function updateProfile<K extends keyof AgencyProfile>(key: K, value: AgencyProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function selectProgram(programId: string) {
    setSelectedProgramId(programId);
    setDraft("");
    setDraftSource("");
    setStatus("idle");
  }

  function toggleMode(mode: string) {
    setProfile((current) => ({
      ...current,
      modes: current.modes.includes(mode)
        ? current.modes.filter((item) => item !== mode)
        : [...current.modes, mode]
    }));
  }

  async function generateDraft() {
    setStatus("loading");
    setDraft("");
    setDraftSource("");

    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          programId: selectedMatch.program.id,
          section
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Draft generation failed.");
      }

      setDraft(payload.draft);
      setDraftSource(payload.source === "anthropic" ? "Claude draft" : "Local cite-or-skip draft");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setDraft(error instanceof Error ? error.message : "Draft generation failed.");
    }
  }

  function exportMarkdown() {
    const header = [
      `# ${section}`,
      "",
      `Agency: ${profile.agencyName || "[AGENCY TO PROVIDE: agency name]"}`,
      `Program: ${selectedMatch.program.name}`,
      `Administered by: ${selectedMatch.program.administeredBy}`,
      "",
      "---",
      ""
    ].join("\n");
    const blob = new Blob([header + draft], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug(profile.agencyName || "agency")}-${slug(selectedMatch.program.name)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">AI-assisted grant matching and narrative drafting</p>
          <h1>GrantPilot Transit</h1>
        </div>
        <div className="guardrail">
          <FileText size={18} />
          Draft only. Agency reviews and submits.
        </div>
      </header>

      <section className="workspace">
        <aside className="panel profile-panel">
          <StepTitle number="1" title="Agency profile" />
          <label>
            Agency name
            <input
              value={profile.agencyName}
              onChange={(event) => updateProfile("agencyName", event.target.value)}
              placeholder="Example Transit Authority"
            />
          </label>

          <div className="row">
            <label>
              State
              <input
                value={profile.state}
                list="state-options"
                onBlur={(event) => updateProfile("state", normalizeStateInput(event.target.value))}
                onChange={(event) => updateProfile("state", event.target.value)}
                placeholder="IN or Indiana"
              />
              <datalist id="state-options">
                {usStates.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </datalist>
            </label>
            <label>
              Service area
              <select
                value={profile.areaType}
                onChange={(event) =>
                  updateProfile("areaType", event.target.value as AgencyProfile["areaType"])
                }
              >
                <option value="rural">Rural</option>
                <option value="urban">Urban / small-urban</option>
              </select>
            </label>
          </div>

          <fieldset>
            <legend>Modes operated</legend>
            <div className="chips">
              {modeOptions.map((mode) => (
                <button
                  className={profile.modes.includes(mode) ? "chip selected" : "chip"}
                  key={mode}
                  onClick={() => toggleMode(mode)}
                  type="button"
                >
                  {mode}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="row">
            <label>
              Federal grantee
              <select
                value={profile.federalGrantee ? "yes" : "no"}
                onChange={(event) => updateProfile("federalGrantee", event.target.value === "yes")}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>
              Funding goal
              <select
                value={profile.fundingGoal}
                onChange={(event) =>
                  updateProfile("fundingGoal", event.target.value as AgencyProfile["fundingGoal"])
                }
              >
                <option>AI training</option>
                <option>AI pilot</option>
                <option>automation/software</option>
              </select>
            </label>
          </div>

          <label>
            AI idea
            <textarea
              value={profile.aiIdea}
              onChange={(event) => updateProfile("aiIdea", event.target.value)}
              placeholder="Example: train dispatchers to use AI safely for service alerts and rider communication."
            />
          </label>

          <div className="optional-grid">
            <label>
              Annual ridership
              <input
                value={profile.annualRidership}
                onChange={(event) => updateProfile("annualRidership", event.target.value)}
                placeholder="Leave blank for placeholder"
              />
            </label>
            <label>
              Requested amount
              <input
                value={profile.requestedAmount}
                onChange={(event) => updateProfile("requestedAmount", event.target.value)}
                placeholder="Leave blank for placeholder"
              />
            </label>
            <label>
              Local match source
              <input
                value={profile.localMatchSource}
                onChange={(event) => updateProfile("localMatchSource", event.target.value)}
                placeholder="Leave blank for placeholder"
              />
            </label>
          </div>
        </aside>

        <section className="main-flow">
          <div className="panel">
            <StepTitle number="2" title="Grant match" />
            <p className="match-helper">
              {canRankGrants
                ? "Ranked from the current agency profile. State, service area, and funding goal update the recommendation."
                : "Select a state to rank grants and choose the draft program."}
            </p>
            <div className="matches">
              {matches.map((match, index) => (
                <GrantCard
                  key={match.program.id}
                  match={match}
                  rank={index + 1}
                  canRank={canRankGrants}
                  selected={canRankGrants && match.program.id === selectedMatch.program.id}
                  onSelect={() => selectProgram(match.program.id)}
                />
              ))}
            </div>
          </div>

          <div className="panel draft-panel">
            <div className="draft-header">
              <StepTitle number="3" title="Narrative draft" />
              <label className="section-picker">
                Section
                <select
                  value={section}
                  onChange={(event) => setSection(event.target.value as NarrativeSection)}
                >
                  {selectedMatch.program.narrativeSections.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <button
              className="primary"
              onClick={generateDraft}
              disabled={!canRankGrants || status === "loading"}
            >
              {status === "loading" ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
              Generate Draft
            </button>

            <div className={status === "error" ? "draft error" : "draft"}>
              {draft ? (
                <>
                  {draftSource && <p className="source">{draftSource}</p>}
                  <pre>{draft}</pre>
                </>
              ) : (
                <div className="empty-state">
                  <Route size={28} />
                  {canRankGrants
                    ? "Select a grant, choose a section, then generate a draft."
                    : "Select a state to rank grants before generating a draft."}
                </div>
              )}
            </div>
          </div>

          <div className="panel export-panel">
            <StepTitle number="4" title="Export" />
            <button className="secondary" onClick={exportMarkdown} disabled={!draft}>
              <Download size={18} />
              Download Markdown
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function StepTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="step-title">
      <span>{number}</span>
      <h2>{title}</h2>
    </div>
  );
}

function GrantCard({
  match,
  rank,
  canRank,
  selected,
  onSelect
}: {
  match: GrantMatch;
  rank: number;
  canRank: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const cardClass = [
    "grant-card",
    selected ? "selected" : "",
    canRank && rank === 1 ? "recommended" : "",
    canRank && !match.eligible ? "muted" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cardClass} disabled={!canRank} onClick={onSelect} type="button">
      <div className="grant-rankline">
        <span className={canRank && rank === 1 ? "rank-pill recommended" : "rank-pill"}>
          {canRank ? (rank === 1 ? "#1 Recommended" : `#${rank} Ranked`) : "Grant option"}
        </span>
        {selected && <span className="selected-pill">Selected for draft</span>}
      </div>
      <div className="grant-topline">
        <h3>{match.program.name}</h3>
        <span className={!canRank ? "badge pending" : match.eligible ? "badge eligible" : "badge ineligible"}>
          {!canRank ? "Pending" : match.eligible ? "Eligible" : "Not eligible"}
        </span>
      </div>
      <p>
        <strong>Why this match:</strong>{" "}
        {canRank ? match.reason : "Select a state to evaluate eligibility and ranking."}
      </p>
      <dl>
        <div>
          <dt>AI fit</dt>
          <dd>{match.aiFit}</dd>
        </div>
        <div>
          <dt>Share</dt>
          <dd>{match.program.federalShare}</dd>
        </div>
        <div>
          <dt>Local match</dt>
          <dd>{match.program.localMatch}</dd>
        </div>
        <div>
          <dt>Admin</dt>
          <dd>{match.program.administeredBy}</dd>
        </div>
      </dl>
    </button>
  );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
