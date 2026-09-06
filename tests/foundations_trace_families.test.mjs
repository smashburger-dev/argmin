import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { graders } from '../assets/js/core/graders.js';
import {
  TRACE_ASSIGNMENT_CONTRACT,
  TRACE_CALL_COMPOSITION_CONTRACT,
  TRACE_DICT_CONTRACT,
  TRACE_EXCEPTION_CONTRACT,
  TRACE_FAMILY_CONTRACTS,
  TRACE_FAMILY_RUNTIME,
  accumulatorTraceTable,
  assignmentTraceTable,
  callCompositionTraceTable,
  generateTraceAssignmentFamily,
  gradeTraceTable,
} from '../assets/js/core/foundations_trace_families.mjs';
import {
  createFamilyRegistry,
  familyEventInput,
  familyIdTokens,
} from '../assets/js/domain/exercise_registry.mjs';
import { TRACE_FAMILIES } from '../assets/js/domain/foundations_trace_registry.mjs';
import { instanceKey } from '../assets/js/domain/learning_policy.mjs';
import { buildLearningEvent } from '../assets/js/domain/learning_event.mjs';
import { validateSourceDocument } from '../tools/compile_content.mjs';
import './helpers/register_static_cases.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = JSON.parse(readFileSync(join(root, 'research/streamlining/s4a-v2/canonical-families.json'), 'utf8'));

const runtimeOf = (familyId) => TRACE_FAMILY_RUNTIME[familyId];
const contractOf = (familyId) => TRACE_FAMILY_CONTRACTS.find((contract) => contract.familyId === familyId);
const propertyCases = (contract) => contract.caseTypes.filter((item) => item.propertyTest !== false);

function counterexample(instance) {
  if (instance.activityType === 'single-choice') {
    const wrong = (instance.choices || []).find((choice) => choice.correct !== true);
    assert.ok(wrong, `${instance.caseId}: Gegenbeispiel fehlt`);
    return wrong.id;
  }
  if (instance.activityType === 'code-trace') {
    const answers = {};
    for (const variable of instance.parameters.variables) answers[variable.name] = String(variable.value);
    const first = instance.parameters.variables[0];
    const raw = String(first.value).trim();
    answers[first.name] = /^-?\d+$/.test(raw) ? String(Number(raw) + 1) : `${raw} §falsch`;
    return answers;
  }
  const output = instance.expectedAnswer.output;
  const tokens = String(output).split(' ');
  if (tokens.length >= 2) {
    const swapped = [tokens[1], tokens[0], ...tokens.slice(2)].join(' ');
    if (swapped !== output) return swapped;
  }
  return `${output} §falsch`;
}

function correctAnswer(instance) {
  if (instance.activityType === 'single-choice') return instance.expectedAnswer.correctChoice;
  if (instance.activityType === 'code-trace') {
    const answers = {};
    for (const variable of instance.parameters.variables) answers[variable.name] = String(variable.value);
    return answers;
  }
  return instance.expectedAnswer.output;
}

function solvedValue(contract, instance) {
  const solved = runtimeOf(contract.familyId).solve(instance.parameters);
  if (contract.activityType === 'predict-output') return solved.output;
  if (contract.activityType === 'single-choice') {
    return (instance.choices || []).find((choice) => choice.text === solved.correctText)?.id;
  }
  return solved.variables
    .map(({ name, value }) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function expectedValue(contract, instance) {
  if (contract.activityType === 'predict-output') return instance.expectedAnswer.output;
  if (contract.activityType === 'single-choice') return instance.expectedAnswer.correctChoice;
  return instance.parameters.variables
    .map(({ name, value }) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

test('trace family contracts validate against the exercise-family schema', () => {
  for (const contract of TRACE_FAMILY_CONTRACTS) {
    validateSourceDocument('exercise-family', contract, root);
  }
  assert.throws(
    () => validateSourceDocument('exercise-family', { ...TRACE_ASSIGNMENT_CONTRACT, generate: true }, root),
    /additional/,
  );
});

test('trace families are S4A families, not silent token permutations', () => {
  const known = new Map(canonical.families.map((family) => [familyIdTokens(family.familyId), family.familyId]));
  for (const contract of TRACE_FAMILY_CONTRACTS) {
    assert.equal(known.get(familyIdTokens(contract.familyId)), contract.familyId, contract.familyId);
  }
  assert.equal(known.get(familyIdTokens('assignment-trace-state')), 'trace-assignment-state');
  assert.equal(TRACE_FAMILIES.get('trace-assignment-state').familyId, 'trace-assignment-state');
});

test('registry rejects token-multiset aliases and duplicate trace family ids', () => {
  const withRuntime = (contract, familyId = contract.familyId) => ({
    ...contract,
    familyId,
    generate: runtimeOf(contract.familyId).generate,
    solve: runtimeOf(contract.familyId).solve,
  });
  assert.throws(
    () => createFamilyRegistry([
      withRuntime(TRACE_ASSIGNMENT_CONTRACT),
      withRuntime(TRACE_ASSIGNMENT_CONTRACT, 'assignment-trace-state'),
    ]),
    /Token-Multiset/,
  );
  assert.throws(
    () => createFamilyRegistry([withRuntime(TRACE_DICT_CONTRACT), withRuntime(TRACE_DICT_CONTRACT)]),
    /doppelt/,
  );
});

test('unknown trace family, case, profile or seed fail closed', () => {
  assert.throws(() => TRACE_FAMILIES.instantiate('trace-assign-state', 1, 'core', 'chain3-overwrite-print'), /Unbekannte Familie/);
  assert.throws(() => TRACE_FAMILIES.instantiate('trace-assignment-state', 1, 'core', 'chain4-overwrite-print'), /Unbekannter Fall/);
  assert.throws(() => TRACE_FAMILIES.instantiate('trace-assignment-state', 1, 'expert', 'chain3-overwrite-print'), /Unbekanntes Profil/);
  assert.throws(() => TRACE_FAMILIES.instantiate('trace-assignment-state', 1.5, 'core', 'chain3-overwrite-print'), /Seed/);
  assert.throws(
    () => TRACE_FAMILIES.assertFamilyPlacement({
      placementId: 'p-trace-x',
      role: 'curated',
      familyId: 'trace-dict-state-update',
      caseId: 'dict-nope-steps',
      seed: 1,
      difficulty: 'core',
      masteryEligible: true,
    }),
    /Unbekannter Fall/,
  );
});

for (const contract of TRACE_FAMILY_CONTRACTS) {
  test(`${contract.familyId}: case type, seed and profile instantiate distinct variants`, () => {
    const cases = propertyCases(contract);
    assert.ok(cases.length >= 2 || contract.caseTypes.length >= 2, 'mindestens zwei Falltypen');
    const first = cases[0].caseId;
    const second = (cases[1] || contract.caseTypes[1]).caseId;
    const base = TRACE_FAMILIES.instantiate(contract.familyId, 7, 'intro', first);
    const otherCase = TRACE_FAMILIES.instantiate(contract.familyId, 7, 'intro', second);
    const otherSeed = TRACE_FAMILIES.instantiate(contract.familyId, 8, 'intro', first);
    const core = TRACE_FAMILIES.instantiate(contract.familyId, 7, 'core', first);
    assert.equal(base.caseId, first);
    assert.equal(otherCase.caseId, second);
    assert.notDeepEqual(
      JSON.stringify(base.parameters),
      JSON.stringify(otherCase.parameters),
      'Falltypen unterscheiden sich',
    );
    assert.notDeepEqual(base, otherSeed, 'Seeds unterscheiden sich');
    assert.notDeepEqual(base, core, 'Profile unterscheiden sich (difficulty ist Fallparameter)');
    assert.equal(base.instanceId, `${contract.familyId}:${first}:intro:7`);
    assert.equal(base.masteryEligible, true);
    assert.deepEqual(base.competencyIds, contract.competencyIds);
    assert.deepEqual(base, TRACE_FAMILIES.instantiate(contract.familyId, 7, 'intro', first));
    const randomCase = TRACE_FAMILIES.instantiate(contract.familyId, 7, 'core');
    assert.ok(cases.some((item) => item.caseId === randomCase.caseId), 'Zufallsfall ist property-testfähig');
  });

  test(`${contract.familyId}: independent solver matches; counterexample fails`, async () => {
    for (const { caseId } of contract.caseTypes) {
      for (const difficulty of contract.difficultyProfiles) {
        const instance = TRACE_FAMILIES.instantiate(contract.familyId, 21, difficulty, caseId);
        assert.deepEqual(solvedValue(contract, instance), expectedValue(contract, instance), `${caseId} ${difficulty}: Solver`);
        const right = await TRACE_FAMILIES.grade(instance, correctAnswer(instance));
        const wrong = await TRACE_FAMILIES.grade(instance, counterexample(instance));
        assert.equal(right.correct, true, `${caseId} ${difficulty}: Sollantwort`);
        assert.equal(wrong.correct, false, `${caseId} ${difficulty}: Gegenbeispiel`);
      }
    }
  });

  test(`${contract.familyId}: property sweep over 32 seeds (determinism, solver, grading)`, async () => {
    for (const { caseId } of propertyCases(contract)) {
      for (const difficulty of contract.difficultyProfiles) {
        for (let seed = 0; seed < 32; seed += 1) {
          const instance = TRACE_FAMILIES.instantiate(contract.familyId, seed, difficulty, caseId);
          assert.deepEqual(instance, TRACE_FAMILIES.instantiate(contract.familyId, seed, difficulty, caseId));
          assert.equal(instance.caseId, caseId);
          assert.equal(instance.difficulty, difficulty);
          assert.deepEqual(solvedValue(contract, instance), expectedValue(contract, instance));
          assert.equal((await TRACE_FAMILIES.grade(instance, correctAnswer(instance))).correct, true);
          assert.equal((await TRACE_FAMILIES.grade(instance, counterexample(instance))).correct, false);
          assert.equal(
            (await graders.deterministic.grade(instance, correctAnswer(instance))).correct,
            true,
            'direkter deterministischer Grader',
          );
        }
      }
    }
  });
}

// Dokumentierte Profilschranken (Datensicht des Tests; die Verteilung hat die
// Dev-Probe über Seeds 0..127 ohne einen einzigen Fallback bestätigt).
test('profile intro/stretch/challenge hold their documented numeric bounds', () => {
  const pick = (familyId, caseId, difficulty, seed) => (
    TRACE_FAMILIES.instantiate(familyId, seed, difficulty, caseId).parameters
  );
  for (let seed = 0; seed < 64; seed += 1) {
    const reassign = pick('trace-assignment-state', 'reassign-two-variables-print', 'intro', seed);
    assert.ok(Math.max(Math.abs(reassign.a0), Math.abs(reassign.k1), Math.abs(reassign.k2)) <= 6);
    const chain = pick('trace-assignment-state', 'chain3-overwrite-print', 'challenge', seed);
    assert.ok([chain.x0, chain.k1, chain.k2].some((v) => v < 0));
    assert.ok(Math.max(Math.abs(chain.x0), Math.abs(chain.k1), Math.abs(chain.k2)) >= 8);
    const linear = pick('trace-call-composition', 'both-orders-linear-functions', 'intro', seed);
    assert.ok(Math.max(Math.abs(linear.fb), Math.abs(linear.gb), Math.abs(linear.v)) <= 3);
    const elif = pick('aggregate-accumulator-count', 'elif-branch-value', 'challenge', seed);
    assert.ok(Math.abs(elif.x) >= 8);
  }
});

test('trace-exception-path asks two options on intro and four above; position rotates', () => {
  for (const { caseId } of TRACE_EXCEPTION_CONTRACT.caseTypes) {
    const introPositions = new Set();
    const corePositions = new Set();
    for (let seed = 0; seed < 64; seed += 1) {
      const intro = TRACE_FAMILIES.instantiate('trace-exception-path', seed, 'intro', caseId);
      const core = TRACE_FAMILIES.instantiate('trace-exception-path', seed, 'core', caseId);
      assert.equal(intro.choices.length, 2, `${caseId}: intro fragt zwei Optionen`);
      assert.equal(core.choices.length, 4, `${caseId}: core fragt vier Optionen`);
      introPositions.add(intro.expectedAnswer.correctChoice);
      corePositions.add(core.expectedAnswer.correctChoice);
    }
    assert.ok(introPositions.size > 1, `${caseId}: intro rotiert die korrekte Position`);
    assert.ok(corePositions.size > 1, `${caseId}: core rotiert die korrekte Position`);
  }
});

test('trace golden corpus is byte-identical over seeds 0-63', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/foundations-trace-golden-corpus.json'), 'utf8'));
  const [firstSeed, lastSeed] = fixture.seedRange;
  const instances = [];
  for (const family of fixture.families) {
    for (const caseId of family.caseTypes) {
      for (const difficulty of family.difficultyProfiles) {
        for (let seed = firstSeed; seed <= lastSeed; seed += 1) {
          instances.push(TRACE_FAMILIES.instantiate(family.familyId, seed, difficulty, caseId));
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

test('S4D0 familyEventInput maps trace instances to the S3 write path', () => {
  const instance = TRACE_FAMILIES.instantiate('trace-collection-state', 7, 'core', 'list-copy-steps');
  const input = familyEventInput(instance);
  assert.equal(input.definitionId, 'trace-collection-state:list-copy-steps');
  assert.equal(input.activityId, 'trace-collection-state');
  assert.equal(input.exerciseId, 'trace-collection-state:list-copy-steps');
  assert.deepEqual(input.competencyIds, ['c-python-collections', 'c-python-control-flow']);
  assert.equal(input.seed, 7);
  assert.equal(input.masteryEligible, true);
  assert.throws(() => familyEventInput(null), /familyId und caseId/);
});

test('S4D0 trace instance key is stable per case and shared across profiles', () => {
  const intro = TRACE_FAMILIES.instantiate('trace-dict-state-update', 7, 'intro', 'dict-start-key-steps');
  const challenge = TRACE_FAMILIES.instantiate('trace-dict-state-update', 7, 'challenge', 'dict-start-key-steps');
  const keyFor = (instance) => instanceKey(buildLearningEvent({
    ...familyEventInput(instance), cycleId: 'cycle-9', eventType: 'attempt',
    answer: 'a', hintsUsed: 0, correct: true,
  }));
  assert.equal(keyFor(intro), 'trace-dict-state-update:dict-start-key-steps:cycle-9:7');
  assert.equal(keyFor(challenge), keyFor(intro));
});

// Taxonomie-Kreuzcheck: Shard-Mitglieder (foundations.json, Foundations-Umfang)
// je Familie. runtime = geseedeter Laufzeitfall, static-content = fixer Content
// (unverändert; Multi-Archetyp mit Doku nach Familienmodell 10b), seed-static =
// fixe Seed-Falltypen außerhalb von w01-w04 (nur dokumentiert, kein Content).
const TRACE_TAXONOMY = [
  {
    familyId: 'trace-assignment-state',
    summary: 'Verfolgt Zuweisungszustände durch ein Programm in einer Umgebungstabelle mit stdout-Puffer.',
    solutionPath: 'Zuweisungen in Ordnung auswerten, wobei die rechte Seite den alten Zustand liest, und Zustand sowie Ausgabe fortschreiben.',
    referenceModel: 'Umgebungstabelle plus stdout-Puffer; ein Mini-Interpreter wertet Zuweisungen in Ordnung aus (RHS liest alten Zustand).',
    errorHypotheses: ['reads-new-value', 'overwrite-forgotten', 'print-order', 'state-object-confusion'],
    shardCases: ['reassign-two-variables-print', 'three-variable-overwrite-chain', 'temp-variable-with-distractors', 'chain3-overwrite-print', 'method-chain-transform'],
    runtimeArchetype: 'output-predict-lines',
    refinements: {
      'accumulate-reassign-print': 'dritte Zuweisungsform von genPythonStateTrace (n/m-Akkumulation), dieselbe Schablone, kein Shard-Falltyp',
      'slice-predict-output': 'genCodeReadingOutput-Einmalzuweisung (Umgebungstabelle plus stdout); Überschreibungsschritt läuft vakant',
      'join-split-predict': 'genCodeReadingOutput-Einmalzuweisung (split/join); Überschreibungsschritt läuft vakant',
      'comprehension-predict': 'genCodeReadingOutput-Einmalzuweisung (Filter/Abbildung); Überschreibungsschritt läuft vakant',
      'gradient-loop-two-updates': 'statischer W08-Fall mit derselben Ausgabevorhersage und eigenem Kompetenz-Override',
      'tree-majority-vote-trace': 'statischer W15-Fall mit derselben Zustandsverfolgung und eigenem Kompetenz-Override',
      'rng-stream-reseed-trace': 'statischer W17-Fall mit stdout-Ausgabe und eigenem Kompetenz-Override',
      'manual-backward-step-trace': 'statischer W19-Fall mit derselben Zustandsverfolgung und eigenem Kompetenz-Override',
      'fixed-dropout-mask-trace': 'statischer W21-Fall mit stdout-Ausgabe und eigenem Kompetenz-Override',
      'stable-softmax-rows-trace': 'statischer W22-Fall mit stdout-Ausgabe und eigenem Kompetenz-Override',
      'char-encode-roundtrip-trace': 'statischer W23-Fall mit stdout-Ausgabe und eigenem Kompetenz-Override',
      'greedy-loop-trace': 'statischer W24-Fall mit stdout-Ausgabe und eigenem Kompetenz-Override',
      'freeze-param-filter-trace': 'statischer W25-Fall mit stdout-Ausgabe und eigenem Kompetenz-Override',
      'absolute-vs-relative-gain-trace': 'statischer W26-Fall mit Variablenzustand und eigenem Kompetenz-Override',
    },
    staticContent: [
      { sourceId: 'w01-e3', contentType: 'predict-output', caseId: 'reassign-two-variables-print' },
      { sourceId: 'w01-e4', contentType: 'code-trace', caseId: 'three-variable-overwrite-chain' },
      { sourceId: 'w01-e7', contentType: 'parsons', caseId: 'temp-variable-with-distractors' },
    ],
    seedStatic: [],
    multiArchetypeRationale: 'state-trace-vars (w01-e4) und program-ordering (w01-e7) bleiben statische Mitglieder mit identischem Lösungs- und Evidence-Vertrag; nur output-predict-lines läuft geseedet.',
  },
  {
    familyId: 'trace-call-composition',
    summary: 'Tracet die Auswertung verketteter bzw. verschachtelter Aufrufe und ihren resultierenden Wert.',
    solutionPath: 'Aufrufkomposition von innen nach außen auswerten und das Endergebnis bestimmen.',
    referenceModel: 'Deterministische Auswertungssemantik der Aufrufkomposition.',
    errorHypotheses: ['Falsche Auswertungsreihenfolge der Aufrufe', 'Argumentzuordnung vertauscht'],
    shardCases: ['nested-call-value-chain', 'two-functions-one-print', 'both-orders-linear-functions'],
    runtimeArchetype: 'output-predict-lines',
    refinements: {},
    staticContent: [
      { sourceId: 'w01-e5', contentType: 'code-trace', caseId: 'nested-call-value-chain' },
      { sourceId: 'w01-e6', contentType: 'predict-output', caseId: 'two-functions-one-print' },
    ],
    seedStatic: [],
    multiArchetypeRationale: 'state-trace-vars (w01-e5) bleibt statisches Mitglied mit identischem Lösungs- und Evidence-Vertrag; w01-e6 ist als gepinnter Laufzeitfall drin.',
  },
  {
    familyId: 'trace-collection-state',
    summary: 'Tracet Zustandsänderungen einer Collection durch Operationen und Zuweisungen.',
    solutionPath: 'Collection-Operation Schritt für Schritt anwenden und den resultierenden Collection-Zustand angeben.',
    referenceModel: 'Collection-Zustand mit deterministischer Update-Semantik (Mutation statt Kopie).',
    errorHypotheses: ['Mutation und Kopie verwechselt', 'Index- oder Slice-Grenzen falsch gezogen'],
    shardCases: ['half-open-slices-with-join', 'list-copy-alias-steps'],
    splitCoverage: { 'list-copy-alias-steps': ['list-alias-steps', 'list-copy-steps'] },
    runtimeArchetype: 'state-trace-vars',
    refinements: {
      'list-mutate-steps': 'genCollectionStepTrace-Form ohne Shard-Falltyp, dieselbe Mutationsschablone',
      'list-alias-steps': 'eine Hälfte von list-copy-alias-steps (Aliasing ohne Kopie)',
      'list-copy-steps': 'eine Hälfte von list-copy-alias-steps (Kopie ohne Aliasing)',
      'list-rebind-steps': 'genCollectionStepTrace-Form ohne Shard-Falltyp (Rebinding vs. In-place)',
      'set-add-discard-steps': 'genCollectionStepTrace-Form ohne Shard-Falltyp (Set-Semantik, Profillage vakant: Wortschatz fix)',
    },
    staticContent: [
      { sourceId: 'w02-e1', contentType: 'predict-output', caseId: 'half-open-slices-with-join' },
    ],
    seedStatic: [],
    multiArchetypeRationale: 'output-predict-lines (w02-e1) bleibt statisches Mitglied mit identischem Lösungs- und Evidence-Vertrag.',
  },
  {
    familyId: 'aggregate-accumulator-count',
    summary: 'Zählt durch Akkumulation über eine Folge von Elementen oder Schritten.',
    solutionPath: 'Akkumulator initialisieren, über die Folge iterieren und den Zählerstand fortschreiben.',
    referenceModel: 'Akkumulatorzustand über einer endlichen Folge.',
    errorHypotheses: ['Startwert oder Update des Akkumulators falsch', 'Elemente doppelt oder gar nicht gezählt'],
    shardCases: ['stepped-range-prepend-accumulator', 'while-counter-with-stop-state', 'for-if-else-accumulator'],
    runtimeArchetype: 'output-predict-lines',
    refinements: {
      'elif-branch-value': 'genControlFlowOutput-Form ohne Shard-Falltyp (Zweigwert statt Zähler)',
      'for-filter-accumulator': 'genControlFlowOutput-Form ohne Shard-Falltyp (Filter-Akkumulator)',
    },
    staticContent: [
      { sourceId: 'w02-e2', contentType: 'predict-output', caseId: 'stepped-range-prepend-accumulator' },
    ],
    seedStatic: [{ sourceId: 'f-control-trace-01', caseId: 'for-if-else-accumulator' }],
    multiArchetypeRationale: 'state-trace-vars (f-control-trace-01) bleibt statisches Mitglied mit identischem Lösungs- und Evidence-Vertrag.',
  },
  {
    familyId: 'trace-dict-state-update',
    summary: 'Verfolgt den Zustand eines Dictionaries durch Update-Operationen und liest Werte und Schlüsselmenge am Ende ab.',
    solutionPath: 'Dictionary-Operationen (Inkrement, del, setdefault, get-Standard) Zeile für Zeile anwenden und den Endzustand von Werten und Schlüsselmenge ablesen.',
    referenceModel: 'Dict-Zustand mit deterministischer Update-Semantik (Überschreiben, Löschen, Einfügen nur bei Fehlen, get-Standard); ein Mini-Interpreter wertet die Operationen in Ordnung aus.',
    errorHypotheses: ['Dict-Update-Semantik falsch angewendet (Überschreiben, del, setdefault, get-Standard)', 'Aggregation über das falsche Dict-Objekt (Werte statt Schlüssel)'],
    shardCases: ['del-setdefault-increment', 'get-default-counting'],
    runtimeArchetype: 'state-trace-vars',
    refinements: {
      'dict-start-key-steps': 'dict-steps-Schablone, partitioniert nach start-Schlüsselvokabular; Lösungsweg und Referenzmodell identisch',
      'dict-ziel-pfad-key-steps': 'dict-steps-Schablone, partitioniert nach ziel-/pfad-Schlüsselvokabular; Lösungsweg und Referenzmodell identisch',
    },
    staticContent: [
      { sourceId: 'w03-e1', contentType: 'predict-output', caseId: 'del-setdefault-increment' },
    ],
    seedStatic: [{ sourceId: 'f-collections-output-01', caseId: 'get-default-counting' }],
    multiArchetypeRationale: 'output-predict-lines (w03-e1, f-collections-output-01) bleiben statische Mitglieder mit identischem Lösungs- und Evidence-Vertrag.',
  },
  {
    familyId: 'trace-exception-path',
    summary: 'Tracet, welcher Programm- und Ausnahmepfad bei der Ausführung tatsächlich durchlaufen wird.',
    solutionPath: 'Ausführungspfad verfolgen und bestimmen, welche Ausnahme wo ausgelöst oder abgefangen wird.',
    referenceModel: 'Programm mit deterministischem Ausnahme- und Fehlerfluss.',
    errorHypotheses: ['Falscher Zweig gewählt', 'Reihenfolge der Ausnahmebehandlung missverstanden'],
    shardCases: ['assert-raise-and-catch', 'seeded-operation-type-cases'],
    splitCoverage: {
      'seeded-operation-type-cases': ['valueerror', 'typeerror-concat', 'keyerror', 'filenotfound', 'indexerror', 'typeerror-len', 'no-error-int', 'no-error-mul'],
    },
    runtimeArchetype: 'choice-diagnose',
    refinements: {
      valueerror: 'ein Ausnahmefall aus seeded-operation-type-cases (genExceptionBoundary-Bank)',
      'typeerror-concat': 'ein Ausnahmefall aus seeded-operation-type-cases (genExceptionBoundary-Bank)',
      keyerror: 'ein Ausnahmefall aus seeded-operation-type-cases (genExceptionBoundary-Bank)',
      filenotfound: 'ein Ausnahmefall aus seeded-operation-type-cases (genExceptionBoundary-Bank)',
      indexerror: 'ein Ausnahmefall aus seeded-operation-type-cases (genExceptionBoundary-Bank)',
      'typeerror-len': 'ein Ausnahmefall aus seeded-operation-type-cases (genExceptionBoundary-Bank)',
      'no-error-int': 'fehlerfreier Gegenfall aus seeded-operation-type-cases (genExceptionBoundary-Bank)',
      'no-error-mul': 'fehlerfreier Gegenfall aus seeded-operation-type-cases (genExceptionBoundary-Bank)',
    },
    staticContent: [
      { sourceId: 'w04-e1', contentType: 'predict-output', caseId: 'assert-raise-and-catch' },
    ],
    seedStatic: [],
    multiArchetypeRationale: 'output-predict-lines (w04-e1) bleibt statisches Mitglied mit identischem Lösungs- und Evidence-Vertrag.',
  },
];

const CONTENT_TYPE_ARCHETYPE = {
  'predict-output': 'output-predict-lines',
  'code-trace': 'state-trace-vars',
  'single-choice': 'choice-diagnose',
  parsons: 'program-ordering',
};

function loadContentExercises() {
  const byId = new Map();
  for (const week of ['w01', 'w02', 'w03', 'w04']) {
    const document = JSON.parse(readFileSync(join(root, 'content/exercises', `${week}.json`), 'utf8'));
    for (const exercise of document.exercises) byId.set(exercise.exerciseId, exercise);
  }
  return byId;
}

test('taxonomy crosscheck covers every shard case and documents every refinement', () => {
  for (const entry of TRACE_TAXONOMY) {
    const contract = contractOf(entry.familyId);
    assert.equal(contract.summary, entry.summary, `${entry.familyId}: Vertrag folgt dem Shard-Wortlaut`);
    const runtimeCases = new Set(contract.caseTypes.map((item) => item.caseId));
    const staticCases = new Set(entry.staticContent.map((item) => item.caseId));
    const splitCoverage = entry.splitCoverage || {};
    for (const caseId of entry.shardCases) {
      const split = splitCoverage[caseId] || [];
      assert.ok(
        runtimeCases.has(caseId) || staticCases.has(caseId) || entry.seedStatic.some((item) => item.caseId === caseId)
        || (split.length > 0 && split.every((part) => runtimeCases.has(part))),
        `${entry.familyId}: Shard-Fall ${caseId} ist abgedeckt`,
      );
    }
    for (const caseId of runtimeCases) {
      assert.ok(
        entry.shardCases.includes(caseId) || (entry.refinements[caseId] || '').length > 0,
        `${entry.familyId}: Laufzeitfall ${caseId} ist Shard-Fall oder begründete Verfeinerung`,
      );
    }
    const staticArchetypes = new Set(entry.staticContent.map((item) => CONTENT_TYPE_ARCHETYPE[item.contentType]));
    if ([...staticArchetypes].some((archetype) => archetype !== entry.runtimeArchetype)) {
      assert.ok(
        (entry.multiArchetypeRationale || '').length > 0,
        `${entry.familyId}: Multi-Archetyp ist begründet`,
      );
    }
  }
});

test('taxonomy static siblings exist in w01-w04 with matching answer form', () => {
  const content = loadContentExercises();
  for (const entry of TRACE_TAXONOMY) {
    const contract = contractOf(entry.familyId);
    for (const sibling of entry.staticContent) {
      const exercise = content.get(sibling.sourceId);
      assert.ok(exercise, `${sibling.sourceId} existiert im Content`);
      assert.equal(exercise.type, sibling.contentType, `${sibling.sourceId}: Antwortform`);
      assert.ok(
        exercise.skillIds.some((skill) => contract.competencyIds.includes(skill)),
        `${sibling.sourceId}: teilt die Kompetenz mit der Familie`,
      );
    }
  }
});

test('trace contracts follow the shard word-for-word (solution, reference, errors)', () => {
  const shard = JSON.parse(readFileSync(join(root, 'research/streamlining/s4a-v2/shards/foundations.json'), 'utf8'));
  const byFamily = new Map();
  for (const candidate of shard.entries) {
    const familyId = candidate.cognitiveFamily.familyId;
    if (!byFamily.has(familyId)) byFamily.set(familyId, candidate.cognitiveFamily);
  }
  for (const entry of TRACE_TAXONOMY) {
    const shardFamily = byFamily.get(entry.familyId);
    assert.ok(shardFamily, `${entry.familyId} steht im Shard`);
    assert.equal(shardFamily.summary, entry.summary);
    assert.equal(shardFamily.membershipEvidence.solutionPath, entry.solutionPath);
    assert.equal(shardFamily.membershipEvidence.referenceModel, entry.referenceModel);
    assert.deepEqual(shardFamily.membershipEvidence.errorHypotheses, entry.errorHypotheses);
    const shardCaseIds = new Set(
      shard.entries.filter((item) => item.cognitiveFamily.familyId === entry.familyId)
        .map((item) => item.caseTemplate.caseId),
    );
    assert.deepEqual([...shardCaseIds].sort(), [...entry.shardCases].sort(), `${entry.familyId}: Shard-Fälle`);
  }
});


test('trace table states reproduce the snippet lines and the expected output', () => {
  const cases = ['reassign-two-variables-print', 'chain3-overwrite-print', 'accumulate-reassign-print'];
  for (const caseId of cases) {
    for (const difficulty of ['intro', 'core', 'stretch', 'challenge']) {
      for (const seed of [1, 7, 42]) {
        const generated = generateTraceAssignmentFamily({ seed, caseId, difficulty });
        const { traceTable } = generated;
        assert.ok(traceTable, `${caseId} ${difficulty}: Tabelle vorhanden`);
        const snippetLines = generated.parameters.snippet.split('\n');
        const printLine = snippetLines.find((line) => line.startsWith('print'));
        assert.deepEqual(traceTable.lines, snippetLines.filter((line) => !line.startsWith('print')));
        assert.equal(traceTable.lines.length, traceTable.expectedStates.length);
        const printed = printLine.slice('print('.length, -1).split(',').map((name) => name.trim());
        const last = traceTable.expectedStates[traceTable.expectedStates.length - 1];
        assert.equal(printed.map((name) => last[name]).join(' '), generated.expected.output);
        assert.deepEqual(gradeTraceTable(traceTable, traceTable.expectedStates), {
          correct: true,
          firstBadRow: null,
          firstBadVar: null,
        });
      }
    }
  }
});

test('trace table is absent for single-expression reading shapes', () => {
  const generated = generateTraceAssignmentFamily({ seed: 5, caseId: 'slice-predict-output', difficulty: 'core' });
  assert.equal(generated.traceTable, null);
  assert.equal(assignmentTraceTable({ parameters: { shape: 'slice', snippet: 'x' } }), null);
});

test('trace table grading reports the first deviating cell', () => {
  const generated = generateTraceAssignmentFamily({ seed: 7, caseId: 'reassign-two-variables-print', difficulty: 'core' });
  const { traceTable } = generated;
  const wrong = traceTable.expectedStates.map((row) => ({ ...row }));
  wrong[1] = { ...wrong[1], b: '9999' };
  assert.deepEqual(gradeTraceTable(traceTable, wrong), { correct: false, firstBadRow: 1, firstBadVar: 'b' });
  const padded = traceTable.expectedStates.map((row) => Object.fromEntries(
    Object.entries(row).map(([name, value]) => [name, value === '' ? '' : ` ${value} `]),
  ));
  assert.equal(gradeTraceTable(traceTable, padded).correct, true);
  const emptied = traceTable.expectedStates.map((row) => ({ ...row }));
  emptied[0] = { ...emptied[0], a: '' };
  assert.equal(gradeTraceTable(traceTable, emptied).correct, false);
});

test('loop tables reproduce the expected output from per-iteration states', () => {
  const generate = runtimeOf('aggregate-accumulator-count').generate;
  for (const [caseId, check] of [
    ['while-counter-with-stop-state', (table, expected) => {
      const last = table.expectedStates[table.expectedStates.length - 1];
      assert.equal(`${last.summe} ${last.n}`, expected.output);
      assert.ok(table.lines.length >= 4 && table.lines.length <= 7);
    }],
    ['for-filter-accumulator', (table, expected) => {
      const last = table.expectedStates[table.expectedStates.length - 1];
      assert.equal(last.ergebnis, expected.output);
      assert.equal(table.lines.length, table.expectedStates.length);
    }],
  ]) {
    for (const difficulty of ['intro', 'core', 'stretch']) {
      for (const seed of [2, 11, 30]) {
        const generated = generate({ seed, caseId, difficulty });
        assert.ok(generated.traceTable, `${caseId} ${difficulty}: Tabelle vorhanden`);
        check(generated.traceTable, generated.expected);
        assert.deepEqual(gradeTraceTable(generated.traceTable, generated.traceTable.expectedStates), {
          correct: true,
          firstBadRow: null,
          firstBadVar: null,
        });
      }
    }
  }
});

test('elif keeps plain prediction without a table', () => {
  const generated = runtimeOf('aggregate-accumulator-count').generate({ seed: 4, caseId: 'elif-branch-value', difficulty: 'core' });
  assert.equal(generated.traceTable, null);
  assert.equal(accumulatorTraceTable({ parameters: { shape: 'elif' } }), null);
});

test('call composition tables compute inner before outer in both lanes', () => {
  assert.ok(TRACE_CALL_COMPOSITION_CONTRACT, 'Vertrag importiert');
  const generate = runtimeOf('trace-call-composition').generate;
  for (const seed of [3, 7, 21]) {
    const generated = generate({ seed, caseId: 'both-orders-linear-functions', difficulty: 'core' });
    const { traceTable } = generated;
    assert.deepEqual(traceTable.stateVars, ['innen', 'außen']);
    const [first, second] = traceTable.expectedStates;
    assert.equal(`${first.außen} ${second.außen}`, generated.expected.output);
    assert.equal(gradeTraceTable(traceTable, traceTable.expectedStates).correct, true);
  }
  assert.equal(callCompositionTraceTable({ parameters: { form: 'unbekannt' } }), null);
});
