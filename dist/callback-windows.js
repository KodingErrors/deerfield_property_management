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
