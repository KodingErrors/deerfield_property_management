// Deterministic pseudo-randomness shared by the seed modules. A given seed string always
// produces the same sequence, on every machine, reload and test run, so generated sample
// data behaves like fixed data rather than changing under the visitor.

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(seed) {
  return mulberry32(hash(seed));
}

// Helpers built on one stream, so callers stay readable.
export function intBetween(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

export function oneOf(random, values) {
  return values[Math.floor(random() * values.length)];
}

export function roundedTo(random, min, max, step) {
  const steps = Math.round((max - min) / step);
  return Math.round((min + intBetween(random, 0, steps) * step) * 100) / 100;
}
