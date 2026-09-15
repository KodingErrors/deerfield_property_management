// The days and times the callback picker offers: a week at a time, computed in Eastern
// time (not the visitor's clock), and business hours in half-hour slots.
import { SLOT_MINUTES, describeDay } from "./callback-windows.js";

const TIME_ZONE = "America/Toronto";

export type CallbackDay = { key: string; long: string; shortDay: string; shortDate: string };

export const CALLBACK_TIMES: readonly number[] = Array.from({ length: 16 }, (_, index) => 9 * 60 + index * SLOT_MINUTES);

/** How many weeks ahead the picker will go. Week 0 starts tomorrow. */
export const CALLBACK_WEEKS = 4;

function easternDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date());
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as
    { year: number; month: number; day: number };
}

// weekOffset 0 is the seven days starting tomorrow; 1 is the seven after that.
export function callbackDays(weekOffset = 0): CallbackDay[] {
  const today = easternDateParts();
  const base = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const first = 1 + weekOffset * 7;
  return Array.from({ length: 7 }, (_, index) =>
    describeDay(new Date(base.getTime() + (first + index) * 86400000).toISOString().slice(0, 10)) as CallbackDay);
}
