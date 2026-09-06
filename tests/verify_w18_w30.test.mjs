import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptLegacyExercise } from '../assets/js/core/legacy_exercise_adapter.mjs';
import { routeForDefinition } from '../assets/js/domain/activity_route.mjs';
import { W01_SEED_GENERATORS } from '../assets/js/core/w01_generators.mjs';
import { DATA_ML_SEED_GENERATORS } from '../assets/js/core/data_ml_generators.mjs';
import { SEED_GENERATORS } from '../assets/js/core/seed_generator_registry.mjs';
import { W18_W21_SEED_GENERATORS } from '../assets/js/core/w18_w21_generators.mjs';
import { W22_W26_SEED_GENERATORS } from '../assets/js/core/w22_w26_generators.mjs';
import { W27_W30_SEED_GENERATORS } from '../assets/js/core/w27_w30_generators.mjs';
import { catalogRoot, discoverJson } from '../tools/content_roots.mjs';

// W18-W30 integration verification against the ADR-0013 contracts. These
// tests are acceptance checks over the authored sources (week packs, lessons,
// project package, coverage matrix, generator modules, route/adapter
// runtime). They deliberately do NOT execute Python: browser execution is the
// job of the CDP acceptance suite; here the solver/test contracts are checked
// statically, and the deterministic numeric generators are executed in Node.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEEKS = Array.from({ length: 13 }, (_, index) => `w${18 + index}`);
const PYODIDE_GRADERS = new Set(['pyodide', 'pyodide-sympy']);
const AUTHORITATIVE_GRADERS = new Set(['deterministic', 'pyodide', 'pyodide-sympy']);
const PRIVATE_MARKERS = /library-private|private-extracts|locatorPath|localPath|\/Users\/|\bMML\b|mml-book|murphy-pml|cs50p-psets-harvard/i;

const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const pack = (weekId) => readJson(`content/exercises/${weekId}.json`);
const exercisesOf = (weekId) => pack(weekId).exercises;
const ALL_EXERCISES = WEEKS.flatMap((weekId) => exercisesOf(weekId).map((exercise) => ({ weekId, exercise })));
const pyodideExercises = (weekId) => exercisesOf(weekId).filter((exercise) => PYODIDE_GRADERS.has(exercise.grader));

// --- Python static analysis ---------------------------------------------------
// Strip string literals (single, double, triple quoted) and comments so that
// brackets inside prose (e.g. "p muss in (0, 1] liegen") do not produce false
// balance failures, then check bracket balance on the remaining code.

function stripPythonStringsAndComments(code) {
  let out = '';
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '#') {
      while (i < code.length && code[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = code.slice(i, i + 3) === ch.repeat(3) ? ch.repeat(3) : ch;
      i += quote.length;
      while (i < code.length) {
        if (code[i] === '\\') { i += 2; continue; }
        if (code.startsWith(quote, i)) { i += quote.length; break; }
        i += 1;
      }
      out += ' ';
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function bracketsBalanced(code) {
  const stack = [];
  const closing = { ')': '(', ']': '[', '}': '{' };
  for (const ch of stripPythonStringsAndComments(code)) {
    if ('([{'.includes(ch)) stack.push(ch);
    else if (ch in closing && stack.pop() !== closing[ch]) return false;
  }
  return stack.length === 0;
}

// --- B1: solver agreement -----------------------------------------------------

test('every pyodide exercise ships a non-empty reference solver and a parseable, non-empty test block', () => {
  assert.ok(ALL_EXERCISES.some(({ exercise }) => PYODIDE_GRADERS.has(exercise.grader)), 'w18-w30 must contain pyodide exercises');
  for (const { exercise } of ALL_EXERCISES) {
    if (!PYODIDE_GRADERS.has(exercise.grader)) continue;
    const solver = exercise.expectedAnswer?.referenceSolver ?? '';
    const tests = exercise.parameters?.tests ?? '';
    assert.equal(exercise.expectedAnswer?.kind, 'reference-solver', `${exercise.exerciseId}: pyodide tasks need a reference-solver expectedAnswer`);
    assert.ok(solver.trim().length > 0, `${exercise.exerciseId}: referenceSolver must not be empty`);
    assert.ok(tests.trim().length > 0, `${exercise.exerciseId}: parameters.tests must not be empty`);
    // Static parse heuristics: balanced brackets outside strings, and the
    // solver actually defines a function that returns a value.
    assert.equal(bracketsBalanced(solver), true, `${exercise.exerciseId}: referenceSolver brackets unbalanced`);
    assert.equal(bracketsBalanced(tests), true, `${exercise.exerciseId}: tests brackets unbalanced`);
    assert.match(solver, /\bdef\s+\w+\s*\(/, `${exercise.exerciseId}: referenceSolver defines no function`);
    assert.match(solver, /\breturn\b/, `${exercise.exerciseId}: referenceSolver never returns`);
    // The tests must drive the grader contract through __check.
    assert.match(tests, /__check\(/, `${exercise.exerciseId}: tests never call __check`);
  }
});

// --- B2: W19 numeric gradient contracts ---------------------------------------

test('w19 autograd exercises verify analytic gradients against a central numeric difference', () => {
  const gradientTasks = pyodideExercises('w19');
  assert.ok(gradientTasks.length >= 3, 'w19 must ship its autograd python tasks');
  for (const exercise of gradientTasks) {
    const tests = exercise.parameters.tests;
    // Central difference: (f(x+h) - f(x-h)) / (2*h) with a small explicit h.
    assert.match(tests, /2\s*\*\s*h/, `${exercise.exerciseId}: no central difference (2 * h) in the numeric check`);
    assert.match(tests, /\bh\s*=\s*1e-\d/, `${exercise.exerciseId}: numeric check needs an explicit small step h = 1e-<n>`);
    // Numeric comparison with a tolerance: allclose or an explicit epsilon.
    assert.match(tests, /allclose|abs\([^)]*\)\s*<|<\s*1e-\d/, `${exercise.exerciseId}: numeric check compares with a tolerance`);
  }
});

// --- B3: W22 attention contracts ----------------------------------------------

test('w22 attention exercises assert masking, softmax and row normalization', () => {
  const attentionTasks = pyodideExercises('w22');
  assert.ok(attentionTasks.length >= 3, 'w22 must ship its attention python tasks');
  const allTests = attentionTasks.map((exercise) => exercise.parameters.tests);
  // Every attention task must exercise the mask parameter.
  for (const [index, tests] of allTests.entries()) {
    assert.match(tests, /mask/i, `w22 python task ${index + 1}: mask handling is not asserted`);
  }
  // Week-level contract: additive -inf masking, softmax by name, and a
  // row-sum normalization check (weights of a row sum to 1).
  assert.ok(allTests.some((tests) => /-inf/.test(tests)), 'w22 tests never use -inf masking');
  assert.ok(allTests.some((tests) => /softmax/i.test(tests)), 'w22 tests never assert softmax by name');
  assert.ok(allTests.some((tests) => /\.sum\(axis\s*=\s*1\)|Zeilensumme/i.test(tests)), 'w22 tests never check that softmax rows sum to 1');
});

// --- B4: W23 tokenizer contracts ----------------------------------------------

test('w23 tokenizer exercises assert an encode/decode round trip and a deterministic merge table', () => {
  const tokenizerTasks = pyodideExercises('w23');
  assert.ok(tokenizerTasks.length >= 3, 'w23 must ship its tokenizer python tasks');
  const allTests = tokenizerTasks.map((exercise) => exercise.parameters.tests).join('\n');
  // Round-trip property decode(encode(s)) == s must be an actual assertion.
  assert.match(allTests, /__check\([^)]*decode\(\s*encode\(/s, 'w23 tests never assert the decode(encode(s)) round trip');
  // Determinism: a fixed merge table literal and exact-equality expectations
  // against a fully spelled out sequence (no golden output hidden in code).
  assert.match(allTests, /MERGES\s*=\s*\[\s*\(/, 'w23 tests never pin a fixed merge table');
  assert.match(allTests, /(?:bpe_encode|learn_merges)\([^)]*\)\s*==\s*\[\s*\(/, 'w23 tests never assert an exact deterministic merge sequence');
});

// --- B5: W27 retrieval golden sets and genRecallAtK properties ----------------

test('w27 ranking exercises grade against fixed golden sets (corpus, relevance labels, recall)', () => {
  for (const exercise of pyodideExercises('w27')) {
    const tests = exercise.parameters.tests;
    if (!/rank(_query)?\s*\(/.test(tests)) continue; // normalize/chunk task: no ranking contract
    assert.match(tests, /\b\w*DOCS\w*\s*=\s*\[/, `${exercise.exerciseId}: ranking test needs a fixed golden corpus`);
    // Golden relevance labels: either a named list (B_RELEVANT = [...]) or a
    // fixed inline index list handed to recall_at_k([...], ...) — both are
    // golden sets, anything computed would not be a golden set.
    assert.match(tests, /\b\w*(RELEVANT|relevant)\w*\s*=\s*\[|recall_at_k\(\s*\[\s*\d/, `${exercise.exerciseId}: ranking test needs fixed relevance labels`);
    assert.match(tests, /recall|evaluate/i, `${exercise.exerciseId}: ranking test must assert recall/evaluate`);
  }
});

test('genRecallAtK stays deterministic, integer-exact and varied over 200 seeds', () => {
  const seeds = Array.from({ length: 200 }, (_, index) => 2701 + index);
  const instances = seeds.map((seed) => W27_W30_SEED_GENERATORS.genRecallAtK(seed));
  const distinct = new Set(instances.map((instance) => instance.expected));
  assert.ok(distinct.size >= 20, `genRecallAtK answer space collapsed to ${distinct.size} distinct values (< 20)`);
  for (const [index, seed] of seeds.entries()) {
    const instance = instances[index];
    assert.ok(Number.isInteger(instance.expected), `seed ${seed}: expected answer must be an exact integer`);
    assert.deepEqual(W27_W30_SEED_GENERATORS.genRecallAtK(seed), instance, `seed ${seed}: generator is not deterministic`);
  }
});

// --- B6: evaluation without an LLM grader as ground truth ---------------------

test('no w18-w30 exercise uses an LLM judge or an external API as authoritative ground truth', () => {
  for (const { exercise } of ALL_EXERCISES) {
    // Hard contract: mastery only through authoritative graders; a
    // manual-rubric grader is never mastery-eligible.
    if (exercise.masteryEligible === true) {
      assert.ok(AUTHORITATIVE_GRADERS.has(exercise.grader),
        `${exercise.exerciseId}: masteryEligible with non-authoritative grader ${exercise.grader}`);
    }
    if (exercise.grader === 'manual-rubric') {
      assert.notEqual(exercise.masteryEligible, true, `${exercise.exerciseId}: manual-rubric must never be mastery-eligible`);
    }
    // Hard contract: expectedAnswer never defers to the network or an API key.
    const expected = JSON.stringify(exercise.expectedAnswer ?? {});
    assert.doesNotMatch(expected, /https?:\/\//i, `${exercise.exerciseId}: expectedAnswer references a URL`);
    assert.doesNotMatch(expected, /\brequests\b|\burllib\b|\bopenai\b|\bhttpx\b/i, `${exercise.exerciseId}: expectedAnswer calls an external library/API`);
    assert.doesNotMatch(expected, /api[_-]?key| bearer\s+/i, `${exercise.exerciseId}: expectedAnswer embeds an API credential`);
  }
});

// --- B7: W29 defensive security classification --------------------------------

test('w29 injection examples stay synthetic and defensive: no credentials, no real targets, no attack instructions', () => {
  const w29 = pack('w29');
  const serialized = JSON.stringify(w29);

  // Allow-list for domains: synthetic example domains only. A real domain in
  // an injection example would turn the fixture into an operational pointer.
  const domains = new Set((serialized.match(/\b[a-z0-9][a-z0-9-]*\.(?:com|invalid|de|org|net|io|dev)\b/gi) || []).map((value) => value.toLowerCase()));
  for (const domain of domains) {
    assert.ok(
      ['example.com', 'example.invalid', 'example.org', 'example.net'].includes(domain),
      `w29 uses a non-example domain in an injection fixture: ${domain}`,
    );
  }

  // Credential literals and credential-bearing URLs are forbidden everywhere
  // in the pack (also inside detection corpora: a fixture never needs a real
  // secret to be classifiable).
  assert.doesNotMatch(serialized, /https?:\/\/[^\s"'`]*:[^\s"'`@]+@/i, 'w29 contains a URL with embedded credentials');
  assert.doesNotMatch(serialized, /password\s*=\s*\S/i, 'w29 contains a password literal');
  assert.doesNotMatch(serialized, /api[_-]?key\s*=\s*\S/i, 'w29 contains an api key literal');
  assert.doesNotMatch(serialized, /\.env\b/i, 'w29 references .env files');

  // Attack instructions are forbidden in learner-facing instruction fields.
  // Corpus lines inside parameters.tests are labeled detection data, not
  // instructions, so they are excluded from the imperative deny-list (they
  // remain covered by the credential and domain rules above).
  const instructionFields = [];
  for (const exercise of w29.exercises) {
    instructionFields.push(String(exercise.prompt ?? ''));
    instructionFields.push(String(exercise.fullSolution ?? ''));
    if (typeof exercise.parameters?.starterCode === 'string') instructionFields.push(exercise.parameters.starterCode);
    for (const hint of exercise.hints ?? []) instructionFields.push(String(hint));
    for (const rule of exercise.feedbackRules ?? []) instructionFields.push(String(rule.then ?? ''));
    for (const choice of exercise.choices ?? []) instructionFields.push(String(choice.text ?? ''));
    instructionFields.push(String(exercise.expectedAnswer?.referenceSolver ?? ''));
  }
  const instructions = instructionFields.join('\n');
  // German imperative attack phrasings against third-party targets. Kept
  // narrow on purpose: nouns like "Angriffsfläche" or "Angreifer" describe
  // threats defensively and must not trip the deny-list; only imperatives
  // directed at foreign systems or offensive-technique assignments do.
  const attackInstructions = [
    /\bgreife\b[^.]{0,80}\ban\b/i,
    /\b(attackiere|kompromittiere|infiltriere|laehm|spaehe\s+aus)\b/i,
    /\b(attackiere|kompromittiere|infiltriere|greife)\b[^.]{0,60}\b(fremde[n]?|externe[n]?|oeffentliche[n]?|fremdes)\b/i,
    /\b(brute[\s-]?force|ddos|botnetz)\b[^.]{0,60}\b(gegen|auf|auf\s+fremde)\b/i,
    /\b(sql[\s-]?injection|exploit)\b[^.]{0,60}\b(entwickle|schreibe|baue|programmiere|fuehre\s+aus)\b/i,
  ];
  for (const pattern of attackInstructions) {
    assert.doesNotMatch(instructions, pattern, `w29 instruction text asks learners to attack external systems (${pattern})`);
  }
});

// --- B8: manual-rubric / short-rationale mastery exclusion ---------------------

test('manual-rubric and short-rationale tasks never grant mastery in w18-w30', () => {
  for (const { weekId, exercise } of ALL_EXERCISES) {
    const selfReported = exercise.grader === 'manual-rubric' || exercise.type === 'short-rationale';
    if (selfReported) {
      assert.equal(exercise.masteryEligible, false, `${exercise.exerciseId}: self-reported evidence must set masteryEligible false`);
    }
    // The adapter is the runtime view of the pack: it must agree with the
    // authored flag (it already forces manual-rubric to false).
    const definition = adaptLegacyExercise(exercise, weekId);
    if (selfReported) {
      assert.equal(definition.masteryEligible, false, `${exercise.exerciseId}: adapter makes self-reported evidence mastery-eligible`);
    }
  }
});

// --- B9: native routes and lesson registration --------------------------------

test('every w18-w30 exercise resolves to a native route and every new lesson is registered in the catalog', () => {
  for (const { weekId, exercise } of ALL_EXERCISES) {
    const definition = adaptLegacyExercise(exercise, weekId);
    const route = routeForDefinition(definition);
    assert.match(route, /^#\/(exercise|lab)\//, `${exercise.exerciseId}: no native route (${route})`);
    if (definition.activityType === 'python-code') {
      assert.ok(route.startsWith('#/lab/'), `${exercise.exerciseId}: python-code must open the lab route`);
    } else {
      assert.ok(route.startsWith('#/exercise/'), `${exercise.exerciseId}: ${definition.activityType} must open the exercise route`);
    }
  }

  const catalog = readJson('content/catalog.json');
  const discoveredLessons = new Set(discoverJson(join(root, 'content'), catalogRoot(catalog, 'lessons')));
  const newLessonDirs = ['deep-learning', 'transformer-llm', 'genai-systems'];
  const newLessonFiles = newLessonDirs.flatMap((dir) => readdirSync(join(root, 'content/lessons', dir))
    .filter((file) => file.endsWith('.json'))
    .map((file) => `lessons/${dir}/${file}`));
  assert.equal(newLessonFiles.length, 13, 'w18-w30 must add exactly 13 lesson files');
  for (const file of newLessonFiles) {
    assert.ok(discoveredLessons.has(file), `lesson file ${file} is not under the declared lessons root`);
    const lesson = readJson(`content/${file}`);
    assert.match(lesson.lessonId, /^l-(dl|tf|genai)-/, `${file}: unexpected lesson id prefix ${lesson.lessonId}`);
  }
});

// --- B10: project/week relation ------------------------------------------------

test('p-rag-secure-prototype belongs to w30 only; the w31-w39 capstone anchors at w39', () => {
  const project = readJson('content/projects/rag-secure-prototype/project.json');
  assert.equal(project.projectId, 'p-rag-secure-prototype');
  assert.equal(project.legacyWeekId, 'w30', 'p-rag-secure-prototype must be anchored at w30');

  const matrix = readJson('content/coverage-matrix.json');
  const topics = matrix.roadmapTopics;
  for (const topic of topics) {
    const carries = (topic.projectIds || []).includes('p-rag-secure-prototype');
    if (topic.topicId === 'w30') {
      assert.equal(carries, true, 'coverage matrix w30 must list p-rag-secure-prototype');
    } else {
      assert.equal(carries, false, `coverage matrix ${topic.topicId} unexpectedly lists p-rag-secure-prototype`);
    }
  }
  // ADR-0014 Design A: one capstone project, anchored at the final week w39;
  // w31-w38 deliberately carry no project (documented no-project gaps).
  const w39 = topics.find((topic) => topic.topicId === 'w39');
  assert.ok((w39.projectIds || []).includes('p-rag-capstone'), 'coverage matrix w39 must list p-rag-capstone');
  for (const topic of topics.filter((item) => /^w3[1-8]$/.test(item.topicId))) {
    assert.deepEqual(topic.projectIds || [], [], `coverage matrix ${topic.topicId} must not carry a project (ADR-0014 Design A)`);
  }
});

// --- B11: no private markers ---------------------------------------------------

test('w18-w30 packs and new lessons carry no private markers', () => {
  for (const weekId of WEEKS) {
    assert.doesNotMatch(JSON.stringify(pack(weekId)), PRIVATE_MARKERS, `${weekId}.json contains a private marker`);
  }
  for (const dir of ['deep-learning', 'transformer-llm', 'genai-systems']) {
    for (const file of readdirSync(join(root, 'content/lessons', dir))) {
      const source = readFileSync(join(root, 'content/lessons', dir, file), 'utf8');
      assert.doesNotMatch(source, PRIVATE_MARKERS, `lessons/${dir}/${file} contains a private marker`);
    }
  }
});

// --- B12: no meaningless catalog counters in the new content tests -------------

test('w18-w21/w22-w26/w27-w30 content tests assert no hardcoded catalog totals', () => {
  // Growth-counter rule (ADR-0013 inherited-debt C): catalog totals like
  // 46 competencies / 190 exercises / 41 lessons / 112 exercises-ish counts
  // must be derived from sources (tests/helpers/content_counts.mjs), never
  // hardcoded. Per-week literals (6 exercises per pack, seed ranges, tier
  // sets) are pack-shape contracts of the authored files and are allowed.
  const files = ['w18_w21_content.test.mjs', 'w22_w26_content.test.mjs', 'w27_w30_content.test.mjs'];
  const catalogTotals = /\b(46|190|41|112|13)\b/;
  for (const file of files) {
    const source = readFileSync(join(root, 'tests', file), 'utf8');
    const lines = source.split('\n');
    lines.forEach((line, index) => {
      const code = line.replace(/\/\/.*$/, '');
      if (/assert/.test(code) && catalogTotals.test(code)) {
        assert.fail(`${file}:${index + 1} asserts a hardcoded catalog total: ${line.trim()}`);
      }
    });
  }
});

// --- B13: generator registry wiring ---------------------------------------------

test('every w18-w30 generator name exists in exactly one new registry and is wired into the runtime consumers', () => {
  const newRegistries = {
    W18_W21_SEED_GENERATORS,
    W22_W26_SEED_GENERATORS,
    W27_W30_SEED_GENERATORS,
  };
  const allRegistries = {
    W01_SEED_GENERATORS,
    DATA_ML_SEED_GENERATORS,
    ...newRegistries,
  };

  // The shared registry owns family imports; runtime consumers must use that
  // registry instead of maintaining divergent spread maps.
  const registrySource = readFileSync(join(root, 'assets/js/core/seed_generator_registry.mjs'), 'utf8');
  for (const name of Object.keys(newRegistries)) {
    assert.match(registrySource, new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from`));
  }
  for (const consumer of [
    'assets/js/core/legacy_exercise_adapter.mjs',
    'assets/js/core/graders.js',
  ]) {
    assert.match(readFileSync(join(root, consumer), 'utf8'), /seed_generator_registry\.mjs/);
  }
  for (const registry of Object.values(newRegistries)) {
    for (const [name, generator] of Object.entries(registry)) assert.equal(SEED_GENERATORS[name], generator);
  }

  // No name may live in more than one family registry; the shared registry
  // rejects duplicates before any runtime consumer starts.
  const ownerCount = new Map();
  for (const [registry, names] of Object.entries(allRegistries)) {
    for (const name of Object.keys(names)) {
      ownerCount.set(name, (ownerCount.get(name) || new Set()).add(registry));
    }
  }
  for (const [name, owners] of ownerCount) {
    assert.equal(owners.size, 1, `generator name ${name} is defined in multiple registries (${[...owners].join(', ')})`);
  }

  for (const { weekId, exercise } of ALL_EXERCISES) {
    const generatorName = exercise.expectedAnswer?.generator || exercise.parameters?.seedGenerator;
    if (!generatorName) continue;
    const owners = Object.entries(newRegistries)
      .filter(([, registry]) => Object.hasOwn(registry, generatorName))
      .map(([name]) => name);
    assert.equal(owners.length, 1, `${exercise.exerciseId}: generator ${generatorName} must exist in exactly one of the three new registries (found: ${owners.join(', ') || 'none'})`);
    // The adapter must resolve the referenced name to a real generatorId.
    const definition = adaptLegacyExercise(exercise, weekId);
    assert.equal(definition.generatorId, generatorName, `${exercise.exerciseId}: adapter drops the referenced generator ${generatorName}`);
  }
});
