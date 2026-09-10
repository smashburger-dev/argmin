#!/usr/bin/env node
// B2: Teacher-Trace-Erzeugung mit Solver-Gate-Vorbereitung.
// Der Teacher ist per Env steckbar; ohne API-Key laeuft nur der Mock.
// Bezahlte API-Aufrufe ohne Key sind ausgeschlossen: fremde Teacher
// brechen graceful mit Exit 2 ab, bevor ein Request entsteht.
//
// Env: ARGMIN_TEACHER (mock, default), ARGMIN_TEACHER_MODEL,
//   ARGMIN_TEACHER_MODEL_VERSION, ARGMIN_TEACHER_SNAPSHOT_DATE,
//   ARGMIN_TEACHER_API_KEY, ARGMIN_MOCK_TEACHER_CORRUPT_EVERY.
// Flags: --mock-pairs N (Mock-Paare aus dem Content, default 20),
//   --pairs <jsonl> (eigene Paare), --out <jsonl>, --cost <json>,
//   --dry-run (Mock-Teacher plus Kostenschaetzung, kein Netz).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureExerciseFamilies } from '../../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../../assets/js/domain/family_registry.mjs';
import {
  TEACHER_PROMPT_VERSION, TOOLING_VERSION, estimateTokens, costFor, mockTeacher,
} from './llm_common.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const flag = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const hasFlag = (name) => process.argv.includes(name);

const teacher = process.env.ARGMIN_TEACHER || 'mock';
const model = process.env.ARGMIN_TEACHER_MODEL || 'mock';
const modelVersion = process.env.ARGMIN_TEACHER_MODEL_VERSION || 'mock-1';
const snapshotDate = process.env.ARGMIN_TEACHER_SNAPSHOT_DATE || new Date().toISOString().slice(0, 10);
const apiKey = process.env.ARGMIN_TEACHER_API_KEY || '';
const corruptEvery = Number(process.env.ARGMIN_MOCK_TEACHER_CORRUPT_EVERY || '0');
const dryRun = hasFlag('--dry-run');

if (teacher !== 'mock' && !apiKey) {
  console.error(`Teacher ${teacher} braucht ARGMIN_TEACHER_API_KEY; ohne Key kein Lauf (graceful, kein API-Aufruf).`);
  process.exit(2);
}
if (teacher !== 'mock' && !dryRun) {
  console.error(`Teacher ${teacher} ist nicht implementiert; erlaubt: mock (plus --dry-run).`);
  process.exit(2);
}

const familyDocs = readdirSync(join(root, 'content/families'))
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));
for (const doc of familyDocs) registerStaticCases(doc.familyId, doc.cases);
const registry = configureExerciseFamilies(familyDocs);

const wantsGradable = (familyId, caseId, difficulty, seed) => {
  try {
    const instance = registry.instantiate(familyId, seed, difficulty, caseId);
    if (instance.graderId !== 'deterministic') return null;
    if (!['numeric', 'single-choice'].includes(instance.activityType)) return null;
    return instance;
  } catch {
    return null;
  }
};

const collectMockPairs = (count) => {
  const perFamily = Math.max(1, Math.ceil(count / 4));
  const pairs = [];
  for (const doc of familyDocs) {
    if (pairs.length >= count) break;
    let taken = 0;
    for (const item of doc.cases || []) {
      for (let seed = 0; seed < 64 && taken < perFamily; seed += 1) {
        const instance = wantsGradable(doc.familyId, item.caseId, item.difficultyProfile, seed);
        if (instance) {
          pairs.push({
            familyId: instance.familyId, caseId: instance.caseId,
            difficulty: instance.difficulty, seed,
          });
          taken += 1;
        }
      }
      if (taken >= perFamily) break;
    }
  }
  return pairs.slice(0, count);
};

const pairsFile = flag('--pairs');
const pairs = pairsFile
  ? readFileSync(pairsFile, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
  : collectMockPairs(Number(flag('--mock-pairs') || '20'));

const traces = pairs.map((pair, index) => {
  const instance = registry.instantiate(pair.familyId, pair.seed, pair.difficulty, pair.caseId);
  const trace = mockTeacher(instance, { corruptEvery, counter: index + 1 });
  const promptText = `${instance.prompt} ${JSON.stringify(instance.parameters)}`;
  const inTokens = estimateTokens(promptText);
  const outTokens = estimateTokens(`${trace.hintText} ${trace.reasoning} ${trace.finalAnswer}`);
  return {
    ...pair,
    prompt: instance.prompt,
    parameters: instance.parameters,
    choices: instance.choices || null,
    expectedAnswer: instance.expectedAnswer,
    teacher: { id: teacher, model, modelVersion, snapshotDate, promptVersion: TEACHER_PROMPT_VERSION },
    trace,
    usage: { inTokens, outTokens, estimated: true },
  };
});

const inTotal = traces.reduce((sum, item) => sum + item.usage.inTokens, 0);
const outTotal = traces.reduce((sum, item) => sum + item.usage.outTokens, 0);
const cost = costFor(model, inTotal, outTotal);
const costLog = {
  tooling: TOOLING_VERSION, teacher, model, modelVersion, snapshotDate,
  promptVersion: TEACHER_PROMPT_VERSION, dryRun, traces: traces.length,
  tokens: { in: inTotal, out: outTotal, estimated: true }, costEur: cost.eur, costNote: cost.note,
};
writeFileSync(flag('--out') || 'teacher-traces.jsonl', `${traces.map((item) => JSON.stringify(item)).join('\n')}\n`);
writeFileSync(flag('--cost') || 'teacher-cost.json', `${JSON.stringify(costLog, null, 2)}\n`);
console.log(`Spuren: ${traces.length}, Tokens in/out: ${inTotal}/${outTotal}, Kosten EUR: ${cost.eur ?? cost.note}, dryRun: ${dryRun}`);
