// Seed building specifics for demonstration. Like seed-traits.js these are generated,
// not published by Deerfield, and the pages that show them say so.
//
// These fields are presentational only. The matcher never reads them, so generated
// specifics cannot change which properties are eligible, excluded or ranked — that stays
// driven by the real portfolio data in data.js.
//
// To replace a generated value with a real one, add an explicit `details` object to that
// record in data.js. Explicit values always win.

import { intBetween, oneOf, roundedTo, seededRandom } from "./seeded-random.js";

export const SEED_DETAILS_ENABLED = true;

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const ZONING = {
  industrial: ["M2 — General industrial", "M3 — Heavy industrial", "E2 — Employment", "EM1 — Prestige employment"],
  retail: ["C2 — Community commercial", "C5 — Mixed use commercial", "CA1 — Arterial commercial", "MU2 — Main street"],
  office: ["D1 — Downtown mixed use", "C3 — Office commercial", "OF1 — Office", "MU1 — Mixed use"],
};

const CONDITION = {
  industrial: ["Shell", "Warehouse finished", "Office and warehouse", "Turnkey"],
  retail: ["Vanilla box", "Built out", "Turnkey", "Shell"],
  office: ["Base building", "Built out", "Turnkey", "Shell"],
};

function availability(random, available) {
  if (!available) return "Not currently listed";
  if (random() < 0.45) return "Immediate";
  const month = intBetween(random, 0, 11);
  return `${MONTHS[month]} ${intBetween(random, 2026, 2027)}`;
}

function sentence(type, details, city) {
  const lead = {
    industrial: `Industrial space in ${city} with ${details.clearHeight} ft clear height`,
    retail: `Retail space in ${city} with ${details.frontage} ft of frontage`,
    office: `Office space in ${city} across ${details.floors} ${details.floors === 1 ? "floor" : "floors"}`,
  }[type];
  return `${lead}, built in ${details.yearBuilt} and zoned ${details.zoning.split(" — ")[0]}. ` +
    `Asking ${details.askingRate} with ${details.additionalRent} additional rent.`;
}

export function seedDetails(id, type, available, city) {
  if (!SEED_DETAILS_ENABLED) return {};
  const random = seededRandom("deerfield-detail:" + id);
  const kind = ZONING[type] ? type : "office";

  const details = {
    yearBuilt: intBetween(random, 1955, 2015),
    zoning: oneOf(random, ZONING[kind]),
    condition: oneOf(random, CONDITION[kind]),
    availableFrom: availability(random, available),
    askingRate: null,
    additionalRent: `$${roundedTo(random, 3, 12.5, 0.25).toFixed(2)} / SF`,
    parkingSpaces: null,
  };

  if (kind === "industrial") {
    details.askingRate = `$${roundedTo(random, 8.5, 16.5, 0.25).toFixed(2)} / SF`;
    details.parkingSpaces = intBetween(random, 8, 60);
    details.clearHeight = intBetween(random, 14, 32);
    details.truckDoors = intBetween(random, 1, 8);
    details.driveInDoors = intBetween(random, 0, 4);
    details.power = `${oneOf(random, [200, 400, 600, 800, 1200])}A / ${oneOf(random, ["347-600V", "120-208V"])}`;
    details.officeFinish = `${intBetween(random, 5, 35)}%`;
  } else if (kind === "retail") {
    details.askingRate = `$${roundedTo(random, 14, 38, 0.5).toFixed(2)} / SF`;
    details.parkingSpaces = intBetween(random, 20, 220);
    details.frontage = intBetween(random, 18, 120);
    details.trafficCount = `${(intBetween(random, 8, 42) * 1000).toLocaleString("en-CA")} vehicles / day`;
    details.bayDepth = `${intBetween(random, 40, 110)} ft`;
  } else {
    details.askingRate = `$${roundedTo(random, 12, 28, 0.5).toFixed(2)} / SF`;
    details.parkingSpaces = intBetween(random, 15, 120);
    details.floors = intBetween(random, 1, 12);
    // A walk-up is plausible; a four-storey building with no elevator is not.
    details.elevators = details.floors >= 3 ? intBetween(random, 1, 4) : intBetween(random, 0, 1);
    details.commonArea = `${intBetween(random, 8, 22)}%`;
  }

  details.summary = sentence(kind, details, city || "Ontario");
  return details;
}

// Label and order for display. Only keys present on a record are rendered.
export const DETAIL_LABELS = Object.freeze([
  ["askingRate", "Asking rate"],
  ["additionalRent", "Additional rent"],
  ["availableFrom", "Available from"],
  ["yearBuilt", "Year built"],
  ["zoning", "Zoning"],
  ["condition", "Condition"],
  ["clearHeight", "Clear height"],
  ["truckDoors", "Truck-level doors"],
  ["driveInDoors", "Drive-in doors"],
  ["power", "Power"],
  ["officeFinish", "Office finish"],
  ["frontage", "Frontage"],
  ["bayDepth", "Bay depth"],
  ["trafficCount", "Traffic count"],
  ["floors", "Floors"],
  ["elevators", "Elevators"],
  ["commonArea", "Common area factor"],
  ["parkingSpaces", "Parking spaces"],
]);

export function formatDetail(key, value) {
  if (value == null) return null;
  if (key === "clearHeight") return `${value} ft`;
  if (key === "frontage") return `${value} ft`;
  return String(value);
}
