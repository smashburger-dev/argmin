import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { graders } from '../assets/js/core/graders.js';
import {
  FOUNDATIONS_CHOICE_CONTRACTS,
  FOUNDATIONS_CHOICE_FAMILY_SPECS,
  STRING_IMMUTABILITY_CASES,
  SET_OPERATION_CASES,
  ERROR_HYPOTHESIS_CASES,
  TEST_ATTITUDE_CASES,
  CONTROL_CONSTRUCT_CASES,
  PYTHON_COLLECTION_CASES,
  EXCEPTION_PLACEMENT_CASES,
} from '../assets/js/core/foundations_choice_families.mjs';
import {
  createFamilyRegistry,
  familyIdTokens,
  instantiate,
  grade,
  FOUNDATIONS_CHOICE_FAMILIES,
} from '../assets/js/domain/foundations_choice_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Spiegel von research/streamlining/s4a-v2/canonical-families.json
// (integration-pre-s2b; Datei existiert im S4D1-Baum nicht, daher eingebettet).
// memberSourceIds je Familie, familyGroup überall classify-concept.
const CANONICAL = {
  'classify-string-immutability': { summary: 'Ordnet eine String-Operation ihren Folgen aus der Unveränderlichkeit von Strings zu.', members: ['w02-e3'] },
  'classify-set-operation-semantics': { summary: 'Ordnet eine Mengenbeobachtung der richtigen Set-Operation und Eindeutigkeits-Semantik zu.', members: ['w03-e2'] },
  'classify-error-hypothesis': { summary: 'Ordnet ein beobachtetes Fehlerbild der plausibelsten Fehlerhypothese zu.', members: ['f-algebra-debug-01', 'f-meta-error-classify-01', 'f-meta-error-log-01'] },
  'classify-test-attitude': { summary: 'Ordnet eine Testpraxis der passenden Testhaltung zu.', members: ['f-testing-choice-01'] },
  'classify-control-construct': { summary: 'Ordnet ein Code-Fragment dem passenden Kontrollkonstrukt zu.', members: ['f-control-choice-01'] },
  'classify-python-collection-choice': { summary: 'Ordnet eine Aufgabe der passenden Python-Collection zu.', members: ['f-collections-choice-01'] },
  'classify-exception-placement': { summary: 'Ordnet eine Ausnahmebehandlung dem passenden Platzierungsort zu.', members: ['f-files-choice-01'] },
};

const BANKS = {
  'classify-string-immutability': STRING_IMMUTABILITY_CASES,
  'classify-set-operation-semantics': SET_OPERATION_CASES,
  'classify-error-hypothesis': ERROR_HYPOTHESIS_CASES,
  'classify-test-attitude': TEST_ATTITUDE_CASES,
  'classify-control-construct': CONTROL_CONSTRUCT_CASES,
  'classify-python-collection-choice': PYTHON_COLLECTION_CASES,
  'classify-exception-placement': EXCEPTION_PLACEMENT_CASES,
};

const SOLVER_TABLE = {
  'string-item-assignment-typeerror': 'Das Programm bricht mit einem TypeError ab: Strings unterstützen keine Zuweisung an einzelne Zeichen.',
  'dedup-and-intersection': 'len(a) ist 2 und a & b ist {"lern"} — Mengen speichern jedes Element nur einmal, & bildet den Durchschnitt.',
  'base-vs-exponent-confusion': 'Bei gleicher Basis werden die Exponenten addiert, aber die Basis bleibt 2.',
  'seeded-error-pattern-cases': 'Die Schleifengrenze an der Grenze zwischen vier und fünf Durchläufen prüfen (Typ: Off-by-one) und die Grenze gezielt testen.',
  'error-journal-next-test': 'Beobachtung und kleinste Reproduktion notieren, die Vorzeichenregel als Ursachenhypothese benennen und dieselbe Regel an einer frischen Instanz gezielt testen',
  'csv-off-by-one-reproduce-smallest': 'Den kleinsten Fall reproduzieren und prüfen, ob Header und nullbasierter Index in der Umrechnung fehlen.',
  'for-over-existing-collection': '`for value in values:`',
  'membership-set-for-dedup': 'Ein Set `seen`, das jede erstmals gelesene ID aufnimmt.',
  'translate-error-to-issue': 'Dort, wo eine Zeile in einen konkreten Issue-Eintrag übersetzt werden kann.',
};

const CONTRACT_KEYS = [
  'familyId', 'familyGroup', 'summary', 'taskArchetype', 'authorityMode',
  'masteryEligible', 'caseTypes', 'difficultyProfiles', 'competencyIds',
  'graderId', 'activityType',
];

function loadSourceDefinition(sourceId) {
  if (sourceId === 'w02-e3' || sourceId === 'w03-e2') {
    const week = sourceId.slice(0, 3);
    const doc = JSON.parse(readFileSync(join(root, 'content', 'exercises', `${week}.json`), 'utf8'));
    return doc.exercises.find((entry) => entry.exerciseId === sourceId);
  }
  if (sourceId === 'f-meta-error-log-01') {
    const item = ERROR_HYPOTHESIS_CASES.find((entry) => entry.sourceId === sourceId);
    return {
      prompt: item.prompt,
      fullSolution: item.solution,
      choices: [
        { id: 'correct', text: item.correct, correct: true },
        ...item.distractors.map((text, index) => ({ id: `wrong-${index}`, text, correct: false })),
      ],
    };
  }
  if (sourceId === 'f-algebra-debug-01' || sourceId === 'f-meta-error-classify-01') {
    const item = ERROR_HYPOTHESIS_CASES.find((entry) => entry.sourceId === sourceId);
    return {
      prompt: item.prompt,
      fullSolution: item.solution,
      choices: [
        { id: 'correct', text: item.correct, correct: true },
        ...item.distractors.map((text, index) => ({ id: `wrong-${index}`, text, correct: false })),
      ],
    };
  }
  const stem = { 'f-control-choice-01': 'control-choice', 'f-collections-choice-01': 'collections-choice', 'f-files-choice-01': 'files-choice', 'f-testing-choice-01': 'testing-choice', 'f-algebra-debug-01': 'algebra-debug', 'f-meta-error-classify-01': 'meta-error-classify' }[sourceId];
  return JSON.parse(readFileSync(join(root, 'content', 'exercise-definitions', 'foundations', `${stem}.json`), 'utf8'));
}

function counterexample(instance) {
  const wrong = instance.choices.find((choice) => choice.correct !== true);
  assert.ok(wrong, `${instance.caseId}: Gegenbeispiel fehlt`);
  return wrong.id;
}

test('choice contracts keep the S4C shape with static authority and mastery', () => {
  assert.equal(FOUNDATIONS_CHOICE_CONTRACTS.length, 7);
  for (const contract of FOUNDATIONS_CHOICE_CONTRACTS) {
    assert.deepEqual(Object.keys(contract).sort(), [...CONTRACT_KEYS].sort(), `${contract.familyId}: Schlüsselsatz`);
    assert.equal(contract.familyGroup, 'classify-concept');
    assert.equal(contract.taskArchetype, 'choice-diagnose');
    assert.equal(contract.authorityMode, 'static');
    assert.equal(contract.masteryEligible, true);
    assert.equal(contract.graderId, 'deterministic');
    assert.equal(contract.activityType, 'single-choice');
    assert.deepEqual(contract.difficultyProfiles, ['intro', 'core', 'stretch', 'challenge']);
    assert.ok(contract.caseTypes.length >= 1, `${contract.familyId}: mindestens ein Shard-Fall`);
    for (const caseType of contract.caseTypes) {
      assert.deepEqual(Object.keys(caseType), ['caseId'], `${contract.familyId}: Falltyp ohne Zusatzschlüssel`);
    }
  }
});

test('contracts match the canonical taxonomy, not a silent token permutation', () => {
  assert.deepEqual(Object.keys(CANONICAL).sort(), FOUNDATIONS_CHOICE_CONTRACTS.map((c) => c.familyId).sort());
  for (const contract of FOUNDATIONS_CHOICE_CONTRACTS) {
    const canonical = CANONICAL[contract.familyId];
    assert.equal(contract.summary, canonical.summary, `${contract.familyId}: Summary`);
    const bankSources = BANKS[contract.familyId].map((item) => item.sourceId).sort();
    assert.deepEqual(bankSources, [...canonical.members].sort(), `${contract.familyId}: Mitglieder`);
    assert.deepEqual(
      BANKS[contract.familyId].map((item) => item.caseId).sort(),
      contract.caseTypes.map((item) => item.caseId).sort(),
      `${contract.familyId}: Falltypen`,
    );
  }
  // Token-Permutationen fallen in denselben Eimer (S4C-Präzedenz git-operation-classify).
  assert.equal(familyIdTokens('string-classify-immutability'), familyIdTokens('classify-string-immutability'));
  const signatures = new Set(FOUNDATIONS_CHOICE_CONTRACTS.map((c) => familyIdTokens(c.familyId)));
  assert.equal(signatures.size, 7, 'eigene Token-Multimengen paarweise verschieden');
  assert.ok(!signatures.has(familyIdTokens('classify-git-operation')), 'keine Kollision mit classify-git-operation');
});


test('static families declare no vacuous template steps', () => {
  for (const contract of FOUNDATIONS_CHOICE_CONTRACTS) {
    assert.equal(contract.vacuousSteps, undefined, `${contract.familyId}: keine leerlaufenden Schritte`);
    for (const caseType of contract.caseTypes) {
      for (const difficulty of contract.difficultyProfiles) {
        const instance = instantiate(contract.familyId, 5, difficulty, caseType.caseId);
        assert.deepEqual(Object.keys(instance.parameters).sort(), ['caseId', 'difficulty']);
      }
    }
  }
});

test('registry rejects token-multiset aliases, duplicates and empty families', () => {
  const specs = FOUNDATIONS_CHOICE_FAMILY_SPECS.map(({ contract, generate, solve }) => ({ ...contract, generate, solve }));
  const [first] = specs;
  assert.throws(
    () => createFamilyRegistry([...specs, { ...first, familyId: 'string-classify-immutability' }]),
    /Token-Multiset/,
  );
  assert.throws(() => createFamilyRegistry([...specs, first]), /doppelt/);
  assert.throws(
    () => createFamilyRegistry([{ ...first, familyId: 'classify-empty-stub', caseTypes: [] }]),
    /mindestens ein Falltyp/,
  );
});

test('solver-generator mismatch fails closed', () => {
  const [first] = FOUNDATIONS_CHOICE_FAMILY_SPECS.map(({ contract, generate, solve }) => ({ ...contract, generate, solve }));
  const broken = createFamilyRegistry([{
    ...first,
    solve: () => ({ correctText: 'niemals die richtige Antwort' }),
  }]);
  assert.throws(
    () => broken.instantiate(first.familyId, 3, 'core', first.caseTypes[0].caseId),
    /weichen ab/,
  );
});

test('unknown family, case, profile or seed fail closed', () => {
  assert.throws(() => instantiate('classify-git-operation', 1, 'core', 'diff-unstaged'), /Unbekannte Familie/);
  assert.throws(() => instantiate('reflect-error-journal-rationale', 1, 'core', 'w01-e11'), /Unbekannte Familie/);
  assert.throws(
    () => instantiate('classify-string-immutability', 1, 'core', 'dedup-and-intersection'),
    /Unbekannter Fall/,
  );
  assert.throws(() => instantiate('classify-control-construct', 1, 'expert', 'for-over-existing-collection'), /Unbekanntes Profil/);
  assert.throws(() => instantiate('classify-test-attitude', 1.5, 'core', 'csv-off-by-one-reproduce-smallest'), /Seed/);
  assert.equal(FOUNDATIONS_CHOICE_FAMILIES.get('classify-git-operation'), null);
  assert.equal(FOUNDATIONS_CHOICE_FAMILIES.get('reflect-error-journal-rationale'), null);
});

test('case type, seed and profile instantiate distinct variants', () => {
  const base = instantiate('classify-error-hypothesis', 7, 'intro', 'base-vs-exponent-confusion');
  const otherCase = instantiate('classify-error-hypothesis', 7, 'intro', 'seeded-error-pattern-cases');
  const otherSeed = instantiate('classify-error-hypothesis', 8, 'intro', 'base-vs-exponent-confusion');
  const core = instantiate('classify-error-hypothesis', 7, 'core', 'base-vs-exponent-confusion');
  assert.notEqual(base.prompt, otherCase.prompt);
  assert.notDeepEqual(base.choices, otherSeed.choices);
  assert.equal(base.choices.length, 2);
  assert.equal(core.choices.length, 4);
  assert.equal(base.definitionId, undefined);
  assert.equal(base.masteryEligible, true);
  assert.equal(base.deterministicSeed, 7);
  assert.equal(base.instanceId, 'classify-error-hypothesis:base-vs-exponent-confusion:intro:7');
  assert.deepEqual(base, instantiate('classify-error-hypothesis', 7, 'intro', 'base-vs-exponent-confusion'));
  // Seed ohne Falltyp löst deterministisch auf (Singletons: immer ihr Shard-Fall).
  const singleton = instantiate('classify-control-construct', 9, 'core');
  assert.equal(singleton.caseId, 'for-over-existing-collection');
});

test('mergeInto names the home family and does not rewrite the instance identity', () => {
  const stub = {
    familyId: 'classify-orphan-merge-source',
    familyGroup: 'classify-concept',
    summary: 'Merge-Quelle, Vollzug bleibt S4D.',
    taskArchetype: 'choice-diagnose',
    authorityMode: 'static',
    masteryEligible: true,
    mergeInto: 'classify-error-hypothesis',
    caseTypes: [{ caseId: 'pending-a' }],
    difficultyProfiles: ['intro', 'core'],
    competencyIds: ['c-algebra'],
    graderId: 'deterministic',
    activityType: 'single-choice',
    generate: ({ caseId, difficulty }) => ({
      parameters: { caseId, difficulty },
      expected: { correctChoice: 'a' },
      choices: [
        { id: 'a', text: 'behalten', correct: true },
        { id: 'b', text: 'umziehen', correct: false },
      ],
      prompt: caseId,
      fullSolution: 'behalten',
    }),
    solve: () => ({ correctText: 'behalten' }),
  };
  const registry = createFamilyRegistry([stub]);
  assert.equal(registry.get('classify-orphan-merge-source').mergeInto, 'classify-error-hypothesis');
  const instance = registry.instantiate('classify-orphan-merge-source', 1, 'core', 'pending-a');
  assert.equal(instance.familyId, 'classify-orphan-merge-source');
  assert.equal(instance.caseId, 'pending-a');
});

test('independent solver matches the expected choice; a distractor is the counterexample', async () => {
  const solves = Object.fromEntries(
    FOUNDATIONS_CHOICE_FAMILY_SPECS.map(({ contract, solve }) => [contract.familyId, solve]),
  );
  for (const contract of FOUNDATIONS_CHOICE_CONTRACTS) {
    for (const caseType of contract.caseTypes) {
      for (const difficulty of contract.difficultyProfiles) {
        const instance = instantiate(contract.familyId, 21, difficulty, caseType.caseId);
        const solved = solves[contract.familyId](instance.parameters);
        assert.equal(solved.correctText, SOLVER_TABLE[caseType.caseId], `${caseType.caseId} ${difficulty}: Solver-Tabelle`);
        const correct = instance.choices.find((choice) => choice.id === instance.expectedAnswer.correctChoice);
        assert.equal(correct.text, solved.correctText);
        const right = await grade(instance, instance.expectedAnswer.correctChoice);
        const wrong = await grade(instance, counterexample(instance));
        assert.equal(right.correct, true, `${caseType.caseId} ${difficulty}: Sollantwort`);
        assert.equal(wrong.correct, false, `${caseType.caseId} ${difficulty}: Gegenbeispiel`);
        assert.equal((await graders.deterministic.grade(instance, instance.expectedAnswer.correctChoice)).correct, true);
      }
    }
  }
});

test('property tests cover every case type and profile over 32 seeds', async () => {
  for (const contract of FOUNDATIONS_CHOICE_CONTRACTS) {
    const solve = Object.fromEntries(
      FOUNDATIONS_CHOICE_FAMILY_SPECS.map(({ contract: c, solve: s }) => [c.familyId, s]),
    )[contract.familyId];
    for (const caseType of contract.caseTypes) {
      for (const difficulty of contract.difficultyProfiles) {
        for (let seed = 0; seed < 32; seed += 1) {
          const instance = instantiate(contract.familyId, seed, difficulty, caseType.caseId);
          assert.deepEqual(instance, instantiate(contract.familyId, seed, difficulty, caseType.caseId));
          assert.equal(instance.caseId, caseType.caseId);
          assert.equal(instance.difficulty, difficulty);
          assert.equal(instance.choices.filter((choice) => choice.correct).length, 1);
          const solved = solve(instance.parameters);
          const correct = instance.choices.find((choice) => choice.correct);
          assert.equal(correct.text, solved.correctText);
          assert.equal((await grade(instance, correct.id)).correct, true);
          assert.equal((await grade(instance, counterexample(instance))).correct, false);
        }
      }
    }
  }
});

test('foundations choice golden corpus is byte-identical over seeds 0-63', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/foundations-choice-golden-corpus.json'), 'utf8'));
  assert.equal(fixture.generator, 'foundations_choice_families');
  assert.deepEqual(
    fixture.families.map((entry) => entry.familyId).sort(),
    FOUNDATIONS_CHOICE_CONTRACTS.map((contract) => contract.familyId).sort(),
  );
  const [firstSeed, lastSeed] = fixture.seedRange;
  const instances = [];
  for (const entry of fixture.families) {
    for (const caseId of entry.caseTypes) {
      for (const difficulty of fixture.difficultyProfiles) {
        for (let seed = firstSeed; seed <= lastSeed; seed += 1) {
          instances.push(instantiate(entry.familyId, seed, difficulty, caseId));
        }
      }
    }
  }
  assert.equal(instances.length, fixture.instances);
  assert.equal(
    createHash('sha256').update(instances.map(JSON.stringify).join('\n')).digest('hex'),
    fixture.digest,
  );
});
