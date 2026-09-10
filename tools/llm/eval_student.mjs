#!/usr/bin/env node
// B4: Eval-Harness fuer den Student (Erklaer-/Hint-Umschreiber).
// Sechs Metriken, stratifiziert pro Familie: Solver-Agreement,
// Mutanten-Rejektion, Nicht-Leak, Deutsch-Rate, Trace-Validitaet,
// Token-Budget. Gate-Logik Tooling vs. Adapter getrennt:
//
// - Gate "tooling": PRs am Repo-Code (Budget, Validitaet, Nicht-Leak).
// - Gate "adapter": Gewichte-Bewertung (Agreement, Mutanten, Deutsch).
// Training aendert keinen Repo-Code; Adapter-Gewichte werden nie
// gegen family_golden_corpus gegatet (Gate waere trivial gruen).
//
// Gebrauch: node tools/llm/eval_student.mjs --traces verified.jsonl
//   [--predictions preds.jsonl] [--gate tooling|adapter|none]
//   [--report eval-report.json]
//
// Mutanten-Diskrimination ist die Hauptmetrik: Jeder verifizierte Mutant
// (Fixture-`mutants`, sonst gebaut plus solver-geprueft) wird dem Student
// vorgelegt, entweder als judgeMutant(instance, mutant)-Funktion oder, fuer
// Datei-Predictions, als `mutantVerdicts`-Array in Fixture-Reihenfolge.
// Ohne Urteil ist die Metrik null und das Adapter-Gate fail-closed rot.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureExerciseFamilies } from '../../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../../assets/js/domain/family_registry.mjs';
import {
  TOOLING_VERSION, estimateTokens, isGerman, mockStudent, leakedSolution, traceNumbersValid,
} from './llm_common.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const flag = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};

export const BUDGET_DEFAULTS = { maxIn: 1500, maxOut: 600 };
export const GATE_THRESHOLDS = {
  tooling: { nonLeak: 1, traceValidity: 0.95, budget: 0.95 },
  adapter: { agreement: 0.8, mutantRejection: 1, german: 0.95 },
};

// Verifizierte Mutanten: falsche Antworten, die der Solver verwirft.
export const buildMutants = (instance) => {
  const mutants = [];
  const correct = (instance.choices || []).find((choice) => choice.correct);
  if (correct) {
    for (const choice of instance.choices.filter((item) => !item.correct).slice(0, 3)) {
      mutants.push({ text: choice.id, expectedRejectReason: 'wrong-choice' });
    }
    return mutants;
  }
  const expected = instance.expectedAnswer;
  if (expected && Number.isInteger(expected.value)) {
    for (const delta of [1, 2, -1]) {
      mutants.push({ text: String(expected.value + delta), expectedRejectReason: 'wrong-value' });
    }
  }
  return mutants;
};

// Fixture mutants are solver-verified (see tests/llm_benchmark.test.mjs);
// live items without fixture mutants fall back to built plus graded ones.
const fixtureMutants = (item) => (Array.isArray(item.mutants) ? item.mutants : [])
  .filter((mutant) => mutant && mutant.solverVerdict && mutant.solverVerdict.correct === false);

const verifiedBuiltMutants = async (registry, instance) => {
  const verified = [];
  for (const mutant of buildMutants(instance)) {
    let mutantGrade = null;
    try {
      mutantGrade = await registry.grade(instance, mutant.text);
    } catch {
      continue;
    }
    if (mutantGrade && mutantGrade.correct === true) continue;
    verified.push(mutant);
  }
  return verified;
};

// Unknown verdict shapes count as accepted (fail-closed, never silent 1.0).
const isAccepted = (verdict) => {
  if (typeof verdict === 'boolean') return verdict;
  if (verdict && typeof verdict.accepted === 'boolean') return verdict.accepted;
  if (verdict && typeof verdict.rejected === 'boolean') return !verdict.rejected;
  return true;
};

const judgeRejections = async (instance, mutants, judge) => {
  let rejected = 0;
  for (const mutant of mutants) {
    let verdict = true;
    try {
      verdict = await judge(instance, mutant);
    } catch {
      verdict = true;
    }
    if (!isAccepted(verdict)) rejected += 1;
  }
  return rejected;
};

// File predictions cannot carry functions; they report one verdict per
// mutant in fixture order. Length mismatch means unmeasurable (null).
const verdictRejections = (mutants, verdicts) => {
  if (!Array.isArray(verdicts) || verdicts.length !== mutants.length) return null;
  return verdicts.filter((verdict) => !isAccepted(verdict)).length;
};

export const evaluateItem = async (registry, item, prediction, judgeMutant = null) => {
  const instance = registry.instantiate(item.familyId, item.seed, item.difficulty, item.caseId);
  const grade = await registry.grade(instance, prediction.finalAnswer);
  const agreement = grade && grade.correct === true;
  const fixture = fixtureMutants(item);
  const verified = fixture.length ? fixture : await verifiedBuiltMutants(registry, instance);
  const judge = judgeMutant || prediction.judgeMutant || null;
  const rejected = typeof judge === 'function'
    ? await judgeRejections(instance, verified, judge)
    : verdictRejections(verified, prediction.mutantVerdicts);
  const inTokens = estimateTokens(`${instance.prompt} ${JSON.stringify(instance.parameters)}`);
  const outTokens = estimateTokens(`${prediction.hintText} ${prediction.reasoning} ${prediction.finalAnswer}`);
  return {
    familyId: item.familyId,
    agreement,
    mutantRejection: rejected === null || !verified.length ? null : rejected / verified.length,
    nonLeak: leakedSolution(instance, prediction.hintText) === null,
    german: isGerman(prediction.hintText),
    traceValidity: agreement && traceNumbersValid(instance, prediction.reasoning),
    budget: inTokens <= BUDGET_DEFAULTS.maxIn && outTokens <= BUDGET_DEFAULTS.maxOut,
  };
};

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export const summarize = (rows) => {
  const byFamily = new Map();
  for (const row of rows) {
    if (!byFamily.has(row.familyId)) byFamily.set(row.familyId, []);
    byFamily.get(row.familyId).push(row);
  }
  const perFamily = {};
  for (const [familyId, items] of byFamily) {
    const rejections = items.map((item) => item.mutantRejection).filter((value) => value !== null);
    perFamily[familyId] = {
      n: items.length,
      agreement: mean(items.map((item) => Number(item.agreement))),
      mutantRejection: mean(rejections),
      nonLeak: mean(items.map((item) => Number(item.nonLeak))),
      german: mean(items.map((item) => Number(item.german))),
      traceValidity: mean(items.map((item) => Number(item.traceValidity))),
      budget: mean(items.map((item) => Number(item.budget))),
    };
  }
  const families = Object.values(perFamily);
  const macro = (key) => mean(families.map((family) => family[key]).filter((value) => value !== null));
  return {
    perFamily,
    macro: {
      agreement: macro('agreement'), mutantRejection: macro('mutantRejection'),
      nonLeak: macro('nonLeak'), german: macro('german'),
      traceValidity: macro('traceValidity'), budget: macro('budget'),
    },
  };
};

export const checkGate = (kind, summary) => {
  if (kind === 'none') return { kind, pass: true, checks: [] };
  const thresholds = GATE_THRESHOLDS[kind];
  if (!thresholds) throw new Error(`Unbekanntes Gate ${kind}; erlaubt: tooling, adapter, none.`);
  const checks = Object.entries(thresholds).map(([metric, min]) => {
    const value = summary.macro[metric === 'budget' ? 'budget' : metric];
    return { metric, min, value, pass: value !== null && value >= min };
  });
  return { kind, pass: checks.every((check) => check.pass), checks };
};

const loadRegistry = () => {
  const familyDocs = readdirSync(join(root, 'content/families'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));
  for (const doc of familyDocs) registerStaticCases(doc.familyId, doc.cases);
  return configureExerciseFamilies(familyDocs);
};

const isMain = process.argv[1] && process.argv[1].endsWith('eval_student.mjs');
if (isMain) {
  const tracesFile = flag('--traces');
  if (!tracesFile) {
    console.error('Fehlt: --traces <verified.jsonl>');
    process.exit(1);
  }
  const registry = loadRegistry();
  const traces = readFileSync(tracesFile, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const predsFile = flag('--predictions');
  const predictions = predsFile
    ? readFileSync(predsFile, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
    : null;
  const rows = [];
  for (const [index, item] of traces.entries()) {
    const instance = registry.instantiate(item.familyId, item.seed, item.difficulty, item.caseId);
    const prediction = predictions ? predictions[index] : mockStudent(instance);
    rows.push(await evaluateItem(registry, item, prediction));
  }
  const summary = summarize(rows);
  const gate = checkGate(flag('--gate') || 'none', summary);
  const report = { tooling: TOOLING_VERSION, items: rows.length, ...summary, gate };
  writeFileSync(flag('--report') || 'eval-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Items: ${rows.length}, Makro: ${JSON.stringify(summary.macro)}, Gate ${gate.kind}: ${gate.pass ? 'PASS' : 'FAIL'}`);
  process.exit(gate.pass ? 0 : 1);
}
