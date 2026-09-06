// Review-route helper (ADR-0015). Deliberately free of the generator
// registry: this module is imported by statically bundled views, and the
// seed derivation is a pure FNV-1a hash over the due key.

/** Review links open a fresh instance for generator-backed exercises: the
 *  seed is derived deterministically from the due key, so one due period
 *  always opens the same fresh instance and the next period opens a
 *  different one. Non-exercise routes (lab) pass through unchanged. */
export function freshReviewRoute(route, generatorId, dueKey) {
  if (!generatorId || typeof route !== 'string' || !route.startsWith('#/exercise/')) return route;
  let h = 2166136261;
  const key = String(dueKey ?? '');
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${route}?seed=${(h >>> 0) % 1000000}`;
}

/** Strict `?seed=N` parsing for both shells (ADR-0015). Only plain decimal
 *  digits within uint32 are a seed override; empty, negative, hex, exponent
 *  or float notation stays a no-op instead of silently coercing to a seed
 *  (Number('') === 0 would otherwise force instance 0 on a broken link). */
export function parseSeedQuery(query) {
  if (typeof query !== 'string' || !query) return null;
  const raw = new URLSearchParams(query).get('seed');
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value <= 0xffffffff ? value : null;
}
