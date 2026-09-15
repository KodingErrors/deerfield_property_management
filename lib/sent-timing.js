// Timing of the "Sent!" confirmation modal, shared by the React component and the test
// that pins it: the paper plane flies for FLIGHT_MS, "Sent!" appears, and the modal
// dismisses itself LINGER_MS later unless the visitor closes it first.
export const FLIGHT_MS = 1000;
export const LINGER_MS = 2600;

// When motion is reduced the copy shows immediately and the linger is unchanged.
export function sentSchedule(reducedMotion) {
  const flight = reducedMotion ? 0 : FLIGHT_MS;
  return { landAt: flight, closeAt: flight + LINGER_MS };
}
