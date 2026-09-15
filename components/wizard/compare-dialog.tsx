"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { formatCheckedDate, TYPE_LABELS, type Evaluation, type Match, type Search } from "@/lib/catalog";
import { unitSummary } from "@/lib/search";
import { statusLabel } from "./results";

type Props = {
  open: boolean;
  search: Search;
  matches: Match[];
  onClose: () => void;
  onContact: () => void;
};

function OutcomeCell({ item }: { item: Evaluation | undefined }) {
  if (!item || item.outcome === "unknown") return <span className="cell-unknown">? Not confirmed</span>;
  if (item.outcome === "match") return <span className="cell-match">✓ Confirmed</span>;
  if (item.outcome === "partial") return <span className="cell-partial">~ Partial fit</span>;
  return <span className="cell-miss">× Does not match</span>;
}

export function CompareDialog({ open, search, matches, onClose, onContact }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  // Driven by `open`; closes route through onClose so React stays in charge.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const rows: Array<{ label: string; render: (match: Match) => ReactNode }> = [
    { label: "Match", render: (match) => statusLabel(match.status, match.score) },
    { label: "Fit score", render: (match) => (match.score == null ? "—" : `${match.score} / 100`) },
    { label: "Market", render: (match) => match.property.city },
    { label: "Type", render: (match) => TYPE_LABELS[match.property.type] },
    { label: "Available space", render: (match) => unitSummary(match.property) },
    { label: "Source checked", render: () => formatCheckedDate() },
    ...search.features.map((preference) => ({
      label: preference.label,
      render: (match: Match) => <OutcomeCell item={match.preferences.find((item) => item.key === preference.key)} />,
    })),
  ];

  return (
    <dialog
      ref={dialog}
      className="modal compare-modal"
      id="compare-dialog"
      aria-labelledby="compare-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === dialog.current) onClose(); }}
    >
      <div id="compare-content">
        <header className="modal-header">
          <div><p className="eyebrow">Side by side</p><h2 id="compare-title">Compare properties</h2></div>
          <button className="icon-button" type="button" aria-label="Close comparison" onClick={onClose}>×</button>
        </header>
        <div className="compare-scroll">
          <table>
            <thead>
              <tr><th>Criteria</th>{matches.map((match) => <th key={match.property.id}>{match.property.name}<small>{match.property.city}, ON</small></th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}><th>{row.label}</th>{matches.map((match) => <td key={match.property.id}>{row.render(match)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="modal-footer">
          <button className="secondary-button" type="button" onClick={onClose}>Close</button>
          <button className="primary-button" type="button" onClick={onContact}>Contact Deerfield</button>
        </footer>
      </div>
    </dialog>
  );
}
