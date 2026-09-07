import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DATA_ML_FAMILY_SPECS,
  generateFormulaCountFromConstructionFamily,
  generateFormulaStatFromTableFamily,
  solveFormulaCountFromConstruction,
  solveFormulaStatFromTable,
} from '../assets/js/core/data_ml_families.mjs';
import { genAttentionShape, genGreedyToken, genLoraParamCount, genRelativeGain, genVocabAfterMerges } from '../assets/js/core/w22_w26_generators.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
import { createFamilyRegistry, registerStaticCases, staticFamilySpec } from '../assets/js/domain/family_registry.mjs';
import { legacyOracle } from './helpers/legacy_oracle.mjs';

const root = join(process.cwd(), 'content');
const legacy = {};
for (const week of [22, 23, 24, 25, 26]) {
  const exercises = legacyOracle.weeks[`w${week}`].exercises;
  for (const exercise of exercises) legacy[exercise.exerciseId] = exercise;
}

const staticDocs = [
  'classify-attention-roles',
  'optimize-softmax-attention-mask',
  'construct-attention-mask',
  'optimize-multi-head-attention',
  'classify-subword-principle',
  'transform-tokenize-roundtrip',
  'transform-bpe-merge-apply',
  'optimize-bpe-merge-learn',
  'classify-decoding-strategy',
  'optimize-decode-greedy-loop',
  'compose-toy-inference-pipeline',
  'classify-lora-tradeoff',
  'formula-lora-delta-apply',
  'classify-benchmark-reading',
  'formula-ratio-percent-metric',
  'validate-required-field-raise',
  'rank-evidence-table',
  'trace-assignment-state',
];

const docs = staticDocs.map((familyId) => JSON.parse(
  readFileSync(join(root, 'families', `${familyId}.json`), 'utf8'),
));
for (const document of docs) registerStaticCases(document.familyId, document.cases);
const staticFamilies = createFamilyRegistry(
  docs.filter((document) => document.contract).map(staticFamilySpec),
);





test('S4D21 runtime specs contain all seeded cases and competency overrides', () => {
  const byFamily = new Map(DATA_ML_FAMILY_SPECS.map((spec) => [spec.familyId, spec]));
  for (const [familyId, caseId, competencyId] of [
    ['formula-count-from-construction', 'attention-tensor-cells', 'c-dl-attention'],
    ['formula-count-from-construction', 'bpe-vocab-size', 'c-dl-tokenizer'],
    ['formula-count-from-construction', 'lora-param-count', 'c-dl-finetuning'],
    ['formula-stat-from-table', 'greedy-step-stat', 'c-dl-inference'],
    ['formula-stat-from-table', 'paper-gain-from-counts', 'c-dl-papers'],
  ]) {
    const type = byFamily.get(familyId).caseTypes.find((entry) => entry.caseId === caseId);
    assert.deepEqual(type.competencyIds, [competencyId]);
  }
});

test('S4D21 static cases instantiate with legacy source lineage', () => {
  for (const document of docs) {
    for (const item of document.cases) {
      const registry = document.contract ? staticFamilies : EXERCISE_FAMILIES;
      const instance = registry.instantiate(document.familyId, 0, item.difficultyProfile, item.caseId);
      assert.ok(item.sourceLineage?.length);
      assert.ok(instance.prompt);
    }
  }
});
