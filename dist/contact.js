import { properties } from "./data.js";
import { DEFAULT_RECIPIENT, enforceBody, enforceSubject } from "./inquiry-format.js";
import { SLOT_MINUTES, availabilityLines, mergedWindows, slotValue, slotsBetween, timeLabel, windowLabel } from "./callback-windows.js";
import { bindPhoneFormatting } from "./phone-format.js";
import "./site-shell.js";

const TIME_ZONE = "America/Toronto";
const form = document.querySelector("#inquiry-form");
const formStatus = document.querySelector("#form-status");
const propertyPicker = document.querySelector("#contact-property-picker");
const propertyToggle = document.querySelector("#contact-property-toggle");
const propertyMenu = document.querySelector("#contact-property-menu");
const propertyOptions = document.querySelector("#contact-property-options");
const propertySearch = document.querySelector("#contact-property-search");
const propertySummary = document.querySelector("#contact-property-summary");
const propertyChips = document.querySelector("#contact-property-chips");
const availabilityGrid = document.querySelector("#callback-availability");
const gridView = document.querySelector("#callback-grid-view");
const rangeView = document.querySelector("#callback-range-builder");
const rangeDay = document.querySelector("#callback-range-day");
const rangeStart = document.querySelector("#callback-range-start");
const rangeEnd = document.querySelector("#callback-range-end");
const rangeAdd = document.querySelector("#callback-range-add");
const rangeChips = document.querySelector("#callback-range-chips");
const rangeStatus = document.querySelector("#callback-range-status");
const modeToggle = document.querySelector("#callback-mode-toggle");
const callbackPhoneNote = document.querySelector("#callback-phone-note");
const reviewDialog = document.querySelector("#email-review-dialog");
const reviewSubject = document.querySelector("#email-review-subject");
const reviewBody = document.querySelector("#email-review-body");
const reviewTo = document.querySelector("#review-to");
const reviewFrom = document.querySelector("#review-from");
const reviewReplyTo = document.querySelector("#review-reply-to");
const reviewSubjectFinal = document.querySelector("#review-subject-final");
const reviewClose = document.querySelector("#email-review-close");
const reviewBack = document.querySelector("#email-review-back");
const sendButton = document.querySelector("#email-send-button");
const sendStatus = document.querySelector("#email-send-status");
const selectedPropertyIds = new Set();
const selectedAvailability = new Set();
let pendingInquiry = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function setPropertyMenu(open) {
  propertyMenu.hidden = !open;
  propertyToggle.setAttribute("aria-expanded", String(open));
  propertyPicker.classList.toggle("is-open", open);
  if (open) propertySearch.focus();
}

function renderPropertyOptions(query = "") {
  const needle = query.trim().toLowerCase();
  const filtered = properties.filter((item) => `${item.name} ${item.city}`.toLowerCase().includes(needle));
  propertyOptions.innerHTML = filtered.length
    ? filtered.map((item) => `<label class="property-option"><input type="checkbox" value="${escapeHtml(item.id)}" ${selectedPropertyIds.has(item.id) ? "checked" : ""}><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.city)}, ON</small></span></label>`).join("")
    : '<p class="property-empty">No properties match that search.</p>';
}

function renderSelectedProperties() {
  const selected = properties.filter((item) => selectedPropertyIds.has(item.id));
  propertySummary.textContent = selected.length ? `${selected.length} ${selected.length === 1 ? "property" : "properties"} selected — choose more` : "Choose properties";
  propertyChips.innerHTML = selected.map((item) => `<button type="button" data-remove-property="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}"><span>${escapeHtml(item.name)}</span><b aria-hidden="true">×</b></button>`).join("");
  renderPropertyOptions(propertySearch.value);
}

propertyToggle.addEventListener("click", () => setPropertyMenu(propertyMenu.hidden));
propertySearch.addEventListener("input", () => renderPropertyOptions(propertySearch.value));
propertyOptions.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  if (event.target.checked) selectedPropertyIds.add(event.target.value);
  else selectedPropertyIds.delete(event.target.value);
  renderSelectedProperties();
  setPropertyMenu(false);
  propertyToggle.focus();
});
propertyChips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-property]");
  if (!button) return;
  selectedPropertyIds.delete(button.dataset.removeProperty);
  renderSelectedProperties();
});
document.addEventListener("click", (event) => {
  if (!propertyMenu.hidden && !propertyPicker.contains(event.target)) setPropertyMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !propertyMenu.hidden) {
    setPropertyMenu(false);
    propertyToggle.focus();
  }
});

function easternDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

function callbackDays() {
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

const days = callbackDays();
const times = Array.from({ length: 16 }, (_, index) => 9 * 60 + index * SLOT_MINUTES);

availabilityGrid.innerHTML = [
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

function setSlot(value, selected) {
  if (selected) selectedAvailability.add(value);
  else selectedAvailability.delete(value);
}

function selectedWindows() {
  return mergedWindows(selectedAvailability, days, times);
}

// A phone number is never required; the note just explains what changes without one.
function syncCallbackPhoneNote() {
  callbackPhoneNote.hidden = !(selectedAvailability.size && !form.elements.phone.value.trim());
}

function renderWindowChips() {
  syncCallbackPhoneNote();
  const windows = selectedWindows();
  rangeChips.innerHTML = windows.length
    ? windows.map((window) => `<button class="callback-chip" type="button" data-day="${escapeHtml(window.day.key)}" data-start="${window.start}" data-end="${window.end}" aria-label="Remove ${escapeHtml(window.day.long)}, ${timeLabel(window.start)} to ${timeLabel(window.end)}"><span>${escapeHtml(window.day.shortDay)} ${escapeHtml(window.day.shortDate)} · ${windowLabel(window)}</span><b aria-hidden="true">×</b></button>`).join("")
    : '<p class="callback-empty">No callback windows selected yet.</p>';
}

function syncAvailabilityViews() {
  for (const cell of availabilityGrid.querySelectorAll(".availability-cell")) {
    cell.querySelector("input").checked = selectedAvailability.has(cell.dataset.slot);
  }
  renderWindowChips();
}

// Drag to paint a block of time. The first cell decides whether the whole drag selects
// or clears, so dragging back over a painted block erases it.
let paintMode = null;

function paintCell(cell) {
  if (!cell || paintMode === null) return;
  setSlot(cell.dataset.slot, paintMode);
  cell.querySelector("input").checked = paintMode;
  renderWindowChips();
}

availabilityGrid.addEventListener("pointerdown", (event) => {
  const cell = event.target.closest(".availability-cell");
  if (!cell) return;
  event.preventDefault();
  paintMode = !selectedAvailability.has(cell.dataset.slot);
  cell.querySelector("input").focus();
  paintCell(cell);
  availabilityGrid.setPointerCapture(event.pointerId);
});

// Pointer capture routes every move to the grid, so hit-test the cell under the pointer
// rather than relying on pointerenter.
availabilityGrid.addEventListener("pointermove", (event) => {
  if (paintMode === null) return;
  paintCell(document.elementFromPoint(event.clientX, event.clientY)?.closest(".availability-cell"));
});

function endPaint() {
  paintMode = null;
}

window.addEventListener("pointerup", endPaint);
window.addEventListener("pointercancel", endPaint);

// Pointer painting calls preventDefault, so this only fires for keyboard toggles.
availabilityGrid.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  setSlot(event.target.value, event.target.checked);
  renderWindowChips();
});

function toggleMany(values) {
  const selectAll = !values.every((value) => selectedAvailability.has(value));
  for (const value of values) setSlot(value, selectAll);
  syncAvailabilityViews();
}

availabilityGrid.addEventListener("click", (event) => {
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
  syncAvailabilityViews();
});

rangeChips.addEventListener("click", (event) => {
  const chip = event.target.closest(".callback-chip");
  if (!chip) return;
  for (const value of slotsBetween(chip.dataset.day, Number(chip.dataset.start), Number(chip.dataset.end))) {
    setSlot(value, false);
  }
  rangeStatus.textContent = "";
  syncAvailabilityViews();
});

// Painting suits a mouse; the range builder suits a thumb. Pick by device, but let the
// visitor override, and never let a viewport change discard their choice.
const coarsePointer = matchMedia("(pointer: coarse), (max-width: 720px)");
let availabilityMode = coarsePointer.matches ? "list" : "grid";
let visitorChoseMode = false;

function applyAvailabilityMode() {
  gridView.hidden = availabilityMode !== "grid";
  rangeView.hidden = availabilityMode !== "list";
  modeToggle.textContent = availabilityMode === "grid" ? "Switch to list view" : "Switch to grid view";
}

modeToggle.addEventListener("click", () => {
  availabilityMode = availabilityMode === "grid" ? "list" : "grid";
  visitorChoseMode = true;
  applyAvailabilityMode();
});

coarsePointer.addEventListener("change", (event) => {
  if (visitorChoseMode) return;
  availabilityMode = event.matches ? "list" : "grid";
  applyAvailabilityMode();
});

bindPhoneFormatting(form.elements.phone);
form.elements.phone.addEventListener("input", syncCallbackPhoneNote);

applyAvailabilityMode();
syncAvailabilityViews();

// The portfolio comparison hands over several properties at once.
for (const id of new URLSearchParams(location.search).getAll("property")) {
  if (properties.some((item) => item.id === id)) selectedPropertyIds.add(id);
}
renderSelectedProperties();

function selectedPropertyList() {
  return properties.filter((item) => selectedPropertyIds.has(item.id));
}

function formValues() {
  const data = new FormData(form);
  return {
    name: String(data.get("name") || "").trim(), email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(), company: String(data.get("company") || "").trim(),
    interest: String(data.get("interest") || "").trim(), message: String(data.get("message") || "").trim(),
    website: String(data.get("website") || "").trim()
  };
}

function buildInquiry(values) {
  const selected = selectedPropertyList();
  const callbacks = availabilityLines(selectedAvailability, days, times);
  const subjectDetail = selected.length === 1 ? selected[0].name : selected.length > 1 ? `${selected.length} properties` : values.interest;
  return {
    subject: `[DEERFIELD] Inquiry — ${subjectDetail}`,
    body: [
      "DEERFIELD DEAL DESK INQUIRY", "", `Name: ${values.name}`, `Email: ${values.email}`,
      `Phone: ${values.phone || "Not provided"}`, `Company: ${values.company || "Not provided"}`,
      `Interest: ${values.interest}`, "", "PROPERTIES",
      ...(selected.length ? selected.map((property) => `- ${property.name}, ${property.city}, ON`) : ["- No specific property"]),
      "", "CALLBACK AVAILABILITY (EASTERN TIME)",
      ...(callbacks.length ? callbacks : ["- No callback windows selected"]),
      "", "MESSAGE", values.message
    ].join("\n")
  };
}

// Ask the server where inquiries actually go instead of hardcoding an address in the
// dialog. The static preview has no /api, so fall back to the compiled-in default.
const deliveryConfig = { recipient: DEFAULT_RECIPIENT, from: null };

function renderEnvelope() {
  reviewTo.textContent = deliveryConfig.recipient;
  reviewFrom.textContent = deliveryConfig.from || "Deerfield Deal Desk";
  reviewReplyTo.textContent = pendingInquiry?.email || "—";
  reviewSubjectFinal.textContent = reviewSubject.value.trim() ? enforceSubject(reviewSubject.value) : "—";
}

fetch("/api/inquiry-config", { headers: { accept: "application/json" } })
  .then((response) => (response.ok ? response.json() : null))
  .then((config) => {
    if (!config) return;
    if (config.recipient) deliveryConfig.recipient = config.recipient;
    deliveryConfig.from = config.from || null;
    renderEnvelope();
  })
  .catch(() => {});

reviewSubject.addEventListener("input", renderEnvelope);

function closeReview() {
  reviewDialog.close();
  sendStatus.textContent = "";
}

reviewClose.addEventListener("click", closeReview);
reviewBack.addEventListener("click", closeReview);
reviewDialog.addEventListener("click", (event) => { if (event.target === reviewDialog) closeReview(); });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = formValues();
  if (!form.reportValidity()) return;
  pendingInquiry = { ...values, propertyIds: [...selectedPropertyIds], availability: [...selectedAvailability] };
  const email = buildInquiry(values);
  reviewSubject.value = enforceSubject(email.subject);
  reviewBody.value = email.body;
  renderEnvelope();
  sendStatus.textContent = "";
  reviewDialog.showModal();
});

sendButton.addEventListener("click", async () => {
  if (!pendingInquiry || !reviewSubject.value.trim() || !reviewBody.value.trim()) {
    sendStatus.textContent = "Add a subject and email message before sending.";
    return;
  }
  sendButton.disabled = true;
  sendButton.textContent = "Sending…";
  sendStatus.textContent = "Sending your inquiry securely…";
  try {
    const response = await fetch("/api/inquiries", {
      method: "POST", headers: { "content-type": "application/json" },
      // Send precisely what the dialog displayed.
      body: JSON.stringify({ ...pendingInquiry, subject: enforceSubject(reviewSubject.value), body: enforceBody(reviewBody.value), submissionId: crypto.randomUUID() })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The email could not be sent. Please try again.");
    sendStatus.textContent = "Your inquiry was sent to Deerfield successfully.";
    formStatus.textContent = "Your inquiry was sent to Deerfield successfully.";
    form.reset();
    selectedPropertyIds.clear();
    selectedAvailability.clear();
    syncAvailabilityViews();
    rangeStatus.textContent = "";
    renderSelectedProperties();
    pendingInquiry = null;
    setTimeout(() => reviewDialog.close(), 1400);
  } catch (error) {
    sendStatus.textContent = error instanceof Error ? error.message : "The email could not be sent. Please try again.";
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Send inquiry →";
  }
});
