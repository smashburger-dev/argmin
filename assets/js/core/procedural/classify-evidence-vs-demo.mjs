// Procedural family classify-evidence-vs-demo: the seed draws a scenario from
// the curated bank and rotates the answer position via buildRotatedChoices.
// Each case keeps its curated base example verbatim as oracle (key 'base') —
// same prompt, same four option texts, same solution — plus new German
// scenarios: evidence-vs-demo probes what artifacts prove (Work Evidence vs
// Mastery via deterministic partial tests), demo-vs-evidence trains the
// overclaim detector on bounded vs absolute README claims. parameters carry
// only the scenario key, so nothing answer-relevant leaks into
// instance.parameters. Mirrors genSvmMarginCapsule in data_ml_families.mjs.

import { makeChoiceFamily } from '../generator_draw_kit.mjs';

import bank from '../../../../content/banks/classify-evidence-vs-demo.json' with { type: 'json' };

export const EVIDENCE_DEMO_CAPSULES = bank.capsules;

export const EVIDENCE_DEMO_CONTRACT = {
  familyId: 'classify-evidence-vs-demo',
  familyGroup: 'classify-concept',
  summary: 'Unterscheidet Evidenz für eine reproduzierbare Pipeline von einer bloßen Demo.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'evidence-vs-demo', propertyTest: false },
    { caseId: 'demo-vs-evidence', propertyTest: false },
  ],
  difficultyProfiles: ['intro'],
  competencyIds: ['c-capstone-pipeline'],
};

export const FAMILY_SPEC = makeChoiceFamily({
  contract: EVIDENCE_DEMO_CONTRACT,
  capsules: EVIDENCE_DEMO_CAPSULES,
  shapeError: 'Evidenz-Demo-Parameter verletzen die Kapselform',
  keyBy: 'caseId',
});

