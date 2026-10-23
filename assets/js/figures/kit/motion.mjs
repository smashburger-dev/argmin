// Time-based motion helpers for the figure kit. All functions are pure:
// callers keep the state, these map (state, dt) -> new state.

/**
 * Frame delta in seconds. First call (last === 0) assumes 60 fps; real deltas
 * clamp at 1/30 s so a hidden tab cannot teleport the animation.
 * @param {number} now ms @param {number} last ms @returns {number} seconds
 */
export function clampDt(now, last) {
  if (last === 0) return 1 / 60;
  return Math.min(Math.max((now - last) / 1000, 0), 1 / 30);
}

/**
 * Exponential follow: x glides to target with time constant tau. Snaps when
 * the remaining error is below 1e-4; calm jumps straight to target.
 * @returns {number}
 */
export function follow(x, target, dt, tau, calm) {
  if (calm) return target;
  const err = target - x;
  if (Math.abs(err) < 1e-4) return target;
  return x + err * (1 - Math.exp(-dt / tau));
}

/**
 * Critically damped spring on state = { x, v } toward target. omega = 1/seconds,
 * integrated in 4 substeps for stability. Returns true while still moving;
 * once |error| and |v| are below 1e-4 the state snaps to rest and returns false.
 * calm jumps straight to target.
 * @param {{ x: number, v: number }} state @param {number} target
 * @param {number} dt seconds @param {number} seconds time constant
 * @param {boolean} calm @returns {boolean} still moving
 */
export function settle(state, target, dt, seconds, calm) {
  if (calm) {
    state.x = target;
    state.v = 0;
    return false;
  }
  const w = 1 / seconds;
  const h = dt / 4;
  for (let i = 0; i < 4; i += 1) {
    state.v += (w * w * (target - state.x) - 2 * w * state.v) * h;
    state.x += state.v * h;
  }
  if (Math.abs(target - state.x) < 1e-4 && Math.abs(state.v) < 1e-4) {
    state.x = target;
    state.v = 0;
    return false;
  }
  return true;
}

/** Shortest signed angular difference from -> to, in (-pi, pi]. @returns {number} */
export function angleDelta(from, to) {
  const tau = Math.PI * 2;
  return ((((to - from) % tau) + tau * 1.5) % tau) - Math.PI;
}

/** Classic smoothstep between edges a and b. @returns {number} in [0, 1] */
export function smoothstep(a, b, x) {
  if (b - a === 0) return x >= b ? 1 : 0;
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * Eased progress of a sub-interval: 0 before a, smoothstep ramp inside
 * [a, b], 1 after b.
 * @param {number} p global progress in [0, 1] @param {number} a @param {number} b
 * @returns {number} in [0, 1]
 */
export function span(p, a, b) {
  return smoothstep(a, b, p);
}

/**
 * One-shot pulse: smoothstep rise over [0, rise], exponential decay with time
 * constant fall after the peak, 0 for negative age.
 * @param {number} age seconds since the event @param {number} rise @param {number} fall
 * @returns {number}
 */
export function burst(age, rise, fall) {
  if (age < 0) return 0;
  if (age < rise) return smoothstep(0, rise, age);
  return Math.exp(-(age - rise) / fall);
}
