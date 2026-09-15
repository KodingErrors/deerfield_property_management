// The "Send inquiry" button on both inquiry paths, and the confirmation that follows it.
// The button itself stays quiet (a paper-plane icon that nudges on hover and a "Sending"
// state); the moment of sending is shown centre-screen instead: a modal in which the plane
// flies in over one second and then "Sent!" appears. Both paths share this so the
// experience is identical whichever form the visitor used.

const PLANE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M21 3 10 14"/><path d="M21 3 14 21l-4-7-7-4Z"/></svg>';

const LABELS = { idle: "Send inquiry", sending: "Sending", error: "Try again" };

export const FLIGHT_MS = 1000;
const LINGER_MS = 2600;

export function setSendState(button, state) {
  if (!button) return;
  button.classList.remove("is-sending", "is-error");
  if (state !== "idle") button.classList.add(`is-${state}`);
  button.disabled = state === "sending";
  button.innerHTML =
    `<span class="send-icon" aria-hidden="true">${PLANE}</span>` +
    `<span class="send-label">${LABELS[state] || LABELS.idle}</span>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

// Opens the confirmation modal. Resolves once the plane has landed and "Sent!" is showing,
// so callers can sequence anything that should wait for the visitor to have seen it.
// The modal dismisses itself after a short linger, or immediately on click / Escape.
export function showSentConfirmation({ message = "Your inquiry is on its way to Deerfield." } = {}) {
  let dialog = document.querySelector("#sent-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "sent-dialog";
    dialog.className = "sent-dialog";
    dialog.setAttribute("aria-labelledby", "sent-dialog-title");
    dialog.addEventListener("click", () => dialog.close());
    document.body.append(dialog);
  }
  dialog.classList.remove("is-landed");
  dialog.innerHTML =
    '<div class="sent-scene" aria-hidden="true">' +
      '<svg class="sent-trail" viewBox="0 0 320 160" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="6 8">' +
        '<path d="M14 142 C 90 138, 150 110, 196 76 S 262 34, 300 24"/></svg>' +
      `<span class="sent-plane">${PLANE}</span>` +
    "</div>" +
    '<div class="sent-copy">' +
      '<p class="sent-title" id="sent-dialog-title" role="status">Sent!</p>' +
      `<p class="sent-message">${escapeHtml(message)}</p>` +
      '<button class="secondary-button" type="button">Done</button>' +
    "</div>";
  dialog.showModal();

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flight = reduced ? 0 : FLIGHT_MS;
  const closeTimer = setTimeout(() => { if (dialog.open) dialog.close(); }, flight + LINGER_MS);
  dialog.addEventListener("close", () => clearTimeout(closeTimer), { once: true });

  return new Promise((resolve) => {
    setTimeout(() => {
      dialog.classList.add("is-landed");
      resolve(dialog);
    }, flight);
  });
}
