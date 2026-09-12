// B1: sampelt Trainings-Paare nur aus High-Entropy-Generatoren (JS-Specs).
// Kein Teacher-Aufruf, kein Netz. Output nach private/llm/ (gitignoriert).
// Statische Content-Familien sind ausgeschlossen (Modulo-Leak: dort ist
// echte Trainings/Halte-Disjointness unmoeglich, Spec B1): Combos mit
// kleinem Antwortraum scheitern an der Entropy-Probe und landen in
// excludedLowEntropy, daher braucht sampleCombo keinen STATIC_CAP-Branch.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXERCISE_FAMILIES } from '../../assets/js/domain/exercise_registry.mjs';
import { GIT_OPERATION_CONTRACT } from '../../assets/js/core/foundations_fresh_generators.mjs';
import { FOUNDATIONS_CHOICE_FAMILY_SPECS } from '../../assets/js/core/foundations_choice_families.mjs';
import { FOUNDATIONS_CONSTRUCT_SPECS } from '../../assets/js/domain/foundations_construct_registry.mjs';
import { TRACE_FAMILY_SPECS } from '../../assets/js/domain/foundations_trace_registry.mjs';
import { LINALG_FAMILY_SPECS } from '../../assets/js/domain/foundations_linalg_registry.mjs';
import { DATA_ML_FAMILY_SPECS } from '../../assets/js/core/data_ml_families.mjs';
import { FAMILY_SPEC as WORKED_FADING_DISTRIBUTIVE } from '../../assets/js/core/procedural/worked-example-fading-distributive.mjs';
import { FAMILY_SPEC as WORKED_FADING_LINEAR_EQUATIONS } from '../../assets/js/core/procedural/worked-example-fading-linear-equations.mjs';

export const HOLD_SEED_MIN = 90000;
export const HOLD_SEED_MAX = 90999;
export const TRAIN_SEED_MIN = 200;
export const TRAIN_SEED_MAX = 89999;
// Spec-B1-Pin (Wert im Prompt-Gate festgehalten); kein Sampling-Branch
// referenziert ihn, da eligible Combos stets probeDistinct >=
// ENTROPY_MIN_DISTINCT >> STATIC_CAP haben und der Cap-Branch damit fuer
// alle erreichbaren Eingaben unerreichbar waere.
export const STATIC_CAP = 10;
export const PROBE_N = 200;
export const ENTROPY_MIN_DISTINCT = 100;
export const PROMPT_FILES = ['teacher-trace.md', 'eval-rubric.md'];

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function promptVersion(name) {
  const raw = readFileSync(join(root, 'tools/llm/prompts', name), 'utf8');
  const match = raw.match(/^---\nversion:\s*(\d+)\n/);
  if (!match) throw new Error(`${name}: Frontmatter version fehlt`);
  return Number(match[1]);
}

export function jsFamilyIds() {
  return [
    GIT_OPERATION_CONTRACT.familyId,
    ...FOUNDATIONS_CHOICE_FAMILY_SPECS.map((spec) => spec.contract.familyId),
    ...FOUNDATIONS_CONSTRUCT_SPECS.map((spec) => spec.familyId),
    ...TRACE_FAMILY_SPECS.map((spec) => spec.familyId),
    ...LINALG_FAMILY_SPECS.map((spec) => spec.familyId),
    ...DATA_ML_FAMILY_SPECS.map((spec) => spec.familyId),
    WORKED_FADING_DISTRIBUTIVE.familyId,
    WORKED_FADING_LINEAR_EQUATIONS.familyId,
  ];
}

const dedupKey = (instance) => JSON.stringify([instance.prompt, instance.parameters, instance.expectedAnswer]);

const isTrainSeed = (seed) => seed >= TRAIN_SEED_MIN && seed <= TRAIN_SEED_MAX;

function eligibleCombos() {
  const combos = [];
  const excluded = [];
  for (const familyId of jsFamilyIds()) {
    const family = EXERCISE_FAMILIES.get(familyId);
    if (!family) throw new Error(`Unbekannte Familie ${familyId}`);
    for (const caseType of family.caseTypes) {
      for (const difficulty of family.difficultyProfiles) {
        const seen = new Set();
        let usable = true;
        for (let i = 0; i < PROBE_N; i += 1) {
          try {
            seen.add(dedupKey(EXERCISE_FAMILIES.instantiate(familyId, TRAIN_SEED_MIN + i, difficulty, caseType.caseId)));
          } catch { usable = false; break; }
        }
        if (!usable) continue;
        if (seen.size < ENTROPY_MIN_DISTINCT) excluded.push({ familyId, caseId: caseType.caseId, difficulty, distinct: seen.size });
        else combos.push({ familyId, caseId: caseType.caseId, difficulty, probeDistinct: seen.size });
      }
    }
  }
  return { combos, excluded };
}

function sampleCombo(combo, quota, seenKeys, startSeed) {
  const items = [];
  let attempts = 0;
  let seed = startSeed;
  while (items.length < quota && seed <= TRAIN_SEED_MAX) {
    attempts += 1;
    seed += 1;
    let instance;
    try {
      instance = EXERCISE_FAMILIES.instantiate(combo.familyId, seed, combo.difficulty, combo.caseId);
    } catch { continue; }
    const key = dedupKey(instance);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    items.push({ ...combo, seed, prompt: instance.prompt, parameters: instance.parameters, expectedAnswer: instance.expectedAnswer, choices: instance.choices ?? null });
  }
  return { items, attempts, duplicates: attempts - items.length };
}

export function samplePairs({ maxPairs = 12000 } = {}) {
  const { combos, excluded } = eligibleCombos();
  if (!combos.length) throw new Error('Keine High-Entropy-Kombination gefunden');
  const base = Math.floor(maxPairs / combos.length);
  const rest = maxPairs % combos.length;
  const seenKeys = new Set();
  const items = [];
  let attempts = 0;
  const perFamily = {};
  combos.forEach((combo, index) => {
    const quota = base + (index < rest ? 1 : 0);
    const { items: got, attempts: tried, duplicates } = sampleCombo(combo, quota, seenKeys, TRAIN_SEED_MIN + PROBE_N);
    attempts += tried;
    for (const item of got) {
      if (!isTrainSeed(item.seed)) throw new Error(`Trainings-Seed ${item.seed} ausserhalb der Range`);
      if (item.seed >= HOLD_SEED_MIN && item.seed <= HOLD_SEED_MAX) throw new Error('Haltebereich verletzt');
      perFamily[item.familyId] = (perFamily[item.familyId] ?? 0) + 1;
    }
    items.push(...got);
    combo.duplicates = duplicates;
  });
  const duplicates = attempts - items.length;
  return {
    items,
    summary: {
      pairs: items.length,
      attempts,
      duplicates,
      duplicateRate: attempts ? duplicates / attempts : 0,
      familyMix: perFamily,
      combos: combos.length,
      excludedLowEntropy: excluded,
      trainSeedRanges: [[TRAIN_SEED_MIN, TRAIN_SEED_MAX]],
      holdSeedRange: [HOLD_SEED_MIN, HOLD_SEED_MAX],
      promptVersions: Object.fromEntries(PROMPT_FILES.map((name) => [name, promptVersion(name)])),
    },
  };
}

function parseArgs(argv) {
  const out = { maxPairs: 12000, outDir: join(root, 'private/llm') };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--max-pairs') out.maxPairs = Number(argv[i + 1]);
    if (argv[i] === '--out-dir') out.outDir = argv[i + 1];
  }
  return out;
}

function main() {
  const { maxPairs, outDir } = parseArgs(process.argv.slice(2));
  const { items, summary } = samplePairs({ maxPairs });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'pairs.jsonl'), `${items.map((item) => JSON.stringify(item)).join('\n')}\n`);
  writeFileSync(join(outDir, 'pairs-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Paare: ${summary.pairs} (Versuche ${summary.attempts}, Duplikatquote ${summary.duplicateRate.toFixed(3)})`);
  console.log(`Kombinationen: ${summary.combos}, ausgeschlossen (low-entropy): ${summary.excludedLowEntropy.length}`);
  for (const [familyId, count] of Object.entries(summary.familyMix).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}\t${familyId}`);
  }
  console.log(`Train-Ranges: ${JSON.stringify(summary.trainSeedRanges)}, Haltebereich: ${JSON.stringify(summary.holdSeedRange)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
