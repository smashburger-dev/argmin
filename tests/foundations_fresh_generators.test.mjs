// Session-B quality gate for the 13 fresh-variation generator families
// (ADR-0015). Numeric families run 200 seeds (some deeper loops run up to
// 1200); semantic variant banks are enumerated completely. genDet2 is
// cross-checked against an independent solver written in this file;
// genCollectionStepTrace against the local solveStepTrace re-execution.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOUNDATIONS_FRESH_GENERATORS,
  metaErrorCaseCount,
  exceptionBoundaryCaseCount,
  gitNextActionCaseCount,
} from '../assets/js/core/foundations_fresh_generators.mjs';
import { LINALG_NUMPY_FRESH_GENERATORS } from '../assets/js/core/linalg_numpy_fresh_generators.mjs';

/** Independent det2 check: same formula, but written here so the assertion
 *  below does not compare the product function against itself. */
function det2Independently(p) {
  return p.A[0][0] * p.A[1][1] - p.A[0][1] * p.A[1][0];
}

const NUMERIC_SEEDS = 200;
const FAMILIES = { ...FOUNDATIONS_FRESH_GENERATORS, ...LINALG_NUMPY_FRESH_GENERATORS };

// The step-trace solver re-executes the snippet semantics from parameters.
function solveStepTrace(p) {
  const values = {};
  const render = (v) => Array.isArray(v) ? `[${v.join(', ')}]` : String(v);
  const lines = p.snippet.split('\n');
  const states = [];
  let list = null;
  let other = null;
  for (const line of lines) {
    const code = line.replace(/^\d+\s+/, '');
    let m;
    if ((m = code.match(/^(\w+) = \[(.*)\]$/))) {
      list = m[2].split(',').map((s) => Number(s.trim()));
      values[m[1]] = list;
    } else if ((m = code.match(/^(\w+) = \{'([^']+)': (-?\d+)\}$/))) {
      values[m[1]] = new Map([[m[2], Number(m[3])]]);
    } else if ((m = code.match(/^(\w+) = \{'([^']+)', '([^']+)'\}$/))) {
      values[m[1]] = new Set([m[2], m[3]]);
    } else if ((m = code.match(/^(\w+) = (\w+)$/)) && values[m[2]]) {
      other = { name: m[1], source: m[2], copy: false };
      values[m[1]] = values[m[2]];
    } else if ((m = code.match(/^(\w+) = (\w+)\.copy\(\)$/))) {
      other = { name: m[1], source: m[2], copy: true };
      values[m[1]] = [...values[m[2]]];
    } else if ((m = code.match(/^(\w+)\.append\((-?\d+)\)$/))) { values[m[1]].push(Number(m[2])); }
    else if ((m = code.match(/^(\w+)\.extend\(\[(-?\d+)\]\)$/))) { values[m[1]].push(Number(m[2])); }
    else if ((m = code.match(/^(\w+)\[(\d+)\] = (-?\d+)$/))) { values[m[1]][Number(m[2])] = Number(m[3]); }
    else if ((m = code.match(/^(\w+)\.add\('([^']+)'\)$/))) { values[m[1]].add(m[2]); }
    else if ((m = code.match(/^(\w+)\.discard\('([^']+)'\)$/))) { values[m[1]].delete(m[2]); }
    else if ((m = code.match(/^(\w+)\['([^']+)'\] = (-?\d+)$/))) { values[m[1]].set(m[2], Number(m[3])); }
    else if ((m = code.match(/^del (\w+)\['([^']+)'\]$/))) { values[m[1]].delete(m[2]); }
    else if ((m = code.match(/^(\w+) = (\w+) \+ \[(-?\d+)\]$/))) { values[m[1]] = [...values[m[2]], Number(m[3])]; }
    else if ((m = code.match(/^(\w+) \+= \[(-?\d+)\]$/))) { values[m[1]].push(Number(m[2])); }
    else throw new Error(`step-trace solver: unverstandene Zeile: ${code}`);
    states.push(renderState(values[lines[0].replace(/^\d+\s+/, '').match(/^(\w+) =/)[1]]));
  }
  const answer = {};
  const variables = p.variables;
  const mainName = variables[0].name.replace(/_nach_\d+$/, '');
  variables.forEach((v, i) => {
    if (v.name === `${mainName}_nach_${i + 1}`) answer[v.name] = states[i];
  });
  const yEnd = variables.find((v) => v.name === 'y_ende');
  if (yEnd) answer.y_ende = renderState(values.y);
  return answer;
}

const renderState = (value) => {
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  if (value instanceof Map) return `{${[...value.entries()].map(([k, v]) => `'${k}': ${v}`).join(', ')}}`;
  if (value instanceof Set) return `{${[...value].map((v) => `'${v}'`).sort().join(', ')}}`;
  return String(value);
};

// --- 1. registry + definitions -----------------------------------------------

test('all fresh families expose their registered generator ids', () => {
  const ids = Object.keys(FAMILIES);
  assert.equal(ids.length, 13);
  for (const id of ids) assert.equal(typeof FAMILIES[id], 'function', `${id} is not callable`);
});

// --- 2. determinism + answer spaces + independent solvers ---------------------

test('genDet2 invariant: determinant is never zero (independence actually holds)', () => {
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const instance = FAMILIES.genDet2(seed);
    assert.notEqual(instance.expected, 0, `seed ${seed} produced a dependent column set`);
    assert.ok(Math.abs(instance.expected) <= 50);
    assert.equal(instance.expected, det2Independently(instance.parameters));
  }
});

test('genBranchCoverageCount: prompt never contains the leaf count as a standalone number', () => {
  for (let seed = 1; seed <= NUMERIC_SEEDS; seed++) {
    const instance = FAMILIES.genBranchCoverageCount(seed);
    // strip the leading line numbers of the numbered code block first
    const code = instance.prompt.replace(/^\d+\s+/gm, '');
    const tokens = new Set(code.match(/(?<![\w.])(\d+)(?![\w.])/g) || []);
    assert.ok(!tokens.has(String(instance.expected)), `seed ${seed}: answer ${instance.expected} leaks in prompt`);
  }
});

// --- 3. semantic variant banks --------------------------------------------------

test('variant banks: every case reachable, choices valid, correct position rotates, no semantic duplicates', () => {
  const banks = [
    ['genMetaErrorClassify', metaErrorCaseCount()],
    ['genExceptionBoundary', exceptionBoundaryCaseCount()],
    ['genGitNextAction', gitNextActionCaseCount()],
  ];
  for (const [generatorId, caseCount] of banks) {
    const generator = FAMILIES[generatorId];
    const cases = new Map(); // caseId -> prompt signature
    const positions = new Set();
    for (let seed = 0; seed < caseCount * 8; seed++) {
      const instance = generator(seed);
      assert.ok(Array.isArray(instance.choices) && instance.choices.length >= 2, `${generatorId}@${seed}: choices missing`);
      assert.equal(instance.choices.filter((choice) => choice.correct).length, 1, `${generatorId}@${seed}: choices need one correct answer`);
      positions.add(instance.choices.findIndex((c) => c.correct));
      const caseId = instance.parameters.caseId;
      const questionLine = instance.prompt.split('\n')[0];
      if (!cases.has(caseId)) cases.set(caseId, questionLine);
      else assert.equal(cases.get(caseId), questionLine, `${generatorId}/${caseId}: same case must ask the same question`);
    }
    assert.equal(cases.size, caseCount, `${generatorId}: all ${caseCount} cases must be reachable`);
    assert.equal(positions.size, Math.min(4, caseCount), `${generatorId}: correct position must rotate`);
  }
});

// --- 4. collection step trace -----------------------------------------------------

test('genCollectionStepTrace: all six families reachable, solver parity, states actually evolve', () => {
  const seen = new Map();
  for (let seed = 1; seed <= 300; seed++) {
    const instance = FAMILIES.genCollectionStepTrace(seed);
    const family = instance.parameters.family;
    seen.set(family, (seen.get(family) || 0) + 1);
    const expectedStates = solveStepTrace(instance.parameters);
    for (const variable of instance.parameters.variables) {
      assert.equal(variable.type, 'repr');
      assert.equal(variable.value, expectedStates[variable.name], `seed ${seed}/${family}: ${variable.name}`);
    }
    // Mutation vs. rebinding must be observable: the state sequence changes
    // (except after no-op lines like y = x.copy()).
    const stateValues = instance.parameters.variables.map((v) => v.value);
    assert.ok(new Set(stateValues).size >= 2, `seed ${seed}/${family}: degenerate trace (constant states)`);
  }
  assert.equal(seen.size, 6, `all six families must appear (${[...seen.keys()].join(', ')})`);
  assert.ok([...seen.values()].every((count) => count >= 20), 'every family appears substantially');
});

// --- 5. prompt-leak protection ------------------------------------------------------

test('predict-output prompts never embed the expected output string (slices excepted)', () => {
  for (const generatorId of ['genPythonStateTrace', 'genCodeReadingOutput', 'genFunctionCompose', 'genControlFlowOutput', 'genShapePredict']) {
    const generator = FAMILIES[generatorId];
    for (let seed = 1; seed <= 150; seed++) {
      const instance = generator(seed);
      const output = instance.expected.output;
      const snippet = String(instance.parameters.snippet || '');
      if (generatorId === 'genCodeReadingOutput' && instance.parameters.shape === 'slice') {
        // A slice answer is necessarily a substring of the shown word; the
        // derived work are the bounds — assert it is a PROPER substring that
        // never equals the full word (reading the whole word is not the task).
        assert.notEqual(output, instance.parameters.word, `seed ${seed}: full word as answer`);
        assert.ok(output.length >= 2);
        continue;
      }
      // Everything else: the output must never appear verbatim as a
      // ready-made answer inside the snippet.
      assert.ok(!snippet.includes(output), `${generatorId}@${seed}: snippet prints the answer verbatim`);
    }
  }
});

// --- ADR-0015 completion fixes: pinned regressions from the Session-B review ---

test('genGitNextAction: fileName varies across seeds (not fixed to one value)', () => {
  const names = new Set();
  for (let seed = 0; seed < 120; seed++) {
    const fileName = FAMILIES.genGitNextAction(seed).parameters.fileName;
    if (fileName) names.add(fileName);
  }
  assert.ok(names.size >= 2, `fileName must vary across file-bearing seeds, got ${[...names].join(', ')}`);
});

test('genCollectionStepTrace list-copy: the final x write actually changes x (solution text stays truthful)', () => {
  let checked = 0;
  for (let seed = 1; seed <= 1200; seed++) {
    const instance = FAMILIES.genCollectionStepTrace(seed);
    if (instance.parameters.family !== 'list-copy') continue;
    checked += 1;
    const valueOf = (name) => instance.parameters.variables.find((v) => v.name === name).value;
    assert.notEqual(valueOf('x_nach_4'), valueOf('x_nach_3'),
      `seed ${seed}: x[0] write is a no-op but the solution claims "verändert x"`);
  }
  assert.ok(checked > 100, 'list-copy family must be exercised');
});

test('learner-facing generator texts stay German (no foreign-language artifacts, no English booleans)', () => {
  const forbidden = [/\bplusieurs\b/, /\bist (?:true|false)\b/, /\bist True\b/];
  for (const generatorId of ['genGitNextAction', 'genMetaErrorClassify', 'genExceptionBoundary', 'genControlFlowOutput', 'genPythonStateTrace', 'genCodeReadingOutput', 'genFunctionCompose', 'genCollectionStepTrace', 'genBranchCoverageCount']) {
    for (let seed = 0; seed < 150; seed++) {
      const instance = FAMILIES[generatorId](seed);
      for (const text of [instance.prompt, instance.fullSolution]) {
        for (const pattern of forbidden) {
          assert.ok(!pattern.test(text), `${generatorId}@${seed}: forbidden text ${pattern} in "${String(text).slice(0, 80)}"`);
        }
      }
    }
  }
});
