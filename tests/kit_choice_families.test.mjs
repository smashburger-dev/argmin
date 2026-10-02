// Generic capsule gates for every choice kit in JS_FAMILY_SPECS: the shared
// gates (anchor, bank table, capsule shape, statistics, determinism, contract
// dispatch, registry grading) run over spec + spec.kit — family-specific knobs
// sit in OPTIONS. Family extras (oracle tables, deep anchors) stay in their
// own test files.
// Run: node --test tests/kit_choice_families.test.mjs
import { describe } from 'node:test';
import assert from 'node:assert/strict';
import { JS_FAMILY_SPECS } from '../assets/js/domain/exercise_registry.mjs';
import { standaloneNumberPresent } from '../assets/js/core/generator_draw_kit.mjs';
import { maxAbsVectors } from '../assets/js/core/linalg_generators.mjs';
import { choiceKitSuite } from './helpers/kit_suites.mjs';

const OPTIONS = {
  // alpha-rank carries bare numbers as key text — the digit may appear as a
  // substring inside $\alpha=24$ but never as a standalone number.
  'classify-lora-tradeoff': {
    leakCheck: (prompt, text, generated) => (generated.parameters.caseId === 'lora-alpha-rank'
      ? standaloneNumberPresent(prompt, text)
      : prompt.includes(text)),
  },
  'classify-independence-multiple': {
    complies: (parameters, capsule) => maxAbsVectors(parameters.vectors) <= capsule.bound,
  },
  'classify-matrix-shape': {
    checkParameters: (generated, capsule, label) => {
      for (const dims of [generated.parameters.dimsA, generated.parameters.dimsB]) {
        assert.equal(dims.length, 2, `${label}: Tupel`);
        for (const value of dims) assert.ok(Number.isInteger(value) && value >= 1, `${label}: ganzzahlig`);
      }
    },
  },
};

for (const spec of JS_FAMILY_SPECS) {
  if (spec.kit?.type !== 'choice') continue;
  describe(spec.familyId, () => choiceKitSuite(spec, OPTIONS[spec.familyId]));
}
