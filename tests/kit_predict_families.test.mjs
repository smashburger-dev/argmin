// Generic capsule gates for every predict-output kit in JS_FAMILY_SPECS —
// anchor, capsule shape, solver/distinct statistics, determinism and the
// contract dispatch block run over spec + spec.kit. Family extras (oracle
// tables, coverage pins) stay in their own test files.
// Run: node --test tests/kit_predict_families.test.mjs
import { describe } from 'node:test';
import { JS_FAMILY_SPECS } from '../assets/js/domain/exercise_registry.mjs';
import { predictKitSuite } from './helpers/kit_suites.mjs';

for (const spec of JS_FAMILY_SPECS) {
  if (spec.kit?.type !== 'predict') continue;
  describe(spec.familyId, () => predictKitSuite(spec));
}
