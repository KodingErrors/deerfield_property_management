// The days and times the callback picker offers: the next seven days computed in Eastern
// time (not the visitor's clock), and business hours in half-hour slots.
import { SLOT_MINUTES } from "./callback-windows.js";

const TIME_ZONE = "America/Toronto";

export type CallbackDay = { key: string; long: string; shortDay: string; shortDate: string };

export const CALLBACK_TIMES: readonly number[] = Array.from({ length: 16 }, (_, index) => 9 * 60 + index * SLOT_MINUTES);

function easternDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date());
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as
    { year: number; month: number; day: number };
}

export function callbackDays(): CallbackDay[] {
  const today = easternDateParts();
  const base = new Date(Date.UTC(today.year, today.month - 1, today.day));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base.getTime() + (index + 1) * 86400000);
    return {
      key: date.toISOString().slice(0, 10),
      long: new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(date),
      shortDay: new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: "UTC" }).format(date),
      shortDate: new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(date),
    };
  });
}
