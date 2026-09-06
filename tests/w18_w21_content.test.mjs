import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { legacyOracle } from './helpers/legacy_oracle.mjs';

// Content contract tests for the W18-W21 deep-learning week packs and
// lessons (ADR-0013, NumPy-first). Mirrors the data_ml_content pattern but
// reads the authored files directly: catalog registration is the parent's
// integration step, so the compiled bundle does not know these files yet.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const WEEKS = [
  { weekId: 'w18', competencyId: 'c-dl-tensors', generator: 'genLinearParamCount', seedRange: [1801, 1860] },
  { weekId: 'w19', competencyId: 'c-dl-autograd', generator: 'genBackpropChain', seedRange: [1901, 1960] },
  { weekId: 'w20', competencyId: 'c-dl-training', generator: 'genSgdSteps', seedRange: [2001, 2060] },
  { weekId: 'w21', competencyId: 'c-dl-regularization', generator: 'genDropoutCount', seedRange: [2101, 2160] },
];

const ALLOWED_SOURCE_IDS = new Set([
  'dlbook-goodfellow', 'd2l-book', 'karpathy-micrograd', 'karpathy-zero-to-hero',
  'karpathy-recipe-blog', 'karpathy-nanogpt', 'pytorch-repro-notes', 'numpy-docs',
  'hf-transformers-docs', 'devries-ml', 'sklearn-user-guide',
]);

// Reading-skill annotation convention (in use since w08-e3): exercises may
// tag c-python-reading alongside the week competency.
const READING_SKILL = 'c-python-reading';

const competencies = JSON.parse(readFileSync(join(root, 'content/competencies/core.json'), 'utf8')).competencies;
const competencyById = new Map(competencies.map((c) => [c.competencyId, c]));

/** Transitive requires closure of a competency (excluding itself). */
function requiresClosure(id) {
  const seen = new Set();
  const queue = [...(competencyById.get(id)?.requires || [])];
  while (queue.length) {
    const next = queue.shift();
    if (seen.has(next)) continue;
    seen.add(next);
    queue.push(...(competencyById.get(next)?.requires || []));
  }
  return seen;
}

const sources = JSON.parse(readFileSync(join(root, 'content/sources.json'), 'utf8')).sources;
const knownSourceIds = new Set(sources.map((s) => s.sourceId));

const ajv = new Ajv2020({ strict: false, allErrors: true });
const lessonSchema = JSON.parse(readFileSync(join(root, 'schemas/lesson.schema.json'), 'utf8'));
const validateLesson = ajv.compile(lessonSchema);

const REQUIRED_EXERCISE_FIELDS = [
  'exerciseId', 'schemaVersion', 'skillIds', 'type', 'prompt', 'locale', 'grader',
  'parameters', 'deterministicSeed', 'expectedAnswer', 'tolerancePolicy', 'hints',
  'feedbackRules', 'fullSolution', 'typicalErrors', 'difficulty', 'estimatedMinutes',
  'sourceLineage', 'license', 'contentClass', 'validationStatus', 'testedSeedCount',
];

function wordCount(md) {
  return md.split(/\s+/).filter((token) => /[A-Za-zÄÖÜäöüß0-9]/.test(token)).length;
}

for (const { weekId, competencyId, generator, seedRange } of WEEKS) {
  const pack = legacyOracle.weeks[weekId];

  test(`${weekId}: pack parses with weekId, locale and 6 exercises e1..e6`, () => {
    assert.equal(pack.schemaVersion, 1);
    assert.equal(pack.weekId, weekId);
    assert.equal(pack.locale, 'de');
    assert.equal(pack.exercises.length, 6);
    assert.deepEqual(pack.exercises.map((e) => e.exerciseId),
      [1, 2, 3, 4, 5, 6].map((n) => `${weekId}-e${n}`));
  });

  test(`${weekId}: every exercise carries the mandatory fields`, () => {
    for (const exercise of pack.exercises) {
      for (const field of REQUIRED_EXERCISE_FIELDS) {
        assert.notEqual(exercise[field], undefined, `${exercise.exerciseId}: Pflichtfeld ${field} fehlt`);
      }
      assert.equal(exercise.locale, 'de');
      assert.equal(exercise.schemaVersion, 1);
      assert.equal(exercise.license, 'CC BY 4.0 (generated)');
      assert.equal(exercise.contentClass, 'generated');
      assert.ok(Array.isArray(exercise.hints) && exercise.hints.length >= 2,
        `${exercise.exerciseId}: needs 2 gestufte hints`);
      assert.ok(Array.isArray(exercise.feedbackRules) && exercise.feedbackRules.length >= 2
        && exercise.feedbackRules.length <= 3, `${exercise.exerciseId}: feedbackRules 2-3`);
      assert.equal(exercise.typicalErrors.length, 3, `${exercise.exerciseId}: typicalErrors 3`);
      assert.equal(exercise.sourceLineage.statement, 'eigenständig entwickelt');
      assert.ok(exercise.sourceLineage.concept.length > 3);
      assert.ok(Number.isInteger(exercise.sourceLineage.seed));
      assert.match(exercise.validationStatus, /authored/);
      assert.doesNotMatch(exercise.validationStatus, /browser-verified/,
        `${exercise.exerciseId}: browser-verified nicht behauptbar`);
    }
  });

  test(`${weekId}: deterministicSeed unique inside the documented range`, () => {
    const seeds = pack.exercises.map((e) => e.deterministicSeed);
    assert.equal(new Set(seeds).size, 6);
    for (const seed of seeds) {
      assert.ok(seed >= seedRange[0] && seed <= seedRange[1],
        `${weekId}: seed ${seed} outside ${seedRange[0]}-${seedRange[1]}`);
    }
  });

  test(`${weekId}: skillIds stay inside the week competency and its requires closure`, () => {
    const allowed = new Set([competencyId, READING_SKILL, ...requiresClosure(competencyId)]);
    for (const exercise of pack.exercises) {
      assert.ok(exercise.skillIds.includes(competencyId),
        `${exercise.exerciseId}: Wochenkompetenz ${competencyId} fehlt`);
      for (const skill of exercise.skillIds) {
        assert.ok(allowed.has(skill), `${exercise.exerciseId}: skill ${skill} nicht erlaubt`);
      }
    }
  });

  test(`${weekId}: difficulty tiers 1/2/3/4 all present`, () => {
    const tiers = new Set(pack.exercises.map((e) => e.difficulty));
    for (const tier of [1, 2, 3, 4]) assert.ok(tiers.has(tier), `${weekId}: Tier ${tier} fehlt`);
  });

  test(`${weekId}: slot contract e1..e6 (types, graders, mastery)`, () => {
    const [e1, e2, e3, e4, e5, e6] = pack.exercises;
    assert.equal(e1.type, 'single-choice');
    assert.equal(e1.grader, 'deterministic');
    assert.equal(e1.difficulty, 1);
    assert.equal(e1.masteryEligible, false);
    assert.ok(Array.isArray(e1.choices) && e1.choices.length >= 2);
    assert.equal(e1.choices.filter((c) => c.correct === true).length, 1);
    assert.equal(e1.expectedAnswer.correctChoice,
      e1.choices.find((c) => c.correct === true).id);

    assert.equal(e2.type, 'numeric');
    assert.equal(e2.grader, 'deterministic');
    assert.equal(e2.difficulty, 2);
    assert.equal(e2.masteryEligible, true);
    assert.equal(e2.parameters.seedGenerator, generator);
    assert.equal(e2.expectedAnswer.kind, 'seeded-integer');
    assert.equal(e2.expectedAnswer.generator, generator);
    assert.ok(e2.testedSeedCount >= 200, `${weekId}-e2: testedSeedCount >= 200`);

    assert.ok(['predict-output', 'code-trace'].includes(e3.type), `${weekId}-e3 type`);
    assert.equal(e3.grader, 'deterministic');
    assert.equal(e3.difficulty, 2);
    assert.equal(e3.masteryEligible, true);
    if (e3.type === 'predict-output') {
      assert.equal(e3.expectedAnswer.kind, 'output-lines');
      assert.equal(typeof e3.expectedAnswer.output, 'string');
    } else {
      assert.equal(e3.expectedAnswer.kind, 'variable-values');
      assert.ok(e3.parameters.variables.length >= 2);
      assert.ok(e3.parameters.variables.every((v) => Number.isInteger(v.value)));
    }

    for (const exercise of [e4, e5, e6]) {
      assert.equal(exercise.type, 'python-code');
      assert.equal(exercise.grader, 'pyodide');
      assert.deepEqual(exercise.parameters.packages, ['numpy']);
      assert.equal(exercise.masteryEligible, true);
      assert.ok(exercise.parameters.tests.trim().length > 0);
      assert.match(exercise.parameters.tests, /__check\(/);
      assert.equal(exercise.expectedAnswer.kind, 'reference-solver');
      assert.ok(exercise.expectedAnswer.referenceSolver.includes('def '));
      assert.equal(exercise.tolerancePolicy.mode, 'tests');
    }
    assert.equal(e4.difficulty, 2);
    assert.equal(e5.difficulty, 3);
    assert.equal(e6.difficulty, 4);
  });

  test(`${weekId}: honesty contract — NumPy-first, no framework execution claims`, () => {
    for (const exercise of pack.exercises) {
      const packages = exercise.parameters?.packages || [];
      assert.equal(packages.some((p) => ['torch', 'tensorflow', 'jax'].includes(p)), false,
        `${exercise.exerciseId} requests a browser-unavailable framework`);
      const text = `${exercise.prompt} ${exercise.fullSolution}`;
      assert.doesNotMatch(text, /GPU-Training|auf der GPU trainiert/,
        `${exercise.exerciseId} claims GPU training`);
    }
  });
}

const LESSONS = [
  { file: 'lessons/deep-learning/dl-tensors.json', competencyId: 'c-dl-tensors', main: 'dl-tensors.md' },
  { file: 'lessons/deep-learning/dl-autograd.json', competencyId: 'c-dl-autograd', main: 'dl-autograd.md' },
  { file: 'lessons/deep-learning/dl-training.json', competencyId: 'c-dl-training', main: 'dl-training.md' },
  { file: 'lessons/deep-learning/dl-regularization.json', competencyId: 'c-dl-regularization', main: 'dl-regularization.md' },
];

for (const { file, competencyId, main } of LESSONS) {
  const lesson = JSON.parse(readFileSync(join(root, 'content', file), 'utf8'));

  test(`${file}: validates against lesson.schema.json`, () => {
    assert.equal(validateLesson(lesson), true, JSON.stringify(validateLesson.errors));
    assert.equal(lesson.competencyIds.length, 1);
    assert.equal(lesson.competencyIds[0], competencyId);
    assert.equal(lesson.locale, 'de');
    assert.equal(lesson.releaseStatus, 'draft');
    assert.equal(lesson.rightsId, 'ki-lernplattform-original');
    assert.ok(lesson.estimatedMinutes >= 60 && lesson.estimatedMinutes <= 90);
    assert.ok(lesson.objectives.length >= 3 && lesson.objectives.length <= 5);
    assert.ok(lesson.blocks.length >= 2 && lesson.blocks.length <= 4);
    const types = lesson.blocks.map((b) => b.type);
    assert.ok(types.includes('worked-example'));
    assert.ok(types.includes('checkpoint') || types.includes('explanation'));
  });

  test(`${file}: requires mirrors the competency requires`, () => {
    const competency = competencyById.get(competencyId);
    assert.ok(competency);
    assert.deepEqual([...lesson.requires].sort(), [...competency.requires].sort());
  });

  test(`${file}: sourceRefs use allowlisted, existing source ids`, () => {
    assert.ok(lesson.sourceRefs.length >= 2 && lesson.sourceRefs.length <= 3);
    for (const ref of lesson.sourceRefs) {
      assert.ok(ALLOWED_SOURCE_IDS.has(ref.sourceId), `${file}: ${ref.sourceId} nicht erlaubt`);
      assert.ok(knownSourceIds.has(ref.sourceId), `${file}: ${ref.sourceId} unbekannt in sources.json`);
      assert.ok(ref.locator.length > 0);
    }
  });

  test(`${file}: every block resolves to an existing markdown file`, () => {
    for (const block of lesson.blocks) {
      assert.match(block.contentRef, /\.md$/);
      const target = join(root, 'content', block.contentRef);
      assert.ok(existsSync(target), `${file}: ${block.contentRef} fehlt`);
      const md = readFileSync(target, 'utf8');
      assert.match(md, /^# /, `${block.contentRef} beginnt nicht mit # Titel`);
    }
  });

  test(`${main}: german lesson text with 400+ words and KaTeX math`, () => {
    const md = readFileSync(join(root, 'content/lessons/deep-learning', main), 'utf8');
    assert.ok(wordCount(md) >= 400, `${main}: nur ${wordCount(md)} Woerter`);
    assert.ok(md.includes('$'), `${main}: keine Mathe-Ausdrücke`);
  });
}

test('the four week generators are referenced by exactly their e2 exercises', async () => {
  const { W18_W21_SEED_GENERATORS } = await import('../assets/js/core/w18_w21_generators.mjs');
  for (const { weekId, generator } of WEEKS) {
    const pack = legacyOracle.weeks[weekId];
    const generated = pack.exercises.filter((e) => e.parameters?.seedGenerator);
    assert.equal(generated.length, 1, `${weekId}: genau eine Generator-Aufgabe erwartet`);
    assert.equal(generated[0].exerciseId, `${weekId}-e2`);
    assert.ok(Object.hasOwn(W18_W21_SEED_GENERATORS, generator));
    const instance = W18_W21_SEED_GENERATORS[generator](generated[0].deterministicSeed);
    assert.equal(generated[0].expectedAnswer.defaultExpected, instance.expected);
  }
});
