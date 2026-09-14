// Seed feature data for demonstration. These traits are generated, not sourced from
// Deerfield's public listings. Generation is deterministic: a property id always
// produces the same traits on every machine, reload and test run.
//
// To replace a generated trait with a real one, add an explicit `features` object to
// that record in data.js — explicit values always win over the seed. To return the
// whole portfolio to "unknown", set SEED_TRAITS_ENABLED to false.

import { seededRandom } from "./seeded-random.js";

export const SEED_TRAITS_ENABLED = true;

// [probability of true, probability of false]. The remainder stays null ("not
// confirmed"), because the unknown-data path is central to how the site ranks and
// explains matches and must stay exercised.
const TRAIT_WEIGHTS = Object.freeze({
  industrial: {
    parking: [0.7, 0.1],
    transitAccess: [0.2, 0.55],
    groundFloor: [0.75, 0.05],
    privateEntrance: [0.5, 0.25],
    elevator: [0.1, 0.7],
    truckLevelLoading: [0.7, 0.1],
    driveInDoors: [0.65, 0.15],
    officeComponent: [0.6, 0.2],
    outdoorStorage: [0.45, 0.35],
    streetFrontage: [0.3, 0.5],
    visibility: [0.3, 0.45],
    signage: [0.35, 0.4],
  },
  retail: {
    parking: [0.75, 0.08],
    transitAccess: [0.45, 0.3],
    groundFloor: [0.8, 0.05],
    privateEntrance: [0.55, 0.25],
    elevator: [0.12, 0.65],
    truckLevelLoading: [0.1, 0.65],
    driveInDoors: [0.12, 0.6],
    officeComponent: [0.2, 0.55],
    outdoorStorage: [0.15, 0.6],
    streetFrontage: [0.75, 0.08],
    visibility: [0.7, 0.1],
    signage: [0.65, 0.15],
  },
  office: {
    parking: [0.7, 0.1],
    transitAccess: [0.6, 0.2],
    groundFloor: [0.35, 0.45],
    privateEntrance: [0.45, 0.3],
    elevator: [0.5, 0.3],
    truckLevelLoading: [0.05, 0.75],
    driveInDoors: [0.05, 0.75],
    officeComponent: [0.55, 0.2],
    outdoorStorage: [0.08, 0.7],
    streetFrontage: [0.35, 0.4],
    visibility: [0.4, 0.35],
    signage: [0.4, 0.35],
  },
});

export function seedFeatures(id, type) {
  if (!SEED_TRAITS_ENABLED) return {};
  const weights = TRAIT_WEIGHTS[type] || TRAIT_WEIGHTS.office;
  const random = seededRandom("deerfield-seed:" + id);
  const features = {};
  for (const [key, [likelyTrue, likelyFalse]] of Object.entries(weights)) {
    const roll = random();
    features[key] = roll < likelyTrue ? true : roll < likelyTrue + likelyFalse ? false : null;
  }
  return features;
}
