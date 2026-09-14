import { cities, featureSets, properties } from "./data.js";
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
      <div class="portfolio-card-visual ${item.image ? "has-photo" : ""}">${item.image ? `<img src="../${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">` : `<span>${escapeHtml(typeLabel[item.type])}</span>`}<b class="status-badge ${item.available ? "strong" : "verify"}">${item.available ? "Space available" : "Portfolio property"}</b></div>
      <div class="portfolio-card-copy"><p>${escapeHtml(item.city)}, Ontario</p><h2>${escapeHtml(item.name)}</h2><span>${escapeHtml(unitSummary(item))}</span>${selectedFeatures.size ? `<div class="card-feature-status">${escapeHtml(featureSummary(item))}</div>` : ""}<a href="../property/?id=${encodeURIComponent(item.id)}" aria-label="View ${escapeHtml(item.name)} details">View property details →</a></div>
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
render();
