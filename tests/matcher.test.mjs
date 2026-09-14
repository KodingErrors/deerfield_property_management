import test from "node:test";
import assert from "node:assert/strict";
import { matchProperty, matchProperties } from "../dist/matcher.js";

const baseSearch = {
  type: "industrial",
  sizeMin: 8000,
  sizeIdeal: 10000,
  sizeMax: 12000,
  cities: [],
  locationMode: "preference",
  features: [],
};

function property(overrides = {}) {
  return {
    id: "p1",
    name: "Test Property",
    city: "Burlington",
    type: "industrial",
    available: true,
    units: [{ label: "1", size: 10000, available: true }],
    features: { parking: null, truckLevelLoading: null },
    ...overrides,
  };
}

test("a confirmed hard size miss excludes before scoring", () => {
  const result = matchProperty(baseSearch, property({
    units: [{ label: "1", size: 6000, available: true }],
  }));
  assert.equal(result.status, "excluded");
  assert.equal(result.score, null);
  assert.match(result.hardFailures[0].reason, /below your 8,000 SF minimum/);
});

test("unknown hard size requires verification", () => {
  const result = matchProperty(baseSearch, property({ units: [] }));
  assert.equal(result.status, "verification_required");
  assert.equal(result.hardUnknowns[0].key, "size");
});

test("unknown preferences are omitted from the denominator", () => {
  const search = {
    ...baseSearch,
    sizeMin: null,
    sizeIdeal: null,
    sizeMax: null,
    features: [
      { key: "truckLevelLoading", label: "Truck-level loading", weight: 3 },
      { key: "parking", label: "Parking", weight: 2 },
    ],
  };
  const result = matchProperty(search, property({
    features: { truckLevelLoading: null, parking: true },
  }));
  assert.equal(result.score, 100);
  assert.equal(result.preferences[0].outcome, "unknown");
});

test("hard criteria keep excluded properties out of eligible ranking", () => {
  const search = { ...baseSearch, cities: ["Burlington"], locationMode: "hard" };
  const output = matchProperties(search, [
    property({ id: "wrong-city", name: "A", city: "Hamilton" }),
    property({ id: "right-city", name: "B", city: "Burlington" }),
  ]);
  assert.deepEqual(output.eligible.map((item) => item.property.id), ["right-city"]);
  assert.deepEqual(output.excluded.map((item) => item.property.id), ["wrong-city"]);
});
