import { properties } from "./data.js";
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
const reviewDialog = document.querySelector("#email-review-dialog");
const reviewSubject = document.querySelector("#email-review-subject");
const reviewBody = document.querySelector("#email-review-body");
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

function timeLabel(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

const days = callbackDays();
const times = Array.from({ length: 16 }, (_, index) => 9 * 60 + index * 30);
availabilityGrid.innerHTML = [
  '<span class="availability-corner">Eastern</span>',
  ...days.map((day) => `<span class="availability-day"><strong>${day.shortDay}</strong><small>${day.shortDate}</small></span>`),
  ...times.flatMap((minutes) => [
    `<span class="availability-time">${timeLabel(minutes)}</span>`,
    ...days.map((day) => {
      const value = `${day.key}|${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      const label = `${day.long} at ${timeLabel(minutes)} Eastern`;
      return `<label class="availability-cell" title="${label}"><input type="checkbox" value="${value}" aria-label="${label}"><span aria-hidden="true"></span></label>`;
    })
  ])
].join("");

availabilityGrid.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  if (event.target.checked) selectedAvailability.add(event.target.value);
  else selectedAvailability.delete(event.target.value);
});

const selectedId = new URLSearchParams(location.search).get("property");
if (properties.some((item) => item.id === selectedId)) selectedPropertyIds.add(selectedId);
renderSelectedProperties();

function selectedPropertyList() {
  return properties.filter((item) => selectedPropertyIds.has(item.id));
}

function availabilityLines() {
  return days.flatMap((day) => {
    const selectedTimes = [...selectedAvailability]
      .filter((value) => value.startsWith(`${day.key}|`))
      .map((value) => {
        const [hour, minute] = value.split("|")[1].split(":").map(Number);
        return timeLabel(hour * 60 + minute);
      });
    return selectedTimes.length ? [`- ${day.long}: ${selectedTimes.join(", ")}`] : [];
  });
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
  const callbacks = availabilityLines();
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
  const phoneInput = form.elements.phone;
  phoneInput.setCustomValidity(selectedAvailability.size && !values.phone ? "Enter a phone number for your requested callback." : "");
  if (!form.reportValidity()) return;
  pendingInquiry = { ...values, propertyIds: [...selectedPropertyIds], availability: [...selectedAvailability] };
  const email = buildInquiry(values);
  reviewSubject.value = email.subject;
  reviewBody.value = email.body;
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
      body: JSON.stringify({ ...pendingInquiry, subject: reviewSubject.value, body: reviewBody.value, submissionId: crypto.randomUUID() })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The email could not be sent. Please try again.");
    sendStatus.textContent = "Your inquiry was sent to Deerfield successfully.";
    formStatus.textContent = "Your inquiry was sent to Deerfield successfully.";
    form.reset();
    selectedPropertyIds.clear();
    selectedAvailability.clear();
    availabilityGrid.querySelectorAll("input:checked").forEach((input) => { input.checked = false; });
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
