// The canonical shape of an outgoing inquiry, shared by both review dialogs so they can
// show exactly what the server will send.
//
// worker/index.js deliberately repeats these rules instead of importing this file:
// the worker must stay importable on its own. tests/worker.test.mjs asserts the
// two stay identical by feeding this module's output through the worker unchanged.

export const SUBJECT_PREFIX = "[DEERFIELD]";
export const DEFAULT_RECIPIENT = "raiyanworks@gmail.com";
export const SUBJECT_MAX_LENGTH = 160;
export const BODY_MAX_LENGTH = 10000;
export const FALLBACK_SUBJECT = "Property inquiry";
// The prefix is re-applied after truncation, so the detail gets what is left of the budget.
export const SUBJECT_DETAIL_MAX_LENGTH = SUBJECT_MAX_LENGTH - SUBJECT_PREFIX.length - 1;

// Strip before truncating, so that running this over its own output is a no-op. Doing it
// the other way round lets a long subject shrink again on every pass.
export function enforceSubject(draft) {
  const detail = String(draft ?? "")
    .trim()
    .replace(/^\[DEERFIELD\]\s*/i, "")
    .trim()
    .slice(0, SUBJECT_DETAIL_MAX_LENGTH)
    .trim();
  return SUBJECT_PREFIX + " " + (detail || FALLBACK_SUBJECT);
}

export function enforceBody(draft) {
  return String(draft ?? "").trim().slice(0, BODY_MAX_LENGTH);
}
