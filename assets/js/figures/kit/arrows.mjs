// Arrow primitive geometry in plane-local 2D (u right, v down). The scene
// emits from/to; the painter renders this path. Kept DOM-free so node tests
// can verify the head contract: tip exactly at `to`, axis parallel to
// from→to.

// Two decimals: at head length ~1 the rounding jitter of 0.05 would tilt the
// measured head axis by a few degrees — the contract allows 1°.
const r = (v) => Math.round(v * 100) / 100;

/**
 * Arrow path `d`: shaft from→head base, triangular head with the tip
 * exactly at `to`. Head length min(1.1, 0.35·len), half-width 0.5·headLen;
 * the shaft stops at the head's base.
 * @param {[number, number]} from @param {[number, number]} to
 * @returns {string}
 */
export function arrowPathD(from, to) {
  const [fx, fy] = from;
  const [tx, ty] = to;
  const dx = tx - fx;
  const dy = ty - fy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const h = Math.min(1.1, 0.35 * len);
  const hw = 0.5 * h;
  const bx = tx - ux * h;
  const by = ty - uy * h;
  return `M${r(fx)} ${r(fy)} L${r(bx)} ${r(by)}`
    + ` M${r(tx)} ${r(ty)} L${r(bx - uy * hw)} ${r(by + ux * hw)} L${r(bx + uy * hw)} ${r(by - ux * hw)} Z`;
}
