import { properties } from "./data.js";
import "./site-shell.js";

const searchInput = document.querySelector("#portfolio-search");
const availableOnly = document.querySelector("#available-only");
const typeFilters = document.querySelector("#type-filters");
const grid = document.querySelector("#portfolio-grid");
const count = document.querySelector("#portfolio-count");
let activeType = "all";

const typeLabel = { office: "Office", retail: "Retail", industrial: "Industrial" };
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const unitSummary = (item) => {
  if (!item.available) return "No space currently listed";
  if (!item.units.length) return "Availability listed — size to be confirmed";
  return item.units.map((unit) => `Unit ${unit.label} · ${unit.size.toLocaleString()} SF`).join(" · ");
};

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = properties.filter((item) => {
    const textMatch = !query || `${item.name} ${item.city} ${item.type}`.toLowerCase().includes(query);
    const typeMatch = activeType === "all" || item.type === activeType;
    return textMatch && typeMatch && (!availableOnly.checked || item.available);
  });
  count.textContent = `${filtered.length} ${filtered.length === 1 ? "property" : "properties"}`;
  grid.innerHTML = filtered.length ? filtered.map((item) => `
    <article class="portfolio-card">
      <div class="portfolio-card-visual ${item.image ? "has-photo" : ""}">${item.image ? `<img src="../${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">` : `<span>${escapeHtml(typeLabel[item.type])}</span>`}<b class="status-badge ${item.available ? "strong" : "verify"}">${item.available ? "Space available" : "Portfolio property"}</b></div>
      <div class="portfolio-card-copy"><p>${escapeHtml(item.city)}, Ontario</p><h2>${escapeHtml(item.name)}</h2><span>${escapeHtml(unitSummary(item))}</span><a href="../property/?id=${encodeURIComponent(item.id)}" aria-label="View ${escapeHtml(item.name)} details">View property details →</a></div>
    </article>`).join("") : '<div class="portfolio-empty"><h2>No properties match those filters.</h2><p>Try a different city, property type, or include properties without current availability.</p></div>';
}

searchInput.addEventListener("input", render);
availableOnly.addEventListener("change", render);
typeFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-type]");
  if (!button) return;
  activeType = button.dataset.type;
  typeFilters.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  render();
});
render();
