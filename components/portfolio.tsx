"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { cities, featureSets, formatCheckedDate, imageUrl, properties, TYPE_LABELS, type Property, type PropertyType } from "@/lib/catalog";

const PREFERRED_FEATURE_ORDER = ["parking", "transitAccess", "groundFloor", "privateEntrance", "elevator", "truckLevelLoading", "driveInDoors", "officeComponent", "outdoorStorage", "streetFrontage", "visibility", "signage"];
const FEATURE_LABELS = new Map(Object.values(featureSets).flat().map(([key, label]) => [key, label]));
const FEATURES = PREFERRED_FEATURE_ORDER.filter((key) => FEATURE_LABELS.has(key));
const TYPE_CHIPS: Array<["all" | PropertyType, string]> = [["all", "All"], ["office", "Office"], ["retail", "Retail"], ["industrial", "Industrial"]];

function unitSummary(item: Property) {
  if (!item.available) return "No space currently listed";
  if (!item.units.length) return "Availability listed — size to be confirmed";
  return item.units.map((unit) => `Unit ${unit.label} · ${unit.size.toLocaleString()} SF`).join(" · ");
}

function featureSummary(item: Property, selected: ReadonlySet<string>) {
  let confirmed = 0;
  let unknown = 0;
  for (const key of selected) {
    if (item.features[key] === true) confirmed += 1;
    else if (item.features[key] == null) unknown += 1;
  }
  const parts = [];
  if (confirmed) parts.push(`${confirmed} selected ${confirmed === 1 ? "feature" : "features"} confirmed`);
  if (unknown) parts.push(`${unknown} to verify`);
  return parts.join(" · ");
}

function FeatureCell({ value }: { value: boolean | null }) {
  if (value === true) return <span className="cell-match">✓ Confirmed</span>;
  if (value === false) return <span className="cell-miss">× Not available</span>;
  return <span className="cell-unknown">? Not confirmed</span>;
}

export function Portfolio() {
  const [query, setQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [includeUnknown, setIncludeUnknown] = useState(true);
  const [activeType, setActiveType] = useState<"all" | PropertyType>("all");
  const [selectedFeatures, setSelectedFeatures] = useState<ReadonlySet<string>>(new Set());
  // Selection survives filtering: narrowing the list should not silently drop a property
  // the visitor already picked.
  const [compareSelection, setCompareSelection] = useState<ReadonlySet<string>>(new Set());
  const compareDialog = useRef<HTMLDialogElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const cityNeedle = cityQuery.trim().toLowerCase();
    const confirmedCount = (item: Property) => [...selectedFeatures].filter((key) => item.features[key] === true).length;
    return properties
      .filter((item) => {
        const textMatch = !needle || item.name.toLowerCase().includes(needle);
        const cityMatch = !cityNeedle || item.city.toLowerCase().includes(cityNeedle);
        const typeMatch = activeType === "all" || item.type === activeType;
        const featureMatch = [...selectedFeatures].every((key) => item.features[key] === true || (includeUnknown && item.features[key] == null));
        return textMatch && cityMatch && typeMatch && featureMatch && (!availableOnly || item.available);
      })
      .sort((a, b) => (selectedFeatures.size ? confirmedCount(b) - confirmedCount(a) : 0));
  }, [query, cityQuery, availableOnly, includeUnknown, activeType, selectedFeatures]);

  function toggleFeature(key: string) {
    setSelectedFeatures((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleCompare(id: string) {
    setCompareSelection((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setCityQuery("");
    setAvailableOnly(false);
    setIncludeUnknown(true);
    setActiveType("all");
    setSelectedFeatures(new Set());
  }

  const chosen = properties.filter((item) => compareSelection.has(item.id));
  const contactHref = "/contact/?" + chosen.map((item) => `property=${encodeURIComponent(item.id)}`).join("&");
  const total = compareSelection.size;

  return (
    <>
      <section className="portfolio-toolbar" aria-label="Property filters">
        <label className="search-field">
          <span>Property name</span>
          <input id="portfolio-search" type="search" placeholder="Try Mainway or Applewood" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="search-field">
          <span>City</span>
          <input id="city-filter" type="search" list="portfolio-cities" placeholder="Start typing a city" autoComplete="address-level2" value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} />
          <datalist id="portfolio-cities">{cities.map((city) => <option key={city} value={city} />)}</datalist>
        </label>
        <fieldset>
          <legend>Property type</legend>
          <div className="filter-chips" id="type-filters">
            {TYPE_CHIPS.map(([value, label]) => (
              <button key={value} type="button" data-type={value} aria-pressed={activeType === value} onClick={() => setActiveType(value)}>{label}</button>
            ))}
          </div>
        </fieldset>
        <label className="available-toggle">
          <input id="available-only" type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
          <span>Available space only</span>
        </label>
      </section>

      <section className="feature-filter-panel" aria-labelledby="feature-filter-title">
        <div className="feature-filter-heading">
          <div>
            <p className="eyebrow">Space features</p>
            <h2 id="feature-filter-title">What does the property need?</h2>
            <p>Select any features to filter the portfolio. Listings with unconfirmed public data stay visible for broker verification unless you turn that option off.</p>
            <p className="data-caveat">Feature data is sample data for demonstration and is not drawn from Deerfield’s published listings. Confirm any feature with the broker.</p>
          </div>
          <button className="clear-filter-button" id="clear-filters" type="button" onClick={clearFilters}>Clear all filters</button>
        </div>
        <div className="feature-filter-chips" id="feature-filters" aria-label="Feature filters">
          {FEATURES.map((key) => {
            const on = selectedFeatures.has(key);
            return (
              <button key={key} type="button" data-feature={key} aria-pressed={on} onClick={() => toggleFeature(key)}>
                <span aria-hidden="true">{on ? "✓" : "+"}</span>{FEATURE_LABELS.get(key)}
              </button>
            );
          })}
        </div>
        <label className="unknown-toggle">
          <input id="include-unknown" type="checkbox" checked={includeUnknown} onChange={(event) => setIncludeUnknown(event.target.checked)} />
          <span><strong>Include listings that need confirmation</strong><small>Recommended because most public listings do not publish every building feature.</small></span>
        </label>
      </section>

      <div className="portfolio-heading">
        <p id="portfolio-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "property" : "properties"}</p>
        <p>Portfolio information checked {formatCheckedDate("long")}. Availability can change.</p>
      </div>

      <section className="portfolio-grid" id="portfolio-grid" aria-label="Deerfield properties">
        {filtered.length ? filtered.map((item) => {
          const photo = imageUrl(item);
          const selected = compareSelection.has(item.id);
          return (
            <article className="portfolio-card" key={item.id}>
              <Link className={`portfolio-card-visual card-photo-link ${photo ? "has-photo" : ""}`} href={item.sourceUrl} aria-label={`View ${item.name} details`}>
                {photo ? <img src={photo} alt={item.name} loading="lazy" /> : <span>{TYPE_LABELS[item.type]}</span>}
                <b className={`status-badge ${item.available ? "strong" : "verify"}`}>{item.available ? "Space available" : "Portfolio property"}</b>
                <span className="photo-hint" aria-hidden="true">View details</span>
              </Link>
              <div className="portfolio-card-copy">
                <p>{item.city}, Ontario</p>
                <h2>{item.name}</h2>
                <span>{unitSummary(item)}</span>
                {selectedFeatures.size ? <div className="card-feature-status">{featureSummary(item, selectedFeatures)}</div> : null}
                <div className="card-actions">
                  <Link href={item.sourceUrl} aria-label={`View ${item.name} details`}>View property details</Link>
                  <button className="card-compare" type="button" data-compare={item.id} aria-pressed={selected} onClick={() => toggleCompare(item.id)}>
                    {selected ? "✓ Selected" : "+ Compare"}
                  </button>
                </div>
              </div>
            </article>
          );
        }) : (
          <div className="portfolio-empty">
            <h2>No properties match those filters.</h2>
            <p>Try a different city or property type, clear a feature, or include listings whose features need confirmation.</p>
          </div>
        )}
      </section>

      <div className="compare-bar" id="compare-bar" hidden={total === 0}>
        <p id="compare-bar-count">{total === 1 ? "1 property selected — choose one more to compare" : `${total} properties selected`}</p>
        <div className="compare-bar-actions">
          <button className="secondary-button" id="compare-clear" type="button" onClick={() => setCompareSelection(new Set())}>Clear selection</button>
          <button className="primary-button" id="compare-open" type="button" disabled={total < 2} onClick={() => compareDialog.current?.showModal()}>Compare</button>
        </div>
      </div>

      <dialog
        className="modal compare-modal"
        id="portfolio-compare-dialog"
        ref={compareDialog}
        aria-labelledby="portfolio-compare-title"
        onClick={(event) => { if (event.target === compareDialog.current) compareDialog.current?.close(); }}
      >
        <div id="portfolio-compare-content">
          <header className="modal-header">
            <div>
              <p className="eyebrow">Side by side</p>
              <h2 id="portfolio-compare-title">Compare properties</h2>
              <p>Feature data is sample data for demonstration. Confirm anything that matters with the broker.</p>
            </div>
            <button className="dialog-close" type="button" aria-label="Close comparison" onClick={() => compareDialog.current?.close()}>×</button>
          </header>
          <div className="compare-scroll">
            <table>
              <thead>
                <tr><th>Criteria</th>{chosen.map((item) => <th key={item.id}>{item.name}<small>{item.city}, ON</small></th>)}</tr>
              </thead>
              <tbody>
                <tr><th>Market</th>{chosen.map((item) => <td key={item.id}>{item.city}, Ontario</td>)}</tr>
                <tr><th>Type</th>{chosen.map((item) => <td key={item.id}>{TYPE_LABELS[item.type]}</td>)}</tr>
                <tr><th>Status</th>{chosen.map((item) => <td key={item.id}>{item.available ? <span className="cell-match">Space available</span> : <span className="cell-unknown">No current space published</span>}</td>)}</tr>
                <tr><th>Available space</th>{chosen.map((item) => <td key={item.id}>{unitSummary(item)}</td>)}</tr>
                {FEATURES.map((key) => (
                  <tr key={key}><th>{FEATURE_LABELS.get(key)}</th>{chosen.map((item) => <td key={item.id}><FeatureCell value={item.features[key]} /></td>)}</tr>
                ))}
                <tr><th>Information checked</th>{chosen.map((item) => <td key={item.id}>{formatCheckedDate("long")}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <footer className="modal-footer">
            <button className="secondary-button" type="button" onClick={() => compareDialog.current?.close()}>Close</button>
            <Link className="primary-button" href={contactHref}>Contact about these</Link>
          </footer>
        </div>
      </dialog>
    </>
  );
}
