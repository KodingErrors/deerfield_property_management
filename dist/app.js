import { cities, featureSets, properties, SOURCE_CHECKED_AT } from "./data.js";
import { formatNumber, matchProperties } from "./matcher.js";
import { DEFAULT_RECIPIENT, enforceBody, enforceSubject } from "./inquiry-format.js";
import { bindPhoneFormatting } from "./phone-format.js";

const STORAGE_KEY = "deerfield-search-v1";
const THEME_KEY = "deerfield-theme";
const CONTACT_EMAIL = "info@deerfieldbrokerage.com";
const TYPE_LABELS = {
  industrial: "Industrial",
  retail: "Retail",
  office: "Office",
  unsure: "Any property type",
};
const WEIGHT_LABELS = { 1: "Low", 2: "Medium", 3: "High" };
const defaultSearch = {
  version: 1,
  type: null,
  sizeMin: null,
  sizeIdeal: null,
  sizeMax: null,
  cities: [],
  locationMode: "preference",
  features: [],
  moveIn: "",
  intendedUse: "",
  notes: "",
};

let search = loadSearch();
let step = 1;
let results = null;
const selected = new Set();

const root = document.documentElement;
const themeButton = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector("#theme-icon");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const landing = document.querySelector(".landing-shell");
const finder = document.querySelector("#finder");
const resultsView = document.querySelector("#results-view");
const compareDialog = document.querySelector("#compare-dialog");
const compareContent = document.querySelector("#compare-content");
const contactDialog = document.querySelector("#contact-dialog");
const contactContent = document.querySelector("#contact-content");
const menuButton = document.querySelector("#menu-toggle");
const menuClose = document.querySelector("#menu-close");
const mobileNavigation = document.querySelector("#mobile-navigation");
const mobileNavigationBackdrop = document.querySelector("#mobile-navigation-backdrop");

// Same delivery path as the contact page. The static preview has no /api, so fall back
// to the compiled-in default.
const deliveryConfig = { recipient: DEFAULT_RECIPIENT, from: null };

fetch("/api/inquiry-config", { headers: { accept: "application/json" } })
  .then((response) => (response.ok ? response.json() : null))
  .then((config) => {
    if (!config) return;
    if (config.recipient) deliveryConfig.recipient = config.recipient;
    deliveryConfig.from = config.from || null;
    updateEnvelope();
  })
  .catch(() => {});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadSearch() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || parsed.version !== 1) return structuredClone(defaultSearch);
    return {
      ...structuredClone(defaultSearch),
      ...parsed,
      cities: Array.isArray(parsed.cities) ? parsed.cities.filter((city) => cities.includes(city)) : [],
      features: Array.isArray(parsed.features) ? parsed.features : [],
    };
  } catch {
    return structuredClone(defaultSearch);
  }
}

function saveSearch() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(search));
}

function syncThemeControl() {
  const dark = root.dataset.theme === "dark";
  themeButton.setAttribute("aria-label", dark ? "Use light mode" : "Use dark mode");
  themeButton.title = dark ? "Use light mode" : "Use dark mode";
  themeIcon.textContent = dark ? "☀" : "◐";
  themeMeta.content = dark ? "#101410" : "#fbfcfa";
}

themeButton.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  syncThemeControl();
});

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  if (localStorage.getItem(THEME_KEY)) return;
  root.dataset.theme = event.matches ? "dark" : "light";
  syncThemeControl();
});

function progressMarkup() {
  return [1, 2, 3, 4]
    .map((index) => '<i class="' + (index <= step ? "complete" : "") + '"></i>')
    .join("");
}

function finderFrame(title, subtitle, body) {
  finder.innerHTML =
    '<header class="finder-header">' +
      '<div><p class="card-title">Build your property search</p><p>Your answers stay editable until you contact Deerfield.</p></div>' +
      '<p class="step-count">Step ' + step + ' of 4</p>' +
      '<div class="progress" aria-label="Step ' + step + ' of 4">' + progressMarkup() + '</div>' +
    '</header>' +
    '<div class="finder-body">' +
      '<p class="eyebrow">' + escapeHtml(title) + '</p>' +
      body +
      (subtitle ? '<p class="help">' + escapeHtml(subtitle) + '</p>' : "") +
    '</div>';
}

function renderStepOne() {
  const typeChoices = [
    ["industrial", "I", "Industrial", "Warehousing, distribution or production"],
    ["retail", "R", "Retail", "Storefront, restaurant or customer-facing space"],
    ["office", "O", "Office", "Professional, medical or administrative space"],
    ["unsure", "?", "I’m not sure", "Tell us how you plan to use the space"],
  ].map(([value, icon, label, description]) =>
    '<button class="choice" type="button" data-type="' + value + '" aria-pressed="' + String(search.type === value) + '">' +
      '<span class="choice-icon">' + icon + '</span><span><strong>' + label + '</strong><small>' + description + '</small></span>' +
    '</button>'
  ).join("");

  const body =
    '<h2 id="space-question">What kind of space are you looking for?</h2>' +
    '<p class="help">Choose the closest fit, then add any size boundaries you already know.</p>' +
    '<div class="space-grid">' + typeChoices + '</div>' +
    '<fieldset class="field-panel"><legend>How much space do you need?</legend>' +
      '<p class="field-note">Minimum and maximum are hard limits. Ideal size helps rank eligible properties.</p>' +
      '<div class="number-grid">' +
        numberField("size-min", "Minimum", search.sizeMin) +
        numberField("size-ideal", "Ideal", search.sizeIdeal) +
        numberField("size-max", "Maximum", search.sizeMax) +
      '</div>' +
      '<p class="form-error" id="step-error" role="alert"></p>' +
    '</fieldset>' +
    wizardActions(false, "Continue");
  finderFrame("Your space", "", body);
}

function numberField(id, label, value) {
  return '<label class="number-field" for="' + id + '"><span>' + label + '</span>' +
    '<span class="input-shell"><input id="' + id + '" inputmode="numeric" type="number" min="1" step="1" value="' +
    escapeHtml(value ?? "") + '" placeholder="No limit"><small>SF</small></span></label>';
}

function renderStepTwo() {
  const cityChoices = cities.map((city) =>
    '<label class="check-card"><input type="checkbox" name="city" value="' + escapeHtml(city) + '"' +
    (search.cities.includes(city) ? " checked" : "") + '><span>' + escapeHtml(city) + '</span></label>'
  ).join("");

  const body =
    '<h2>Where would you like to be?</h2>' +
    '<p class="help">Choose as many markets as you want, or leave all unselected to see every market.</p>' +
    '<div class="city-grid">' + cityChoices + '</div>' +
    '<fieldset class="field-panel"><legend>How strict is location?</legend>' +
      '<div class="radio-stack">' +
        radioOption("hard", "Only these locations", "Exclude properties outside your selected markets.") +
        radioOption("preference", "Prefer these locations", "Keep other markets in the results and rank selected ones higher.") +
      '</div>' +
    '</fieldset>' +
    wizardActions(true, "Continue");
  finderFrame("Location", "", body);
}

function radioOption(value, label, description) {
  return '<label class="radio-card"><input type="radio" name="location-mode" value="' + value + '"' +
    (search.locationMode === value ? " checked" : "") + '><span><strong>' + label + '</strong><small>' + description + '</small></span></label>';
}

function renderStepThree() {
  const activeType = search.type || "unsure";
  const activeFeatures = featureSets[activeType] || featureSets.unsure;
  const featureRows = activeFeatures.map(([key, label]) => {
    const preference = search.features.find((item) => item.key === key);
    const checked = Boolean(preference);
    const weight = preference?.weight || 2;
    return '<div class="priority-row">' +
      '<label><input type="checkbox" data-feature="' + key + '" data-label="' + escapeHtml(label) + '"' +
      (checked ? " checked" : "") + '><span><strong>' + escapeHtml(label) + '</strong><small>Use this to rank suitable properties</small></span></label>' +
      '<label class="importance"><span>Importance</span><select data-weight="' + key + '"' + (checked ? "" : " disabled") + '>' +
        weightOptions(weight) + '</select></label>' +
    '</div>';
  }).join("");

  const body =
    '<h2>What matters most?</h2>' +
    '<p class="help">Public listings do not confirm every feature. Unknown details stay visible and are never treated as a “no.”</p>' +
    '<div class="priority-list">' + featureRows + '</div>' +
    '<aside class="data-note"><strong>Why preferences?</strong><span>Only property type, location, confirmed availability and unit size can safely exclude a property in this first release.</span></aside>' +
    wizardActions(true, "Continue");
  finderFrame("Priorities", "", body);
}

function weightOptions(selected) {
  return [1, 2, 3].map((weight) =>
    '<option value="' + weight + '"' + (weight === selected ? " selected" : "") + '>' + WEIGHT_LABELS[weight] + '</option>'
  ).join("");
}

function renderStepFour() {
  const body =
    '<h2>When do you need the space?</h2>' +
    '<div class="context-grid">' +
      '<label class="wide-field"><span>Move-in timing</span><select id="move-in">' +
        timingOptions() +
      '</select></label>' +
      '<label class="wide-field"><span>What will the space be used for?</span><textarea id="intended-use" rows="3" placeholder="For example: regional distribution and light assembly">' + escapeHtml(search.intendedUse) + '</textarea></label>' +
      '<label class="wide-field"><span>Anything else we should know? <small>Optional</small></span><textarea id="search-notes" rows="3" placeholder="Access, timing or operational context">' + escapeHtml(search.notes) + '</textarea></label>' +
    '</div>' +
    '<section class="search-summary" aria-labelledby="summary-title">' +
      '<div><p class="eyebrow">Your search</p><h3 id="summary-title">' + escapeHtml(searchHeadline()) + '</h3></div>' +
      '<div class="summary-columns">' + searchSummaryMarkup() + '</div>' +
    '</section>' +
    wizardActions(true, "Show matching properties", true);
  finderFrame("Timing & review", "", body);
}

function timingOptions() {
  const options = [
    ["", "Select timing"],
    ["immediate", "Immediately"],
    ["within-3", "Within 3 months"],
    ["3-6", "3–6 months"],
    ["6-12", "6–12 months"],
    ["12-plus", "12+ months"],
    ["flexible", "Flexible"],
  ];
  return options.map(([value, label]) =>
    '<option value="' + value + '"' + (search.moveIn === value ? " selected" : "") + '>' + label + '</option>'
  ).join("");
}

function wizardActions(showBack, nextLabel, resultsAction = false) {
  return '<footer class="finder-actions split">' +
    (showBack ? '<button class="text-button" type="button" data-action="back">← Back</button>' : '<button class="text-button" type="button" data-action="start-over">Start over</button>') +
    '<button class="primary-button" type="button" data-action="' + (resultsAction ? "results" : "next") + '"' +
    (!search.type ? " disabled" : "") + '>' + nextLabel + ' <span aria-hidden="true">→</span></button>' +
  '</footer>';
}

function readNumber(id) {
  const field = document.querySelector("#" + id);
  if (!field || field.value.trim() === "") return null;
  const value = Number(field.value);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function captureCurrentStep() {
  if (step === 1) {
    search.sizeMin = readNumber("size-min");
    search.sizeIdeal = readNumber("size-ideal");
    search.sizeMax = readNumber("size-max");
    const values = [search.sizeMin, search.sizeIdeal, search.sizeMax].filter((value) => value != null);
    const ordered = values.every((value, index) => index === 0 || value >= values[index - 1]);
    if (!ordered) {
      const error = document.querySelector("#step-error");
      if (error) error.textContent = "Enter size values from smallest to largest.";
      return false;
    }
  }
  if (step === 2) {
    search.cities = [...document.querySelectorAll('input[name="city"]:checked')].map((input) => input.value);
    search.locationMode = document.querySelector('input[name="location-mode"]:checked')?.value || "preference";
  }
  if (step === 4) {
    search.moveIn = document.querySelector("#move-in")?.value || "";
    search.intendedUse = document.querySelector("#intended-use")?.value.trim() || "";
    search.notes = document.querySelector("#search-notes")?.value.trim() || "";
  }
  saveSearch();
  return true;
}

function renderWizard() {
  landing.hidden = false;
  resultsView.hidden = true;
  if (step === 1) renderStepOne();
  if (step === 2) renderStepTwo();
  if (step === 3) renderStepThree();
  if (step === 4) renderStepFour();
  finder.scrollIntoView({ behavior: "smooth", block: "start" });
}

finder.addEventListener("click", (event) => {
  const typeChoice = event.target.closest("[data-type]");
  if (typeChoice) {
    const nextType = typeChoice.dataset.type;
    if (search.type !== nextType) search.features = [];
    search.type = nextType;
    saveSearch();
    renderStepOne();
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "next" && captureCurrentStep()) {
    step = Math.min(4, step + 1);
    renderWizard();
  }
  if (action === "back" && captureCurrentStep()) {
    step = Math.max(1, step - 1);
    renderWizard();
  }
  if (action === "results" && captureCurrentStep()) showResults();
  if (action === "start-over") resetSearch();
});

finder.addEventListener("change", (event) => {
  const featureInput = event.target.closest("[data-feature]");
  if (featureInput) {
    const key = featureInput.dataset.feature;
    search.features = search.features.filter((item) => item.key !== key);
    if (featureInput.checked) {
      search.features.push({ key, label: featureInput.dataset.label, weight: 2 });
    }
    saveSearch();
    renderStepThree();
    return;
  }
  const weightSelect = event.target.closest("[data-weight]");
  if (weightSelect) {
    const preference = search.features.find((item) => item.key === weightSelect.dataset.weight);
    if (preference) preference.weight = Number(weightSelect.value);
    saveSearch();
  }
});

function resetSearch() {
  const hasWork = search.type || search.cities.length || search.features.length || search.intendedUse;
  if (hasWork && !confirm("Start a new search and clear these answers?")) return;
  search = structuredClone(defaultSearch);
  selected.clear();
  step = 1;
  saveSearch();
  renderWizard();
}

function searchHeadline() {
  const type = search.type ? TYPE_LABELS[search.type] : "Commercial property";
  const size = formatSizeRange();
  return size ? type + " · " + size : type;
}

function formatSizeRange() {
  if (search.sizeMin != null && search.sizeMax != null) {
    return formatNumber(search.sizeMin) + "–" + formatNumber(search.sizeMax) + " SF";
  }
  if (search.sizeMin != null) return formatNumber(search.sizeMin) + "+ SF";
  if (search.sizeMax != null) return "Up to " + formatNumber(search.sizeMax) + " SF";
  if (search.sizeIdeal != null) return "About " + formatNumber(search.sizeIdeal) + " SF";
  return "";
}

function searchSummaryMarkup() {
  const requirements = [
    search.type && search.type !== "unsure" ? TYPE_LABELS[search.type] : null,
    formatSizeRange() || null,
    search.locationMode === "hard" && search.cities.length ? search.cities.join(" or ") : null,
    "Listed as available",
  ].filter(Boolean);
  const preferences = [
    search.locationMode === "preference" && search.cities.length
      ? search.cities.join(", ") + " — High"
      : null,
    ...search.features.map((item) => item.label + " — " + WEIGHT_LABELS[item.weight]),
  ].filter(Boolean);
  return '<div><strong>Must have</strong><ul>' +
    requirements.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") +
    '</ul></div><div><strong>Priorities</strong>' +
    (preferences.length ? "<ul>" + preferences.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>" : "<p>None selected</p>") +
    '</div>';
}

function showResults() {
  results = matchProperties(search, properties);
  landing.hidden = true;
  resultsView.hidden = false;
  history.pushState({ view: "results" }, "", "#results");
  renderResults();
  scrollTo({ top: 0, behavior: "smooth" });
}

function renderResults() {
  const totalMatches = results.counts.eligible + results.counts.verification_required;
  const matches = [...results.eligible, ...results.verificationRequired];
  resultsView.innerHTML =
    '<section class="results-shell">' +
      '<header class="results-header">' +
        '<div><p class="eyebrow">Your matches</p><h1>' + totalMatches + ' ' + (totalMatches === 1 ? "property fits" : "properties fit") + ' your requirements</h1>' +
        '<p>' + results.counts.eligible + ' strong ' + (results.counts.eligible === 1 ? "match" : "matches") + ' · ' +
        results.counts.verification_required + ' need verification · ' + results.counts.excluded + ' excluded</p></div>' +
        '<div class="results-actions">' +
          '<button class="secondary-button" type="button" data-results-action="edit">Edit search</button>' +
          '<button class="secondary-button" type="button" data-results-action="compare"' + (selected.size < 2 ? " disabled" : "") + '>Compare ' + selected.size + '</button>' +
          '<button class="primary-button" type="button" data-results-action="contact">Contact Deerfield</button>' +
        '</div>' +
      '</header>' +
      '<aside class="results-summary"><strong>' + escapeHtml(searchHeadline()) + '</strong><span>' +
        (search.cities.length ? escapeHtml(search.cities.join(", ")) : "All markets") +
        ' · Information checked ' + formatDate(SOURCE_CHECKED_AT) + '</span></aside>' +
      (matches.length ? '<div class="results-grid">' + matches.map(renderMatchCard).join("") + '</div>' : renderEmptyState()) +
      renderExcluded() +
    '</section>';
}

function renderMatchCard(match, index) {
  const property = match.property;
  const selectedNow = selected.has(property.id);
  const positive = [
    ...match.hardMatches,
    ...match.preferences.filter((item) => item.outcome === "match" || item.outcome === "partial"),
  ].slice(0, 3);
  const unknowns = [
    ...match.hardUnknowns,
    ...match.preferences.filter((item) => item.outcome === "unknown"),
  ];
  const visual = property.image
    ? '<img src="' + property.image + '" alt="' + escapeHtml(property.name + " exterior") + '" loading="' + (index ? "lazy" : "eager") + '">'
    : '<span aria-hidden="true">' + escapeHtml(TYPE_LABELS[property.type]) + '</span>';
  return '<article class="property-card">' +
    '<a class="property-visual card-photo-link ' + (property.image ? "has-image" : "") + '" data-property-type="' + property.type +
      '" href="' + property.sourceUrl + '" aria-label="View ' + escapeHtml(property.name) + ' details">' + visual +
      '<span class="status-badge ' + statusClass(match.status) + '">' + statusLabel(match.status, match.score) + '</span>' +
      '<span class="photo-hint" aria-hidden="true">View details</span></a>' +
    '<div class="property-card-body">' +
      '<div class="property-heading"><div><p>' + escapeHtml(TYPE_LABELS[property.type]) + '</p><h2>' + escapeHtml(property.name) + '</h2><span>' +
      escapeHtml(property.city + ", ON") + '</span></div>' +
      (match.score == null ? '<div class="score text-score">Meets<br>requirements</div>' : '<div class="score"><strong>' + match.score + '</strong><span>/100 fit</span></div>') +
      '</div>' +
      '<p class="unit-line">' + escapeHtml(unitSummary(property)) + '</p>' +
      '<div class="reason-block"><strong>Why it matches</strong><ul>' +
        positive.map((item) => '<li class="reason-positive"><span>✓</span>' + escapeHtml(item.reason) + '</li>').join("") +
      '</ul></div>' +
      (unknowns.length ? '<div class="reason-block unknown"><strong>Needs confirmation</strong><ul>' +
        unknowns.slice(0, 3).map((item) => '<li><span>?</span>' + escapeHtml(item.reason) + '</li>').join("") +
      '</ul></div>' : "") +
      '<details class="explanation"><summary>Full match explanation</summary>' +
        '<ul>' + [...match.hardMatches, ...match.hardUnknowns, ...match.preferences].map((item) =>
          '<li data-outcome="' + item.outcome + '"><strong>' + escapeHtml(item.label) + '</strong><span>' + escapeHtml(item.reason) + '</span></li>'
        ).join("") + '</ul></details>' +
      '<footer class="property-actions">' +
        '<a class="text-link" href="' + property.sourceUrl + '">View property details →</a>' +
        '<button class="select-button" type="button" data-select="' + property.id + '" aria-pressed="' + selectedNow + '">' +
          (selectedNow ? "Selected ✓" : "Select to compare") + '</button>' +
      '</footer>' +
    '</div></article>';
}

function statusLabel(status, score) {
  if (status === "verification_required") return "Verification required";
  return score == null ? "Meets requirements" : "Strong match";
}

function statusClass(status) {
  return status === "verification_required" ? "verify" : "strong";
}

function unitSummary(property) {
  if (!property.units.length) return property.available
    ? "Available unit · square footage not confirmed"
    : "No units currently listed";
  if (property.units.length === 1) {
    return "Unit " + property.units[0].label + " · " + formatNumber(property.units[0].size) + " SF available";
  }
  const sizes = property.units.map((unit) => unit.size);
  return property.units.length + " units · " + formatNumber(Math.min(...sizes)) + "–" + formatNumber(Math.max(...sizes)) + " SF available";
}

function renderEmptyState() {
  const reasonCounts = new Map();
  results.excluded.forEach((match) => match.hardFailures.forEach((failure) =>
    reasonCounts.set(failure.key, (reasonCounts.get(failure.key) || 0) + 1)
  ));
  const topReason = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const label = topReason === "size" ? "size range" : topReason === "location" ? "location restriction" : "required property type";
  return '<section class="empty-state"><p class="eyebrow">No exact matches</p><h2>Your ' + label + ' removed the remaining available properties.</h2>' +
    '<p>We won’t loosen a hard requirement without you. Edit the search, or send Deerfield the requirement profile as-is.</p>' +
    '<div><button class="secondary-button" type="button" data-results-action="edit">Edit requirements</button>' +
    '<button class="primary-button" type="button" data-results-action="contact">Contact Deerfield anyway</button></div></section>';
}

function renderExcluded() {
  if (!results.excluded.length) return "";
  return '<details class="excluded-list"><summary>See why ' + results.excluded.length + ' ' +
    (results.excluded.length === 1 ? "property was" : "properties were") + ' excluded</summary><div>' +
    results.excluded.map((match) =>
      '<article><span>' + escapeHtml(TYPE_LABELS[match.property.type]) + '</span><h3>' + escapeHtml(match.property.name) + '</h3><p>' +
      escapeHtml(match.hardFailures.map((item) => item.reason).join(" ")) + '</p></article>'
    ).join("") + '</div></details>';
}

resultsView.addEventListener("click", (event) => {
  const selectedButton = event.target.closest("[data-select]");
  if (selectedButton) {
    const id = selectedButton.dataset.select;
    if (selected.has(id)) selected.delete(id);
    else if (selected.size < 4) selected.add(id);
    else return showToast("Compare up to four properties at a time.");
    renderResults();
    return;
  }
  const action = event.target.closest("[data-results-action]")?.dataset.resultsAction;
  if (action === "edit") {
    step = 4;
    history.pushState({ view: "finder" }, "", "#finder");
    renderWizard();
  }
  if (action === "compare") openCompare();
  if (action === "contact") openContact();
});

function selectedMatches() {
  if (!results) return [];
  return [...results.eligible, ...results.verificationRequired]
    .filter((match) => selected.has(match.property.id));
}

function openCompare() {
  const matches = selectedMatches();
  if (matches.length < 2) return showToast("Select at least two properties to compare.");
  const featureRows = search.features.map((preference) => ({
    label: preference.label,
    render: (match) => outcomeCell(match.preferences.find((item) => item.key === preference.key)),
  }));
  const rows = [
    { label: "Match", render: (match) => statusLabel(match.status, match.score) },
    { label: "Fit score", render: (match) => match.score == null ? "—" : match.score + " / 100" },
    { label: "Market", render: (match) => match.property.city },
    { label: "Type", render: (match) => TYPE_LABELS[match.property.type] },
    { label: "Available space", render: (match) => unitSummary(match.property) },
    { label: "Source checked", render: () => formatDate(SOURCE_CHECKED_AT) },
    ...featureRows,
  ];
  compareContent.innerHTML =
    '<header class="modal-header"><div><p class="eyebrow">Side by side</p><h2 id="compare-title">Compare properties</h2></div>' +
    '<button class="icon-button" type="button" data-close="compare" aria-label="Close comparison">×</button></header>' +
    '<div class="compare-scroll"><table><thead><tr><th>Criteria</th>' +
    matches.map((match) => '<th>' + escapeHtml(match.property.name) + '<small>' + escapeHtml(match.property.city + ", ON") + '</small></th>').join("") +
    '</tr></thead><tbody>' +
    rows.map((row) => '<tr><th>' + escapeHtml(row.label) + '</th>' +
      matches.map((match) => '<td>' + row.render(match) + '</td>').join("") + '</tr>').join("") +
    '</tbody></table></div>' +
    '<footer class="modal-footer"><button class="secondary-button" type="button" data-close="compare">Close</button>' +
    '<button class="primary-button" type="button" data-compare-contact>Contact Deerfield</button></footer>';
  compareDialog.showModal();
}

function outcomeCell(item) {
  if (!item || item.outcome === "unknown") return '<span class="cell-unknown">? Not confirmed</span>';
  if (item.outcome === "match") return '<span class="cell-match">✓ Confirmed</span>';
  if (item.outcome === "partial") return '<span class="cell-partial">~ Partial fit</span>';
  return '<span class="cell-miss">× Does not match</span>';
}

compareDialog.addEventListener("click", (event) => {
  if (event.target.closest('[data-close="compare"]')) compareDialog.close();
  if (event.target.closest("[data-compare-contact]")) {
    compareDialog.close();
    openContact();
  }
});

function openContact() {
  const matches = selectedMatches();
  contactContent.innerHTML =
    '<header class="modal-header"><div><p class="eyebrow">Review before contacting</p><h2 id="contact-title">Your requirement packet</h2>' +
    '<p>Everything remains editable. Send it straight to Deerfield, or open it in your own email app.</p></div>' +
    '<button class="icon-button" type="button" data-close="contact" aria-label="Close contact form">×</button></header>' +
    '<div class="contact-layout"><form id="contact-form" novalidate>' +
      '<div class="form-grid">' +
        contactField("contact-name", "Full name", "", "text", true) +
        contactField("contact-email", "Email", "", "email", true) +
        contactField("contact-phone", "Phone", "", "tel", false) +
        contactField("contact-company", "Company", "", "text", false) +
      '</div>' +
      '<label class="wide-field"><span>Intended use <b aria-hidden="true">*</b></span><textarea id="contact-use" rows="3" required>' + escapeHtml(search.intendedUse) + '</textarea></label>' +
      '<label class="wide-field"><span>Additional information</span><textarea id="contact-notes" rows="4">' + escapeHtml(search.notes) + '</textarea></label>' +
      '<fieldset class="selected-properties"><legend>Properties of interest</legend>' +
        (matches.length ? matches.map((match) => '<label><input type="checkbox" name="contact-property" value="' + match.property.id + '" checked><span><strong>' +
          escapeHtml(match.property.name) + '</strong><small>' + escapeHtml(match.property.city + ", ON") + '</small></span></label>').join("")
          : '<p>No property selected. Deerfield will receive your requirements only.</p>') +
      '</fieldset>' +
      '<p class="form-error" id="contact-error" role="alert"></p>' +
    '</form><aside class="packet-preview"><p class="eyebrow">Email preview</p>' +
      '<dl class="review-envelope" id="wizard-envelope">' +
        '<div><dt>To</dt><dd id="wizard-to">' + escapeHtml(deliveryConfig.recipient) + '</dd></div>' +
        '<div><dt>From</dt><dd id="wizard-from">' + escapeHtml(deliveryConfig.from || "Deerfield Deal Desk") + '</dd></div>' +
        '<div><dt>Reply-To</dt><dd id="wizard-reply-to">—</dd></div>' +
        '<div><dt>Subject</dt><dd id="wizard-subject">—</dd></div>' +
      '</dl><pre id="packet-preview"></pre></aside></div>' +
    '<footer class="modal-footer"><p class="form-status" id="wizard-send-status" aria-live="polite"></p>' +
    '<button class="secondary-button" type="button" data-copy-inquiry>Copy inquiry</button>' +
    '<button class="secondary-button" type="button" data-open-email>Open in email app <span aria-hidden="true">↗</span></button>' +
    '<button class="primary-button" type="button" data-send-inquiry>Send inquiry →</button></footer>';
  bindPhoneFormatting(document.querySelector("#contact-phone"));
  updatePacketPreview();
  contactDialog.showModal();
  document.querySelector("#contact-name")?.focus();
}

function contactField(id, label, value, type, required) {
  return '<label class="wide-field"><span>' + label + (required ? ' <b aria-hidden="true">*</b>' : ' <small>Optional</small>') +
    '</span><input id="' + id + '" type="' + type + '" value="' + escapeHtml(value) + '"' + (required ? " required" : "") + '></label>';
}

function contactValues() {
  const selectedIds = [...document.querySelectorAll('input[name="contact-property"]:checked')].map((input) => input.value);
  return {
    name: document.querySelector("#contact-name")?.value.trim() || "",
    email: document.querySelector("#contact-email")?.value.trim() || "",
    phone: document.querySelector("#contact-phone")?.value.trim() || "",
    company: document.querySelector("#contact-company")?.value.trim() || "",
    intendedUse: document.querySelector("#contact-use")?.value.trim() || "",
    notes: document.querySelector("#contact-notes")?.value.trim() || "",
    propertyIds: selectedIds,
  };
}

function buildInquiry(values) {
  const selectedProperties = properties.filter((property) => values.propertyIds.includes(property.id));
  const hardRequirements = [
    search.type && search.type !== "unsure" ? TYPE_LABELS[search.type] : null,
    formatSizeRange() || null,
    search.locationMode === "hard" && search.cities.length ? search.cities.join(" or ") : null,
    "Currently listed as available",
  ].filter(Boolean);
  const priorities = [
    search.locationMode === "preference" && search.cities.length ? search.cities.join(", ") + " — High" : null,
    ...search.features.map((item) => item.label + " — " + WEIGHT_LABELS[item.weight]),
  ].filter(Boolean);
  const matchingSelected = selectedMatches().filter((match) => values.propertyIds.includes(match.property.id));
  const verification = matchingSelected.flatMap((match) =>
    [...match.hardUnknowns, ...match.preferences.filter((item) => item.outcome === "unknown")]
      .map((item) => match.property.name + ": " + item.reason)
  );
  const timing = timingLabel(search.moveIn);
  const lines = [
    "Hello Deerfield,",
    "",
    "I'm looking for commercial space with the following requirements.",
    "",
    "Name: " + (values.name || "—"),
    "Company: " + (values.company || "—"),
    "Email: " + (values.email || "—"),
    "Phone: " + (values.phone || "—"),
    "Intended use: " + (values.intendedUse || "—"),
    "Property type: " + (search.type ? TYPE_LABELS[search.type] : "Not specified"),
    "Target size: " + (formatSizeRange() || "Not specified"),
    "Preferred locations: " + (search.cities.length ? search.cities.join(", ") : "Open to all markets"),
    "Move-in timing: " + (timing || "Not specified"),
    "",
    "Hard requirements:",
    ...hardRequirements.map((item) => "- " + item),
    "",
    "Priorities:",
    ...(priorities.length ? priorities.map((item) => "- " + item) : ["- None specified"]),
    "",
    "Properties I'm interested in:",
    ...(selectedProperties.length
      ? selectedProperties.map((property) => "- " + property.name + " — " + property.city + ", ON")
      : ["- No specific property selected"]),
    "",
    "Items that need verification:",
    ...(verification.length ? verification.map((item) => "- " + item) : ["- None identified"]),
    "",
    "Additional notes:",
    values.notes || "—",
    "",
    "Thank you,",
    values.name || "",
  ];
  const market = search.cities.slice(0, 2).join(" / ") || "Ontario";
  const subject = (search.type && search.type !== "unsure" ? TYPE_LABELS[search.type] : "Commercial") +
    " space requirement — " + market + (formatSizeRange() ? " — " + formatSizeRange() : "");
  return { subject, body: lines.join("\n") };
}

function timingLabel(value) {
  return {
    immediate: "Immediately",
    "within-3": "Within 3 months",
    "3-6": "3–6 months",
    "6-12": "6–12 months",
    "12-plus": "12+ months",
    flexible: "Flexible",
  }[value] || "";
}

function updatePacketPreview() {
  const preview = document.querySelector("#packet-preview");
  if (preview) preview.textContent = buildInquiry(contactValues()).body;
  updateEnvelope();
}

function updateEnvelope() {
  if (!document.querySelector("#wizard-envelope")) return;
  const values = contactValues();
  document.querySelector("#wizard-to").textContent = deliveryConfig.recipient;
  document.querySelector("#wizard-from").textContent = deliveryConfig.from || "Deerfield Deal Desk";
  document.querySelector("#wizard-reply-to").textContent = values.email || "—";
  document.querySelector("#wizard-subject").textContent = enforceSubject(buildInquiry(values).subject);
}

async function sendWizardInquiry() {
  const form = document.querySelector("#contact-form");
  const values = contactValues();
  const error = document.querySelector("#contact-error");
  const status = document.querySelector("#wizard-send-status");
  const button = document.querySelector("[data-send-inquiry]");
  if (!form.reportValidity() || !values.name || !values.email || !values.intendedUse) {
    error.textContent = "Add your name, email and intended use before sending.";
    return;
  }
  error.textContent = "";
  const packet = buildInquiry(values);
  button.disabled = true;
  button.textContent = "Sending…";
  status.textContent = "Sending your inquiry securely…";
  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        subject: enforceSubject(packet.subject),
        body: enforceBody(packet.body),
        submissionId: crypto.randomUUID(),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The email could not be sent. Please try again.");
    status.textContent = "Your inquiry was sent to Deerfield successfully.";
    showToast("Your inquiry was sent to Deerfield.");
  } catch (sendError) {
    status.textContent = sendError instanceof Error ? sendError.message : "The email could not be sent. Please try again.";
  } finally {
    button.disabled = false;
    button.textContent = "Send inquiry →";
  }
}

contactContent.addEventListener("input", updatePacketPreview);
contactContent.addEventListener("change", updatePacketPreview);
contactContent.addEventListener("click", async (event) => {
  if (event.target.closest('[data-close="contact"]')) {
    contactDialog.close();
    return;
  }
  if (event.target.closest("[data-copy-inquiry]")) {
    const packet = buildInquiry(contactValues());
    await copyText("Subject: " + packet.subject + "\n\n" + packet.body);
    return;
  }
  if (event.target.closest("[data-send-inquiry]")) {
    await sendWizardInquiry();
    return;
  }
  if (event.target.closest("[data-open-email]")) {
    const form = document.querySelector("#contact-form");
    const values = contactValues();
    const error = document.querySelector("#contact-error");
    if (!form.reportValidity() || !values.name || !values.email || !values.intendedUse) {
      error.textContent = "Add your name, email and intended use before opening the email.";
      return;
    }
    error.textContent = "";
    const packet = buildInquiry(values);
    const mailto = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(packet.subject) + "&body=" + encodeURIComponent(packet.body);
    if (mailto.length > 7800) {
      await copyText(packet.body);
      showToast("The inquiry was copied because it is too long for some email apps.");
      return;
    }
    window.location.href = mailto;
  }
});

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Inquiry copied to your clipboard.");
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
    showToast("Inquiry copied to your clipboard.");
  }
}

function showToast(message) {
  let toast = document.querySelector("#app-toast");
  if (!toast) {
    toast = document.createElement("output");
    toast.id = "app-toast";
    toast.className = "toast";
    toast.setAttribute("aria-live", "polite");
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(value + "T12:00:00"));
}

window.addEventListener("popstate", () => {
  if (location.hash === "#results" && results) {
    landing.hidden = true;
    resultsView.hidden = false;
    renderResults();
  } else {
    landing.hidden = false;
    resultsView.hidden = true;
    renderWizard();
  }
});

compareDialog.addEventListener("click", (event) => {
  if (event.target === compareDialog) compareDialog.close();
});
contactDialog.addEventListener("click", (event) => {
  if (event.target === contactDialog) contactDialog.close();
});

function setMobileNavigation(open, restoreFocus = true) {
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  mobileNavigation.hidden = !open;
  mobileNavigationBackdrop.hidden = !open;
  document.body.classList.toggle("menu-open", open);
  if (open) menuClose.focus();
  if (!open && restoreFocus) menuButton.focus();
}

menuButton.addEventListener("click", () => {
  setMobileNavigation(menuButton.getAttribute("aria-expanded") !== "true");
});
menuClose.addEventListener("click", () => setMobileNavigation(false));
mobileNavigationBackdrop.addEventListener("click", () => setMobileNavigation(false));
mobileNavigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMobileNavigation(false, false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    setMobileNavigation(false);
  }
});
function openSavedResults() {
  if (location.hash !== "#results" || !search.type) return false;
  results = matchProperties(search, properties);
  landing.hidden = true;
  resultsView.hidden = false;
  renderResults();
  return true;
}

function registerWebMcpTools() {
  if (!document.modelContext?.registerTool) return;

  const configureSearch = {
    name: "configure_property_search",
    description: "Stage a Deerfield commercial-property search using confirmed hard constraints and weighted preferences. This updates the on-page search but does not contact Deerfield.",
    inputSchema: {
      type: "object",
      properties: {
        propertyType: { type: "string", enum: ["industrial", "retail", "office", "unsure"] },
        sizeMin: { type: ["number", "null"], minimum: 0 },
        sizeIdeal: { type: ["number", "null"], minimum: 0 },
        sizeMax: { type: ["number", "null"], minimum: 0 },
        cities: { type: "array", items: { type: "string", enum: cities }, uniqueItems: true },
        locationMode: { type: "string", enum: ["hard", "preference"] },
      },
      required: ["propertyType"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    execute: async (input) => {
      const sizeValues = [input.sizeMin, input.sizeIdeal, input.sizeMax].filter((value) => value != null);
      if (!sizeValues.every((value, index) => index === 0 || value >= sizeValues[index - 1])) {
        return { content: [{ type: "text", text: "Minimum, ideal and maximum sizes must be ordered from smallest to largest." }], isError: true };
      }
      search = {
        ...search,
        type: input.propertyType,
        sizeMin: input.sizeMin ?? null,
        sizeIdeal: input.sizeIdeal ?? null,
        sizeMax: input.sizeMax ?? null,
        cities: Array.isArray(input.cities) ? input.cities : [],
        locationMode: input.locationMode || "preference",
      };
      step = 4;
      saveSearch();
      renderWizard();
      return { content: [{ type: "text", text: "Search staged: " + searchHeadline() + ". Review it on the page before showing matches." }] };
    },
  };

  const showMatches = {
    name: "show_property_matches",
    description: "Calculate and display explainable matches for the currently staged Deerfield property search. This never sends an inquiry.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    execute: async () => {
      if (!search.type) {
        return { content: [{ type: "text", text: "No property search is configured yet." }], isError: true };
      }
      results = matchProperties(search, properties);
      landing.hidden = true;
      resultsView.hidden = false;
      history.replaceState({ view: "results" }, "", "#results");
      renderResults();
      const names = [...results.eligible, ...results.verificationRequired]
        .slice(0, 5)
        .map((match) => match.property.name)
        .join(", ");
      return { content: [{ type: "text", text: results.counts.eligible + " strong matches and " + results.counts.verification_required + " needing verification. Top results: " + (names || "none") + "." }] };
    },
  };

  document.modelContext.registerTool(configureSearch);
  document.modelContext.registerTool(showMatches);
}

syncThemeControl();
registerWebMcpTools();
if (!openSavedResults()) renderWizard();
