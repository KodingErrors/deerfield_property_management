"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CompareDialog } from "./compare-dialog";
import { ContactModal } from "./contact-modal";
import { Results } from "./results";
import { STEP_TITLES, StepLocation, StepPriorities, StepSpace, StepTiming } from "./steps";
import { SentConfirmation } from "../sent-confirmation";
import { useDeliveryConfig } from "../use-delivery-config";
import { useToast } from "../use-toast";
import { cities, matchProperties, type MatchResults, type Search, type SearchType } from "@/lib/catalog";
import { defaultSearch, loadSearch, saveSearch, searchHeadline, sizesOrdered } from "@/lib/search";

type Step = 1 | 2 | 3 | 4;
type View = "finder" | "results";

// WebMCP: the page exposes two tools to agents when the browser provides
// document.modelContext. Both are explicitly non-sending.
type ModelContext = { registerTool: (tool: unknown) => void };

export function DealDesk() {
  const [search, setSearch] = useState<Search>(defaultSearch);
  const [step, setStep] = useState<Step>(1);
  const [view, setView] = useState<View>("finder");
  const [results, setResults] = useState<MatchResults | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [sentOpen, setSentOpen] = useState(false);
  // Callback windows chosen in the contact modal, kept here so closing and reopening the
  // modal does not lose them.
  const [availability, setAvailability] = useState<ReadonlySet<string>>(new Set());
  const [stepError, setStepError] = useState("");
  const [entering, setEntering] = useState(false);
  const finder = useRef<HTMLElement>(null);
  const delivery = useDeliveryConfig();
  const { showToast, toast } = useToast();

  // The saved search lives in localStorage, so it is applied after hydration; a saved
  // #results hash reopens the results the visitor was looking at.
  useEffect(() => {
    const saved = loadSearch();
    setSearch(saved);
    if (location.hash === "#results" && saved.type) {
      setResults(matchProperties(saved));
      setView("results");
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setView(location.hash === "#results" && results ? "results" : "finder");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [results]);

  const update = useCallback((patch: Partial<Search>) => {
    setSearch((current) => {
      const next = { ...current, ...patch };
      saveSearch(next);
      return next;
    });
  }, []);

  function goTo(next: Step) {
    setEntering(true);
    setStep(next);
    setStepError("");
    requestAnimationFrame(() => finder.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function validateStep(): boolean {
    if (step === 1 && !sizesOrdered(search)) {
      setStepError("Enter size values from smallest to largest.");
      return false;
    }
    return true;
  }

  function showResults() {
    if (!validateStep()) return;
    setResults(matchProperties(search));
    setView("results");
    history.pushState({ view: "results" }, "", "#results");
    scrollTo({ top: 0, behavior: "smooth" });
  }

  function editSearch() {
    setStep(4);
    setView("finder");
    history.pushState({ view: "finder" }, "", "#finder");
  }

  function startOver() {
    const hasWork = search.type || search.cities.length || search.features.length || search.intendedUse;
    if (hasWork && !confirm("Start a new search and clear these answers?")) return;
    const fresh = structuredClone(defaultSearch);
    saveSearch(fresh);
    setSearch(fresh);
    setSelected(new Set());
    setStep(1);
  }

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      else {
        showToast("Compare up to four properties at a time.");
        return current;
      }
      return next;
    });
  }

  const selectedMatches = results ? [...results.eligible, ...results.verificationRequired].filter((match) => selected.has(match.property.id)) : [];

  function openContact() {
    setCompareOpen(false);
    setContactOpen(true);
  }

  // Keep the tool implementations pointed at the latest state without re-registering.
  const tools = useRef({ update, setStep, setResults, setView, search });
  tools.current = { update, setStep, setResults, setView, search };

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!modelContext?.registerTool) return;
    modelContext.registerTool({
      name: "configure_property_search",
      description: "Stage a Deerfield commercial-property search using confirmed hard constraints and weighted preferences. This updates the on-page search but does not contact Deerfield.",
      inputSchema: {
        type: "object",
        properties: {
          propertyType: { type: "string", enum: ["industrial", "retail", "office", "unsure"] },
          sizeMin: { type: ["number", "null"], minimum: 0 },
          sizeIdeal: { type: ["number", "null"], minimum: 0 },
          sizeMax: { type: ["number", "null"], minimum: 0 },
          cities: { type: "array", items: { type: "string", enum: cities }, uniqueItems: true },
          locationMode: { type: "string", enum: ["hard", "preference"] },
        },
        required: ["propertyType"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      execute: async (input: { propertyType: SearchType; sizeMin?: number | null; sizeIdeal?: number | null; sizeMax?: number | null; cities?: string[]; locationMode?: "hard" | "preference" }) => {
        const patch = { sizeMin: input.sizeMin ?? null, sizeIdeal: input.sizeIdeal ?? null, sizeMax: input.sizeMax ?? null };
        if (!sizesOrdered(patch)) {
          return { content: [{ type: "text", text: "Minimum, ideal and maximum sizes must be ordered from smallest to largest." }], isError: true };
        }
        const next = { ...tools.current.search, ...patch, type: input.propertyType, cities: Array.isArray(input.cities) ? input.cities : [], locationMode: input.locationMode || "preference" };
        tools.current.update(next);
        tools.current.setStep(4);
        tools.current.setView("finder");
        return { content: [{ type: "text", text: `Search staged: ${searchHeadline(next)}. Review it on the page before showing matches.` }] };
      },
    });
    modelContext.registerTool({
      name: "show_property_matches",
      description: "Calculate and display explainable matches for the currently staged Deerfield property search. This never sends an inquiry.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      execute: async () => {
        const current = tools.current.search;
        if (!current.type) return { content: [{ type: "text", text: "No property search is configured yet." }], isError: true };
        const found = matchProperties(current);
        tools.current.setResults(found);
        tools.current.setView("results");
        history.replaceState({ view: "results" }, "", "#results");
        const names = [...found.eligible, ...found.verificationRequired].slice(0, 5).map((match) => match.property.name).join(", ");
        return { content: [{ type: "text", text: `${found.counts.eligible} strong matches and ${found.counts.verification_required} needing verification. Top results: ${names || "none"}.` }] };
      },
    });
  }, []);

  const last = step === 4;

  return (
    <>
      <main className="landing-shell" hidden={view === "results"}>
        <section className="intro">
          <p className="eyebrow">Find your space</p>
          <h1>A clearer way to find your <em>next space.</em></h1>
          <p className="lede">Tell us what your business needs. We’ll separate the essentials from the preferences and show how every available property fits.</p>
          <dl className="portfolio-stats">
            <div><dt>29</dt><dd>Public properties</dd></div>
            <div><dt>3</dt><dd>Space categories</dd></div>
            <div><dt>2 min</dt><dd>Guided search</dd></div>
          </dl>
        </section>

        <section className="finder-card" id="finder" ref={finder} aria-labelledby="space-question">
          <header className="finder-header">
            <div>
              <p className="card-title">Build your property search</p>
              <p>Your answers stay editable until you contact Deerfield.</p>
            </div>
            <p className="step-count">Step {step} of 4</p>
            <div className="progress" aria-label={`Step ${step} of 4`}>
              {[1, 2, 3, 4].map((index) => <i key={index} className={index <= step ? "complete" : undefined} />)}
            </div>
          </header>
          {/* Keyed on the step so the body remounts and the rise-in plays once per change. */}
          <div className={`finder-body${entering ? " step-enter" : ""}`} key={step}>
            <p className="eyebrow">{STEP_TITLES[step - 1]}</p>
            {step === 1 && <StepSpace search={search} update={update} error={stepError} />}
            {step === 2 && <StepLocation search={search} update={update} />}
            {step === 3 && <StepPriorities search={search} update={update} />}
            {step === 4 && <StepTiming search={search} update={update} />}
            <footer className="finder-actions split">
              {step === 1
                ? <button className="text-button" type="button" onClick={startOver}>Start over</button>
                : <button className="text-button" type="button" onClick={() => goTo((step - 1) as Step)}>Back</button>}
              <button
                className="primary-button"
                type="button"
                data-action={last ? "results" : "next"}
                disabled={!search.type}
                onClick={() => (last ? showResults() : validateStep() && goTo((step + 1) as Step))}
              >
                {last ? "Show matching properties" : "Continue"}
              </button>
            </footer>
          </div>
        </section>
      </main>

      <main className="results-view" id="results-view" hidden={view !== "results"} aria-live="polite">
        {results && view === "results" ? (
          <Results search={search} results={results} selected={selected} onToggleSelect={toggleSelect} onEdit={editSearch} onCompare={() => setCompareOpen(true)} onContact={openContact} />
        ) : null}
      </main>

      <CompareDialog open={compareOpen} search={search} matches={selectedMatches} onClose={() => setCompareOpen(false)} onContact={openContact} />
      <ContactModal
        open={contactOpen}
        search={search}
        matches={selectedMatches}
        delivery={delivery}
        availability={availability}
        onAvailabilityChange={setAvailability}
        onClose={() => setContactOpen(false)}
        onSent={() => {
          setAvailability(new Set());
          setContactOpen(false);
          setSentOpen(true);
        }}
        showToast={showToast}
      />
      <SentConfirmation open={sentOpen} onClose={() => setSentOpen(false)} />
      {toast}
    </>
  );
}
