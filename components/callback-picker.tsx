"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CALLBACK_TIMES, callbackDays, type CallbackDay } from "@/lib/callback-schedule";
import { SLOT_MINUTES, availabilityLines, mergedWindows, slotValue, slotsBetween, timeLabel, windowLabel } from "@/lib/callback-windows.js";

export type PickerMode = "auto" | "grid" | "list";

type Props = {
  /** Slot keys "YYYY-MM-DD|HH:MM"; the parent owns the Set so it can outlive the picker. */
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  /** "auto" picks by device (painting suits a mouse, the range builder suits a thumb). */
  mode?: PickerMode;
  /** Whether the visitor has given a phone number; without one a note explains what changes. */
  hasPhone: boolean;
};

type Window = { day: CallbackDay; start: number; end: number };

export function availabilityEmailLines(selected: ReadonlySet<string>, days: CallbackDay[]): string[] {
  return availabilityLines(selected, days, CALLBACK_TIMES) as string[];
}

// Two input modes write the same Set of slot keys, so either can be edited without the
// other losing state: a drag-to-paint grid and a range builder ("list view").
export function CallbackPicker({ selected, onChange, mode = "auto", hasPhone }: Props) {
  const days = useMemo(callbackDays, []);
  const times = CALLBACK_TIMES;
  const [deviceMode, setDeviceMode] = useState<"grid" | "list">("grid");
  const [chosenMode, setChosenMode] = useState<"grid" | "list" | null>(null);
  const [rangeDay, setRangeDay] = useState(() => days[0].key);
  const [rangeStart, setRangeStart] = useState(times[0]);
  const [rangeEnd, setRangeEnd] = useState(times[0] + SLOT_MINUTES * 4);
  const [status, setStatus] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  // The first cell of a drag decides whether the whole drag selects or clears.
  const paint = useRef<boolean | null>(null);
  // Pointer moves can arrive faster than React re-renders, so mutations build on the
  // latest Set handed to onChange rather than on the one from the current render.
  const latest = useRef(selected);
  latest.current = selected;

  useEffect(() => {
    const coarse = matchMedia("(pointer: coarse), (max-width: 720px)");
    const apply = () => setDeviceMode(coarse.matches ? "list" : "grid");
    apply();
    coarse.addEventListener("change", apply);
    return () => coarse.removeEventListener("change", apply);
  }, []);

  const current = chosenMode ?? (mode === "auto" ? deviceMode : mode);
  const windows = mergedWindows(selected, days, times) as Window[];

  function update(mutate: (next: Set<string>) => void) {
    const next = new Set(latest.current);
    mutate(next);
    latest.current = next;
    onChange(next);
  }

  function toggleMany(values: string[]) {
    const selectAll = !values.every((value) => selected.has(value));
    update((next) => values.forEach((value) => (selectAll ? next.add(value) : next.delete(value))));
  }

  function paintCell(cell: Element | null | undefined) {
    const slot = cell instanceof HTMLElement ? cell.dataset.slot : undefined;
    if (!slot || paint.current === null) return;
    const on = paint.current;
    if (latest.current.has(slot) === on) return;
    update((next) => (on ? next.add(slot) : next.delete(slot)));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const cell = (event.target as HTMLElement).closest(".availability-cell");
    if (!cell) return;
    event.preventDefault();
    const slot = (cell as HTMLElement).dataset.slot!;
    paint.current = !selected.has(slot);
    cell.querySelector("input")?.focus();
    paintCell(cell);
    grid.current?.setPointerCapture(event.pointerId);
  }

  // Pointer capture routes every move (and the release) to the grid, so hit-test the cell
  // under the pointer rather than relying on pointerenter.
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (paint.current === null) return;
    paintCell(document.elementFromPoint(event.clientX, event.clientY)?.closest(".availability-cell"));
  }

  function endPaint() {
    paint.current = null;
  }

  function addRange() {
    if (rangeEnd <= rangeStart) {
      setStatus("Choose an end time later than the start time.");
      return;
    }
    update((next) => (slotsBetween(rangeDay, rangeStart, rangeEnd) as string[]).forEach((value) => next.add(value)));
    const day = days.find((item) => item.key === rangeDay)!;
    setStatus(`Added ${day.long}, ${timeLabel(rangeStart)} – ${timeLabel(rangeEnd)}.`);
  }

  function removeWindow(window: Window) {
    update((next) => (slotsBetween(window.day.key, window.start, window.end) as string[]).forEach((value) => next.delete(value)));
    setStatus("");
  }

  return (
    <fieldset className="callback-picker">
      <legend>Callback availability</legend>
      <div className="callback-header">
        <p>Select any 30-minute windows when Deerfield can call you.</p>
        <button className="callback-mode-toggle" id="callback-mode-toggle" type="button" onClick={() => setChosenMode(current === "grid" ? "list" : "grid")}>
          {current === "grid" ? "Switch to list view" : "Switch to grid view"}
        </button>
      </div>

      <div id="callback-grid-view" hidden={current !== "grid"}>
        <p className="callback-hint">Drag across the grid to paint a block of time, and drag back over it to clear. Tap a day or a time heading to toggle that whole column or row.</p>
        <div className="availability-scroll">
          <div
            ref={grid}
            className="availability-grid"
            id="callback-availability"
            role="group"
            aria-label="Callback availability for the next seven days"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPaint}
            onPointerCancel={endPaint}
            onLostPointerCapture={endPaint}
          >
            <span className="availability-corner">Eastern</span>
            {days.map((day) => (
              <button key={day.key} className="availability-day" type="button" aria-label={`Toggle every time on ${day.long}`} onClick={() => toggleMany(times.map((minutes) => slotValue(day.key, minutes)))}>
                <strong>{day.shortDay}</strong><small>{day.shortDate}</small>
              </button>
            ))}
            {times.map((minutes) => (
              <RowFragment key={minutes} minutes={minutes} days={days} selected={selected} onToggleRow={() => toggleMany(days.map((day) => slotValue(day.key, minutes)))} onKeyboardToggle={(slot, on) => update((next) => (on ? next.add(slot) : next.delete(slot)))} />
            ))}
          </div>
        </div>
      </div>

      <div id="callback-range-builder" hidden={current !== "list"}>
        <p className="callback-hint">Add the windows that suit you, one at a time.</p>
        <div className="range-fields">
          <label><span>Day</span>
            <select id="callback-range-day" value={rangeDay} onChange={(event) => setRangeDay(event.target.value)}>
              {days.map((day) => <option key={day.key} value={day.key}>{day.long}</option>)}
            </select>
          </label>
          <label><span>From</span>
            <select id="callback-range-start" value={rangeStart} onChange={(event) => {
              const start = Number(event.target.value);
              setRangeStart(start);
              if (rangeEnd <= start) setRangeEnd(start + SLOT_MINUTES);
            }}>
              {times.map((minutes) => <option key={minutes} value={minutes}>{timeLabel(minutes)}</option>)}
            </select>
          </label>
          <label><span>To</span>
            <select id="callback-range-end" value={rangeEnd} onChange={(event) => setRangeEnd(Number(event.target.value))}>
              {times.map((minutes) => <option key={minutes} value={minutes + SLOT_MINUTES}>{timeLabel(minutes + SLOT_MINUTES)}</option>)}
            </select>
          </label>
          <button className="secondary-button" id="callback-range-add" type="button" onClick={addRange}>Add window</button>
        </div>
        <p className="range-status" id="callback-range-status" aria-live="polite">{status}</p>
      </div>

      <div className="callback-summary" id="callback-range-chips" aria-live="polite">
        {windows.length ? windows.map((window) => (
          <button
            key={`${window.day.key}-${window.start}`}
            className="callback-chip"
            type="button"
            aria-label={`Remove ${window.day.long}, ${timeLabel(window.start)} to ${timeLabel(window.end)}`}
            onClick={() => removeWindow(window)}
          >
            <span>{window.day.shortDay} {window.day.shortDate} · {windowLabel(window)}</span><b aria-hidden="true">×</b>
          </button>
        )) : <p className="callback-empty">No callback windows selected yet.</p>}
      </div>
      {/* A phone number is never required; the note just explains what changes without one. */}
      <p className="field-help" id="callback-phone-note" hidden={!(selected.size && !hasPhone)}>
        Add a phone number above if you would like Deerfield to call. Without one they will reply to these times by email.
      </p>
      <small className="field-help">Callback times are shown from 9:00 a.m. to 5:00 p.m. Eastern. (Other times should be mentioned in the email if need be.)</small>
    </fieldset>
  );
}

function RowFragment({ minutes, days, selected, onToggleRow, onKeyboardToggle }: {
  minutes: number;
  days: CallbackDay[];
  selected: ReadonlySet<string>;
  onToggleRow: () => void;
  onKeyboardToggle: (slot: string, on: boolean) => void;
}) {
  return (
    <>
      <button className="availability-time" type="button" aria-label={`Toggle ${timeLabel(minutes)} on every day`} onClick={onToggleRow}>{timeLabel(minutes)}</button>
      {days.map((day) => {
        const value = slotValue(day.key, minutes);
        const label = `${day.long} at ${timeLabel(minutes)} Eastern`;
        return (
          <label key={value} className="availability-cell" data-slot={value} title={label}>
            {/* Pointer painting calls preventDefault, so onChange only fires for keyboard toggles. */}
            <input type="checkbox" value={value} aria-label={label} checked={selected.has(value)} onChange={(event) => onKeyboardToggle(value, event.target.checked)} />
            <span aria-hidden="true" />
          </label>
        );
      })}
    </>
  );
}
