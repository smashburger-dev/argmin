// Fresh-instance seed drawing (ADR-0015). Pure, deterministic-per-call-site
// helpers shared by the legacy and the Next shell so both draw equivalent
// fresh instances for retrieval practice and reviews.

import { resolveSeedGenerator } from '../core/seed_generator_registry.mjs';

const variantKeyOf = (generatorId, seed) => {
  const instance = resolveSeedGenerator(generatorId)(seed >>> 0);
  // Only semantic variant banks declare a caseId; procedural families are
  // fresh on every new seed (numbers/states change with the seed itself).
  return instance.parameters?.caseId !== undefined ? String(instance.parameters.caseId) : null;
};

/** Draw a uint32 seed whose instance differs from the current one. For
 *  semantic variant banks (caseId) this avoids re-serving the immediately
 *  previous case; for procedural families every new seed qualifies.
 *  Bounded attempts keep the draw cheap; on a degenerate generator the
 *  last candidate is returned so re-rolling never blocks the learner. */
export function drawFreshSeed(generatorId, currentSeed, random = Math.random, maxTries = 8) {
  const currentKey = variantKeyOf(generatorId, currentSeed);
  if (currentKey === null) return (1 + Math.floor(random() * 1_000_000)) >>> 0;
  let seed = 0;
  for (let i = 0; i < maxTries; i++) {
    seed = (1 + Math.floor(random() * 1_000_000)) >>> 0;
    if (variantKeyOf(generatorId, seed) !== currentKey) return seed;
  }
  return seed;
}
