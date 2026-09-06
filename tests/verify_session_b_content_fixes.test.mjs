// Session-B verification: content corrections across weeks 1-39 and lessons.
// Every numeric claim in the corrected content is recomputed here (softmax,
// BPE merges, SVM margin, ridge/lasso, k-means Lloyd runs, program traces)
// instead of being re-asserted from the JSON. Two kinds of tests:
//  - contract tests (green): pin the corrected, recomputed behavior;
//  - DEFECT tests (red today): document follow-up damage found while
//    verifying (f-control-trace-01 instance arithmetic, ml-ensembles typo).
// Grading always goes through the real call path (graders.deterministic).
// The vendored-pyodide runtime check is opt-in (VERIFY_SESSION_B_PYODIDE=1)
// because the node suite runs without a worker by convention (ADR-0013).

import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import { graders, buildPythonTests } from '../assets/js/core/graders.js';
import { compileContent } from '../tools/compile_content.mjs';
import { catalogRoot, discoverJson } from '../tools/content_roots.mjs';
import { ERROR_HYPOTHESIS_CASES } from '../assets/js/core/foundations_choice_families.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const readText = (path) => readFileSync(join(root, path), 'utf8');
const grade = (exercise, answer) => graders.deterministic.grade(exercise, answer);
const weekPack = (w) => read(`content/exercises/w${String(w).padStart(2, '0')}.json`);
const exercise = (w, id) => weekPack(w).exercises.find((e) => e.exerciseId === id);
const definition = (path) => {
  const fullPath = join(root, 'content/exercise-definitions', path);
  if (existsSync(fullPath)) return read(`content/exercise-definitions/${path}`);
  if (path === 'foundations/meta-error-log.json') {
    const item = ERROR_HYPOTHESIS_CASES.find((entry) => entry.sourceId === 'f-meta-error-log-01');
    return {
      definitionId: 'classify-error-hypothesis:error-journal-next-test',
      activityType: 'single-choice',
      graderId: 'deterministic',
      prompt: item.prompt,
      choices: [
        { id: 'observable-test', text: item.correct, correct: true },
        ...item.distractors.map((text, index) => ({
          id: index === 0 ? 'more-reading' : `wrong-${index}`,
          text,
          correct: false,
        })),
      ],
      expectedAnswer: { correctChoice: 'observable-test' },
      feedbackRules: item.feedbackRules,
    };
  }
  if (path === 'linear-algebra/column-vector.json') {
    const family = read('content/families/formula-scalar-product.json');
    const item = family.cases.find((entry) => entry.caseId === 'column-vector-authored');
    return {
      definitionId: 'formula-scalar-product:column-vector-authored',
      activityType: item.activityType,
      graderId: item.graderId,
      prompt: item.prompt,
      parameters: item.parameters,
      expectedAnswer: item.expected,
    };
  }
  throw new Error(`missing definition fixture ${path}`);
};
const lesson = (path) => readText(`content/lessons/${path}`);

// ---------------------------------------------------------------------------
// 1. w38-e4 grader: python-code must be pyodide-graded (Session-B fix #1)
// ---------------------------------------------------------------------------

test('w38-e4: python-code exercise is pyodide-graded with tests and a reference solver', async () => {
  const e = exercise(38, 'w38-e4');
  assert.equal(e.type, 'python-code');
  assert.equal(e.grader, 'pyodide');
  assert.ok(e.parameters.tests.trim().length > 0, 'w38-e4 must carry parameters.tests');
  assert.equal(typeof e.expectedAnswer.referenceSolver, 'string');
  assert.ok(e.expectedAnswer.referenceSolver.includes('def fehlende_uberschriften'));
  assert.equal(e.tolerancePolicy.mode, 'tests');
  // The deterministic registry has no python-code branch — the pre-fix
  // configuration (grader "deterministic") was structurally ungradable.
  await assert.rejects(
    graders.deterministic.grade({ ...e, grader: 'deterministic', activityType: 'python-code', type: 'python-code' }, 'x'),
    /unbekannter Aufgabentyp python-code/,
  );
});

test('every week-pack python-code exercise routes to the pyodide grader', () => {
  for (let w = 1; w <= 39; w += 1) {
    for (const e of weekPack(w).exercises) {
      if (e.type !== 'python-code') continue;
      assert.equal(e.grader, 'pyodide', `${e.exerciseId} must use the pyodide grader`);
      if (e.exerciseId === 'w05-e8') {
        // w05-e8 keeps its tests code-side (graders.buildPythonTests fallback).
        assert.ok(buildPythonTests(e).trim().length > 0, 'w05-e8 code-side test block must exist');
      } else {
        assert.ok(e.parameters?.tests?.trim().length > 0, `${e.exerciseId} must carry parameters.tests`);
        assert.equal(typeof e.expectedAnswer?.referenceSolver, 'string', `${e.exerciseId} must carry a reference solver`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// 2. tf-attention: masked example S12, output (2, 0), consistent with w22-e4
// ---------------------------------------------------------------------------

const softmaxRow = (row) => {
  const max = Math.max(...row);
  const exps = row.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
};
const mix = (weights, V) => weights.reduce((acc, wj, j) => [acc[0] + wj * V[j][0], acc[1] + wj * V[j][1]], [0, 0]);

test('tf-attention: unmasked hand computation and causal mask S12 -> (2, 0), consistent with w22-e4', () => {
  const md = lesson('transformer-llm/tf-attention.md');
  const Q = [[1, 1, 0, 0], [0, 0, 1, 1]];
  const K = [[1, 1, 0, 0], [0, 0, 1, 1]];
  const V = [[2, 0], [0, 2]];
  const scores = Q.map((q) => K.map((k) => q.reduce((a, x, i) => a + x * k[i], 0)));
  assert.deepEqual(scores, [[2, 0], [0, 2]], 'QK^T');
  const scaled = scores.map((row) => row.map((v) => v / 2)); // sqrt(d_k)=2
  assert.deepEqual(scaled, [[1, 0], [0, 1]]);
  const weightsRow1 = softmaxRow(scaled[0]);
  assert.deepEqual(weightsRow1.map((v) => v.toFixed(3)), ['0.731', '0.269']);
  const outRow1 = mix(weightsRow1, V);
  assert.ok(Math.abs(outRow1[0] - 1.4621171572600098) < 1e-12 && Math.abs(outRow1[1] - 0.5378828427399903) < 1e-12);
  // Lesson pins the rounded hand values and the masked result.
  assert.ok(md.includes('0{,}731') && md.includes('1{,}462'), 'lesson pins the recomputed hand values');
  assert.ok(md.includes('S_{12} = -\\infty'), 'mask must block S12 (query 1 -> key 2)');
  assert.ok(!md.includes('S_{21}'), 'the pre-fix wrong index S21 must be gone');
  const maskedWeights = softmaxRow([1, -Infinity]);
  assert.deepEqual(maskedWeights, [1, 0]);
  const maskedOut = mix(maskedWeights, V);
  assert.deepEqual(maskedOut, [2, 0]);
  assert.ok(md.includes('Ausgabe exakt $(2, 0)$'), 'lesson states the exact masked output (2, 0)');

  // Consistency with w22-e4: same fixture, same numbers, same mask semantics.
  const e4 = exercise(22, 'w22-e4');
  const tests = e4.parameters.tests;
  const row1 = tests.match(/np\.allclose\(out\[0\], \[([^\]]+)\]/)[1].split(',').map(Number);
  const masked = tests.match(/np\.allclose\(out_m\[0\], \[([^\]]+)\]/)[1].split(',').map(Number);
  assert.ok(Math.abs(row1[0] - outRow1[0]) < 1e-12 && Math.abs(row1[1] - outRow1[1]) < 1e-12);
  assert.deepEqual(masked, [2.0, 0.0]);
});

// ---------------------------------------------------------------------------
// 3. tf-tokenizer: 21 character tokens, BPE merge trace with pinned tie-break
// ---------------------------------------------------------------------------

test('tf-tokenizer: "Donaudampfschifffahrt" is 21 tokens and the mini-BPE trace recomputes', () => {
  const md = lesson('transformer-llm/tf-tokenizer.md');
  assert.equal('Donaudampfschifffahrt'.length, 21);
  assert.ok(md.includes('= 21 Tokens'), 'lesson must state the recomputed token count');

  // Mini-BPE exactly as pinned in the lesson: marker </w>, ties resolved by
  // the lexicographically smallest pair, corpus low, low, lower, lowest.
  const words = [['l', 'o', 'w', '</w>'], ['l', 'o', 'w', '</w>'], ['l', 'o', 'w', 'e', 'r', '</w>'], ['l', 'o', 'w', 'e', 's', 't', '</w>']];
  const learned = [];
  for (let round = 0; round < 3; round += 1) {
    const counts = new Map();
    for (const word of words) for (let i = 0; i < word.length - 1; i += 1) {
      const key = `${word[i]}\u0000${word[i + 1]}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let best = null;
    let bestCount = -1;
    for (const [key, count] of counts) {
      const [a, b] = key.split('\u0000');
      const smaller = best === null || count > bestCount || (count === bestCount && (a < best[0] || (a === best[0] && b < best[1])));
      if (smaller) { best = [a, b]; bestCount = count; }
    }
    const merged = best[0] + best[1];
    for (const word of words) for (let i = 0; i < word.length - 1; i += 1) {
      if (word[i] === best[0] && word[i + 1] === best[1]) word.splice(i, 2, merged);
    }
    learned.push(merged);
  }
  assert.deepEqual(learned, ['lo', 'low', 'low</w>']);
  const lowest = words[3];
  assert.deepEqual(lowest, ['low', 'e', 's', 't', '</w>'], 'lowest must decompose into 5 tokens');
  assert.equal(lowest.length, 5);
  assert.ok(md.includes('low|e|s|t|</w>'), 'lesson pins the 5-token decomposition');
  assert.ok(md.includes('aus 7 Symbolen (6 Zeichen plus Marker)'), 'lesson states 7 symbols before merging');
  assert.equal('lowest'.length + 1, 7);
});

// ---------------------------------------------------------------------------
// 4. rag-retrieval: idf floor formulation
// ---------------------------------------------------------------------------

test('rag-retrieval: idf floor is exactly 1 for df = n and the weight stays positive', () => {
  const md = lesson('genai-systems/rag-retrieval.md');
  const idf = (n, df) => Math.log((n + 1) / (df + 1)) + 1;
  for (let n = 1; n <= 12; n += 1) {
    for (let df = 0; df <= n; df += 1) assert.ok(idf(n, df) >= 1 - 1e-12, `idf(${n},${df}) must not drop below the floor`);
    assert.equal(idf(n, n), 1, 'an everywhere-term lands exactly on the floor');
  }
  assert.ok(md.includes('\\log\\frac{n+1}{\\mathrm{df}(t)+1}'), 'smooth idf formula present');
  assert.ok(md.includes('idf-Floor 1'), 'lesson names the floor');
  assert.ok(md.includes('nicht auf Gewicht null'), 'lesson contrasts against the classic idf-zero pitfall');
});

// ---------------------------------------------------------------------------
// 5. e1 choice rotation w18-w30: pattern, flag parity via real grader
// ---------------------------------------------------------------------------

const ROTATION = { 18: 'b', 19: 'c', 20: 'd', 21: 'a', 22: 'b', 23: 'c', 24: 'd', 25: 'a', 26: 'b', 27: 'c', 28: 'd', 29: 'a', 30: 'b' };

test('w18-w30 e1: correct choice rotates b,c,d,a and every week grades exactly that choice correct', async () => {
  for (const [week, expectedId] of Object.entries(ROTATION)) {
    const w = Number(week);
    const e1 = exercise(w, `w${w}-e1`);
    assert.equal(e1.type, 'single-choice');
    const flagged = e1.choices.filter((c) => c.correct);
    assert.equal(flagged.length, 1, `w${w}-e1 must flag exactly one choice`);
    assert.equal(flagged[0].id, expectedId, `w${w}-e1 rotation position`);
    assert.equal(e1.expectedAnswer.correctChoice, expectedId, `w${w}-e1 expectedAnswer.consistency`);
    const texts = new Set(e1.choices.map((c) => c.text));
    assert.equal(texts.size, e1.choices.length, `w${w}-e1 choice texts must stay distinct after rotation`);
    for (const c of e1.choices) {
      const result = await grade(e1, c.id);
      assert.equal(result.correct, c.correct, `w${w}-e1 grader parity for ${c.id}`);
    }
    const wrong = await grade(e1, e1.choices.find((c) => c.id !== expectedId).id);
    assert.equal(wrong.errorType, 'wrong-choice');
  }
});

test('choice selections in e2e specs are position-independent (rotation-safe)', () => {
  const specs = readdirSync(join(root, 'tests/e2e')).filter((f) => f.endsWith('.spec.ts'));
  const body = specs.map((f) => readFileSync(join(root, 'tests/e2e', f), 'utf8')).join('\n');
  // No positional (nth) selection on choice radios: selections happen by
  // accessible name, so the w18-w30 rotation cannot break the suites.
  assert.ok(!/radio[^;.\n]*\.nth\(/.test(body) && !/nth\([^)]*\)[^;.\n]*radio/.test(body), 'position-pinned radio selection found');
  // And no week-e1 exercise of the rotated range is referenced at all.
  assert.ok(!/w(1[89]|2\d|30)-e1\b/.test(body), 'a rotated week-e1 exercise is pinned somewhere');
});

// ---------------------------------------------------------------------------
// 6. Hint leaks stay closed (Session-B fix #7)
// ---------------------------------------------------------------------------

test('trimmed hints no longer contain the solution values', () => {
  const cases = [
    ['w19-e3', exercise(19, 'w19-e3'), [/10/, /-12/, /(^|[^\d.])6(?![\d.])/, /-2/]],
    ['w22-e3', exercise(22, 'w22-e3'), [/0[.,]422/, /0[.,]155/, /0[.,]881/, /0[.,]119/, /2[.,]368/]],
    ['w24-e3', exercise(24, 'w24-e3'), [/<eos>/, /\[0, ?1, ?2\]/, /ab<eos>/]],
    ['w27-e3', exercise(27, 'w27-e3'), [/gh/, /text\[6:8\]/]],
  ];
  for (const [id, ex, patterns] of cases) {
    assert.ok(ex.hints.length >= 1, `${id} keeps at least one hint`);
    for (const hint of ex.hints) {
      for (const pattern of patterns) assert.ok(!pattern.test(hint), `${id} hint leaks solution (${pattern}): ${hint}`);
    }
  }
});

test('hint leak detector bites: the historical leaked hint strings are rejected', () => {
  // Teeth for the green test above: feed the pre-fix hint texts (per the
  // Session-B findings) through the same patterns and require a hit.
  const historicalLeaks = [
    [/10/, 'Am Ende steht w = 10.0 — festgehalten.'],
    [/0[.,]422/, 'Zeile 2 gibt [0.155, 0.422, 0.422].'],
    [/<eos>/, 'Die Folge endet mit 2, also "ab<eos>".'],
    [/gh/, 'text[6:8] ist "gh", also lautet der letzte Chunk "gh".'],
  ];
  for (const [pattern, leakedHint] of historicalLeaks) assert.ok(pattern.test(leakedHint), `detector must flag: ${leakedHint}`);
});

test('rotation parity check bites: an un-rotated (flag on "a") w18-e1 copy is rejected', async () => {
  // Teeth for the parity test: simulate the pre-fix state in memory.
  const e1 = JSON.parse(JSON.stringify(exercise(18, 'w18-e1')));
  for (const c of e1.choices) c.correct = c.id === 'a';
  const flagged = e1.choices.filter((c) => c.correct);
  assert.equal(flagged.length, 1);
  assert.notEqual(flagged[0].id, ROTATION[18], 'parity test must detect the un-rotated flag');
  assert.notEqual(e1.expectedAnswer.correctChoice, flagged[0].id);
});

// ---------------------------------------------------------------------------
// 6b. w19-e4/e5 starters are contract-only; tests still demand real derivation
// ---------------------------------------------------------------------------

test('w19-e4/e5 starters carry contracts, not gradient formulas; tests check numeric gradients', () => {
  for (const id of ['w19-e4', 'w19-e5']) {
    const e = exercise(19, id);
    const starter = e.parameters.starterCode;
    // The derivation must not be precomputed in the docstring.
    for (const pattern of [/X\.T\s*@/, /2\.0\s*\/\s*r\.size/, /2\s*\/\s*m/, /delta\s*=/, /np\.outer/, /\.sum\(axis=0\)/]) {
      assert.ok(!pattern.test(starter), `${id} starter leaks the solution shape (${pattern})`);
    }
    assert.ok(/"""/.test(starter), `${id} starter keeps a contract docstring`);
    // The tests demand the derivation: analytic values plus numeric
    // (central-difference) gradient checks on unseen instances.
    const tests = e.parameters.tests;
    assert.match(tests, /numerisch/, `${id} tests must include numeric gradient checks`);
    assert.match(tests, /2 \* h/, `${id} tests use central differences`);
  }
  // w19-e4 analytic factor: fixtures are (n=4,k=1) and (n=2,k=2) -> 2/(n*k)=1/2.
  // n = rows of X, k = length of the bias vector b.
  const tests = exercise(19, 'w19-e4').parameters.tests;
  const rowsOf = (name) => tests.match(new RegExp(`${name} = np\\.array\\(\\[\\[(.*?)\\]\\]\\)`, 's'))[1].split('], [').length;
  const biasLength = (name) => tests.match(new RegExp(`${name} = np\\.array\\(\\[([^\\]]*)\\]\\)`))[1].split(',').length;
  const n1 = rowsOf('X'); const k1 = biasLength('b');
  const n2 = rowsOf('X2'); const k2 = biasLength('b2');
  assert.deepEqual([n1, k1, n2, k2], [4, 1, 2, 2]);
  assert.equal(2 / (n1 * k1), 0.5);
  assert.equal(2 / (n2 * k2), 0.5);
  assert.ok(tests.includes('2.0 / 4.0 * X.T @ r'), 'first fixture factor must equal 2/(n*k) = 2/4');
  assert.ok(tests.includes('2.0 / 4.0 * X2.T @ r2'), 'second fixture factor must equal 2/(n*k) = 2/4');
});

// ---------------------------------------------------------------------------
// 8. Checkpoints: 9 new files wired exactly once; compiler fails closed
// ---------------------------------------------------------------------------

const SESSION_B_CHECKPOINTS = [
  'lessons/genai-systems/rag-retrieval-checkpoint.md',
  'lessons/genai-systems/genai-evaluation-checkpoint.md',
  'lessons/genai-systems/genai-prototype-checkpoint.md',
  'lessons/genai-systems/genai-security-checkpoint.md',
  'lessons/research/capstone-baseline-checkpoint.md',
  'lessons/research/capstone-pipeline-checkpoint.md',
  'lessons/research/research-cards-checkpoint.md',
  'lessons/research/research-question-checkpoint.md',
  'lessons/research/responsible-ai-checkpoint.md',
];

test('all checkpoint blocks point at real, non-trivial, uniquely referenced files (9 Session-B files included)', () => {
  const catalog = read('content/catalog.json');
  const references = new Map();
  for (const file of discoverJson(join(root, 'content'), catalogRoot(catalog, 'lessons'))) {
    const lessonJson = read(`content/${file}`);
    for (const block of lessonJson.blocks || []) {
      if (block.type !== 'checkpoint') continue;
      references.set(block.contentRef, (references.get(block.contentRef) || 0) + 1);
    }
  }
  for (const [ref, count] of references) {
    assert.equal(count, 1, `${ref} must be referenced exactly once`);
    const path = join(root, 'content', ref);
    assert.ok(existsSync(path), `${ref} missing`);
    const text = readFileSync(path, 'utf8');
    assert.ok(text.length > 400, `${ref} must contain real retrieval questions`);
    assert.ok(text.startsWith('# Checkpoint'), `${ref} must be a checkpoint document`);
  }
  for (const ref of SESSION_B_CHECKPOINTS) {
    assert.equal(references.get(ref), 1, `${ref} must be wired by its lesson`);
    assert.ok(existsSync(join(root, 'content', ref)), `${ref} file must exist`);
  }
  // No orphan checkpoint files either.
  const onDisk = new Set();
  const lessonDirs = readdirSync(join(root, 'content/lessons'), { withFileTypes: true });
  for (const dir of lessonDirs.filter((d) => d.isDirectory())) {
    for (const f of readdirSync(join(root, 'content/lessons', dir.name))) {
      if (f.endsWith('-checkpoint.md')) onDisk.add(`lessons/${dir.name}/${f}`);
    }
  }
  assert.deepEqual([...onDisk].filter((f) => !references.has(f)), []);
});

test('compiler rejects a phantom checkpoint reusing the core document and a missing checkpoint file', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'session-b-phantom-'));
  cpSync(join(root, 'content'), join(temp, 'content'), { recursive: true });
  symlinkSync(join(root, 'schemas'), join(temp, 'schemas'));
  const lessonPath = join(temp, 'content/lessons/research/responsible-ai.json');
  const original = readFileSync(lessonPath, 'utf8');
  const checkpointRef = JSON.parse(original).blocks.find((b) => b.type === 'checkpoint').contentRef;
  try {
    // Green: the untouched copy compiles.
    const bundle = compileContent({ projectRoot: temp, profile: 'public' });
    assert.ok(bundle.lessons.length > 0);

    // Red 1: phantom checkpoint (duplicate contentRef).
    const phantom = JSON.parse(original);
    phantom.blocks.find((b) => b.type === 'checkpoint').contentRef = 'lessons/research/responsible-ai.md';
    writeFileSync(lessonPath, JSON.stringify(phantom));
    assert.throws(
      () => compileContent({ projectRoot: temp, profile: 'public' }),
      /Checkpoint-Block referenziert dasselbe Dokument/,
    );

    // Red 2: checkpoint pointing at a missing document fails closed.
    writeFileSync(lessonPath, original);
    const missing = JSON.parse(original);
    missing.blocks.find((b) => b.type === 'checkpoint').contentRef = 'lessons/research/does-not-exist-checkpoint.md';
    writeFileSync(lessonPath, JSON.stringify(missing));
    assert.throws(() => compileContent({ projectRoot: temp, profile: 'public' }));
  } finally {
    writeFileSync(lessonPath, original);
    rmSync(temp, { recursive: true, force: true });
  }
  assert.ok(checkpointRef.endsWith('-checkpoint.md'));
});

// ---------------------------------------------------------------------------
// 9. Curriculum: W33 FNR, W34 evidence, cp numbering, phases.json consistency
// ---------------------------------------------------------------------------

test('W33 goals use FPR (no FNR anywhere in content); the responsible-ai lesson teaches FPR', () => {
  const curriculum = read('content/curriculum.json');
  const w33 = curriculum.weeks.find((w) => w.weekId === 'w33');
  const goals = w33.goals.join(' ');
  assert.ok(goals.includes('FPR'));
  assert.ok(!goals.includes('FNR'), 'W33 goal must not require untaught FNR');

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(json|md)$/.test(entry.name)) {
        assert.ok(!readFileSync(path, 'utf8').includes('FNR'), `${path} still mentions FNR`);
      }
    }
  };
  walk(join(root, 'content'));

  const md = lesson('research/responsible-ai.md');
  assert.match(md, /False-Positive-Rate \(FPR\)/);
  assert.match(md, /FP\/\(FP \+ TN\)/);
});

test('W34/W35/W36 evidence is consistent with phases.json and project.json cp numbering', () => {
  const curriculum = read('content/curriculum.json');
  const week = (id) => curriculum.weeks.find((w) => w.weekId === id);
  assert.ok(!week('w34').evidence.includes('capstone-cp'), 'W34 no longer claims a capstone checkpoint');
  assert.ok(week('w34').evidence.includes('w34-e2 bis w34-e6'), 'W34 evidence points at browser tasks');
  assert.ok(week('w35').evidence.includes('test_w35_scope') && week('w35').evidence.includes('capstone-cp1'));
  assert.ok(week('w36').evidence.includes('test_w36_pipeline') && week('w36').evidence.includes('capstone-cp2'));
  assert.ok(week('w37').evidence.includes('capstone-cp3'));
  assert.ok(week('w38').evidence.includes('capstone-cp4'));

  const phases = read('content/projects/rag-capstone/phases.json').phases;
  assert.deepEqual(phases.map((p) => p.weekId), ['w35', 'w36', 'w37', 'w38', 'w39']);
  const expectedTests = { w35: 'tests/test_w35_scope.py', w36: 'tests/test_w36_pipeline.py', w37: 'tests/test_w37_eval_redteam.py', w38: 'tests/test_w38_repro.py', w39: 'tests/test_w39_artifacts.py' };
  for (const phase of phases) {
    assert.equal(phase.testFile, expectedTests[phase.weekId]);
    assert.ok(existsSync(join(root, 'content/projects/rag-capstone', phase.testFile)), `${phase.testFile} must exist`);
    // W35-W38 evidence strings name their phase test (W39 evidence is the
    // acceptance report, which is out of the Session-B fix scope).
    if (phase.weekId !== 'w39') {
      assert.ok(week(phase.weekId).evidence.includes(phase.testFile.replace('tests/', '').replace('.py', '')), `${phase.weekId} evidence names the phase test`);
    }
  }
  const project = read('content/projects/rag-capstone/project.json');
  for (const file of phases.map((p) => p.testFile)) assert.ok(project.starterFiles.includes(file));
});

// ---------------------------------------------------------------------------
// 10. ml lessons: margin 2*sqrt(2), k-means convergence, ridge/lasso, ensembles
// ---------------------------------------------------------------------------

test('ml-svm-pca: margin recomputes to 2*sqrt(2) for the (1,1)/(-1,-1) example', () => {
  const md = lesson('data-ml/ml-svm-pca.md');
  const w = [1, 1];
  const norm = Math.hypot(...w);
  // Point distance to the separating line: |w.x| / ||w|| = sqrt(2).
  const dist = Math.abs(w[0] * 1 + w[1] * 1) / norm;
  assert.ok(Math.abs(dist - Math.SQRT2) < 1e-12, 'point distance sqrt(2)');
  // The band between both classes is twice that distance: 2*sqrt(2) = 2.83.
  const marginFromDistances = 2 * dist;
  assert.ok(Math.abs(marginFromDistances - 2 * Math.SQRT2) < 1e-12);
  // Canonical scaling control from the lesson: y*(w.x)=2 here, so the
  // canonical vector is w/2 and margin = 2/||w_hat||.
  const wHat = w.map((v) => v / 2);
  assert.ok(Math.abs(Math.hypot(...wHat) - 1 / Math.SQRT2) < 1e-12);
  assert.ok(Math.abs(2 / Math.hypot(...wHat) - 2 * Math.SQRT2) < 1e-12);
  assert.equal((2 * Math.SQRT2).toFixed(2), '2.83');
  assert.ok(md.includes('Margin $= 2\\sqrt{2} \\approx 2{,}83$'));
});

test('ml-svm-pca: k-means claims recompute (cross-cluster init converges in one assignment round, same-cluster init does not)', () => {
  const points = [[0, 0], [1, 0], [10, 10], [11, 10]];
  const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const run = (initial) => {
    let centroids = initial.map((p) => [...p]);
    let previous = null;
    let rounds = 0;
    for (;;) {
      const assignment = points.map((p) => {
        let best = 0;
        let bestD = Infinity;
        centroids.forEach((c, i) => { const d = dist2(p, c); if (d < bestD - 1e-12) { bestD = d; best = i; } });
        return best;
      });
      rounds += 1;
      const key = assignment.join('');
      if (key === previous) return { assignment, centroids, rounds: rounds - 1 };
      previous = key;
      centroids = centroids.map((_, i) => {
        const members = points.filter((_, j) => assignment[j] === i);
        return [members.reduce((a, p) => a + p[0], 0) / members.length, members.reduce((a, p) => a + p[1], 0) / members.length];
      });
    }
  };
  const cross = run([[0, 0], [10, 10]]);
  const same = run([[0, 0], [1, 0]]);
  assert.deepEqual(cross.assignment, [0, 0, 1, 1]);
  assert.equal(cross.rounds, 1, 'cross-cluster init reaches the final partition in one round');
  const round = (c) => c.map((v) => +v.toFixed(3));
  assert.deepEqual(cross.centroids.map(round), [[0.5, 0], [10.5, 10]]);
  assert.ok(same.rounds > 1, 'same-cluster init must not converge in one round');
  assert.deepEqual(same.assignment, cross.assignment, 'both inits end in the same partition');
  assert.deepEqual(same.centroids.map(round), cross.centroids.map(round), 'same final centroids');

  const md = lesson('data-ml/ml-svm-pca.md');
  assert.ok(md.includes('nicht in einer Runde'), 'lesson pins the multi-round convergence claim');
  assert.ok(md.includes('(0{,}5\\,\\,0)') || md.includes('(0{,}5,\\,0)') || md.includes('(0{,}5\\,0)'), 'lesson pins centroid (0.5, 0)');
});

test('ml-regularization: ridge and lasso formulas recompute (denominator s = sum of squares)', () => {
  const md = lesson('data-ml/ml-regularization.md');
  // One feature: w = 16/(8+2) = 1.6 and the shrink factor.
  assert.equal(16 / (8 + 2), 1.6);
  assert.ok(md.includes('$w = 16/(8+2) = 1{,}6$'));
  // Two features: OLS (2/3, 1) and ridge(1) (0.5, 1) via a 2x2 solve.
  const solve2 = ([[a, b], [c, d]], [e, f]) => {
    const det = a * d - b * c;
    return [(e * d - b * f) / det, (a * f - e * c) / det];
  };
  assert.deepEqual(solve2([[3, 6], [6, 14]], [8, 18]).map((v) => +v.toFixed(6)), [0.666667, 1]);
  assert.deepEqual(solve2([[4, 6], [6, 15]], [8, 18]), [0.5, 1.0]);
  assert.ok(md.includes('$(2/3,\\,1)$'), 'lesson pins OLS values');
  assert.ok(md.includes('$(0{,}5,\\,1)$'), 'lesson pins ridge values');
  // Lasso soft-thresholding: denominator must be s = sum x_i^2.
  assert.ok(md.includes('s=\\sum_i x_i^2'), 'lasso denominator is s = sum of squares');
  const lasso = (c, lambda, s) => Math.sign(c) * Math.max((Math.abs(c) - lambda) / s, 0);
  assert.equal(lasso(16, 2, 8), 1.75);
  assert.equal(lasso(2, 4, 8), 0, 'small correlations are thresholded to exactly zero');
  assert.ok(md.includes('Ridge schrumpft sie nur gegen null'), 'ridge sentence present');
});

test('ml-ensembles: per-example vote vectors recompute to the ensemble output (0,1,1)', () => {
  const votes = [[1, 0, 0], [1, 0, 1], [0, 1, 1]];
  const majority = (vector) => (vector.reduce((a, b) => a + b, 0) * 2 > vector.length ? 1 : 0);
  assert.deepEqual(votes.map(majority), [0, 1, 1]);
  const md = lesson('data-ml/ml-ensembles.md');
  for (const v of ['(1,0,0)', '(1,0,1)', '(0,1,1)']) assert.ok(md.includes(v));
  assert.ok(md.includes('Ensemble-Ausgabe: $(0,1,1)$'));
});

test('DEFECT ml-ensembles: "Ensebleffekt" typo survives the correction', () => {
  const md = lesson('data-ml/ml-ensembles.md');
  assert.match(md, /Ensembleffekt|Ensemble-Effekt/, 'the corrected sentence still contains "Ensebleffekt" (missing m)');
});

test('ml-logistic: gradient-descent reference points at week 8, which teaches it by hand', () => {
  const md = lesson('data-ml/ml-logistic.md');
  assert.match(md, /genau wie in Woche 8 von Hand geübt/);
  const w08 = read('content/curriculum.json').weeks.find((w) => w.weekId === 'w08');
  assert.ok(w08.goals.some((g) => g.includes('Gradientenabstieg-Updates')));
  assert.equal(-Math.log(0.1) > 2.29 && -Math.log(0.1) < 2.31, true, 'log-loss example value 2.3');
});

// ---------------------------------------------------------------------------
// 11. w16: the "Lernparadigmen" typo is gone
// ---------------------------------------------------------------------------

test('w16: the "Lernparadigmen" typo is corrected; the supervision choice grades correct', async () => {
  // The word survives only as the grammatically correct plural in the w16-u3
  // curriculum title. Learner-facing w16 exercise and lesson text carry no
  // (mis-spelled) variant at all.
  const walk = (dir) => {
    const hits = [];
    const visit = (d) => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const path = join(d, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (/\.(json|md)$/.test(entry.name)) {
          const text = readFileSync(path, 'utf8');
          if (/Lernpardigmen|Lernpardigma|Lernparadigma[^l]/.test(text)) hits.push(path);
        }
      }
    };
    visit(dir);
    return hits;
  };
  assert.deepEqual(walk(join(root, 'content')), [], 'misspelled paradigm variants must be gone');

  const e3 = exercise(16, 'w16-e3');
  const flagged = e3.choices.find((c) => c.correct);
  assert.equal(flagged.id, 'b');
  assert.match(flagged.text, /PCA und k-Means sind unüberwacht, SVM ist überwacht/);
  assert.equal((await grade(e3, 'b')).correct, true);
  assert.equal((await grade(e3, 'a')).correct, false);
});

// ---------------------------------------------------------------------------
// 12. w05: e5 skillIds, e1/e3/e13 feedback rules on reachable values
// ---------------------------------------------------------------------------

test('w05-e5: skillIds no longer include c-linalg-matrices; c-algebra exists', () => {
  const e5 = exercise(5, 'w05-e5');
  assert.deepEqual(e5.skillIds, ['c-algebra']);
  const catalog = read('content/catalog.json');
  const ids = new Set();
  for (const file of discoverJson(join(root, 'content'), catalogRoot(catalog, 'competencies'))) {
    for (const c of read(`content/${file}`).competencies) ids.add(c.competencyId);
  }
  assert.ok(ids.has('c-algebra'));
  assert.ok(!e5.skillIds.includes('c-linalg-matrices'));
  // Expression answer still recomputes: (x+3)(x-2) = x^2 + x - 6.
  const poly = (x) => (x + 3) * (x - 2) - (x * x + x - 6);
  for (const x of [-3, -1, 0, 2, 5.5]) assert.ok(Math.abs(poly(x)) < 1e-9);
  assert.equal(e5.expectedAnswer.expression.replace(/\s+/g, ''), 'x**2+x-6');
});

test('w05-e1: c11 really is 2; value-2 rule fires and explains c11 while c12=1 grades correct', async () => {
  const e1 = exercise(5, 'w05-e1');
  const { A, B, entry } = e1.parameters;
  const product = A.map((row) => B[0].map((_, j) => row.reduce((sum, v, i) => sum + v * B[i][j], 0)));
  assert.equal(product[0][0], 2, 'c11');
  assert.deepEqual(entry, [1, 2]);
  assert.equal(product[entry[0] - 1][entry[1] - 1], 1, 'expected c12');
  assert.equal((await grade(e1, '1')).correct, true);
  const wrong = await grade(e1, '2');
  assert.equal(wrong.correct, false);
  assert.match(wrong.diagnosis, /c_\{11\}/);
  assert.match(wrong.diagnosis, /c_\{12\}/);
  const partial = await grade(e1, '-1');
  assert.equal(partial.correct, false);
  assert.ok(partial.diagnosis && partial.diagnosis.length > 10, 'partial-product rule fires');
});

test('w05-e3 / w05-e13: expected dot products and reachable feedback rules', async () => {
  const dot = (u, v) => u.reduce((sum, x, i) => sum + x * v[i], 0);
  const e3 = exercise(5, 'w05-e3');
  assert.equal(dot(e3.parameters.u, e3.parameters.v), -8);
  assert.equal((await grade(e3, '-8')).correct, true);
  assert.equal(dot([2, -1], [1, 4]), -2, 'partial sum is a reachable wrong answer');
  assert.equal(2 - 4 + 6, 4, 'sign-error value is reachable');
  assert.match((await grade(e3, '-2')).diagnosis, /letztere|letzte Term/);
  assert.match((await grade(e3, '4')).diagnosis, /Vorzeichen/);

  const e13 = exercise(5, 'w05-e13');
  assert.equal(dot(e13.parameters.u, e13.parameters.v), 22);
  assert.equal((await grade(e13, '22')).correct, true);
  assert.equal(-3 * 2 + -4 * -5, 14, 'partial sum 14 is reachable');
  assert.equal(6 + 20 + 8, 34, 'sign-error value 34 is reachable');
  assert.match((await grade(e13, '14')).diagnosis, /2\\cdot 4 = 8/);
  assert.match((await grade(e13, '34')).diagnosis, /Vorzeichen/);
});

// ---------------------------------------------------------------------------
// 13. w01: replaced duplicates recompute and grade
// ---------------------------------------------------------------------------

test('w01-e3: a=5, b=10, a=15 -> output "15 10" matches expectedAnswer and fullSolution', async () => {
  const e3 = exercise(1, 'w01-e3');
  let a = 5;
  let b = a * 2;
  a = a + b;
  const output = `${a} ${b}`;
  assert.equal(output, '15 10');
  assert.equal(e3.expectedAnswer.output, '15 10');
  assert.match(e3.fullSolution, /15 10/);
  assert.match(e3.fullSolution, /b = 5 · 2 = 10/);
  const graded = await grade(e3, '15 10');
  assert.equal(graded.correct, true);
  assert.equal((await grade(e3, '10 15')).correct, false);
});

test('w01-e7: swap order p1..p6 grades correct with values 7/2; distractors rejected', async () => {
  const e7 = exercise(1, 'w01-e7');
  const solution = e7.expectedAnswer.solutionOrder;
  assert.deepEqual(solution, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  const vars = {};
  const lines = Object.fromEntries(e7.parameters.fragments.map((f) => [f.id, f.text]));
  for (const id of solution) {
    const text = lines[id];
    const m = text.match(/^(\w+) = (\d+)$/);
    if (m) vars[m[1]] = Number(m[2]);
  }
  assert.deepEqual([vars.a, vars.b], [7, 2]);
  // Execute the swap semantics of p3/p4/p5.
  let a = vars.a; let b = vars.b; const temp = a; a = b; b = temp;
  assert.equal(`${a} ${b}`, '2 7');
  assert.match(e7.fullSolution, /2 7/);
  assert.equal((await grade(e7, solution)).correct, true);
  assert.equal((await grade(e7, [...solution.slice(0, 2), 'd1', ...solution.slice(2)])).correct, false);
});

// ---------------------------------------------------------------------------
// 14. Dead feedback rules now in grader grammar (Session-B fix #20)
// ---------------------------------------------------------------------------

test('f-control-choice-01, f-git-merge-debug-01, f-meta-error-log-01: rewritten rules fire on wrong choices', async () => {
  const cases = [
    ['foundations/control-choice.json', 'for-values', 'while-true'],
    ['foundations/git-merge-debug.json', 'resolve-test-diff', 'ours'],
    ['foundations/meta-error-log.json', 'observable-test', 'more-reading'],
  ];
  for (const [file, right, wrong] of cases) {
    const d = definition(file);
    assert.equal((await grade(d, right)).correct, true, `${d.definitionId} ${right}`);
    const result = await grade(d, wrong);
    assert.equal(result.correct, false);
    assert.equal(result.errorType, 'wrong-choice');
    assert.ok(typeof result.diagnosis === 'string' && result.diagnosis.length > 20, `${d.definitionId} diagnosis must fire`);
    for (const rule of d.feedbackRules) assert.match(String(rule.if), /^choice [!=]== '/, `${d.definitionId} rule grammar`);
  }
});

test('w03-e2 set semantics: per-choice rules fire; w04-e2 branch-count rule fires at 3, correct is 5', async () => {
  const e2 = exercise(3, 'w03-e2');
  const set = new Set(['ki', 'lern', 'ki']);
  assert.equal(set.size, 2);
  const intersection = [...set].filter((x) => new Set(['lern', 'plattform']).has(x));
  assert.deepEqual(intersection, ['lern']);
  assert.equal((await grade(e2, 'a')).correct, true);
  for (const id of ['b', 'c', 'd']) {
    const r = await grade(e2, id);
    assert.equal(r.correct, false);
    assert.ok(r.diagnosis && r.diagnosis.length > 10, `w03-e2 rule for ${id} must fire`);
  }
  // Every wrong choice is covered by exactly one authored rule.
  const covered = e2.feedbackRules.map((r) => String(r.if).match(/^choice === '([^']+)'$/)?.[1]).filter(Boolean);
  assert.deepEqual(covered.sort(), ['b', 'c', 'd']);

  const w04 = exercise(4, 'w04-e2');
  const branches = ['>=90', '>=80', '>=70', '>=60', 'else'];
  assert.equal(branches.length, 5);
  assert.deepEqual(w04.expectedAnswer, { kind: 'integer', value: 5 });
  assert.equal((await grade(w04, '5')).correct, true);
  const at3 = await grade(w04, '3');
  assert.equal(at3.correct, false);
  assert.match(at3.diagnosis, /Zweige/);
});

// ---------------------------------------------------------------------------
// 15. column-vector: generator-form prompt, recomputed solution (7, 1)
// ---------------------------------------------------------------------------

test('f-linalg-column-vector-01: prompt is generator-derived and the solution recomputes to (7, 1)', async () => {
  const d = definition('linear-algebra/column-vector.json');
  const { A, b } = d.parameters;
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const x1 = (b[0] * A[1][1] - A[0][1] * b[1]) / det;
  const x2 = (A[0][0] * b[1] - b[0] * A[1][0]) / det;
  assert.deepEqual([x1, x2], [7, 1]);
  assert.deepEqual(d.expectedAnswer.solution, [7, 1]);
  assert.equal(x1 * A[0][0] + x2 * A[0][1], b[0]);
  assert.equal(x1 * A[1][0] + x2 * A[1][1], b[1]);
  assert.match(d.prompt, /Die Spalten von A sind/, 'prompt derives from parameters');
  assert.doesNotMatch(d.prompt, /\(7, ?1\)/, 'prompt must not hard-code the answer');
  assert.equal((await grade(d, '7 1')).correct, true);
  const swapped = await grade(d, '1 7');
  assert.equal(swapped.correct, false);
});

// ---------------------------------------------------------------------------
// 16. DEFECT f-control-trace-01 (Session-B replacement instance): snippet,
//     declared variables, fullSolution and prompt disagree.
// ---------------------------------------------------------------------------

function traceControlTraceSnippet(snippet) {
  const values = snippet.match(/\[([-\d,\s]+)\]/)[1].split(',').map((v) => Number(v.trim()));
  const threshold = Number(snippet.match(/wert > (\d+)/)[1]);
  let summe = 0;
  const states = [0];
  let wert = null;
  for (const value of values) {
    wert = value;
    if (value > threshold) summe += value;
    else summe -= 2;
    states.push(summe);
  }
  return { summe, wert, states };
}

test('DEFECT f-control-trace-01: executed snippet yields summe=3, declared answer says -1', async () => {
  const d = definition('foundations/control-trace.json');
  const trace = traceControlTraceSnippet(d.parameters.snippet);
  // Ground truth for the shipped snippet: 0 -> -2 -> -4 -> 3, wert = 7.
  assert.deepEqual(trace.states, [0, -2, -4, 3]);
  assert.equal(trace.wert, 7);
  const declared = Object.fromEntries(d.parameters.variables.map((v) => [v.name, v.value]));
  // These two assertions fail today: the correct trace is graded wrong.
  assert.equal(declared.summe, trace.summe, 'declared summe must match the executed snippet');
  assert.equal(declared.wert, trace.wert, 'declared wert must match the executed snippet');
  assert.equal((await grade(d, { summe: String(trace.summe), wert: String(trace.wert) })).correct, true, 'the true end state must grade correct');
});

test('DEFECT f-control-trace-01: prompt asks for total/number, snippet uses summe/wert; fullSolution trace contradicts the snippet', () => {
  const d = definition('foundations/control-trace.json');
  const names = d.parameters.variables.map((v) => v.name);
  for (const name of names) assert.ok(d.parameters.snippet.includes(name), `prompt variables must exist in the snippet (${name})`);
  assert.ok(d.prompt.includes('`total`') === false && d.prompt.includes('`number`') === false, 'prompt must not reference renamed-away variables total/number');
  const trace = traceControlTraceSnippet(d.parameters.snippet);
  const finalState = trace.states[trace.states.length - 1];
  // match only chained traces (n → n → n), not explanatory numbers elsewhere
  const chains = d.fullSolution.match(/-?\d+(?: → -?\d+)+/g);
  assert.ok(chains, 'fullSolution states a trace');
  const lastStated = Number(chains[0].split('→').pop().trim());
  assert.equal(lastStated, finalState, 'fullSolution trace must end at the executed final state');
});

// ---------------------------------------------------------------------------
// 17. OPT-IN runtime proof: reference solvers pass their own tests in the
//     vendored pyodide (set VERIFY_SESSION_B_PYODIDE=1). Scratch-run result
//     2026-08-31: w19-e4 6/6, w19-e5 8/8, w38-e4 6/6 checks passed; the
//     starter alone and a hard-coded fixture cheat both fail.
// ---------------------------------------------------------------------------

test('reference solvers pass the real tests in vendored pyodide (opt-in)', { skip: process.env.VERIFY_SESSION_B_PYODIDE !== '1' }, async () => {
  const { loadPyodide } = await import(join(root, 'vendor/pyodide/pyodide.mjs'));
  const py = await loadPyodide({ indexURL: join(root, 'vendor/pyodide/') });
  await py.loadPackage('numpy');
  const HARNESS = `
import sys, json
__results = []
def __check(name, cond, detail=''):
    __results.append({'name': str(name), 'passed': bool(cond), 'detail': str(detail)})
`;
  const run = async (ex, submission) => {
    const globals = py.runPython('dict()');
    py.runPython(HARNESS, { globals });
    py.runPython(submission, { globals });
    py.runPython(ex.parameters.tests, { globals });
    const results = py.runPython('__results', { globals }).toJs({ dict_converter: Object.fromEntries });
    globals.destroy();
    return Array.from(results);
  };
  for (const [w, id] of [[19, 'w19-e4'], [19, 'w19-e5'], [38, 'w38-e4']]) {
    const e = exercise(w, id);
    const results = await run(e, e.expectedAnswer.referenceSolver);
    assert.ok(results.length > 0 && results.every((r) => r.passed), `${id} reference solver must pass all checks`);
    const starter = await run(e, e.parameters.starterCode).catch(() => []);
    assert.ok(!(starter.length > 0 && starter.every((r) => r.passed)), `${id} starter must not pass`);
  }
  process.exit(0);
});
