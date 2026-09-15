import { properties } from "./data.js";
import { DEFAULT_RECIPIENT, enforceBody, enforceSubject } from "./inquiry-format.js";
import { mountCallbackPicker } from "./callback-picker.js";
import { bindPhoneFormatting } from "./phone-format.js";
import { setSendState, showSentConfirmation } from "./send-button.js";
import "./site-shell.js";

const form = document.querySelector("#inquiry-form");
const formStatus = document.querySelector("#form-status");
const propertyPicker = document.querySelector("#contact-property-picker");
const propertyToggle = document.querySelector("#contact-property-toggle");
const propertyMenu = document.querySelector("#contact-property-menu");
const propertyOptions = document.querySelector("#contact-property-options");
const propertySearch = document.querySelector("#contact-property-search");
const propertySummary = document.querySelector("#contact-property-summary");
const propertyChips = document.querySelector("#contact-property-chips");
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

bindPhoneFormatting(form.elements.phone);
// The picker's markup is static in contact/index.html; this wires it. Mode is chosen by
// device here (grid for a mouse, list for a thumb) — the wizard's modal defaults to list.
const callbackPicker = mountCallbackPicker(document.querySelector(".callback-picker"), { mode: "auto", phoneInput: form.elements.phone });

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
  const callbacks = callbackPicker.lines();
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
  pendingInquiry = { ...values, propertyIds: [...selectedPropertyIds], availability: [...callbackPicker.selected] };
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
  setSendState(sendButton, "sending");
  sendStatus.textContent = "Sending your inquiry securely…";
  let sent = false;
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
    callbackPicker.clear();
    renderSelectedProperties();
    pendingInquiry = null;
    sent = true;
  } catch (error) {
    sendStatus.textContent = error instanceof Error ? error.message : "The email could not be sent. Please try again.";
  } finally {
    setSendState(sendButton, sent ? "idle" : "error");
  }
  if (sent) {
    reviewDialog.close();
    showSentConfirmation();
  }
});
