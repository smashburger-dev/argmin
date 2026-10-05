// WheelEvent has no device identity. Small/fractional pixel deltas and any
// horizontal input suggest a precision gesture with its own OS momentum.
// Keep that gesture native through larger deltas instead of switching per tick.
function isPrecisionWheel(event: WheelEvent): boolean {
  return event.deltaMode === 0 && (
    Math.abs(event.deltaY) < 40 || !Number.isInteger(event.deltaY) || event.deltaX !== 0
  );
}

export function createWheelIntent(): (event: WheelEvent) => boolean {
  let precisionUntil = 0;
  return (event) => {
    const now = performance.now();
    const continuingPrecision = event.deltaMode === 0 && now < precisionUntil;
    if (isPrecisionWheel(event) || continuingPrecision) precisionUntil = now + 250;
    if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.shiftKey) return false;
    if (event.deltaY === 0 || event.deltaX !== 0) return false;
    if (event.deltaMode !== 0) return true;
    return now >= precisionUntil;
  };
}

export function wheelDeltaY(event: WheelEvent, pageSize: number): number {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * pageSize;
  return event.deltaY;
}
