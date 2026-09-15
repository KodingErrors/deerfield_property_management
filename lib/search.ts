// The wizard's search model: defaults, persistence and the derived copy the results,
// summary and inquiry email share. DOM-free apart from localStorage.
import { cities, formatNumber, TYPE_LABELS, WEIGHT_LABELS, type Match, type Property, type Search } from "./catalog";

// Versioned so an older saved shape is discarded rather than half-applied. Same key as
// the previous site, so returning visitors keep their search.
export const STORAGE_KEY = "deerfield-search-v1";
export const CONTACT_EMAIL = "info@deerfieldbrokerage.com";

export const defaultSearch: Search = {
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

export const TIMING_OPTIONS: Array<[value: string, label: string]> = [
  ["", "Select timing"],
  ["immediate", "Immediately"],
  ["within-3", "Within 3 months"],
  ["3-6", "3–6 months"],
  ["6-12", "6–12 months"],
  ["12-plus", "12+ months"],
  ["flexible", "Flexible"],
];

export function timingLabel(value: string): string {
  return TIMING_OPTIONS.find(([key]) => key && key === value)?.[1] || "";
}

export function loadSearch(): Search {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || parsed.version !== 1) return structuredClone(defaultSearch);
    return {
      ...structuredClone(defaultSearch),
      ...parsed,
      cities: Array.isArray(parsed.cities) ? parsed.cities.filter((city: string) => cities.includes(city)) : [],
      features: Array.isArray(parsed.features) ? parsed.features : [],
    };
  } catch {
    return structuredClone(defaultSearch);
  }
}

export function saveSearch(search: Search) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(search));
  } catch {}
}

export function sizesOrdered(search: Pick<Search, "sizeMin" | "sizeIdeal" | "sizeMax">): boolean {
  const values = [search.sizeMin, search.sizeIdeal, search.sizeMax].filter((value): value is number => value != null);
  return values.every((value, index) => index === 0 || value >= values[index - 1]);
}

export function formatSizeRange(search: Search): string {
  if (search.sizeMin != null && search.sizeMax != null) return `${formatNumber(search.sizeMin)}–${formatNumber(search.sizeMax)} SF`;
  if (search.sizeMin != null) return `${formatNumber(search.sizeMin)}+ SF`;
  if (search.sizeMax != null) return `Up to ${formatNumber(search.sizeMax)} SF`;
  if (search.sizeIdeal != null) return `About ${formatNumber(search.sizeIdeal)} SF`;
  return "";
}

export function searchHeadline(search: Search): string {
  const type = search.type ? TYPE_LABELS[search.type] : "Commercial property";
  const size = formatSizeRange(search);
  return size ? `${type} · ${size}` : type;
}

export function hardRequirements(search: Search, availabilityLabel = "Listed as available"): string[] {
  return [
    search.type && search.type !== "unsure" ? TYPE_LABELS[search.type] : null,
    formatSizeRange(search) || null,
    search.locationMode === "hard" && search.cities.length ? search.cities.join(" or ") : null,
    availabilityLabel,
  ].filter((item): item is string => Boolean(item));
}

export function priorities(search: Search): string[] {
  return [
    search.locationMode === "preference" && search.cities.length ? `${search.cities.join(", ")} — High` : null,
    ...search.features.map((item) => `${item.label} — ${WEIGHT_LABELS[item.weight]}`),
  ].filter((item): item is string => Boolean(item));
}

export function unitSummary(property: Property): string {
  if (!property.units.length) return property.available ? "Available unit · square footage not confirmed" : "No units currently listed";
  if (property.units.length === 1) return `Unit ${property.units[0].label} · ${formatNumber(property.units[0].size)} SF available`;
  const sizes = property.units.map((unit) => unit.size);
  return `${property.units.length} units · ${formatNumber(Math.min(...sizes))}–${formatNumber(Math.max(...sizes))} SF available`;
}

export type ContactValues = {
  name: string;
  email: string;
  phone: string;
  company: string;
  intendedUse: string;
  notes: string;
  propertyIds: string[];
  availability: string[];
};

// The generated requirement packet. The modal's editor is seeded from this and follows
// it until the visitor edits the email directly.
export function buildInquiry(search: Search, values: ContactValues, selectedMatches: Match[]): { subject: string; body: string } {
  const selectedProperties = selectedMatches.map((match) => match.property).filter((property) => values.propertyIds.includes(property.id));
  const verification = selectedMatches
    .filter((match) => values.propertyIds.includes(match.property.id))
    .flatMap((match) => [...match.hardUnknowns, ...match.preferences.filter((item) => item.outcome === "unknown")]
      .map((item) => `${match.property.name}: ${item.reason}`));
  const requirements = hardRequirements(search, "Currently listed as available");
  const wants = priorities(search);
  const timing = timingLabel(search.moveIn);
  const lines = [
    "Hello Deerfield,",
    "",
    "I'm looking for commercial space with the following requirements.",
    "",
    `Name: ${values.name || "—"}`,
    `Company: ${values.company || "—"}`,
    `Email: ${values.email || "—"}`,
    `Phone: ${values.phone || "—"}`,
    `Intended use: ${values.intendedUse || "—"}`,
    `Property type: ${search.type ? TYPE_LABELS[search.type] : "Not specified"}`,
    `Target size: ${formatSizeRange(search) || "Not specified"}`,
    `Preferred locations: ${search.cities.length ? search.cities.join(", ") : "Open to all markets"}`,
    `Move-in timing: ${timing || "Not specified"}`,
    "",
    "Hard requirements:",
    ...requirements.map((item) => `- ${item}`),
    "",
    "Priorities:",
    ...(wants.length ? wants.map((item) => `- ${item}`) : ["- None specified"]),
    "",
    "Properties I'm interested in:",
    ...(selectedProperties.length ? selectedProperties.map((property) => `- ${property.name} — ${property.city}, ON`) : ["- No specific property selected"]),
    "",
    "Items that need verification:",
    ...(verification.length ? verification.map((item) => `- ${item}`) : ["- None identified"]),
    "",
    "Callback availability (Eastern time):",
    ...(values.availability.length ? values.availability : ["- No callback windows selected"]),
    "",
    "Additional notes:",
    values.notes || "—",
    "",
    "Thank you,",
    values.name || "",
  ];
  const market = search.cities.slice(0, 2).join(" / ") || "Ontario";
  const size = formatSizeRange(search);
  const subject = `${search.type && search.type !== "unsure" ? TYPE_LABELS[search.type] : "Commercial"} space requirement — ${market}${size ? ` — ${size}` : ""}`;
  return { subject, body: lines.join("\n") };
}
