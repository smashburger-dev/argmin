import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';
import { mockStudent, oracleAnswer, isGerman } from '../tools/llm/llm_common.mjs';
import { buildMutants, evaluateItem, summarize, checkGate } from '../tools/llm/eval_student.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const familyDocs = readdirSync(join(root, 'content/families'))
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));
for (const doc of familyDocs) registerStaticCases(doc.familyId, doc.cases);
const registry = configureExerciseFamilies(familyDocs);

// Small deterministic sample: numeric plus single-choice, kein Modell-Download.
// Stratifiziert: max. 4 Items je Familie, damit zwei Familien vertreten sind.
const sample = [];
{
  const byFamily = new Map();
  for (const doc of familyDocs) {
    // Nur die ersten drei liefernden Familien landen im Sample — spätere
    // Docs werden ohnehin weggeschnitten, kein einziges Instantiate nötig.
    if (byFamily.size >= 3 && !byFamily.has(doc.familyId)) break;
    for (const item of doc.cases || []) {
      for (let seed = 0; seed < 64; seed += 1) {
        const list = byFamily.get(doc.familyId);
        if (list && list.length >= 4) break; // Familie voll — Seed-Scan beenden
        try {
          const instance = registry.instantiate(doc.familyId, seed, item.difficultyProfile, item.caseId);
          if (instance.graderId !== 'deterministic') continue;
          if (!['numeric', 'single-choice'].includes(instance.activityType)) continue;
          if (oracleAnswer(instance) === null) continue;
          // traceValidity braucht mindestens eine Zahl, die sich auf die
          // Parameter zurückführen lässt; rein textuelle Szenario-Kapseln
          // (z. B. Angriffstaxonomie ohne Zahlen) sind für den Mock-Trace
          // strukturell nicht darstellbar und gehören nicht in die Stichprobe.
          if (!/-?\d/.test(JSON.stringify(instance.parameters))) continue;
          const kept = list || [];
          kept.push({ familyId: instance.familyId, caseId: instance.caseId, difficulty: instance.difficulty, seed });
          byFamily.set(instance.familyId, kept);
        } catch {
          continue;
        }
      }
    }
  }
  sample.push(...[...byFamily.values()].slice(0, 3).flat());
}

const rowsFor = async (predict, judge = null) => {
  const rows = [];
  for (const item of sample) {
    const instance = registry.instantiate(item.familyId, item.seed, item.difficulty, item.caseId);
    rows.push(await evaluateItem(registry, item, predict(instance), judge));
  }
  return rows;
};

// Pure-data file prediction (no functions): one verdict per solver-verified
// mutant, JSON round-tripped like a real predictions file.
const filePrediction = async (instance, verdict, finalAnswer = null) => {
  const verified = [];
  for (const mutant of buildMutants(instance)) {
    const grade = await registry.grade(instance, mutant.text);
    if (grade && grade.correct === true) continue;
    verified.push(mutant);
  }
  assert.ok(verified.length > 0, 'Sample-Item ohne verifizierten Mutanten');
  const base = mockStudent(instance);
  return JSON.parse(JSON.stringify({
    finalAnswer: finalAnswer ?? base.finalAnswer,
    hintText: base.hintText,
    reasoning: base.reasoning,
    mutantVerdicts: verified.map(() => verdict),
  }));
};

test('llm eval gate: sechs Metriken stratifiziert, Mock-Student besteht beide Gates', async () => {
  assert.ok(sample.length >= 4, 'Sample zu klein');
  assert.ok(new Set(sample.map((item) => item.familyId)).size >= 2, 'Sample braucht zwei Familien');
  const summary = summarize(await rowsFor(mockStudent));
  for (const metric of ['agreement', 'mutantRejection', 'nonLeak', 'german', 'traceValidity', 'budget']) {
    assert.equal(typeof summary.macro[metric], 'number', `Makro ${metric} fehlt`);
  }
  for (const family of Object.values(summary.perFamily)) {
    assert.equal(family.n >= 1, true);
  }
  assert.equal(summary.macro.agreement, 1);
  assert.equal(summary.macro.mutantRejection, 1);
  assert.equal(summary.macro.nonLeak, 1);
  assert.equal(checkGate('tooling', summary).pass, true);
  assert.equal(checkGate('adapter', summary).pass, true);
  assert.equal(isGerman('Überlege schrittweise auf Deutsch und prüfe dein Ergebnis.'), true);
});

test('llm eval gate: Mutanten-Akzeptanz macht das Adapter-Gate rot (keine triviale Metrik)', async () => {
  const accepting = (instance) => ({
    ...mockStudent(instance),
    judgeMutant: () => ({ accepted: true }),
  });
  const summary = summarize(await rowsFor(accepting));
  assert.equal(summary.macro.agreement, 1, 'Agreement darf die Akzeptanz nicht verdecken');
  assert.equal(summary.macro.mutantRejection, 0);
  assert.equal(checkGate('adapter', summary).pass, false);
  assert.equal(checkGate('tooling', summary).pass, true);
});

test('llm eval gate: Datei-Pfad (mutantVerdicts) ist nicht trivial gruengamable', async () => {
  const rowsForFile = async (verdict, finalAnswer = null) => {
    const rows = [];
    for (const item of sample) {
      const instance = registry.instantiate(item.familyId, item.seed, item.difficulty, item.caseId);
      rows.push(await evaluateItem(registry, item, await filePrediction(instance, verdict, finalAnswer)));
    }
    return rows;
  };
  const accepting = summarize(await rowsForFile({ rejected: false }));
  assert.equal(accepting.macro.mutantRejection, 0, 'Datei-Akzeptanz unentdeckt');
  assert.equal(checkGate('adapter', accepting).pass, false);
  assert.equal(checkGate('tooling', accepting).pass, true);
  const blanketRejected = summarize(await rowsForFile({ rejected: true }, '__falsch__'));
  assert.equal(blanketRejected.macro.mutantRejection, 1);
  assert.equal(blanketRejected.macro.agreement, 0, 'Pauschal-Rejection verdeckt falsche Antworten');
  assert.equal(checkGate('adapter', blanketRejected).pass, false, 'Pauschal-rejected-Datei faellt nicht auf');
});

test('llm eval gate: kaputter Student (falsch plus Leak) faellt beide Gates', async () => {
  const broken = (instance) => {
    const prediction = mockStudent(instance);
    const correct = (instance.choices || []).find((choice) => choice.correct);
    const leakTokens = [
      correct ? correct.text : null,
      instance.expectedAnswer && Number.isInteger(instance.expectedAnswer.value)
        ? String(instance.expectedAnswer.value)
        : null,
    ].filter(Boolean).join(' ');
    return {
      ...prediction,
      finalAnswer: '__falsch__',
      hintText: `Solution is ${leakTokens} without German words xyz.`,
      reasoning: 'n/a 999999',
    };
  };
  const summary = summarize(await rowsFor(broken));
  assert.equal(summary.macro.agreement, 0);
  assert.ok(summary.macro.nonLeak < 1, 'Leak unentdeckt');
  assert.equal(checkGate('tooling', summary).pass, false);
  assert.equal(checkGate('adapter', summary).pass, false);
});
