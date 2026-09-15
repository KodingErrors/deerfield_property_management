import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { FLIGHT_MS, LINGER_MS, sentSchedule } from "../lib/sent-timing.js";

// The confirmation's timing is pure (lib/sent-timing.js); the wiring around it is checked
// by reading the components, since rendering React here would need a DOM and a build.
const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

test("the plane flies for one second before Sent! appears, then the modal lingers", () => {
  assert.equal(FLIGHT_MS, 1000);
  const { landAt, closeAt } = sentSchedule(false);
  assert.equal(landAt, FLIGHT_MS);
  assert.equal(closeAt, FLIGHT_MS + LINGER_MS);
  assert.ok(closeAt > landAt, "the confirmation must stay readable after the plane lands");
});

test("with reduced motion the copy appears immediately and still lingers", () => {
  const { landAt, closeAt } = sentSchedule(true);
  assert.equal(landAt, 0);
  assert.equal(closeAt, LINGER_MS);
});

test("the confirmation dialog shows the plane, then Sent!, and can be dismissed", () => {
  const source = read("components/sent-confirmation.tsx");
  assert.match(source, /id="sent-dialog"/);
  assert.match(source, /sent-plane/);
  assert.match(source, /Sent!/);
  assert.match(source, /sentSchedule/);
  // A click or Escape dismisses it, and the copy is gated on is-landed.
  assert.match(source, /onCancel=/);
  assert.match(source, /onClick=\{onClose\}/);
  assert.match(source, /is-landed/);
});

test("both inquiry paths render the send button through the shared component", () => {
  for (const path of ["components/contact-form.tsx", "components/wizard/contact-modal.tsx"]) {
    const source = read(path);
    assert.match(source, /<SendButton/, path);
    // Never write the label by hand: the component owns idle/sending/error.
    assert.doesNotMatch(source, /textContent\s*=/, path);
    assert.match(source, /setSendState\("sending"\)/, path);
  }
  const button = read("components/send-button.tsx");
  assert.match(button, /idle: "Send inquiry"/);
  assert.match(button, /sending: "Sending"/);
  assert.match(button, /error: "Try again"/);
  assert.match(button, /disabled=\{state === "sending"\}/);
});

test("every dialog closes through React state rather than the native close event", () => {
  // Calling element.close() and waiting for the close event to reach React leaves the
  // parent's `open` stuck true, and the modal will not reopen.
  for (const path of ["components/wizard/contact-modal.tsx", "components/wizard/compare-dialog.tsx", "components/sent-confirmation.tsx"]) {
    const source = read(path);
    assert.doesNotMatch(source, /onClose=\{onClose\}/, `${path} must not rely on the native close event`);
    assert.match(source, /onCancel=/, `${path} must handle Escape`);
  }
});
