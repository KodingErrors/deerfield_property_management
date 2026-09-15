// The callback-availability model, kept free of the DOM so it can be unit tested.
// A selection is a Set of "YYYY-MM-DD|HH:MM" slot keys; both the grid picker and the
// range builder on the contact page write that same shape.

export const SLOT_MINUTES = 30;

export function slotValue(dayKey, minutes) {
  return `${dayKey}|${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function timeLabel(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export function slotsBetween(dayKey, start, end) {
  const values = [];
  for (let minutes = start; minutes < end; minutes += SLOT_MINUTES) values.push(slotValue(dayKey, minutes));
  return values;
}

// Contiguous slots collapse into one window, so a two-hour block reads as a block
// rather than four separate half hours.
export function mergedWindows(selected, days, times) {
  return days.flatMap((day) => {
    const windows = [];
    for (const minutes of times) {
      if (!selected.has(slotValue(day.key, minutes))) continue;
      const previous = windows[windows.length - 1];
      if (previous && previous.end === minutes) previous.end = minutes + SLOT_MINUTES;
      else windows.push({ day, start: minutes, end: minutes + SLOT_MINUTES });
    }
    return windows;
  });
}

// A day key ("YYYY-MM-DD") on its own, formatted the way the picker labels days. Kept
// here rather than in the calendar module so a selection can be described without
// knowing which week is on screen.
export function describeDay(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const format = (options) => new Intl.DateTimeFormat("en-CA", { ...options, timeZone: "UTC" }).format(date);
  return {
    key: dayKey,
    long: format({ weekday: "long", month: "long", day: "numeric" }),
    shortDay: format({ weekday: "short" }),
    shortDate: format({ month: "short", day: "numeric" })
  };
}

// The days a selection actually touches, in order. The picker shows one week at a time,
// so the summary chips and the email lines must be built from the selection itself —
// passing only the visible week would drop windows the visitor chose in another week.
export function daysFromSelection(selected) {
  const keys = [...new Set([...selected].map((value) => value.split("|")[0]))].sort();
  return keys.map(describeDay);
}

export function windowLabel(window) {
  return `${timeLabel(window.start)} – ${timeLabel(window.end)}`;
}

export function availabilityLines(selected, days, times) {
  const byDay = new Map();
  for (const window of mergedWindows(selected, days, times)) {
    byDay.set(window.day.long, [...(byDay.get(window.day.long) || []), windowLabel(window)]);
  }
  return [...byDay].map(([day, windows]) => `- ${day}: ${windows.join(", ")}`);
}
