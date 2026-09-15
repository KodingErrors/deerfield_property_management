import assert from "node:assert/strict";
import test, { mock } from "node:test";

// Just enough DOM for send-button.js: a dialog element with class list, open state and
// listeners, a document that can create and find it, and a matchMedia switch.
function fakeElement() {
  const listeners = {};
  const classes = new Set();
  return {
    id: "", className: "", innerHTML: "", disabled: false, open: false, attributes: {},
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
    dispatch(type) { (listeners[type] || []).forEach((handler) => handler()); },
    showModal() { this.open = true; },
    close() { this.open = false; this.dispatch("close"); },
  };
}

function installDom({ reducedMotion = false } = {}) {
  const body = { children: [], append(el) { this.children.push(el); } };
  globalThis.document = {
    body,
    querySelector: (selector) => body.children.find((el) => `#${el.id}` === selector) || null,
    createElement: () => fakeElement(),
  };
  globalThis.matchMedia = () => ({ matches: reducedMotion });
}

const { FLIGHT_MS, setSendState, showSentConfirmation } = await import("../dist/send-button.js");

test("setSendState renders the plane icon and the label for each state", () => {
  const button = fakeElement();
  setSendState(button, "sending");
  assert.equal(button.disabled, true);
  assert.equal(button.classList.contains("is-sending"), true);
  assert.match(button.innerHTML, /send-icon/);
  assert.match(button.innerHTML, /Sending/);
  setSendState(button, "error");
  assert.equal(button.disabled, false);
  assert.equal(button.classList.contains("is-sending"), false);
  assert.equal(button.classList.contains("is-error"), true);
  assert.match(button.innerHTML, /Try again/);
  setSendState(button, "idle");
  assert.equal(button.classList.contains("is-error"), false);
  assert.match(button.innerHTML, /Send inquiry/);
});

test("the confirmation flies for one second, then says Sent!, then dismisses itself", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    installDom();
    const pending = showSentConfirmation({ message: "On <its> way" });
    const dialog = document.querySelector("#sent-dialog");
    assert.equal(dialog.open, true, "opens immediately");
    assert.equal(dialog.classList.contains("is-landed"), false, "copy hidden while the plane flies");
    assert.match(dialog.innerHTML, /Sent!/);
    assert.match(dialog.innerHTML, /On &lt;its&gt; way/, "message is escaped");

    mock.timers.tick(FLIGHT_MS - 1);
    assert.equal(dialog.classList.contains("is-landed"), false);
    mock.timers.tick(1);
    await pending;
    assert.equal(dialog.classList.contains("is-landed"), true, "Sent! shows once the flight ends");
    assert.equal(dialog.open, true, "still open while it lingers");

    mock.timers.tick(2600);
    assert.equal(dialog.open, false, "closes itself after lingering");
  } finally {
    mock.timers.reset();
  }
});

test("a click dismisses the confirmation early and cancels the auto-close", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    installDom();
    showSentConfirmation();
    const dialog = document.querySelector("#sent-dialog");
    dialog.dispatch("click");
    assert.equal(dialog.open, false);
    dialog.open = true; // if the auto-close timer were still armed it would flip this back
    mock.timers.tick(FLIGHT_MS + 2600);
    assert.equal(dialog.open, true, "auto-close timer was cleared");
  } finally {
    mock.timers.reset();
  }
});

test("with reduced motion the copy appears immediately", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    installDom({ reducedMotion: true });
    const pending = showSentConfirmation();
    mock.timers.tick(0);
    await pending;
    assert.equal(document.querySelector("#sent-dialog").classList.contains("is-landed"), true);
  } finally {
    mock.timers.reset();
  }
});

test("reopening reuses the same dialog element and resets its state", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    installDom();
    const first = showSentConfirmation();
    mock.timers.tick(FLIGHT_MS);
    await first;
    const dialog = document.querySelector("#sent-dialog");
    dialog.close();
    showSentConfirmation();
    assert.equal(document.body.children.length, 1);
    assert.equal(dialog.classList.contains("is-landed"), false);
    assert.equal(dialog.open, true);
  } finally {
    mock.timers.reset();
  }
});
