import { W01_SEED_GENERATORS } from './w01_generators.mjs';
import { genColumnCombination } from './w05_generators.mjs';
import { DATA_ML_SEED_GENERATORS } from './data_ml_generators.mjs';
import { W18_W21_SEED_GENERATORS } from './w18_w21_generators.mjs';
import { W22_W26_SEED_GENERATORS } from './w22_w26_generators.mjs';
import { W27_W30_SEED_GENERATORS } from './w27_w30_generators.mjs';
import { W31_W39_SEED_GENERATORS } from './w31_w39_generators.mjs';
import { FOUNDATIONS_FRESH_GENERATORS } from './foundations_fresh_generators.mjs';
import { LINALG_NUMPY_FRESH_GENERATORS } from './linalg_numpy_fresh_generators.mjs';

const registry = {};
for (const source of [
  W01_SEED_GENERATORS,
  { genColumnCombination },
  DATA_ML_SEED_GENERATORS,
  W18_W21_SEED_GENERATORS,
  W22_W26_SEED_GENERATORS,
  W27_W30_SEED_GENERATORS,
  W31_W39_SEED_GENERATORS,
  FOUNDATIONS_FRESH_GENERATORS,
  LINALG_NUMPY_FRESH_GENERATORS,
]) {
  for (const [generatorId, generator] of Object.entries(source)) {
    if (Object.hasOwn(registry, generatorId)) throw new Error(`Doppelte Generator-ID ${generatorId}`);
    registry[generatorId] = generator;
  }
}

export const SEED_GENERATORS = Object.freeze(registry);

export function hasSeedGenerator(generatorId) {
  return typeof generatorId === 'string' && Object.hasOwn(SEED_GENERATORS, generatorId);
}

export function resolveSeedGenerator(generatorId) {
  if (!hasSeedGenerator(generatorId)) throw new Error(`Unbekannter Legacy-Generator ${generatorId}`);
  return SEED_GENERATORS[generatorId];
}
