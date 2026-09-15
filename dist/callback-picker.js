// The callback-availability picker shared by the contact page and the wizard's contact
// modal. Two input modes — a drag-to-paint grid and a range builder ("list view") — write
// the same Set of "YYYY-MM-DD|HH:MM" slot keys, so either can be edited without the other
// losing state. The contact page ships the markup statically; the wizard generates it
// with callbackPickerMarkup(). Either way mountCallbackPicker() wires it up by the ids
// inside the root it is given, so one picker per page is the assumption.
import { SLOT_MINUTES, availabilityLines, mergedWindows, slotValue, slotsBetween, timeLabel, windowLabel } from "./callback-windows.js";

const TIME_ZONE = "America/Toronto";
// Business hours, 9:00 to 5:00 Eastern in half-hour slots.
export const CALLBACK_TIMES = Array.from({ length: 16 }, (_, index) => 9 * 60 + index * SLOT_MINUTES);

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function easternDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

// The next seven days, computed from Eastern time rather than the visitor's clock.
export function callbackDays() {
  const today = easternDateParts();
  const base = new Date(Date.UTC(today.year, today.month - 1, today.day));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base.getTime() + (index + 1) * 86400000);
    return {
      key: date.toISOString().slice(0, 10),
      long: new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(date),
      shortDay: new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: "UTC" }).format(date),
      shortDate: new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(date)
    };
  });
}

// Mirrors the fieldset in dist/contact/index.html; keep the two in step. The list view
// is the one shown first here — the wizard's modal is narrower than the contact page.
export function callbackPickerMarkup() {
  return '<fieldset class="callback-picker">' +
    '<legend>Callback availability</legend>' +
    '<div class="callback-header"><p>Select any 30-minute windows when Deerfield can call you.</p><button class="callback-mode-toggle" id="callback-mode-toggle" type="button">Switch to grid view</button></div>' +
    '<div id="callback-grid-view" hidden>' +
      '<p class="callback-hint">Drag across the grid to paint a block of time, and drag back over it to clear. Tap a day or a time heading to toggle that whole column or row.</p>' +
      '<div class="availability-scroll"><div class="availability-grid" id="callback-availability" role="group" aria-label="Callback availability for the next seven days"></div></div>' +
    '</div>' +
    '<div id="callback-range-builder">' +
      '<p class="callback-hint">Add the windows that suit you, one at a time.</p>' +
      '<div class="range-fields"><label><span>Day</span><select id="callback-range-day"></select></label><label><span>From</span><select id="callback-range-start"></select></label><label><span>To</span><select id="callback-range-end"></select></label><button class="secondary-button" id="callback-range-add" type="button">Add window</button></div>' +
      '<p class="range-status" id="callback-range-status" aria-live="polite"></p>' +
    '</div>' +
    '<div class="callback-summary" id="callback-range-chips" aria-live="polite"></div>' +
    '<p class="field-help" id="callback-phone-note" hidden>Add a phone number above if you would like Deerfield to call. Without one they will reply to these times by email.</p>' +
    '<small class="field-help">Callback times are shown from 9:00 a.m. to 5:00 p.m. Eastern. (Other times should be mentioned in the email if need be.)</small>' +
  '</fieldset>';
}

// mode: "grid", "list", or "auto" — auto picks by device (painting suits a mouse, the
// range builder suits a thumb) and follows viewport changes until the visitor overrides.
// `selected` may be passed in so a selection survives the picker being re-rendered.
export function mountCallbackPicker(root, { selected = new Set(), mode = "auto", phoneInput = null, onChange = () => {} } = {}) {
  const byId = (id) => root.querySelector("#" + id);
  const grid = byId("callback-availability");
  const gridView = byId("callback-grid-view");
  const rangeView = byId("callback-range-builder");
  const rangeDay = byId("callback-range-day");
  const rangeStart = byId("callback-range-start");
  const rangeEnd = byId("callback-range-end");
  const rangeAdd = byId("callback-range-add");
  const rangeChips = byId("callback-range-chips");
  const rangeStatus = byId("callback-range-status");
  const modeToggle = byId("callback-mode-toggle");
  const phoneNote = byId("callback-phone-note");
  const days = callbackDays();
  const times = CALLBACK_TIMES;

  grid.innerHTML = [
    '<span class="availability-corner">Eastern</span>',
    ...days.map((day) => `<button class="availability-day" type="button" data-day="${escapeHtml(day.key)}" aria-label="Toggle every time on ${escapeHtml(day.long)}"><strong>${escapeHtml(day.shortDay)}</strong><small>${escapeHtml(day.shortDate)}</small></button>`),
    ...times.flatMap((minutes) => [
      `<button class="availability-time" type="button" data-time="${minutes}" aria-label="Toggle ${timeLabel(minutes)} on every day">${timeLabel(minutes)}</button>`,
      ...days.map((day) => {
        const value = slotValue(day.key, minutes);
        const label = `${day.long} at ${timeLabel(minutes)} Eastern`;
        return `<label class="availability-cell" data-slot="${escapeHtml(value)}" title="${escapeHtml(label)}"><input type="checkbox" value="${escapeHtml(value)}" aria-label="${escapeHtml(label)}"><span aria-hidden="true"></span></label>`;
      })
    ])
  ].join("");

  function setSlot(value, on) {
    if (on) selected.add(value);
    else selected.delete(value);
  }

  // A phone number is never required; the note just explains what changes without one.
  function syncPhoneNote() {
    if (phoneNote) phoneNote.hidden = !(selected.size && !(phoneInput?.value || "").trim());
  }

  function renderChips() {
    syncPhoneNote();
    const windows = mergedWindows(selected, days, times);
    rangeChips.innerHTML = windows.length
      ? windows.map((window) => `<button class="callback-chip" type="button" data-day="${escapeHtml(window.day.key)}" data-start="${window.start}" data-end="${window.end}" aria-label="Remove ${escapeHtml(window.day.long)}, ${timeLabel(window.start)} to ${timeLabel(window.end)}"><span>${escapeHtml(window.day.shortDay)} ${escapeHtml(window.day.shortDate)} · ${windowLabel(window)}</span><b aria-hidden="true">×</b></button>`).join("")
      : '<p class="callback-empty">No callback windows selected yet.</p>';
    onChange(selected);
  }

  function syncViews() {
    for (const cell of grid.querySelectorAll(".availability-cell")) {
      cell.querySelector("input").checked = selected.has(cell.dataset.slot);
    }
    renderChips();
  }

  // Drag to paint a block of time. The first cell decides whether the whole drag selects
  // or clears, so dragging back over a painted block erases it.
  let paintMode = null;

  function paintCell(cell) {
    if (!cell || paintMode === null) return;
    setSlot(cell.dataset.slot, paintMode);
    cell.querySelector("input").checked = paintMode;
    renderChips();
  }

  grid.addEventListener("pointerdown", (event) => {
    const cell = event.target.closest(".availability-cell");
    if (!cell) return;
    event.preventDefault();
    paintMode = !selected.has(cell.dataset.slot);
    cell.querySelector("input").focus();
    paintCell(cell);
    grid.setPointerCapture(event.pointerId);
  });

  // Pointer capture routes every move (and the release) to the grid, so hit-test the cell
  // under the pointer rather than relying on pointerenter.
  grid.addEventListener("pointermove", (event) => {
    if (paintMode === null) return;
    paintCell(document.elementFromPoint(event.clientX, event.clientY)?.closest(".availability-cell"));
  });
  const endPaint = () => { paintMode = null; };
  grid.addEventListener("pointerup", endPaint);
  grid.addEventListener("pointercancel", endPaint);
  grid.addEventListener("lostpointercapture", endPaint);

  // Pointer painting calls preventDefault, so this only fires for keyboard toggles.
  grid.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    setSlot(event.target.value, event.target.checked);
    renderChips();
  });

  function toggleMany(values) {
    const selectAll = !values.every((value) => selected.has(value));
    for (const value of values) setSlot(value, selectAll);
    syncViews();
  }

  grid.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-day]");
    if (dayButton) {
      toggleMany(times.map((minutes) => slotValue(dayButton.dataset.day, minutes)));
      return;
    }
    const timeButton = event.target.closest("[data-time]");
    if (timeButton) toggleMany(days.map((day) => slotValue(day.key, Number(timeButton.dataset.time))));
  });

  rangeDay.innerHTML = days.map((day) => `<option value="${escapeHtml(day.key)}">${escapeHtml(day.long)}</option>`).join("");
  rangeStart.innerHTML = times.map((minutes) => `<option value="${minutes}">${timeLabel(minutes)}</option>`).join("");
  rangeEnd.innerHTML = times.map((minutes) => `<option value="${minutes + SLOT_MINUTES}">${timeLabel(minutes + SLOT_MINUTES)}</option>`).join("");
  rangeStart.value = String(times[0]);
  rangeEnd.value = String(times[0] + SLOT_MINUTES * 4);

  rangeStart.addEventListener("change", () => {
    if (Number(rangeEnd.value) <= Number(rangeStart.value)) {
      rangeEnd.value = String(Number(rangeStart.value) + SLOT_MINUTES);
    }
  });

  rangeAdd.addEventListener("click", () => {
    const start = Number(rangeStart.value);
    const end = Number(rangeEnd.value);
    if (end <= start) {
      rangeStatus.textContent = "Choose an end time later than the start time.";
      return;
    }
    for (const value of slotsBetween(rangeDay.value, start, end)) setSlot(value, true);
    const day = days.find((item) => item.key === rangeDay.value);
    rangeStatus.textContent = `Added ${day.long}, ${timeLabel(start)} – ${timeLabel(end)}.`;
    syncViews();
  });

  rangeChips.addEventListener("click", (event) => {
    const chip = event.target.closest(".callback-chip");
    if (!chip) return;
    for (const value of slotsBetween(chip.dataset.day, Number(chip.dataset.start), Number(chip.dataset.end))) {
      setSlot(value, false);
    }
    rangeStatus.textContent = "";
    syncViews();
  });

  const coarsePointer = matchMedia("(pointer: coarse), (max-width: 720px)");
  let current = mode === "auto" ? (coarsePointer.matches ? "list" : "grid") : mode;
  let visitorChoseMode = false;

  function applyMode() {
    gridView.hidden = current !== "grid";
    rangeView.hidden = current !== "list";
    modeToggle.textContent = current === "grid" ? "Switch to list view" : "Switch to grid view";
  }

  modeToggle.addEventListener("click", () => {
    current = current === "grid" ? "list" : "grid";
    visitorChoseMode = true;
    applyMode();
  });

  coarsePointer.addEventListener("change", (event) => {
    if (mode !== "auto" || visitorChoseMode) return;
    current = event.matches ? "list" : "grid";
    applyMode();
  });

  phoneInput?.addEventListener("input", syncPhoneNote);

  applyMode();
  syncViews();

  return {
    selected,
    days,
    times,
    lines: () => availabilityLines(selected, days, times),
    clear() {
      selected.clear();
      rangeStatus.textContent = "";
      syncViews();
    },
  };
}
