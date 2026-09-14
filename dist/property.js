import { properties } from "./data.js";
import "./site-shell.js";

const root = document.querySelector("#property-detail");
const id = new URLSearchParams(location.search).get("id");
const item = properties.find((property) => property.id === id);
const labels = { office: "Office", retail: "Retail", industrial: "Industrial" };
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

if (!item) {
  document.title = "Property not found | Deerfield Deal Desk";
  root.innerHTML = '<section class="not-found"><p class="eyebrow">Property not found</p><h1>That listing is not in the portfolio.</h1><a class="primary-button" href="../properties/">Browse all properties →</a></section>';
} else {
  document.title = `${item.name} | Deerfield Deal Desk`;
  const units = item.units.length ? item.units.map((unit) => `<tr><td>${escapeHtml(unit.label)}</td><td>${unit.size.toLocaleString()} SF</td><td>Listed as available</td></tr>`).join("") : '<tr><td colspan="3">No suite size is published. Contact Deerfield to confirm current availability and particulars.</td></tr>';
  const knownFeatures = Object.entries(item.features).filter(([, value]) => value === true).map(([key]) => key.replaceAll(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()));
  root.innerHTML = `
    <a class="back-link" href="../properties/">← Back to all properties</a>
    <section class="property-detail-hero">
      <div class="property-detail-visual ${item.image ? "has-photo" : ""}">${item.image ? `<img src="../${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : `<span>${escapeHtml(labels[item.type])}</span>`}</div>
      <div class="property-detail-title"><p class="eyebrow">${escapeHtml(labels[item.type])} · ${escapeHtml(item.city)}, Ontario</p><h1>${escapeHtml(item.name)}</h1><div class="detail-status ${item.available ? "available" : "portfolio"}">${item.available ? "Space currently listed as available" : "No current space published"}</div></div>
    </section>
    <section class="detail-columns">
      <article><p class="eyebrow">Property overview</p><h2>Current listing details.</h2><p>${escapeHtml(item.description || `${labels[item.type]} property in ${item.city}, Ontario, represented in Deerfield Brokerage’s public portfolio.`)}</p>${knownFeatures.length ? `<div class="feature-list">${knownFeatures.map((feature) => `<span>✓ ${escapeHtml(feature)}</span>`).join("")}</div><p class="data-caveat">Feature data is sample data for demonstration and should be confirmed with the broker.</p>` : '<p class="data-caveat">Detailed building features are not published in the source portfolio and should be confirmed with the broker.</p>'}</article>
      <article><p class="eyebrow">Available space</p><div class="unit-table-wrap"><table class="unit-table"><thead><tr><th>Unit</th><th>Size</th><th>Status</th></tr></thead><tbody>${units}</tbody></table></div></article>
    </section>
    <section class="detail-actions"><div><p class="eyebrow">Interested in this property?</p><h2>Include it in a structured inquiry.</h2></div><div class="cta-pair"><a class="primary-button" href="../contact/?property=${encodeURIComponent(item.id)}">Contact about this property →</a><a class="secondary-link" href="../#finder">Compare matches</a></div></section>`;
}
