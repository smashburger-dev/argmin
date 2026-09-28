import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureExerciseFamilies, JS_FAMILY_SPECS } from '../assets/js/domain/exercise_registry.mjs';
import { createFamilyRegistry, registerStaticCases } from '../assets/js/domain/family_registry.mjs';
import { freshRouteForDefinition } from '../assets/js/domain/activity_route.mjs';
import { compileContent } from '../tools/compile_content.mjs';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const familyDir = join(root, 'content/families');
const docs = readdirSync(familyDir)
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(familyDir, name), 'utf8')));
for (const doc of docs) registerStaticCases(doc.familyId, doc.cases);
const bundle = compileContent({ projectRoot: root, profile: 'public' });
const registry = configureExerciseFamilies(docs);

// The family route draws '-' seeds as uint32; cover small seeds plus its edges.
const SEEDS = [...Array.from({ length: 48 }, (_, seed) => seed), 2 ** 31 - 1, 2 ** 31, 2 ** 32 - 1, 123456789];

// Mirrors parseFamilyRef in src/ui/FamilyExerciseView.tsx for '-' segments.
const parseFamilyRoute = (route) => {
  const [familyId, casePart, seedPart, difficulty] = route.replace(/^#\/family\//, '').split('/');
  return { familyId, caseId: casePart === '-' ? undefined : casePart, seedPart, difficulty };
};

test('Review einer geseedeten Platzierung öffnet denselben Fall für jeden Seed', () => {
  const seeded = bundle.familyActivities.filter((activity) => activity.seeded);
  assert.ok(seeded.length > 0, 'keine geseedeten Platzierungen im Bundle');
  for (const activity of seeded) {
    const route = parseFamilyRoute(freshRouteForDefinition(activity));
    assert.equal(route.seedPart, '-', activity.definitionId);
    assert.equal(route.caseId, activity.caseId, `${activity.definitionId}: Route verliert den Fall`);
    for (const seed of SEEDS) {
      const instance = registry.instantiate(route.familyId, seed, route.difficulty, route.caseId);
      // Reviews are keyed by familyId:caseId — any other case never clears the entry.
      assert.equal(`${instance.familyId}:${instance.caseId}`, activity.definitionId);
    }
  }
});

test('Übungsraum ohne caseId instanziiert für jeden Seed', () => {
  const practice = bundle.learningModules.flatMap((module) => module.placements || [])
    .filter((placement) => placement.role === 'practice-space' && placement.familyId);
  assert.ok(practice.length > 0, 'keine Übungsraum-Platzierungen im Bundle');
  for (const placement of practice) {
    for (const seed of SEEDS) {
      assert.doesNotThrow(
        () => registry.instantiate(placement.familyId, seed, placement.difficulty),
        `${placement.familyId}@${placement.difficulty} seed ${seed}`,
      );
    }
  }
});

test('Zug ohne caseId wählt nur Fälle, die das Profil bedienen', () => {
  const familyIds = [...new Set([...JS_FAMILY_SPECS.map((spec) => spec.familyId), ...docs.map((doc) => doc.familyId)])];
  for (const familyId of familyIds) {
    const family = registry.get(familyId);
    if (!family) continue;
    for (const difficulty of family.difficultyProfiles) {
      const serving = family.caseTypes.filter((caseType) => caseType.propertyTest !== false).filter((caseType) => {
        try {
          registry.instantiate(familyId, 0, difficulty, caseType.caseId);
          return true;
        } catch {
          return false;
        }
      });
      if (!serving.length) {
        assert.throws(() => registry.instantiate(familyId, 0, difficulty), /kein property-testfähiger Fall/);
        continue;
      }
      const servingIds = new Set(serving.map((caseType) => caseType.caseId));
      for (const seed of SEEDS.slice(0, 16)) {
        const instance = registry.instantiate(familyId, seed, difficulty);
        assert.ok(servingIds.has(instance.caseId), `${familyId}@${difficulty} seed ${seed}: ${instance.caseId}`);
      }
    }
  }
});

test('Zug ohne caseId verschluckt keine echten Generatorfehler', () => {
  const makeFamily = (generate) => ({
    familyId: 'probe-family',
    difficultyProfiles: ['intro', 'core'],
    caseTypes: [{ caseId: 'pinned-core' }, { caseId: 'any-profile' }],
    competencyIds: [],
    generate,
    solve: () => ({}),
  });
  const pinned = createFamilyRegistry([makeFamily(({ caseId, difficulty }) => {
    if (caseId === 'pinned-core' && difficulty !== 'core') throw new Error(`Unbekanntes Profil ${difficulty} für Fall ${caseId}`);
    return { parameters: { caseId, difficulty }, prompt: caseId };
  })]);
  for (let seed = 0; seed < 8; seed += 1) {
    assert.equal(pinned.instantiate('probe-family', seed, 'intro').caseId, 'any-profile');
  }
  const broken = createFamilyRegistry([makeFamily(({ caseId, difficulty }) => {
    if (caseId === 'pinned-core') throw new Error('Division durch null');
    return { parameters: { caseId, difficulty }, prompt: caseId };
  })]);
  assert.throws(() => broken.instantiate('probe-family', 1, 'intro'), /Division durch null/);
});

test('Übungsraum-Pool begrenzt den Zufallszug auf die kuratierten Fälle des Moduls', () => {
  // lm-foundations-python-state: practice-space trace-assignment-state mit
  // genau diesen drei kuratierten Fällen im selben Modul.
  const pool = ['reassign-two-variables-print', 'accumulate-reassign-print', 'chain3-overwrite-print'];
  const poolSet = new Set(pool);
  for (const seed of SEEDS) {
    const instance = registry.instantiate('trace-assignment-state', seed, 'core', undefined, pool);
    assert.ok(poolSet.has(instance.caseId), `seed ${seed}: ${instance.caseId}`);
  }
  // Deterministisch: gleicher Seed und gleicher Pool geben denselben Fall.
  assert.equal(
    registry.instantiate('trace-assignment-state', SEEDS[0], 'core', undefined, pool).caseId,
    registry.instantiate('trace-assignment-state', SEEDS[0], 'core', undefined, pool).caseId,
  );
  // Expliziter caseId umgeht den Pool wie bisher.
  assert.equal(
    registry.instantiate('trace-assignment-state', 3, 'intro', 'manual-backward-step-trace', pool).caseId,
    'manual-backward-step-trace',
  );
  // Leerer oder fremder Pool fällt auf den Ganzfamilien-Zug zurück.
  const unscoped = registry.instantiate('trace-assignment-state', 5, 'core', undefined, ['kein-bekannter-fall']);
  assert.ok(typeof unscoped.caseId === 'string' && unscoped.caseId.length > 0);
});

test('Übungsraum-Pool schlägt das Profil, wenn die Schnittmenge leer ist', () => {
  const family = {
    familyId: 'probe-pool-family',
    difficultyProfiles: ['intro', 'core'],
    caseTypes: [{ caseId: 'seed-zero-shy' }, { caseId: 'any-profile' }],
    competencyIds: [],
    // Lehnt 'intro' nur an Seed 0 ab: die servesProfile-Sonde meldet den Fall
    // als nicht bedienbar, höhere Seeds erzeugen ihn aber problemlos.
    generate: ({ seed, caseId, difficulty }) => {
      if (caseId === 'seed-zero-shy' && difficulty === 'intro' && seed === 0) {
        throw new Error(`Unbekanntes Profil ${difficulty} für Fall ${caseId}`);
      }
      return { parameters: { caseId, difficulty }, prompt: caseId };
    },
    solve: () => ({}),
  };
  const scoped = createFamilyRegistry([family]);
  // Pool x Profil ist leer: der Zug fällt auf den Pool zurück statt zu
  // werfen oder die ganze Familie zu ziehen.
  for (let seed = 1; seed < 16; seed += 1) {
    assert.equal(scoped.instantiate('probe-pool-family', seed, 'intro', undefined, ['seed-zero-shy']).caseId, 'seed-zero-shy');
  }
});
