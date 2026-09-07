import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  genAttentionShape, genVocabAfterMerges, genGreedyToken, genLoraParamCount, genRelativeGain,
} from '../assets/js/core/transformer_generators.mjs';
import { legacyOracle } from './helpers/legacy_oracle.mjs';

// Contract tests for the W22-W26 transformer-LLM content.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const WEEKS = [
  { weekId: 'w22', competency: 'c-dl-attention', seedRange: [2201, 2260] },
  { weekId: 'w23', competency: 'c-dl-tokenizer', seedRange: [2301, 2360] },
  { weekId: 'w24', competency: 'c-dl-inference', seedRange: [2401, 2460] },
  { weekId: 'w25', competency: 'c-dl-finetuning', seedRange: [2501, 2560] },
  { weekId: 'w26', competency: 'c-dl-papers', seedRange: [2601, 2660] },
];

// Only these source ids may back the W22-W26 lessons (dispatch contract).
const ALLOWED_SOURCE_IDS = new Set([
  'arxiv-attention-2017', 'arxiv-lora-2021', 'arxiv-rag-2020', 'arxiv-bert-2018',
  'arxiv-gpt3-2020', 'hf-tokenizers-docs', 'hf-transformers-docs', 'karpathy-nanogpt',
  'pytorch-repro-notes', 'numpy-docs', 'model-cards-paper', 'dlbook-goodfellow', 'd2l-book',
]);

const REQUIRED_EXERCISE_FIELDS = [
  'exerciseId', 'schemaVersion', 'skillIds', 'type', 'prompt', 'locale', 'grader',
  'parameters', 'deterministicSeed', 'expectedAnswer', 'tolerancePolicy', 'hints',
  'feedbackRules', 'fullSolution', 'difficulty', 'estimatedMinutes', 'sourceLineage',
  'license', 'validationStatus', 'testedSeedCount',
];

const loadPack = async (weekId) => legacyOracle.weeks[weekId];
const W22_W26_SEED_GENERATORS = {
  genAttentionShape, genVocabAfterMerges, genGreedyToken, genLoraParamCount, genRelativeGain,
};

const loadCompetencies = async () => {
  const doc = JSON.parse(await readFile(join(root, 'content', 'competencies', 'core.json'), 'utf8'));
  const requires = new Map(doc.competencies.map((item) => [item.competencyId, item.requires || []]));
  const closure = (competencyId) => {
    const seen = new Set();
    const stack = [competencyId];
    while (stack.length) {
      const current = stack.pop();
      for (const parent of requires.get(current) || []) {
        if (!seen.has(parent)) {
          seen.add(parent);
          stack.push(parent);
        }
      }
    }
    return seen;
  };
  return { ids: new Set(doc.competencies.map((item) => item.competencyId)), requires, closure };
};

for (const { weekId, competency, seedRange } of WEEKS) {
  test(`${weekId}: pack structure, ids, locale and seeds`, async () => {
    const pack = await loadPack(weekId);
    assert.equal(pack.schemaVersion, 1);
    assert.equal(pack.weekId, weekId);
    assert.equal(pack.locale, 'de');
    assert.equal(pack.exercises.length, 6, `${weekId} must ship six exercises`);
    const seeds = new Set();
    pack.exercises.forEach((exercise, index) => {
      assert.equal(exercise.exerciseId, `${weekId}-e${index + 1}`);
      for (const field of REQUIRED_EXERCISE_FIELDS) {
        assert.ok(field in exercise, `${exercise.exerciseId} misses ${field}`);
      }
      assert.equal(exercise.locale, 'de');
      assert.ok(exercise.deterministicSeed >= seedRange[0] && exercise.deterministicSeed <= seedRange[1],
        `${exercise.exerciseId} seed ${exercise.deterministicSeed} outside ${weekId} range`);
      assert.ok(!seeds.has(exercise.deterministicSeed), `${weekId} seed reused`);
      seeds.add(exercise.deterministicSeed);
      assert.equal(exercise.sourceLineage.statement, 'eigenständig entwickelt');
      assert.equal(exercise.license, 'CC BY 4.0 (generated)');
      assert.ok((exercise.typicalErrors || []).length >= 2, `${exercise.exerciseId} lacks typical errors`);
      assert.ok((exercise.hints || []).length >= 2, `${exercise.exerciseId} lacks hints`);
    });
  });

  test(`${weekId}: week pattern e1..e6 (choice, generated numeric, trace, python d2/d3, boss)`, async () => {
    const pack = await loadPack(weekId);
    const [e1, e2, e3, e4, e5, e6] = pack.exercises;
    assert.equal(e1.type, 'single-choice');
    assert.equal(e1.difficulty, 1);
    assert.equal(e1.masteryEligible, false, `${weekId}-e1 must stay a non-mastery concept check`);
    assert.equal(e1.grader, 'deterministic');
    assert.equal(e2.type, 'numeric');
    assert.equal(e2.difficulty, 2);
    assert.equal(e2.masteryEligible, true);
    assert.ok(W22_W26_SEED_GENERATORS[e2.parameters.seedGenerator],
      `${weekId}-e2 must use a W22-W26 seed generator`);
    assert.equal(e2.expectedAnswer.generator, e2.parameters.seedGenerator);
    assert.equal(e2.tolerancePolicy.mode, 'exact-integer');
    assert.ok(['predict-output', 'code-trace'].includes(e3.type), `${weekId}-e3 must be a trace type`);
    assert.equal(e3.difficulty, 2);
    assert.equal(e3.masteryEligible, true);
    assert.equal(e3.grader, 'deterministic');
    assert.equal(e4.type, 'python-code');
    assert.equal(e4.grader, 'pyodide');
    assert.equal(e4.difficulty, 2);
    assert.equal(e5.type, 'python-code');
    assert.equal(e5.grader, 'pyodide');
    assert.equal(e5.difficulty, 3);
    assert.ok(e6.difficulty >= 4, `${weekId}-e6 must be the final boss`);
    assert.equal(e6.masteryEligible, true);
    assert.ok(['python-code', 'numeric'].includes(e6.type));
    if (e6.type === 'numeric') {
      assert.ok(W22_W26_SEED_GENERATORS[e6.parameters.seedGenerator]);
    }
  });

  test(`${weekId}: tiers span basic, core, advanced and final boss for ${competency}`, async () => {
    const pack = await loadPack(weekId);
    const tier = (d) => (d <= 1 ? 'basic' : d === 2 ? 'core' : d === 3 ? 'advanced' : 'finalBoss');
    const tiers = new Set(pack.exercises.map((item) => tier(item.difficulty)));
    for (const expected of ['basic', 'core', 'advanced', 'finalBoss']) {
      assert.ok(tiers.has(expected), `${weekId} misses tier ${expected}`);
    }
  });

  test(`${weekId}: skillIds stay inside week competency plus predecessors`, async () => {
    const { closure } = await loadCompetencies();
    const allowed = new Set([competency, ...closure(competency)]);
    const pack = await loadPack(weekId);
    for (const exercise of pack.exercises) {
      assert.ok(exercise.skillIds.includes(competency),
        `${exercise.exerciseId} does not train the week competency ${competency}`);
      for (const skillId of exercise.skillIds) {
        assert.ok(allowed.has(skillId),
          `${exercise.exerciseId} references ${skillId} outside ${competency} + predecessors`);
      }
    }
  });

  test(`${weekId}: pyodide tasks ship numpy, __check tests and reference solvers`, async () => {
    const pack = await loadPack(weekId);
    const pythonTasks = pack.exercises.filter((item) => item.grader === 'pyodide');
    assert.ok(pythonTasks.length >= 3, `${weekId} needs its python tasks`);
    for (const task of pythonTasks) {
      assert.equal(task.type, 'python-code');
      assert.deepEqual(task.parameters.packages, ['numpy']);
      assert.match(task.parameters.tests, /__check\(/);
      assert.ok(task.parameters.tests.split('__check(').length - 1 >= 5,
        `${task.exerciseId} needs at least five checks`);
      assert.ok(task.parameters.starterCode && task.parameters.starterCode.length > 0,
        `${task.exerciseId} lacks starter code`);
      assert.ok(task.expectedAnswer.referenceSolver.includes('def '),
        `${task.exerciseId} lacks a reference solver`);
      assert.equal(task.expectedAnswer.kind, 'reference-solver');
      assert.ok(task.fullSolution.includes('def '), `${task.exerciseId} full solution lacks code`);
      assert.ok(task.validationStatus.includes('solver-verified'),
        `${task.exerciseId} must claim local solver verification`);
      assert.equal(task.masteryEligible, true);
    }
  });

  test(`${weekId}: mastery evidence is diverse and generative`, async () => {
    const pack = await loadPack(weekId);
    const mastery = pack.exercises.filter((item) => item.masteryEligible);
    assert.ok(mastery.length >= 5);
    const types = new Set(mastery.map((item) => item.type));
    assert.ok(types.size >= 3, `${weekId} mastery covers only ${[...types].join(',')}`);
    // Generative evidence rule (ADR-0013): at least one python-code or
    // seeded-numeric hit must exist among the mastery tasks.
    assert.ok(mastery.some((item) => item.type === 'python-code'
      || (item.type === 'numeric' && item.parameters.seedGenerator)),
      `${weekId} lacks generative mastery evidence`);
  });

  test(`${weekId}: single-choice has exactly one correct option`, async () => {
    const pack = await loadPack(weekId);
    const [e1] = pack.exercises;
    assert.equal(e1.choices.length, 4);
    const correct = e1.choices.filter((choice) => choice.correct);
    assert.equal(correct.length, 1);
    assert.equal(e1.expectedAnswer.correctChoice, correct[0].id);
    assert.equal(e1.tolerancePolicy.mode, 'none');
  });
}

test('W24 honesty: toy disclaimer in every python prompt and the lesson', async () => {
  const phrase = 'Dies ist eine Toy-Pipeline mit gestellten Gewichten';
  const pack = await loadPack('w24');
  for (const exercise of pack.exercises.filter((item) => item.grader === 'pyodide')) {
    assert.ok(exercise.prompt.includes(phrase),
      `${exercise.exerciseId} must carry the toy disclaimer`);
  }
  const lesson = readFileSync(join(root, 'content', 'lessons', 'transformer-llm', 'tf-inference.md'), 'utf8');
  assert.ok(lesson.includes(phrase) && lesson.includes('lokales Projekt'));
});

test('W25 honesty: fine-tuning stays toy, never claims real model fine-tuning', async () => {
  const pack = await loadPack('w25');
  for (const exercise of pack.exercises.filter((item) => item.grader === 'pyodide')) {
    assert.ok(exercise.prompt.includes('Toy'),
      `${exercise.exerciseId} must frame the experiment as a toy`);
    assert.ok(!/eches Modell.*feinabgestimmt|fine-tuned a real model/i.test(exercise.prompt),
      `${exercise.exerciseId} claims real fine-tuning`);
  }
});

test('W26 honesty: claim-evidence single-choice never carries mastery', async () => {
  const pack = await loadPack('w26');
  const [e1] = pack.exercises;
  assert.equal(e1.masteryEligible, false);
  assert.equal(e1.type, 'single-choice');
});

// --- lessons ---------------------------------------------------------------------

const LESSON_SCHEMA = JSON.parse(readFileSync(join(root, 'schemas', 'lesson.schema.json'), 'utf8'));

/** Minimal JSON-Schema 2020-12 subset validator for the lesson schema
 *  (keywords used there: type, const, enum, pattern, minLength, minimum,
 *  minItems, uniqueItems, required, additionalProperties, items, $ref). */
function validateAgainstSchema(value, schema, path, errors) {
  if (schema.$ref) {
    const ref = schema.$ref.replace('#/$defs/', '');
    validateAgainstSchema(value, LESSON_SCHEMA.$defs[ref], path, errors);
    return;
  }
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} not in enum`);
  }
  if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`${path}: expected object`);
      return;
    }
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${path}: missing required '${key}'`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(schema.properties && key in schema.properties)) {
          errors.push(`${path}: additional property '${key}'`);
        }
      }
    }
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (key in value) validateAgainstSchema(value[key], sub, `${path}.${key}`, errors);
    }
    return;
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${path}: expected array`);
      return;
    }
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: fewer than ${schema.minItems} items`);
    }
    if (schema.uniqueItems) {
      const serialized = value.map((item) => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length) errors.push(`${path}: items not unique`);
    }
    value.forEach((item, index) => {
      if (schema.items) validateAgainstSchema(item, schema.items, `${path}[${index}]`, errors);
    });
    return;
  }
  if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${path}: expected string`);
      return;
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: shorter than ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: does not match ${schema.pattern}`);
    }
    return;
  }
  if (schema.type === 'integer') {
    if (!Number.isInteger(value)) errors.push(`${path}: expected integer`);
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: below minimum ${schema.minimum}`);
    }
  }
}

const LESSONS = [
  { file: 'tf-attention.json', competency: 'c-dl-attention', requires: ['c-dl-tensors', 'c-linalg-matrices'] },
  { file: 'tf-tokenizer.json', competency: 'c-dl-tokenizer', requires: ['c-python-collections'] },
  { file: 'tf-inference.json', competency: 'c-dl-inference', requires: ['c-dl-attention', 'c-dl-tokenizer'] },
  { file: 'tf-finetuning.json', competency: 'c-dl-finetuning', requires: ['c-dl-inference', 'c-dl-regularization'] },
  { file: 'tf-papers.json', competency: 'c-dl-papers', requires: ['c-dl-finetuning', 'c-meta-learning'] },
];

test('transformer-llm lessons validate against the lesson schema', async () => {
  const { ids } = await loadCompetencies();
  for (const lesson of LESSONS) {
    const doc = JSON.parse(await readFile(join(root, 'content', 'lessons', 'transformer-llm', lesson.file), 'utf8'));
    const errors = [];
    validateAgainstSchema(doc, LESSON_SCHEMA, lesson.file, errors);
    assert.deepEqual(errors, [], `${lesson.file} schema violations`);
    assert.deepEqual(doc.competencyIds, [lesson.competency]);
    assert.deepEqual(doc.requires, lesson.requires);
    for (const id of [...doc.competencyIds, ...doc.requires]) {
      assert.ok(ids.has(id), `${lesson.file} references unknown competency ${id}`);
    }
  }
});

test('transformer-llm lessons only cite allowlisted public source ids', async () => {
  const sources = JSON.parse(await readFile(join(root, 'content', 'sources.json'), 'utf8'));
  const known = new Set(sources.sources.map((item) => item.sourceId));
  for (const lesson of LESSONS) {
    const doc = JSON.parse(await readFile(join(root, 'content', 'lessons', 'transformer-llm', lesson.file), 'utf8'));
    assert.ok(doc.sourceRefs.length > 0, `${lesson.file} has no readings`);
    for (const reference of doc.sourceRefs) {
      assert.ok(ALLOWED_SOURCE_IDS.has(reference.sourceId),
        `${lesson.file} cites non-allowlisted source ${reference.sourceId}`);
      assert.ok(known.has(reference.sourceId),
        `${lesson.file} cites unknown source ${reference.sourceId}`);
    }
    assert.equal(doc.rightsId, 'ki-lernplattform-original');
    assert.equal(doc.releaseStatus, 'draft');
    assert.ok(doc.estimatedMinutes >= 60 && doc.estimatedMinutes <= 90,
      `${lesson.file} estimatedMinutes outside 60-90`);
  }
});

test('transformer-llm lessons pair a worked example with a checkpoint block', async () => {
  for (const lesson of LESSONS) {
    const doc = JSON.parse(await readFile(join(root, 'content', 'lessons', 'transformer-llm', lesson.file), 'utf8'));
    const types = doc.blocks.map((block) => block.type);
    assert.ok(types.includes('worked-example'), `${lesson.file} lacks worked example`);
    assert.ok(types.includes('checkpoint') || types.includes('explanation'),
      `${lesson.file} lacks checkpoint/explanation block`);
    for (const block of doc.blocks) {
      if (block.type === 'visualization') {
        assert.ok(block.contentRef.endsWith('.viz.json'), `${lesson.file}: visualization contentRef must be .viz.json`);
      } else {
        assert.ok(block.contentRef.endsWith('.md'), `${lesson.file}: contentRef must be markdown`);
      }
      assert.ok(existsSync(join(root, 'content', block.contentRef)),
        `${lesson.file}: missing content file ${block.contentRef}`);
    }
  }
});

test('transformer-llm worked examples are German essays of 500-900 words', async () => {
  for (const lesson of LESSONS) {
    const doc = JSON.parse(await readFile(join(root, 'content', 'lessons', 'transformer-llm', lesson.file), 'utf8'));
    const worked = doc.blocks.find((block) => block.type === 'worked-example');
    const markdown = readFileSync(join(root, 'content', worked.contentRef), 'utf8');
    const words = markdown.split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 500 && words <= 900,
      `${lesson.file} worked example has ${words} words (expected 500-900)`);
    assert.match(markdown, /\$[^$]+\$/, `${lesson.file} worked example lacks math`);
    assert.match(markdown, /Direkter Check/, `${lesson.file} worked example lacks exercise links`);
  }
});
