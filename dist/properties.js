import { cities, featureSets, properties, SOURCE_CHECKED_AT } from "./data.js";
import "./site-shell.js";

const searchInput = document.querySelector("#portfolio-search");
const cityInput = document.querySelector("#city-filter");
const cityList = document.querySelector("#portfolio-cities");
const availableOnly = document.querySelector("#available-only");
const includeUnknown = document.querySelector("#include-unknown");
const typeFilters = document.querySelector("#type-filters");
const featureFilters = document.querySelector("#feature-filters");
const clearFilters = document.querySelector("#clear-filters");
const grid = document.querySelector("#portfolio-grid");
const count = document.querySelector("#portfolio-count");
const compareBar = document.querySelector("#compare-bar");
const compareBarCount = document.querySelector("#compare-bar-count");
const compareOpen = document.querySelector("#compare-open");
const compareClear = document.querySelector("#compare-clear");
const compareDialog = document.querySelector("#portfolio-compare-dialog");
const compareContent = document.querySelector("#portfolio-compare-content");

// Selection survives filtering: narrowing the list should not silently drop a property
// the visitor already picked.
const compareSelection = new Set();
let activeType = "all";
const selectedFeatures = new Set();

const typeLabel = { office: "Office", retail: "Retail", industrial: "Industrial" };
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const preferredFeatureOrder = ["parking", "transitAccess", "groundFloor", "privateEntrance", "elevator", "truckLevelLoading", "driveInDoors", "officeComponent", "outdoorStorage", "streetFrontage", "visibility", "signage"];
const featureLabels = new Map(Object.values(featureSets).flat().map(([key, label]) => [key, label]));
const features = preferredFeatureOrder.filter((key) => featureLabels.has(key));
const unitSummary = (item) => {
  if (!item.available) return "No space currently listed";
  if (!item.units.length) return "Availability listed — size to be confirmed";
  return item.units.map((unit) => `Unit ${unit.label} · ${unit.size.toLocaleString()} SF`).join(" · ");
};

cityList.innerHTML = cities.map((city) => `<option value="${escapeHtml(city)}"></option>`).join("");
featureFilters.innerHTML = features.map((key) => `<button type="button" data-feature="${key}" aria-pressed="false"><span aria-hidden="true">+</span>${escapeHtml(featureLabels.get(key))}</button>`).join("");

function featureSummary(item) {
  if (!selectedFeatures.size) return "";
  let confirmed = 0;
  let unknown = 0;
  for (const key of selectedFeatures) {
    if (item.features[key] === true) confirmed += 1;
    else if (item.features[key] == null) unknown += 1;
  }
  const parts = [];
  if (confirmed) parts.push(`${confirmed} selected ${confirmed === 1 ? "feature" : "features"} confirmed`);
  if (unknown) parts.push(`${unknown} to verify`);
  return parts.join(" · ");
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const cityQuery = cityInput.value.trim().toLowerCase();
  const filtered = properties.filter((item) => {
    const textMatch = !query || item.name.toLowerCase().includes(query);
    const cityMatch = !cityQuery || item.city.toLowerCase().includes(cityQuery);
    const typeMatch = activeType === "all" || item.type === activeType;
    const featureMatch = [...selectedFeatures].every((key) => item.features[key] === true || (includeUnknown.checked && item.features[key] == null));
    return textMatch && cityMatch && typeMatch && featureMatch && (!availableOnly.checked || item.available);
  }).sort((a, b) => {
    if (!selectedFeatures.size) return 0;
    const confirmed = (item) => [...selectedFeatures].filter((key) => item.features[key] === true).length;
    return confirmed(b) - confirmed(a);
  });
  count.textContent = `${filtered.length} ${filtered.length === 1 ? "property" : "properties"}`;
  grid.innerHTML = filtered.length ? filtered.map((item) => `
    <article class="portfolio-card">
      <a class="portfolio-card-visual card-photo-link ${item.image ? "has-photo" : ""}" href="../property/?id=${encodeURIComponent(item.id)}" aria-label="View ${escapeHtml(item.name)} details">${item.image ? `<img src="../${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">` : `<span>${escapeHtml(typeLabel[item.type])}</span>`}<b class="status-badge ${item.available ? "strong" : "verify"}">${item.available ? "Space available" : "Portfolio property"}</b><span class="photo-hint" aria-hidden="true">View details</span></a>
      <div class="portfolio-card-copy"><p>${escapeHtml(item.city)}, Ontario</p><h2>${escapeHtml(item.name)}</h2><span>${escapeHtml(unitSummary(item))}</span>${selectedFeatures.size ? `<div class="card-feature-status">${escapeHtml(featureSummary(item))}</div>` : ""}<div class="card-actions"><a href="../property/?id=${encodeURIComponent(item.id)}" aria-label="View ${escapeHtml(item.name)} details">View property details</a><button class="card-compare" type="button" data-compare="${escapeHtml(item.id)}" aria-pressed="${compareSelection.has(item.id)}">${compareSelection.has(item.id) ? "✓ Selected" : "+ Compare"}</button></div></div>
    </article>`).join("") : '<div class="portfolio-empty"><h2>No properties match those filters.</h2><p>Try a different city or property type, clear a feature, or include listings whose features need confirmation.</p></div>';
}

searchInput.addEventListener("input", render);
cityInput.addEventListener("input", render);
availableOnly.addEventListener("change", render);
includeUnknown.addEventListener("change", render);
typeFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-type]");
  if (!button) return;
  activeType = button.dataset.type;
  typeFilters.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  render();
});
featureFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-feature]");
  if (!button) return;
  const key = button.dataset.feature;
  if (selectedFeatures.has(key)) selectedFeatures.delete(key);
  else selectedFeatures.add(key);
  button.setAttribute("aria-pressed", String(selectedFeatures.has(key)));
  button.querySelector("span").textContent = selectedFeatures.has(key) ? "✓" : "+";
  render();
});
clearFilters.addEventListener("click", () => {
  searchInput.value = "";
  cityInput.value = "";
  availableOnly.checked = false;
  includeUnknown.checked = true;
  activeType = "all";
  selectedFeatures.clear();
  typeFilters.querySelectorAll("button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.type === "all")));
  featureFilters.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.querySelector("span").textContent = "+";
  });
  render();
});

function syncCompareBar() {
  const total = compareSelection.size;
  compareBar.hidden = total === 0;
  compareBarCount.textContent = total === 1
    ? "1 property selected — choose one more to compare"
    : `${total} properties selected`;
  compareOpen.disabled = total < 2;
}

grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-compare]");
  if (!button) return;
  const id = button.dataset.compare;
  if (compareSelection.has(id)) compareSelection.delete(id);
  else compareSelection.add(id);
  const isSelected = compareSelection.has(id);
  button.setAttribute("aria-pressed", String(isSelected));
  button.textContent = isSelected ? "✓ Selected" : "+ Compare";
  syncCompareBar();
});

compareClear.addEventListener("click", () => {
  compareSelection.clear();
  render();
  syncCompareBar();
});

function featureCell(value) {
  if (value === true) return '<span class="cell-match">✓ Confirmed</span>';
  if (value === false) return '<span class="cell-miss">× Not available</span>';
  return '<span class="cell-unknown">? Not confirmed</span>';
}

function checkedDate() {
  const [year, month, day] = SOURCE_CHECKED_AT.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function openCompare() {
  const chosen = properties.filter((item) => compareSelection.has(item.id));
  if (chosen.length < 2) return;
  const rows = [
    { label: "Market", render: (item) => escapeHtml(`${item.city}, Ontario`) },
    { label: "Type", render: (item) => escapeHtml(typeLabel[item.type]) },
    { label: "Status", render: (item) => item.available
      ? '<span class="cell-match">Space available</span>'
      : '<span class="cell-unknown">No current space published</span>' },
    { label: "Available space", render: (item) => escapeHtml(unitSummary(item)) },
    ...features.map((key) => ({ label: featureLabels.get(key), render: (item) => featureCell(item.features[key]) })),
    { label: "Information checked", render: () => escapeHtml(checkedDate()) },
  ];
  const contactHref = "../contact/?" + chosen.map((item) => `property=${encodeURIComponent(item.id)}`).join("&");
  compareContent.innerHTML =
    '<header class="modal-header"><div><p class="eyebrow">Side by side</p><h2 id="portfolio-compare-title">Compare properties</h2>' +
    '<p>Feature data is sample data for demonstration. Confirm anything that matters with the broker.</p></div>' +
    '<button class="dialog-close" type="button" data-close-compare aria-label="Close comparison">×</button></header>' +
    '<div class="compare-scroll"><table><thead><tr><th>Criteria</th>' +
    chosen.map((item) => `<th>${escapeHtml(item.name)}<small>${escapeHtml(item.city)}, ON</small></th>`).join("") +
    '</tr></thead><tbody>' +
    rows.map((row) => `<tr><th>${escapeHtml(row.label)}</th>` +
      chosen.map((item) => `<td>${row.render(item)}</td>`).join("") + "</tr>").join("") +
    '</tbody></table></div>' +
    '<footer class="modal-footer"><button class="secondary-button" type="button" data-close-compare>Close</button>' +
    `<a class="primary-button" href="${contactHref}">Contact about these</a></footer>`;
  compareDialog.showModal();
}

compareOpen.addEventListener("click", openCompare);
compareDialog.addEventListener("click", (event) => {
  if (event.target === compareDialog || event.target.closest("[data-close-compare]")) compareDialog.close();
});

render();
syncCompareBar();
