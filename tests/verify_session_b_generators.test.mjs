// Adversarial verification of the 13 Session-B seed-generator families
// (ADR-0015). This file deliberately tries to BREAK the integrated solution:
// uint32 edge seeds, answer-space bias, prompt leaks (prompt text, not just
// snippets), solver independence, fullSolution consistency, rotation
// stickiness, degenerate recursion, and definition drift.
//
// Independent solvers here never import product solver logic. The branch
// leaf count is recomputed structurally from the code text in the prompt
// (indentation-aware parse), replacing the circular import of
// countBranchCoverageLeaves that tests/foundations_fresh_generators.test.mjs
// still has.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FOUNDATIONS_FRESH_GENERATORS,
} from '../assets/js/core/foundations_fresh_generators.mjs';
import {
  LINALG_NUMPY_FRESH_GENERATORS,
} from '../assets/js/core/linalg_numpy_fresh_generators.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILIES = { ...FOUNDATIONS_FRESH_GENERATORS, ...LINALG_NUMPY_FRESH_GENERATORS };
const NUMERIC_SEEDS = 2000;
const LEAK_SEEDS = 500;

// --- 1. uint32 edge determinism ---------------------------------------------

test('edge seeds 0, 2^31, 2^32-1: every family is stable and never throws', () => {
  const edgeSeeds = [0, 1, 2 ** 31 - 1, 2 ** 31, 2 ** 31 + 1, 2 ** 32 - 2, 2 ** 32 - 1];
  for (const [generatorId, generator] of Object.entries(FAMILIES)) {
    for (const seed of edgeSeeds) {
      let first;
      assert.doesNotThrow(() => { first = generator(seed); }, `${generatorId}@${seed} threw`);
      const second = generator(seed);
      assert.deepEqual(first, second, `${generatorId}@${seed} not deterministic`);
      assert.ok(first && first.parameters && first.prompt, `${generatorId}@${seed} incomplete instance`);
    }
  }
});

// --- 2. answer-space distributions -------------------------------------------

test('genBranchCoverageCount: all 8 shapes and all counts 2-5 appear, no count dominates', () => {
  const counts = new Map();
  const shapes = new Set();
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const instance = FAMILIES.genBranchCoverageCount(seed);
    shapes.add(instance.parameters.shape);
    counts.set(instance.expected, (counts.get(instance.expected) || 0) + 1);
  }
  assert.equal(shapes.size, 8, 'all eight structural shapes must be reachable');
  assert.deepEqual([...counts.keys()].sort(), [2, 3, 4, 5]);
  // Measured skew: 3 and 4 carry ~37.5% each (three of eight shapes), because
  // the generator samples shapes uniformly, not answers. A blind favourite
  // guess must stay clearly below a coin flip on 4 options.
  for (const [answer, n] of counts) {
    assert.ok(n / NUMERIC_SEEDS < 0.4, `answer ${answer} dominates: ${n}/${NUMERIC_SEEDS}`);
  }
});

test('genDet2: determinant distribution is symmetric around 0, never 0, bounded', () => {
  let pos = 0;
  let neg = 0;
  const distinct = new Set();
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const d = FAMILIES.genDet2(seed).expected;
    assert.ok(Number.isInteger(d) && d !== 0, `seed ${seed}: det 0 breaks the independence claim`);
    assert.ok(Math.abs(d) <= 50, `seed ${seed}: |det| = ${Math.abs(d)} out of documented range`);
    if (d > 0) pos += 1; else neg += 1;
    distinct.add(d);
  }
  assert.ok(Math.abs(pos - neg) <= 100, `sign skew: pos=${pos} neg=${neg}`);
  assert.ok(distinct.size >= 60, `answer space collapsed to ${distinct.size}`);
});

test('genShapePredict: all 25 shape tuples reachable, none dominating', () => {
  const counts = new Map();
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const tuple = FAMILIES.genShapePredict(seed).expected.output;
    counts.set(tuple, (counts.get(tuple) || 0) + 1);
  }
  assert.equal(counts.size, 25, 'the full (2..6)x(2..6) tuple space must be covered');
  for (const [tuple, n] of counts) {
    assert.ok(n >= 40, `tuple ${tuple} underrepresented: ${n}`);
    assert.ok(n <= 120, `tuple ${tuple} dominating: ${n}`);
  }
});

// --- 3. prompt-leak scan (prompt text included, not only the snippet) ---------

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const standaloneToken = (hay, needle) =>
  new RegExp(`(?<![\\w.])${esc(needle)}(?![\\w.])`).test(hay);

test('predict-output families: neither prompt nor snippet embeds the expected output (500 seeds)', () => {
  for (const generatorId of ['genPythonStateTrace', 'genCodeReadingOutput', 'genFunctionCompose', 'genControlFlowOutput', 'genShapePredict']) {
    for (let seed = 1; seed <= LEAK_SEEDS; seed++) {
      const instance = FAMILIES[generatorId](seed);
      const output = instance.expected.output;
      const snippet = String(instance.parameters.snippet || '');
      // The prompt prose must NEVER contain the answer, not even for slices:
      // only the shown code is legitimate reading material. Answers shorter
      // than 3 chars are exempt: a 2-char slice like "nd" matches German
      // prose ("und") by pure coincidence and is not copyable knowledge.
      if (output.length >= 3) {
        assert.ok(!instance.prompt.includes(output),
          `${generatorId}@${seed}: prompt contains the answer "${output}" verbatim`);
      }
      const isSlice = generatorId === 'genCodeReadingOutput' && instance.parameters.shape === 'slice';
      if (!isSlice) {
        assert.ok(!snippet.includes(output),
          `${generatorId}@${seed}: snippet prints the answer "${output}" verbatim`);
      } else {
        // slices are the documented exception: the answer must be a proper
        // substring, never the whole word
        assert.notEqual(output, instance.parameters.word, `${generatorId}@${seed}: full word as answer`);
        assert.ok(output.length >= 2 && instance.parameters.word.includes(output));
      }
    }
  }
});

test('genLinear2Fresh: the worked example in the prompt is never the actual solution (2000 seeds)', () => {
  // the leak is thin (5 in 2000 seeds; first hit at seed 567), so the sweep
  // needs the full range to demonstrate it
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const instance = FAMILIES.genLinear2Fresh(seed);
    const pair = `(${instance.expected[0]}, ${instance.expected[1]})`;
    assert.ok(!instance.prompt.includes(pair),
      `seed ${seed}: the prompt example equals the solution ${pair}`);
  }
});

test('numeric families: the answer is never the only copyable number in the prompt (500 seeds)', () => {
  for (const generatorId of ['genBranchCoverageCount', 'genMatmulEntryFresh', 'genDet2']) {
    for (let seed = 1; seed <= LEAK_SEEDS; seed++) {
      const instance = FAMILIES[generatorId](seed);
      // strip the numbered-list prefixes of embedded code blocks first
      const stripped = instance.prompt.replace(/^\d+ +/gm, '');
      const tokens = new Set(stripped.match(/(?<![\w.])-?\d+(?![\w.])/g) || []);
      if (tokens.has(String(instance.expected))) {
        // a collision is only a leak if the learner could identify the
        // answer by copying: it must not be the sole candidate token
        assert.ok(tokens.size > 1,
          `${generatorId}@${seed}: answer ${instance.expected} is the only number in the prompt`);
      }
    }
  }
});

test('variant banks: the correct choice text never appears in the prompt (500 seeds)', () => {
  for (const generatorId of ['genMetaErrorClassify', 'genExceptionBoundary', 'genGitNextAction']) {
    for (let seed = 0; seed < LEAK_SEEDS; seed++) {
      const instance = FAMILIES[generatorId](seed);
      const correct = instance.choices.find((c) => c.correct);
      assert.ok(!instance.prompt.includes(correct.text),
        `${generatorId}@${seed}: prompt quotes the correct choice`);
    }
  }
});

// --- 4. branch-coverage solver independence -----------------------------------

/** Structural leaf counter: parses the numbered code block from the prompt
 *  (line numbers stripped with exactly the two-space separator produced by
 *  the generator, so indentation survives) and counts decision-tree leaves.
 *  Sequence statements multiply path counts; an if/elif chain sums its
 *  branch bodies; a chain without else gains one implicit skip branch. */
function structuralLeaves(codeBlock) {
  const lines = codeBlock.split('\n')
    .map((line) => line.replace(/^\d+ {2}/, ''))
    .filter((line) => line.trim() !== '');
  let i = 0;
  const indentOf = (line) => line.match(/^ */)[0].length;
  const parseBlock = (indent) => {
    let leaves = 1;
    while (i < lines.length) {
      const line = lines[i];
      if (indentOf(line) < indent) break;
      const head = line.trim();
      if (indentOf(line) === indent && /^(if |elif |else:)/.test(head)) {
        let sum = 0;
        let sawElse = false;
        while (i < lines.length && indentOf(lines[i]) === indent) {
          const t = lines[i].trim();
          if (t.startsWith('if ') || t.startsWith('elif ')) { i += 1; sum += parseBlock(indent + 4); }
          else if (t === 'else:') { i += 1; sum += parseBlock(indent + 4); sawElse = true; }
          else break;
        }
        leaves *= sum + (sawElse ? 0 : 1);
        continue;
      }
      if (indentOf(line) > indent) throw new Error(`unexpected indent: ${line}`);
      i += 1;
    }
    return leaves;
  };
  return parseBlock(0);
}

test('branch-coverage leaf counts are confirmed by an independent structural parse (no product solver)', () => {
  const shapes = new Set();
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const instance = FAMILIES.genBranchCoverageCount(seed);
    shapes.add(instance.parameters.shape);
    const codeBlock = instance.prompt.split('\n\n')[1];
    const leaves = structuralLeaves(codeBlock);
    assert.equal(leaves, instance.expected,
      `seed ${seed} shape ${instance.parameters.shape}: structural count ${leaves} != expected ${instance.expected}`);
  }
  assert.equal(shapes.size, 8);
});

// --- 5. fullSolution consistency against independent solvers -------------------

const solve = {
  state: (p) => p.shape === 'reassign'
    ? [p.a0 + p.k1 - p.k2, p.a0 + p.k1].join(' ')
    : p.shape === 'chain3'
      ? [p.x0 * p.k1 - p.x0 + p.k2, p.x0 * p.k1, p.x0 * p.k1 - p.x0].join(' ')
      : [((p.n0 + p.k1) * p.f1) - p.g1, (p.n0 + p.k1) * p.f1].join(' '),
  compose: (p) => `${p.fa * (p.ga * p.v + p.gb) + p.fb} ${p.ga * (p.fa * p.v + p.fb) + p.gb}`,
  shape: (p) => {
    if (p.shape === 'outer') return `(${p.n1}, ${p.n2})`;
    const cols = p.n / p.rows;
    return p.shape === 'transpose' ? `(${cols}, ${p.rows})` : `(${p.rows}, ${cols})`;
  },
};

/** Independent step-trace executor: re-runs the numbered snippet from
 *  parameters and renders the tracked variable after every line. */
function executeStepTrace(parameters) {
  const values = new Map();
  const lines = parameters.snippet.split('\n');
  const main = lines[0].replace(/^\d+ {2}/, '').match(/^(\w+) =/)[1];
  const render = (v) => {
    if (Array.isArray(v)) return `[${v.join(', ')}]`;
    if (v instanceof Map) return `{${[...v.entries()].map(([k, x]) => `'${k}': ${x}`).join(', ')}}`;
    if (v instanceof Set) return `{${[...v].map((x) => `'${x}'`).sort().join(', ')}}`;
    return String(v);
  };
  for (const numberedLine of lines) {
    const code = numberedLine.replace(/^\d+ {2}/, '');
    let m;
    if ((m = code.match(/^(\w+) = \[(-?\d+), (-?\d+)\]$/))) values.set(m[1], [Number(m[2]), Number(m[3])]);
    else if ((m = code.match(/^(\w+) = \{'([^']+)': (-?\d+)\}$/))) values.set(m[1], new Map([[m[2], Number(m[3])]]));
    else if ((m = code.match(/^(\w+) = \{'([^']+)', '([^']+)'\}$/))) values.set(m[1], new Set([m[2], m[3]]));
    else if ((m = code.match(/^(\w+) = (\w+)$/)) && values.has(m[2])) values.set(m[1], values.get(m[2]));
    else if ((m = code.match(/^(\w+) = (\w+)\.copy\(\)$/))) values.set(m[1], [...values.get(m[2])]);
    else if ((m = code.match(/^(\w+)\.append\((-?\d+)\)$/))) values.get(m[1]).push(Number(m[2]));
    else if ((m = code.match(/^(\w+)\.extend\(\[(-?\d+)\]\)$/))) values.get(m[1]).push(Number(m[2]));
    else if ((m = code.match(/^(\w+)\[(\d+)\] = (-?\d+)$/))) values.get(m[1])[Number(m[2])] = Number(m[3]);
    else if ((m = code.match(/^(\w+)\.add\('([^']+)'\)$/))) values.get(m[1]).add(m[2]);
    else if ((m = code.match(/^(\w+)\.discard\('([^']+)'\)$/))) values.get(m[1]).delete(m[2]);
    else if ((m = code.match(/^(\w+)\['([^']+)'\] = (-?\d+)$/))) values.get(m[1]).set(m[2], Number(m[3]));
    else if ((m = code.match(/^del (\w+)\['([^']+)'\]$/))) values.get(m[1]).delete(m[2]);
    else if ((m = code.match(/^(\w+) = (\w+) \+ \[(-?\d+)\]$/))) values.set(m[1], [...values.get(m[2]), Number(m[3])]);
    else if ((m = code.match(/^(\w+) \+= \[(-?\d+)\]$/))) values.get(m[1]).push(Number(m[2]));
    else throw new Error(`independent executor: unhandled line ${code}`);
  }
  // replay line by line to snapshot the main variable after each line
  const states = [];
  const snapshot = () => { states.push(render(values.get(main))); };
  values.clear();
  let count = 0;
  for (const numberedLine of lines) {
    const code = numberedLine.replace(/^\d+ {2}/, '');
    applyLine(values, code);
    count += 1;
    if (count <= 4) snapshot();
  }
  const answer = {};
  parameters.variables.forEach((v, index) => {
    if (v.name.endsWith('_nach_' + (index + 1))) answer[v.name] = states[index];
  });
  const yEnd = parameters.variables.find((v) => v.name === 'y_ende');
  if (yEnd) answer.y_ende = render(values.get('y'));
  return { answer, states };
}

function applyLine(values, code) {
  let m;
  if ((m = code.match(/^(\w+) = \[(-?\d+), (-?\d+)\]$/))) values.set(m[1], [Number(m[2]), Number(m[3])]);
  else if ((m = code.match(/^(\w+) = \{'([^']+)': (-?\d+)\}$/))) values.set(m[1], new Map([[m[2], Number(m[3])]]));
  else if ((m = code.match(/^(\w+) = \{'([^']+)', '([^']+)'\}$/))) values.set(m[1], new Set([m[2], m[3]]));
  else if ((m = code.match(/^(\w+) = (\w+)$/)) && values.has(m[2])) values.set(m[1], values.get(m[2]));
  else if ((m = code.match(/^(\w+) = (\w+)\.copy\(\)$/))) values.set(m[1], [...values.get(m[2])]);
  else if ((m = code.match(/^(\w+)\.append\((-?\d+)\)$/))) values.get(m[1]).push(Number(m[2]));
  else if ((m = code.match(/^(\w+)\.extend\(\[(-?\d+)\]\)$/))) values.get(m[1]).push(Number(m[2]));
  else if ((m = code.match(/^(\w+)\[(\d+)\] = (-?\d+)$/))) values.get(m[1])[Number(m[2])] = Number(m[3]);
  else if ((m = code.match(/^(\w+)\.add\('([^']+)'\)$/))) values.get(m[1]).add(m[2]);
  else if ((m = code.match(/^(\w+)\.discard\('([^']+)'\)$/))) values.get(m[1]).delete(m[2]);
  else if ((m = code.match(/^(\w+)\['([^']+)'\] = (-?\d+)$/))) values.get(m[1]).set(m[2], Number(m[3]));
  else if ((m = code.match(/^del (\w+)\['([^']+)'\]$/))) values.get(m[1]).delete(m[2]);
  else if ((m = code.match(/^(\w+) = (\w+) \+ \[(-?\d+)\]$/))) values.set(m[1], [...values.get(m[2]), Number(m[3])]);
  else if ((m = code.match(/^(\w+) \+= \[(-?\d+)\]$/))) values.get(m[1]).push(Number(m[2]));
  else throw new Error(`independent executor: unhandled line ${code}`);
}

test('fullSolution numbers match independent solvers for every family (500-seed sample)', () => {
  for (let seed = 1; seed <= LEAK_SEEDS; seed++) {
    const state = FAMILIES.genPythonStateTrace(seed);
    assert.ok(state.fullSolution.includes(solve.state(state.parameters)),
      `genPythonStateTrace@${seed}: fullSolution misses the computed output`);

    const compose = FAMILIES.genFunctionCompose(seed);
    assert.ok(compose.fullSolution.includes(solve.compose(compose.parameters)),
      `genFunctionCompose@${seed}: fullSolution misses the computed output`);

    const reading = FAMILIES.genCodeReadingOutput(seed);
    assert.ok(reading.fullSolution.includes(reading.expected.output),
      `genCodeReadingOutput@${seed}: fullSolution misses the output`);

    const control = FAMILIES.genControlFlowOutput(seed);
    assert.ok(control.fullSolution.includes(control.expected.output),
      `genControlFlowOutput@${seed}: fullSolution misses the output`);

    const shape = FAMILIES.genShapePredict(seed);
    assert.equal(shape.expected.output, solve.shape(shape.parameters),
      `genShapePredict@${seed}: solver mismatch`);
    assert.ok(shape.fullSolution.includes(shape.expected.output),
      `genShapePredict@${seed}: fullSolution misses the tuple`);

    const det = FAMILIES.genDet2(seed);
    const [a, b] = det.parameters.A[0];
    const [c, d] = det.parameters.A[1];
    assert.equal(det.expected, a * d - b * c, `genDet2@${seed}: determinant mismatch`);
    const shown = det.fullSolution.match(/-?\d+/g).map(Number);
    for (const product of [a * d, b * c, det.expected]) {
      assert.ok(shown.includes(product), `genDet2@${seed}: fullSolution misses ${product}`);
    }

    const matmul = FAMILIES.genMatmulEntryFresh(seed);
    const { A, B, entry } = matmul.parameters;
    const terms = [A[entry[0] - 1][0] * B[0][entry[1] - 1], A[entry[0] - 1][1] * B[1][entry[1] - 1]];
    assert.equal(matmul.expected, terms[0] + terms[1], `genMatmulEntryFresh@${seed}: entry mismatch`);
    assert.ok(matmul.fullSolution.includes(`${terms[0] + terms[1]}.`),
      `genMatmulEntryFresh@${seed}: fullSolution misses the entry`);

    const system = FAMILIES.genLinear2Fresh(seed);
    const { A: MA, b: vb } = system.parameters;
    const detA = MA[0][0] * MA[1][1] - MA[0][1] * MA[1][0];
    const x = (vb[0] * MA[1][1] - MA[0][1] * vb[1]) / detA;
    const y = (MA[0][0] * vb[1] - vb[0] * MA[1][0]) / detA;
    assert.ok(Number.isInteger(x) && Number.isInteger(y), `genLinear2Fresh@${seed}: non-integer solution`);
    assert.equal(x, system.expected[0], `genLinear2Fresh@${seed}: x mismatch`);
    assert.equal(y, system.expected[1], `genLinear2Fresh@${seed}: y mismatch`);
    assert.ok(system.fullSolution.includes(`x = ${x}, y = ${y}`),
      `genLinear2Fresh@${seed}: fullSolution misses the solution pair`);

    const branch = FAMILIES.genBranchCoverageCount(seed);
    assert.ok(branch.fullSolution.includes(`${branch.expected} erreichbare Blätter`)
      && branch.fullSolution.includes(`mindestens ${branch.expected} Testfälle`),
      `genBranchCoverageCount@${seed}: fullSolution count inconsistent`);

    const trace = FAMILIES.genCollectionStepTrace(seed);
    const executed = executeStepTrace(trace.parameters);
    for (const variable of trace.parameters.variables) {
      assert.equal(variable.value, executed.answer[variable.name],
        `genCollectionStepTrace@${seed}: ${variable.name} solver mismatch`);
    }
    assert.ok(trace.fullSolution.includes(executed.states.join(' → ')),
      `genCollectionStepTrace@${seed}: fullSolution state chain mismatch`);

    for (const bankId of ['genMetaErrorClassify', 'genExceptionBoundary', 'genGitNextAction']) {
      const bank = FAMILIES[bankId](seed);
      const correct = bank.choices.find((choice) => choice.correct);
      assert.ok(bank.fullSolution.includes(correct.text.split(' — ')[0]),
        `${bankId}@${seed}: fullSolution does not name the correct choice`);
    }
  }
});

test('genExceptionBoundary no-error-mul: shown repeated string matches the expression', () => {
  for (let seed = 0; seed < NUMERIC_SEEDS; seed++) {
    const instance = FAMILIES.genExceptionBoundary(seed);
    if (instance.parameters.caseId !== 'no-error-mul') continue;
    const code = instance.prompt.split('\n\n')[1];
    const m = code.match(/"(\d+)" \* (\d+)/);
    const repeated = m[1].repeat(Number(m[2]));
    const correct = instance.choices.find((choice) => choice.correct);
    assert.ok(correct.text.includes(`"${repeated}"`),
      `seed ${seed}: expected "${repeated}" in the correct choice`);
  }
});

// --- 6. rotation stickiness and position fairness ------------------------------

test('variant banks: no answer position exceeds 30% over a uniform case sweep', () => {
  const banks = [['genMetaErrorClassify', 5], ['genExceptionBoundary', 8], ['genGitNextAction', 6]];
  for (const [generatorId, caseCount] of banks) {
    const positions = { a: 0, b: 0, c: 0, d: 0 };
    const seeds = caseCount * 200; // exact uniform sweep over the bank
    for (let seed = 0; seed < seeds; seed++) {
      const instance = FAMILIES[generatorId](seed);
      positions[instance.expected.correctChoice] += 1;
    }
    for (const [id, n] of Object.entries(positions)) {
      assert.ok(n / seeds <= 0.3,
        `${generatorId}: position ${id} is correct in ${(100 * n / seeds).toFixed(1)}% of instances`);
    }
  }
});

test('variant banks: the correct position must vary WITHIN a case (repeat encounters must not be position-learnable)', () => {
  const banks = [['genMetaErrorClassify', 5], ['genExceptionBoundary', 8], ['genGitNextAction', 6]];
  for (const [generatorId, caseCount] of banks) {
    const positionsByCase = new Map();
    for (let seed = 0; seed < caseCount * 400; seed++) {
      const instance = FAMILIES[generatorId](seed);
      const caseId = instance.parameters.caseId;
      if (!positionsByCase.has(caseId)) positionsByCase.set(caseId, new Set());
      positionsByCase.get(caseId).add(instance.expected.correctChoice);
    }
    for (const [caseId, positions] of positionsByCase) {
      assert.ok(positions.size > 1,
        `${generatorId}/${caseId}: the correct answer is glued to position(s) ${[...positions].join(',')} for every seed`);
    }
  }
});

// --- 7. degenerate cases and documented value ranges ---------------------------

test('recursive re-rolls terminate across a wide seed range and the uint32 wraparound', () => {
  // genCodeReadingOutput / genControlFlowOutput / genFunctionCompose re-roll
  // with seed+1 on degenerate draws. A cycle would require every successor
  // seed to be degenerate too; empirically the longest consecutive
  // degenerate run over 300k seeds is 3 (measured via rng replication).
  // Here we verify termination behaviour directly, including 2^32-1 -> 0.
  const probes = [4294967294, 4294967295, 0, 1, 2];
  for (let seed = 0; seed <= 20000; seed += 1) probes.push(seed);
  for (const seed of probes) {
    for (const generatorId of ['genCodeReadingOutput', 'genControlFlowOutput', 'genFunctionCompose']) {
      let instance;
      assert.doesNotThrow(() => { instance = FAMILIES[generatorId](seed); }, `${generatorId}@${seed} did not terminate cleanly`);
      assert.ok(instance.expected && instance.parameters, `${generatorId}@${seed}: incomplete re-roll result`);
    }
  }
});

test('genFunctionCompose: comprehension of the composition is never empty and the functions never commute', () => {
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const instance = FAMILIES.genFunctionCompose(seed);
    const [fg, gf] = instance.expected.output.split(' ').map(Number);
    assert.notEqual(fg, gf, `seed ${seed}: commutative pair served despite the guard`);
    const { fa, fb, ga, gb, v } = instance.parameters;
    assert.equal(fg, fa * (ga * v + gb) + fb, `seed ${seed}: f(g(v)) mismatch`);
    assert.equal(gf, ga * (fa * v + fb) + gb, `seed ${seed}: g(f(v)) mismatch`);
  }
});

test('genCodeReadingOutput comprehension re-roll: served comprehensions are never empty', () => {
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const instance = FAMILIES.genCodeReadingOutput(seed);
    if (instance.parameters.shape !== 'comprehension') continue;
    const inner = instance.expected.output;
    assert.ok(/^\[-?\d+(, -?\d+)*\]$/.test(inner) && inner !== '[]',
      `seed ${seed}: empty comprehension served: ${inner}`);
  }
});

test('documented value ranges hold: printed values stay within [-99, 99]', () => {
  // genFunctionCompose doc: "all values integers in [-99, 99]"
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const compose = FAMILIES.genFunctionCompose(seed);
    for (const value of compose.expected.output.split(' ').map(Number)) {
      assert.ok(Math.abs(value) <= 99,
        `genFunctionCompose@${seed}: printed value ${value} outside [-99, 99] (doc contract line 169)`);
    }
  }
  // genPythonStateTrace doc: "all shown and printed values in [-99, 99]"
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const state = FAMILIES.genPythonStateTrace(seed);
    if (state.parameters.shape !== 'accumulate') continue;
    const p = state.parameters;
    const n1 = p.n0 + p.k1;
    const m = n1 * p.f1;
    const n = m - p.g1;
    for (const value of [n1, m, n]) {
      assert.ok(Math.abs(value) <= 99,
        `genPythonStateTrace@${seed} (accumulate): shown value ${value} outside [-99, 99] (doc contract line 66)`);
    }
  }
  // genControlFlowOutput doc: "loop terminates after 2-5 iterations, all values in [-99, 99]"
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const control = FAMILIES.genControlFlowOutput(seed);
    if (control.parameters.shape !== 'while') continue;
    for (const value of control.expected.output.split(' ').map(Number)) {
      assert.ok(Math.abs(value) <= 99,
        `genControlFlowOutput@${seed} (while): printed value ${value} outside [-99, 99] (doc contract line 194)`);
    }
    assert.ok(control.parameters.iterations >= 2 && control.parameters.iterations <= 5,
      `genControlFlowOutput@${seed}: ${control.parameters.iterations} iterations outside 2-5`);
  }
});

// --- 8. definition contract -----------------------------------------------------

const DEFINITIONS = [
  ['foundations/python-state-trace.json', 'genPythonStateTrace'],
  ['foundations/code-reading-output.json', 'genCodeReadingOutput'],
  ['foundations/function-compose.json', 'genFunctionCompose'],
  ['foundations/meta-error-classify.json', 'genMetaErrorClassify'],
  ['foundations/control-flow-output.json', 'genControlFlowOutput'],
  ['foundations/collection-step-trace.json', 'genCollectionStepTrace'],
  ['foundations/exception-boundary.json', 'genExceptionBoundary'],
  ['foundations/branch-coverage.json', 'genBranchCoverageCount'],
  ['foundations/git-next-action.json', 'genGitNextAction'],
  ['linear-algebra/matmul-entry-fresh.json', 'genMatmulEntryFresh'],
  ['linear-algebra/solve-system-fresh.json', 'genLinear2Fresh'],
  ['linear-algebra/det2-fresh.json', 'genDet2'],
  ['linear-algebra/shape-predict.json', 'genShapePredict'],
];

test('stored expectedAnswer defaults show no drift and hints do not leak the answer', () => {
  for (const [path, generatorId] of DEFINITIONS) {
    const definition = JSON.parse(readFileSync(join(root, 'content/exercise-definitions', path), 'utf8'));
    assert.equal(definition.testedSeedCount, 2000, `${path}: testedSeedCount contract`);
    const instance = FAMILIES[generatorId](definition.deterministicSeed);
    const stored = definition.expectedAnswer;
    assert.equal(stored.defaultSeed, definition.deterministicSeed, `${path}: defaultSeed drift`);
    if ('defaultOutput' in stored) {
      assert.equal(stored.defaultOutput, instance.expected.output, `${path}: defaultOutput drift`);
    }
    if ('defaultChoice' in stored) {
      assert.equal(stored.defaultChoice, instance.expected.correctChoice, `${path}: defaultChoice drift`);
    }
    if ('defaultExpected' in stored) {
      const generated = Array.isArray(instance.expected) ? instance.expected : instance.expected;
      assert.deepEqual(stored.defaultExpected, generated, `${path}: defaultExpected drift`);
    }
    const answerText = instance.expected.output
      ?? (Array.isArray(instance.expected) ? `(${instance.expected.join(', ')})` : String(instance.expected));
    for (const hint of definition.hints || []) {
      assert.ok(!hint.includes(answerText), `${path}: hint leaks the default answer "${answerText}"`);
    }
  }
});

test('genGitNextAction: the fileName parameter is real variation, not dead decoration', () => {
  let fileBearing = 0;
  for (let seed = 0; seed < LEAK_SEEDS; seed++) {
    const instance = FAMILIES.genGitNextAction(seed);
    const fileName = instance.parameters.fileName;
    // Session-B fix: cases that name no file carry NO fileName parameter
    // (dead decoration removed); file-bearing cases must surface it.
    if (!fileName) continue;
    fileBearing += 1;
    // no choice may reference a placeholder file the prompt never established
    for (const choice of instance.choices) {
      const mentioned = choice.text.match(/[\w-]+\.(?:py|md)/g) || [];
      for (const file of mentioned) {
        assert.ok(file === fileName || instance.prompt.includes(file),
          `seed ${seed}: choice references "${file}" but the tracked file is "${fileName}"`);
      }
    }
    // if fileName is tracked as a parameter, it must surface somewhere a
    // learner can see: prompt or choices
    assert.ok(instance.prompt.includes(fileName) || instance.choices.some((c) => c.text.includes(fileName)),
      `seed ${seed}: fileName "${fileName}" never appears in prompt or choices (dead variation)`);
  }
  assert.ok(fileBearing >= 30, 'expected a substantial share of file-bearing git cases');
});

test('genExceptionBoundary: no distractor shares the exception name of the correct answer', () => {
  for (let seed = 0; seed < NUMERIC_SEEDS; seed++) {
    const instance = FAMILIES.genExceptionBoundary(seed);
    const correct = instance.choices.find((choice) => choice.correct);
    const name = correct.text.split(' — ')[0];
    for (const choice of instance.choices) {
      if (choice.correct) continue;
      assert.ok(!choice.text.startsWith(name),
        `seed ${seed}: distractor "${choice.text.slice(0, 60)}..." cues the correct answer name "${name}"`);
    }
  }
});
