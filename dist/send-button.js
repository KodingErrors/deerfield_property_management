// The "Send inquiry" button on both inquiry paths. It carries a paper-plane icon that
// takes off while the request is in flight and lands as a check mark when it succeeds,
// so the moment of sending is visible without a spinner or extra copy. The DOM is
// rebuilt on every state change so the label is never left half-updated.

const PLANE =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M21 3 10 14"/><path d="M21 3 14 21l-4-7-7-4Z"/></svg>';
const CHECK =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

const LABELS = { idle: "Send inquiry", sending: "Sending", sent: "Sent", error: "Try again" };

export function setSendState(button, state) {
  if (!button) return;
  button.classList.remove("is-sending", "is-sent", "is-error");
  if (state !== "idle") button.classList.add(`is-${state}`);
  button.disabled = state === "sending";
  button.innerHTML =
    `<span class="send-icon" aria-hidden="true">${state === "sent" ? CHECK : PLANE}</span>` +
    `<span class="send-label">${LABELS[state] || LABELS.idle}</span>`;
}

// After a successful send the button rests on "Sent" briefly so the check mark can be
// seen, then returns to idle so it can be used again.
export function settleSendState(button, delay = 2200) {
  setSendState(button, "sent");
  return new Promise((resolve) => {
    setTimeout(() => {
      if (button.classList.contains("is-sent")) setSendState(button, "idle");
      resolve();
    }, delay);
  });
}
