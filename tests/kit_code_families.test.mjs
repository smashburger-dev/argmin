// Generic capsule gates for every python-code kit in JS_FAMILY_SPECS —
// anchor, capsule shape, distinct/solver statistics, determinism and the
// contract dispatch block run over spec + spec.kit. Family extras (oracle
// tables, coverage pins) stay in their own test files.
// Run: node --test tests/kit_code_families.test.mjs
import { describe } from 'node:test';
import { JS_FAMILY_SPECS } from '../assets/js/domain/exercise_registry.mjs';
import { codeKitSuite } from './helpers/kit_suites.mjs';

const OPTIONS = {
  // Anchors pin curated fullSolution walkthroughs; generated instances carry
  // the module's own reference text (checked in the capsule-shape gate).
  'formula-descriptive-stats-numpy': { strictSolutionAnchor: false },
};

for (const spec of JS_FAMILY_SPECS) {
  if (spec.kit?.type !== 'code') continue;
  describe(spec.familyId, () => codeKitSuite(spec, OPTIONS[spec.familyId]));
}
