import test from "node:test";
import assert from "node:assert/strict";
import {
  SLOT_MINUTES,
  availabilityLines,
  mergedWindows,
  slotValue,
  slotsBetween,
  timeLabel,
  windowLabel,
} from "../lib/callback-windows.js";

const days = [
  { key: "2026-09-15", long: "Tuesday, September 15", shortDay: "Tue", shortDate: "Sep 15" },
  { key: "2026-09-16", long: "Wednesday, September 16", shortDay: "Wed", shortDate: "Sep 16" },
];
const times = Array.from({ length: 16 }, (_, index) => 9 * 60 + index * SLOT_MINUTES);

function selection(...values) {
  return new Set(values);
}

test("slot keys keep the stored format the email payload expects", () => {
  assert.equal(slotValue("2026-09-15", 9 * 60), "2026-09-15|09:00");
  assert.equal(slotValue("2026-09-15", 16 * 60 + 30), "2026-09-15|16:30");
});

test("times read in Eastern business hours, including noon and 5 PM", () => {
  assert.equal(timeLabel(9 * 60), "9:00 AM");
  assert.equal(timeLabel(11 * 60 + 30), "11:30 AM");
  assert.equal(timeLabel(12 * 60), "12:00 PM");
  assert.equal(timeLabel(17 * 60), "5:00 PM");
});

test("contiguous slots collapse into a single window", () => {
  const selected = selection(...slotsBetween("2026-09-15", 9 * 60, 11 * 60));
  const windows = mergedWindows(selected, days, times);
  assert.equal(windows.length, 1);
  assert.equal(windowLabel(windows[0]), "9:00 AM – 11:00 AM");
});

test("a gap splits one day into separate windows", () => {
  const selected = selection(
    ...slotsBetween("2026-09-15", 9 * 60, 10 * 60),
    ...slotsBetween("2026-09-15", 13 * 60, 14 * 60)
  );
  const windows = mergedWindows(selected, days, times);
  assert.deepEqual(windows.map(windowLabel), ["9:00 AM – 10:00 AM", "1:00 PM – 2:00 PM"]);
});

test("windows never merge across days", () => {
  const selected = selection(
    slotValue("2026-09-15", 16 * 60 + 30),
    slotValue("2026-09-16", 9 * 60)
  );
  const windows = mergedWindows(selected, days, times);
  assert.equal(windows.length, 2);
  assert.deepEqual(windows.map((window) => window.day.key), ["2026-09-15", "2026-09-16"]);
});

test("the last slot of the day ends at 5 PM rather than running over", () => {
  const selected = selection(slotValue("2026-09-15", 16 * 60 + 30));
  assert.equal(windowLabel(mergedWindows(selected, days, times)[0]), "4:30 PM – 5:00 PM");
});

test("email lines group every window under its day", () => {
  const selected = selection(
    ...slotsBetween("2026-09-15", 9 * 60, 11 * 60 + 30),
    ...slotsBetween("2026-09-15", 13 * 60, 14 * 60),
    ...slotsBetween("2026-09-16", 15 * 60, 17 * 60)
  );
  assert.deepEqual(availabilityLines(selected, days, times), [
    "- Tuesday, September 15: 9:00 AM – 11:30 AM, 1:00 PM – 2:00 PM",
    "- Wednesday, September 16: 3:00 PM – 5:00 PM",
  ]);
});

test("an empty selection produces no callback lines", () => {
  assert.deepEqual(availabilityLines(selection(), days, times), []);
});

test("slotsBetween covers the range but stops before the end time", () => {
  assert.deepEqual(slotsBetween("2026-09-15", 9 * 60, 10 * 60 + 30), [
    "2026-09-15|09:00",
    "2026-09-15|09:30",
    "2026-09-15|10:00",
  ]);
  assert.deepEqual(slotsBetween("2026-09-15", 9 * 60, 9 * 60), []);
});
