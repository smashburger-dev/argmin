#!/usr/bin/env node
// B2: Trace-Verifikation. Jede Spur wird per family_registry.solve
// (Solver-Konsistenz) plus graders.js (registry.grade) nachgradiert.
// Nur bestehende Spuren landen im Output. Verwerfungsquote plus Gruende
// und Deutsch-Rate werden geloggt. Exit 0 bei IO-Erfolg (auch mit
// Verwerfungen), Exit 1 bei Datei- oder Schemafehlern.
//
// Gebrauch: node tools/llm/verify_traces.mjs --in teacher-traces.jsonl
//   --out verified-traces.jsonl --report verify-report.json
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureExerciseFamilies } from '../../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../../assets/js/domain/family_registry.mjs';
import { TOOLING_VERSION, isGerman } from './llm_common.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const flag = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const required = ['familyId', 'caseId', 'difficulty', 'seed', 'expectedAnswer', 'teacher', 'trace'];
const isRecord = (item) => item && required.every((key) => item[key] !== undefined)
  && item.trace && item.trace.finalAnswer !== undefined;

const familyDocs = readdirSync(join(root, 'content/families'))
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));
for (const doc of familyDocs) registerStaticCases(doc.familyId, doc.cases);
const registry = configureExerciseFamilies(familyDocs);

const inputFile = flag('--in');
if (!inputFile) fail('Fehlt: --in <traces.jsonl>');
const raw = readFileSync(inputFile, 'utf8').split('\n').filter(Boolean);

const kept = [];
const rejectReasons = {};
let germanHits = 0;
const reject = (item, reason) => {
  rejectReasons[reason] = (rejectReasons[reason] || 0) + 1;
};

const verify = async () => {
  for (const [index, line] of raw.entries()) {
    const item = JSON.parse(line);
    if (!isRecord(item)) {
      reject(item, 'schema');
      continue;
    }
    let instance;
    try {
      instance = registry.instantiate(item.familyId, item.seed, item.difficulty, item.caseId);
    } catch {
      reject(item, 'instantiate');
      continue;
    }
    const family = registry.get(item.familyId);
    let solved = null;
    try {
      solved = family.solve(instance.parameters);
    } catch {
      solved = null;
    }
    if (solved && instance.choices && solved.correctText) {
      const correct = instance.choices.find((choice) => choice.correct);
      if (!correct || correct.text !== solved.correctText) {
        reject(item, 'solver-mismatch');
        continue;
      }
    }
    let grade;
    try {
      grade = await registry.grade(instance, item.trace.finalAnswer);
    } catch {
      reject(item, 'grader-error');
      continue;
    }
    if (!grade || grade.correct !== true) {
      reject(item, 'solver-reject');
      continue;
    }
    const german = isGerman(item.trace.hintText) && isGerman(item.trace.reasoning);
    if (german) germanHits += 1;
    kept.push({ ...item, verified: { tooling: TOOLING_VERSION, german } });
  }

  const total = raw.length;
  const rejected = total - kept.length;
  const report = {
    tooling: TOOLING_VERSION,
    total,
    kept: kept.length,
    rejected,
    rejectRate: total ? rejected / total : 0,
    rejectReasons,
    germanRate: kept.length ? germanHits / kept.length : 0,
    germanNote: 'Heuristik plus Spot-Sample N=100 menschlich vor dem Training (siehe Spec B2).',
  };
  writeFileSync(flag('--out') || 'verified-traces.jsonl', kept.map((item) => JSON.stringify(item)).join('\n') + (kept.length ? '\n' : ''));
  writeFileSync(flag('--report') || 'verify-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Geprueft: ${total}, behalten: ${kept.length}, verworfen: ${rejected} (${(report.rejectRate * 100).toFixed(1)}%), Gruende: ${JSON.stringify(rejectReasons)}, Deutsch-Rate: ${report.germanRate.toFixed(2)}`);
};

await verify().catch((error) => fail(String(error && error.message || error)));
