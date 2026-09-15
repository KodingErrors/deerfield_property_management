// Typed facade over the untyped, DOM-free JavaScript modules. Components import from
// here so the shapes the matcher and the data promise are written down once.
import { cities as rawCities, featureSets as rawFeatureSets, properties as rawProperties, SOURCE_CHECKED_AT } from "./data.js";
import { formatNumber, matchProperties as rawMatchProperties } from "./matcher.js";
import { DETAIL_LABELS as rawDetailLabels, formatDetail as rawFormatDetail } from "./seed-details.js";

export type PropertyType = "industrial" | "retail" | "office";
export type SearchType = PropertyType | "unsure";
export type LocationMode = "hard" | "preference";
export type Weight = 1 | 2 | 3;

export type Unit = { label: string; size: number; available: boolean };

export type Property = {
  id: string;
  name: string;
  city: string;
  province: string;
  type: PropertyType;
  available: boolean;
  units: Unit[];
  /** true = confirmed, false = ruled out, null = not confirmed in the public listing. */
  features: Record<string, boolean | null>;
  /** Presentational only; the matcher never reads these. */
  details: Record<string, string | number | null | undefined> & { summary?: string };
  image: string | null;
  description: string | null;
  sourceUrl: string;
  sourceCheckedAt: string;
};

export type FeaturePreference = { key: string; label: string; weight: Weight };

export type Search = {
  version: 1;
  type: SearchType | null;
  sizeMin: number | null;
  sizeIdeal: number | null;
  sizeMax: number | null;
  cities: string[];
  locationMode: LocationMode;
  features: FeaturePreference[];
  moveIn: string;
  intendedUse: string;
  notes: string;
};

export type Outcome = "match" | "partial" | "miss" | "unknown";
export type Evaluation = { key: string; label: string; outcome: Outcome; reason: string; satisfaction?: number | null; weight?: number };
export type MatchStatus = "excluded" | "verification_required" | "eligible";
export type Match = {
  property: Property;
  status: MatchStatus;
  score: number | null;
  hardFailures: Evaluation[];
  hardUnknowns: Evaluation[];
  hardMatches: Evaluation[];
  preferences: Evaluation[];
};
export type MatchResults = {
  eligible: Match[];
  verificationRequired: Match[];
  excluded: Match[];
  counts: { eligible: number; verification_required: number; excluded: number };
};

export const properties = rawProperties as unknown as readonly Property[];
export const cities = rawCities as unknown as readonly string[];
export const featureSets = rawFeatureSets as unknown as Readonly<Record<SearchType, ReadonlyArray<readonly [string, string]>>>;
export const DETAIL_LABELS = rawDetailLabels as unknown as ReadonlyArray<readonly [string, string]>;
export { SOURCE_CHECKED_AT, formatNumber };

export function matchProperties(search: Search): MatchResults {
  return rawMatchProperties(search, rawProperties) as unknown as MatchResults;
}

export function formatDetail(key: string, value: unknown): string | null {
  return rawFormatDetail(key, value) as string | null;
}

export const TYPE_LABELS: Record<SearchType, string> = {
  industrial: "Industrial",
  retail: "Retail",
  office: "Office",
  unsure: "Any property type",
};

export const WEIGHT_LABELS: Record<Weight, string> = { 1: "Low", 2: "Medium", 3: "High" };

/** Listing photos are stored as paths relative to the site root ("assets/x.webp"). */
export function imageUrl(property: Property): string | null {
  return property.image ? `/${property.image}` : null;
}

export function formatCheckedDate(style: "short" | "long" = "short"): string {
  const [year, month, day] = SOURCE_CHECKED_AT.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: style, day: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}
