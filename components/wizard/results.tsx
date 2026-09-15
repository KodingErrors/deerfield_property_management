"use client";

import Link from "next/link";
import { formatCheckedDate, imageUrl, TYPE_LABELS, type Match, type MatchResults, type MatchStatus, type Search } from "@/lib/catalog";
import { searchHeadline, unitSummary } from "@/lib/search";

export function statusLabel(status: MatchStatus, score: number | null) {
  if (status === "verification_required") return "Verification required";
  return score == null ? "Meets requirements" : "Strong match";
}

type ResultsProps = {
  search: Search;
  results: MatchResults;
  selected: ReadonlySet<string>;
  onToggleSelect: (id: string) => void;
  onEdit: () => void;
  onCompare: () => void;
  onContact: () => void;
};

export function Results({ search, results, selected, onToggleSelect, onEdit, onCompare, onContact }: ResultsProps) {
  const totalMatches = results.counts.eligible + results.counts.verification_required;
  const matches = [...results.eligible, ...results.verificationRequired];
  return (
    <section className="results-shell">
      <header className="results-header">
        <div>
          <p className="eyebrow">Your matches</p>
          <h1>{totalMatches} {totalMatches === 1 ? "property fits" : "properties fit"} your requirements</h1>
          <p>{results.counts.eligible} strong {results.counts.eligible === 1 ? "match" : "matches"} · {results.counts.verification_required} need verification · {results.counts.excluded} excluded</p>
        </div>
        <div className="results-actions">
          <button className="secondary-button" type="button" data-results-action="edit" onClick={onEdit}>Edit search</button>
          <button className="secondary-button" type="button" data-results-action="compare" disabled={selected.size < 2} onClick={onCompare}>Compare {selected.size}</button>
          <button className="primary-button" type="button" data-results-action="contact" onClick={onContact}>Contact Deerfield</button>
        </div>
      </header>
      <aside className="results-summary">
        <strong>{searchHeadline(search)}</strong>
        <span>{search.cities.length ? search.cities.join(", ") : "All markets"} · Information checked {formatCheckedDate()}</span>
      </aside>
      {matches.length ? (
        <div className="results-grid">
          {matches.map((match, index) => (
            <MatchCard key={match.property.id} match={match} eager={index === 0} selected={selected.has(match.property.id)} onToggleSelect={() => onToggleSelect(match.property.id)} />
          ))}
        </div>
      ) : <EmptyState results={results} onEdit={onEdit} onContact={onContact} />}
      <Excluded results={results} />
    </section>
  );
}

function MatchCard({ match, eager, selected, onToggleSelect }: { match: Match; eager: boolean; selected: boolean; onToggleSelect: () => void }) {
  const property = match.property;
  const photo = imageUrl(property);
  const positive = [...match.hardMatches, ...match.preferences.filter((item) => item.outcome === "match" || item.outcome === "partial")].slice(0, 3);
  const unknowns = [...match.hardUnknowns, ...match.preferences.filter((item) => item.outcome === "unknown")];
  const badge = match.status === "verification_required" ? "verify" : "strong";
  return (
    <article className="property-card">
      <Link className={`property-visual card-photo-link ${photo ? "has-image" : ""}`} data-property-type={property.type} href={property.sourceUrl} aria-label={`View ${property.name} details`}>
        {photo ? <img src={photo} alt={`${property.name} exterior`} loading={eager ? "eager" : "lazy"} /> : <span aria-hidden="true">{TYPE_LABELS[property.type]}</span>}
        <span className={`status-badge ${badge}`}>{statusLabel(match.status, match.score)}</span>
        <span className="photo-hint" aria-hidden="true">View details</span>
      </Link>
      <div className="property-card-body">
        <div className="property-heading">
          <div><p>{TYPE_LABELS[property.type]}</p><h2>{property.name}</h2><span>{property.city}, ON</span></div>
          {match.score == null
            ? <div className="score text-score">Meets<br />requirements</div>
            : <div className="score"><strong>{match.score}</strong><span>/100 fit</span></div>}
        </div>
        <p className="unit-line">{unitSummary(property)}</p>
        <div className="reason-block">
          <strong>Why it matches</strong>
          <ul>{positive.map((item) => <li className="reason-positive" key={item.key}><span>✓</span>{item.reason}</li>)}</ul>
        </div>
        {unknowns.length ? (
          <div className="reason-block unknown">
            <strong>Needs confirmation</strong>
            <ul>{unknowns.slice(0, 3).map((item) => <li key={item.key}><span>?</span>{item.reason}</li>)}</ul>
          </div>
        ) : null}
        <details className="explanation">
          <summary>Full match explanation</summary>
          <ul>
            {[...match.hardMatches, ...match.hardUnknowns, ...match.preferences].map((item) => (
              <li key={item.key} data-outcome={item.outcome}><strong>{item.label}</strong><span>{item.reason}</span></li>
            ))}
          </ul>
        </details>
        <footer className="property-actions">
          <Link className="text-link" href={property.sourceUrl}>View property details</Link>
          <button className="select-button" type="button" data-select={property.id} aria-pressed={selected} onClick={onToggleSelect}>
            {selected ? "Selected ✓" : "Select to compare"}
          </button>
        </footer>
      </div>
    </article>
  );
}

function EmptyState({ results, onEdit, onContact }: { results: MatchResults; onEdit: () => void; onContact: () => void }) {
  const reasonCounts = new Map<string, number>();
  for (const match of results.excluded) {
    for (const failure of match.hardFailures) reasonCounts.set(failure.key, (reasonCounts.get(failure.key) || 0) + 1);
  }
  const topReason = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const label = topReason === "size" ? "size range" : topReason === "location" ? "location restriction" : "required property type";
  return (
    <section className="empty-state">
      <p className="eyebrow">No exact matches</p>
      <h2>Your {label} removed the remaining available properties.</h2>
      <p>We won’t loosen a hard requirement without you. Edit the search, or send Deerfield the requirement profile as-is.</p>
      <div>
        <button className="secondary-button" type="button" data-results-action="edit" onClick={onEdit}>Edit requirements</button>
        <button className="primary-button" type="button" data-results-action="contact" onClick={onContact}>Contact Deerfield anyway</button>
      </div>
    </section>
  );
}

function Excluded({ results }: { results: MatchResults }) {
  if (!results.excluded.length) return null;
  const count = results.excluded.length;
  return (
    <details className="excluded-list">
      <summary>See why {count} {count === 1 ? "property was" : "properties were"} excluded</summary>
      <div>
        {results.excluded.map((match) => (
          <article key={match.property.id}>
            <span>{TYPE_LABELS[match.property.type]}</span>
            <h3>{match.property.name}</h3>
            <p>{match.hardFailures.map((item) => item.reason).join(" ")}</p>
          </article>
        ))}
      </div>
    </details>
  );
}
