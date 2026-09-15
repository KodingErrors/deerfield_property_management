"use client";

import { cities, featureSets, TYPE_LABELS, WEIGHT_LABELS, type Search, type SearchType, type Weight } from "@/lib/catalog";
import { hardRequirements, priorities, searchHeadline, TIMING_OPTIONS } from "@/lib/search";

export type StepProps = {
  search: Search;
  /** Merge a partial change into the search; the parent persists it. */
  update: (patch: Partial<Search>) => void;
};

const TYPE_CHOICES: Array<[SearchType, string, string, string]> = [
  ["industrial", "I", "Industrial", "Warehousing, distribution or production"],
  ["retail", "R", "Retail", "Storefront, restaurant or customer-facing space"],
  ["office", "O", "Office", "Professional, medical or administrative space"],
  ["unsure", "?", "I’m not sure", "Tell us how you plan to use the space"],
];

function parseSize(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function NumberField({ id, label, value, onChange }: { id: string; label: string; value: number | null; onChange: (value: number | null) => void }) {
  return (
    <label className="number-field" htmlFor={id}>
      <span>{label}</span>
      <span className="input-shell">
        <input id={id} inputMode="numeric" type="number" min={1} step={1} placeholder="No limit" defaultValue={value ?? ""} onChange={(event) => onChange(parseSize(event.target.value))} />
        <small>SF</small>
      </span>
    </label>
  );
}

export function StepSpace({ search, update, error }: StepProps & { error: string }) {
  return (
    <>
      <h2 id="space-question">What kind of space are you looking for?</h2>
      <p className="help">Choose the closest fit, then add any size boundaries you already know.</p>
      <div className="space-grid">
        {TYPE_CHOICES.map(([value, icon, label, description]) => (
          <button
            key={value}
            className="choice"
            type="button"
            data-type={value}
            aria-pressed={search.type === value}
            // Changing type resets the feature preferences, which are type-specific.
            onClick={() => update(search.type === value ? { type: value } : { type: value, features: [] })}
          >
            <span className="choice-icon">{icon}</span><span><strong>{label}</strong><small>{description}</small></span>
          </button>
        ))}
      </div>
      <fieldset className="field-panel">
        <legend>How much space do you need?</legend>
        <p className="field-note">Minimum and maximum are hard limits. Ideal size helps rank eligible properties.</p>
        <div className="number-grid">
          <NumberField id="size-min" label="Minimum" value={search.sizeMin} onChange={(sizeMin) => update({ sizeMin })} />
          <NumberField id="size-ideal" label="Ideal" value={search.sizeIdeal} onChange={(sizeIdeal) => update({ sizeIdeal })} />
          <NumberField id="size-max" label="Maximum" value={search.sizeMax} onChange={(sizeMax) => update({ sizeMax })} />
        </div>
        <p className="form-error" id="step-error" role="alert">{error}</p>
      </fieldset>
    </>
  );
}

export function StepLocation({ search, update }: StepProps) {
  function toggleCity(city: string, on: boolean) {
    const next = search.cities.filter((item) => item !== city);
    if (on) next.push(city);
    update({ cities: cities.filter((item) => next.includes(item)) });
  }
  return (
    <>
      <h2>Where would you like to be?</h2>
      <p className="help">Choose as many markets as you want, or leave all unselected to see every market.</p>
      <div className="city-grid">
        {cities.map((city) => (
          <label className="check-card" key={city}>
            <input type="checkbox" name="city" value={city} checked={search.cities.includes(city)} onChange={(event) => toggleCity(city, event.target.checked)} />
            <span>{city}</span>
          </label>
        ))}
      </div>
      <fieldset className="field-panel">
        <legend>Location strictness</legend>
        <label className="option-card">
          <input type="checkbox" id="location-only" checked={search.locationMode === "hard"} onChange={(event) => update({ locationMode: event.target.checked ? "hard" : "preference" })} />
          <span>
            <strong>Only show these locations</strong>
            <small>Leave out properties outside the markets you picked. Unchecked, other markets stay in the results and your markets rank higher.</small>
          </span>
        </label>
      </fieldset>
    </>
  );
}

export function StepPriorities({ search, update }: StepProps) {
  const activeFeatures = featureSets[search.type || "unsure"] || featureSets.unsure;

  function toggleFeature(key: string, label: string, on: boolean) {
    const features = search.features.filter((item) => item.key !== key);
    if (on) features.push({ key, label, weight: 2 });
    update({ features });
  }

  function setWeight(key: string, weight: Weight) {
    update({ features: search.features.map((item) => (item.key === key ? { ...item, weight } : item)) });
  }

  return (
    <>
      <h2>What matters most?</h2>
      <p className="help">Public listings do not confirm every feature. Unknown details stay visible and are never treated as a “no.”</p>
      <div className="priority-list">
        {activeFeatures.map(([key, label]) => {
          const preference = search.features.find((item) => item.key === key);
          return (
            <div className="priority-row" key={key}>
              <label>
                <input type="checkbox" data-feature={key} checked={Boolean(preference)} onChange={(event) => toggleFeature(key, label, event.target.checked)} />
                <span><strong>{label}</strong><small>Use this to rank suitable properties</small></span>
              </label>
              <label className="importance">
                <span>Importance</span>
                <select data-weight={key} disabled={!preference} value={preference?.weight ?? 2} onChange={(event) => setWeight(key, Number(event.target.value) as Weight)}>
                  {([1, 2, 3] as Weight[]).map((weight) => <option key={weight} value={weight}>{WEIGHT_LABELS[weight]}</option>)}
                </select>
              </label>
            </div>
          );
        })}
      </div>
      <aside className="data-note">
        <strong>Why preferences?</strong>
        <span>Only property type, location, confirmed availability and unit size can safely exclude a property in this first release.</span>
      </aside>
    </>
  );
}

export function StepTiming({ search, update }: StepProps) {
  const requirements = hardRequirements(search);
  const wants = priorities(search);
  return (
    <>
      <h2>When do you need the space?</h2>
      <div className="context-grid">
        <label className="wide-field">
          <span>Move-in timing</span>
          <select id="move-in" value={search.moveIn} onChange={(event) => update({ moveIn: event.target.value })}>
            {TIMING_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="wide-field">
          <span>What will the space be used for?</span>
          <textarea id="intended-use" rows={3} placeholder="For example: regional distribution and light assembly" value={search.intendedUse} onChange={(event) => update({ intendedUse: event.target.value })} />
        </label>
        <label className="wide-field">
          <span>Anything else we should know? <small>Optional</small></span>
          <textarea id="search-notes" rows={3} placeholder="Access, timing or operational context" value={search.notes} onChange={(event) => update({ notes: event.target.value })} />
        </label>
      </div>
      <section className="search-summary" aria-labelledby="summary-title">
        <div><p className="eyebrow">Your search</p><h3 id="summary-title">{searchHeadline(search)}</h3></div>
        <div className="summary-columns">
          <div><strong>Must have</strong><ul>{requirements.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><strong>Priorities</strong>{wants.length ? <ul>{wants.map((item) => <li key={item}>{item}</li>)}</ul> : <p>None selected</p>}</div>
        </div>
      </section>
    </>
  );
}

export const STEP_TITLES = ["Your space", "Location", "Priorities", "Timing & review"] as const;
export { TYPE_LABELS };
