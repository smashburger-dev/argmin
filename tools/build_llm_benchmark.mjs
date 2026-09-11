// A1: deterministic LLM-benchmark builder (no LLM, no network).
// Freezes held oracle instances plus solver-verified mutants into
// tests/fixtures/llm-benchmark.<commit>-<contenthash>.json.
//
// Hold unit is (familyId, caseId, difficulty, moduloClass), never the raw
// seed: static cases enumerate every variant index, procedural cases take
// at most one distinct instance per seed-modulo class over the hold range
// 90000-90999 (disjoint from audit/golden seeds 0-199 and the documented
// training ranges). Only items whose correct answer grades true and whose
// mutant grades false are kept, so the mutant rejection rate is 1 by
// construction and re-checked in tests/llm_benchmark.test.mjs.
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';
import {
  HOLD_SEED_MAX,
  HOLD_SEED_MIN,
  TRAIN_SEED_MAX,
  TRAIN_SEED_MIN,
  jsFamilyIds,
} from './llm/sample_pairs.mjs';

export const BUILDER_VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;
export const HELD_MODULO_BASE = 10;
export const TRAIN_SEED_RANGES = [{ start: TRAIN_SEED_MIN, end: TRAIN_SEED_MAX }];

const HASHED_DIRS = ['content/families', 'assets/js/domain', 'assets/js/core'];
const HASHED_FILES = ['tools/build_llm_benchmark.mjs', 'schemas/llm-benchmark.schema.json'];
const HASHED_EXTENSIONS = new Set(['.json', '.mjs', '.js']);
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const hashedPaths = (root) => {
  const paths = [...HASHED_FILES];
  for (const dir of HASHED_DIRS) {
    for (const name of readdirSync(join(root, dir)).sort()) {
      if ([...HASHED_EXTENSIONS].some((ext) => name.endsWith(ext))) paths.push(`${dir}/${name}`);
    }
  }
  return paths.sort();
};

export function computeContentHash(root = projectRoot) {
  const hash = createHash('sha256');
  for (const path of hashedPaths(root)) {
    hash.update(`${path}\0`);
    hash.update(readFileSync(join(root, path)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function contentCommit(root = projectRoot) {
  try {
    return execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'nogit';
  }
}

export async function loadBenchmarkSnapshot(root = projectRoot) {
  const docs = readdirSync(join(root, 'content/families'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));
  for (const doc of docs) registerStaticCases(doc.familyId, doc.cases);
  return { docs, registry: configureExerciseFamilies(docs) };
}

// Correct final answer per instance (mirrors the family_contract builders;
// code-trace keeps every variable so only the mutant perturbs grading).
export function correctAnswer(instance) {
  switch (instance.activityType) {
    case 'numeric': return String(instance.expectedAnswer.value);
    case 'single-choice': return instance.choices.find((choice) => choice.correct)?.id;
    case 'vector': return `(${instance.expectedAnswer.solution.join(', ')})`;
    case 'parsons': return instance.expectedAnswer.solutionOrder;
    case 'code-trace': return Object.fromEntries(
      instance.parameters.variables.map((variable) => [variable.name, String(variable.value)]),
    );
    case 'predict-output': return instance.expectedAnswer.output;
    default: return undefined;
  }
}

const mutantAnswer = (instance) => {
  switch (instance.activityType) {
    case 'numeric': {
      const value = instance.expectedAnswer.value;
      return String(value === 0 ? 2 : value + 1);
    }
    case 'single-choice': return instance.choices.find((choice) => !choice.correct)?.id;
    case 'vector': {
      const [first, second] = instance.expectedAnswer.solution;
      return `(${first + 1}, ${second})`;
    }
    case 'parsons': return instance.expectedAnswer.solutionOrder.slice(0, -1);
    case 'code-trace': {
      const answers = correctAnswer(instance);
      const [first] = instance.parameters.variables;
      answers[first.name] = typeof first.value === 'number' ? String(first.value + 1) : `${first.value}x`;
      return answers;
    }
    case 'predict-output': return `${instance.expectedAnswer.output}\nx`;
    default: return undefined;
  }
};

const mutantText = (instance, mutant) => {
  if (instance.activityType === 'single-choice') {
    return instance.choices.find((choice) => choice.id === mutant)?.text || String(mutant);
  }
  return typeof mutant === 'string' ? mutant : JSON.stringify(mutant);
};

const supported = (instance) => instance.graderId === 'deterministic'
  && correctAnswer(instance) !== undefined
  && mutantAnswer(instance) !== undefined;

const dedupKey = (instance) => JSON.stringify([instance.prompt, instance.parameters, instance.expectedAnswer]);
const solverDigest = (family, instance) => createHash('sha256')
  .update(JSON.stringify(family.solve(instance.parameters)))
  .digest('hex');

// Positive control (correct grades true) plus negative control (mutant
// grades false). Returns null unless both hold, so only verified items
// enter the fixture.
async function verifyItem(registry, family, instance) {
  const answer = correctAnswer(instance);
  const mutant = mutantAnswer(instance);
  if (answer === undefined || mutant === undefined) return null;
  const good = await registry.grade(instance, answer);
  if (!good.correct) return null;
  const bad = await registry.grade(instance, mutant);
  if (bad.correct) return null;
  return { answer, mutant, bad };
}

function makeItem(family, instance, seed, moduloClass, variantCount, verified, snapshot) {
  const { mutant } = verified;
  return {
    familyId: instance.familyId,
    caseId: instance.caseId,
    difficulty: instance.difficulty,
    heldSeed: seed,
    moduloClass,
    variantCount,
    prompt: instance.prompt,
    parameters: instance.parameters,
    expectedAnswer: instance.expectedAnswer,
    choices: instance.choices ?? null,
    oracle: {
      solverDigest: solverDigest(family, instance),
      graderId: instance.graderId,
      activityType: instance.activityType,
    },
    mutants: [{
      text: mutantText(instance, mutant),
      answer: mutant,
      expectedRejectReason: verified.bad.errorType ?? 'rejected',
      solverVerdict: { correct: false, errorType: verified.bad.errorType ?? null },
    }],
    provenance: {
      contentCommit: snapshot.contentCommit,
      contentHash: snapshot.contentHash,
      builderVersion: BUILDER_VERSION,
      promptVersion: null,
    },
  };
}

const uncoveredReason = (instance) => (String(instance.graderId).startsWith('pyodide')
  ? `grader '${instance.graderId}' needs worker runtime (python-code gap, not benchmarked)`
  : `grader '${instance.graderId}' with type '${instance.activityType}' has no oracle/mutant builder`);

const uncoveredCategory = (instance) => {
  if (String(instance.graderId).startsWith('pyodide')) return 'worker-grader';
  if (instance.graderId === 'manual-rubric') return 'manual-rubric';
  return 'unsupported-type';
};

// Static cases: every variant index is its own modulo class. The held seed
// is the smallest hold-range seed in that class, so the class (not the
// seed) is the pinned unit.
async function buildStaticItems(snapshot, uncovered) {
  const items = [];
  const byId = new Map(snapshot.docs.map((doc) => [doc.familyId, doc]));
  for (const doc of snapshot.docs.filter((item) => item.contract)) {
    const family = snapshot.registry.get(doc.familyId);
    for (const body of doc.cases) {
      const variantCount = 1 + (body.variants ? body.variants.length : 0);
      const probe = snapshot.registry.instantiate(doc.familyId, HOLD_SEED_MIN, body.difficultyProfile, body.caseId);
      if (!supported(probe)) {
        uncovered.push({
          familyId: doc.familyId, caseId: body.caseId, difficulty: body.difficultyProfile,
          category: uncoveredCategory(probe), reason: uncoveredReason(probe),
        });
        continue;
      }
      for (let moduloClass = 0; moduloClass < variantCount; moduloClass += 1) {
        const seed = smallestSeedInClass(variantCount, moduloClass);
        const instance = snapshot.registry.instantiate(doc.familyId, seed, body.difficultyProfile, body.caseId);
        const verified = await verifyItem(snapshot.registry, family, instance);
        if (!verified) {
          uncovered.push({
            familyId: doc.familyId, caseId: body.caseId, difficulty: body.difficultyProfile,
            category: 'verification-failed', reason: `seed ${seed} failed solver verification`,
          });
          continue;
        }
        items.push(makeItem(family, instance, seed, moduloClass, variantCount, verified, snapshot));
      }
    }
  }
  return { items, byId };
}

const smallestSeedInClass = (variantCount, moduloClass) => {
  for (let seed = HOLD_SEED_MIN; seed <= HOLD_SEED_MAX; seed += 1) {
    if (seed % variantCount === moduloClass) return seed;
  }
  throw new Error(`Keine Held-Seed in Klasse ${moduloClass} (mod ${variantCount})`);
};

async function tryProceduralSeed(snapshot, family, familyId, caseId, difficulty, seed, seen) {
  let instance;
  try {
    instance = snapshot.registry.instantiate(familyId, seed, difficulty, caseId);
  } catch {
    return null;
  }
  if (!supported(instance) || seen.has(dedupKey(instance))) return null;
  const verified = await verifyItem(snapshot.registry, family, instance);
  return verified ? { instance, verified } : null;
}

// Procedural cases: at most one distinct instance per seed-modulo class,
// scanning the hold range in seed order (deterministic).
async function buildProceduralItems(snapshot, uncovered) {
  const items = [];
  for (const familyId of jsFamilyIds()) {
    const family = snapshot.registry.get(familyId);
    for (const caseType of family.caseTypes) {
      for (const difficulty of family.difficultyProfiles) {
        let probe = null;
        try {
          probe = snapshot.registry.instantiate(familyId, HOLD_SEED_MIN, difficulty, caseType.caseId);
        } catch {
          continue;
        }
        if (!supported(probe)) {
          uncovered.push({
            familyId, caseId: caseType.caseId, difficulty,
            category: uncoveredCategory(probe), reason: uncoveredReason(probe),
          });
          continue;
        }
        const seen = new Set();
        const taken = new Set();
        for (let seed = HOLD_SEED_MIN; seed <= HOLD_SEED_MAX && taken.size < HELD_MODULO_BASE; seed += 1) {
          const moduloClass = seed % HELD_MODULO_BASE;
          if (taken.has(moduloClass)) continue;
          const built = await tryProceduralSeed(snapshot, family, familyId, caseType.caseId, difficulty, seed, seen);
          if (!built) continue;
          seen.add(dedupKey(built.instance));
          taken.add(moduloClass);
          items.push(makeItem(family, built.instance, seed, moduloClass, HELD_MODULO_BASE, built.verified, snapshot));
        }
        if (!taken.size) {
          uncovered.push({
            familyId, caseId: caseType.caseId, difficulty,
            category: 'verification-failed', reason: 'no held seed passed solver verification',
          });
        }
      }
    }
  }
  return items;
}

const uncoveredStaticGaps = (snapshot, staticIds, root) => {
  const uncovered = [];
  for (const doc of snapshot.docs.filter((item) => !item.contract)) {
    uncovered.push({
      familyId: doc.familyId, caseId: null, difficulty: null,
      category: 'no-contract', reason: 'static doc without contract is not a registered family',
    });
  }
  const canonical = JSON.parse(readFileSync(join(root, 'tests/fixtures/canonical-families.json'), 'utf8'));
  for (const { familyId } of canonical.families) {
    if (!snapshot.registry.get(familyId) && !staticIds.has(familyId)) {
      uncovered.push({
        familyId, caseId: null, difficulty: null,
        category: 'unregistered', reason: 'canonical family is not registered, no oracle available',
      });
    }
  }
  return uncovered;
};

export function fixtureDigest(fixture) {
  return createHash('sha256').update(JSON.stringify(fixture)).digest('hex');
}

export async function buildFixture(root = projectRoot) {
  const snapshot = {
    ...await loadBenchmarkSnapshot(root),
    contentCommit: contentCommit(root),
    contentHash: computeContentHash(root),
  };
  const uncovered = [];
  const { items: staticItems, byId } = await buildStaticItems(snapshot, uncovered);
  const proceduralItems = await buildProceduralItems(snapshot, uncovered);
  const items = [...staticItems, ...proceduralItems];
  uncovered.push(...uncoveredStaticGaps(snapshot, new Set(byId.keys()), root));
  const heldSeeds = [...new Set(items.map((item) => item.heldSeed))].sort((a, b) => a - b);
  return {
    schemaVersion: SCHEMA_VERSION,
    builderVersion: BUILDER_VERSION,
    promptVersion: null,
    contentCommit: snapshot.contentCommit,
    contentHash: snapshot.contentHash,
    heldSeedRange: { start: HOLD_SEED_MIN, end: HOLD_SEED_MAX },
    heldModuloBase: HELD_MODULO_BASE,
    trainSeedRanges: TRAIN_SEED_RANGES,
    heldSeeds,
    mutantRejectionRate: 1,
    uncovered: uncovered.sort((a, b) => String(a.familyId).localeCompare(String(b.familyId))),
    items,
  };
}

export function fixtureFileName(fixture) {
  return `llm-benchmark.${fixture.contentHash.slice(0, 16)}.json`;
}

export const PIN_FILE = 'llm-benchmark-pin.json';

/** Kleiner Pin statt 200k-Zeilen-Snapshot im Repo: der Test baut die Fixture
 *  deterministisch frisch und prueft Digest + Metadaten gegen diese Datei. */
export function fixturePin(fixture) {
  return {
    schemaVersion: fixture.schemaVersion,
    builderVersion: fixture.builderVersion,
    contentHash: fixture.contentHash,
    digest: fixtureDigest(fixture),
    items: fixture.items.length,
    mutants: fixture.items.reduce((sum, item) => sum + item.mutants.length, 0),
    uncovered: fixture.uncovered.length,
    mutantRejectionRate: fixture.mutantRejectionRate,
    heldSeedRange: fixture.heldSeedRange,
    trainSeedRanges: fixture.trainSeedRanges,
  };
}

async function main() {
  const fixture = await buildFixture();
  if (!fixture.items.length) throw new Error('Builder produced zero items');
  const name = fixtureFileName(fixture);
  const dir = join(projectRoot, 'tests/fixtures');
  for (const stale of readdirSync(dir).filter((file) => file.startsWith('llm-benchmark.') && file !== name)) {
    unlinkSync(join(dir, stale));
  }
  writeFileSync(join(dir, name), `${JSON.stringify(fixture, null, 2)}\n`);
  writeFileSync(join(dir, PIN_FILE), `${JSON.stringify(fixturePin(fixture), null, 2)}\n`);
  console.log(JSON.stringify({ fixture: name, pin: PIN_FILE, ...fixturePin(fixture) }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
