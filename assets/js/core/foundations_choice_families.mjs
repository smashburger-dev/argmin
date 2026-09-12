// S4D1 Choice-Familien: statische choice-diagnose-Runtime für Foundations.
//
// Jede Familie ordnet eine Beobachtung anhand eines Konzeptsystems einer
// Klasse zu (Referenzmodell = das Konzeptsystem, Lösungsweg = Zuordnen).
// Die Fallkörper leben public-first in content/families/<familyId>.json und
// werden über die Familien-Registry gelesen (staticCaseBody); dieses Modul
// registriert sie beim Import selbst, damit Generatoren auch ohne
// Bundle-Registrierung laufen (direkte EXERCISE_FAMILIES-Nutzung in Tests
// und Tools). Alle Inhalte sind wörtlich aus den autoritativen
// Family-Shards übernommen. Falltypen sind kanonische Foundations-Fälle
// (authorityMode überall static, außer seeded-error-pattern-cases: seeded).
//
// authorityMode der Verträge ist überall static (S4D1-Vorgabe): auch der
// seeded-error-pattern-cases-Fall ist auf die autorisierte Default-Instanz
// (deterministicSeed 3401, Fall off-by-one) eingefroren — der Seed rotiert
// nur die Antwortposition, niemals den Inhalt. Die eingefrorene Instanz ist
// als Fallkörper serialisiert (Distraktor-Reihenfolge = rotierte Bank-
// Reihenfolge). masteryEligible ist überall true (S4D1-Vorgabe;
// w02-e3/w03-e2 zählen im Content als reiner Bearbeitungsnachweis, in der
// Familien-Runtime als Mastery-Nachweis).
//
// Kein UI, kein Ledger, kein Content-Edit. Die Generatoren stehen bewusst
// NICHT in SEED_GENERATORS (Familien-Generatoren haben Falltyp und Profil,
// nicht nur einen Seed — S4C-Präzedenz generateGitOperationFamily).
import { variantCaseIndex, buildRotatedChoices } from './generator_draw_kit.mjs';
import { registerStaticCases, staticCaseBody } from '../domain/family_registry.mjs';
import stringImmutabilityDoc from '../../../content/families/classify-string-immutability.json' with { type: 'json' };
import setOperationDoc from '../../../content/families/classify-set-operation-semantics.json' with { type: 'json' };
import errorHypothesisDoc from '../../../content/families/classify-error-hypothesis.json' with { type: 'json' };
import testAttitudeDoc from '../../../content/families/classify-test-attitude.json' with { type: 'json' };
import controlConstructDoc from '../../../content/families/classify-control-construct.json' with { type: 'json' };
import pythonCollectionDoc from '../../../content/families/classify-python-collection-choice.json' with { type: 'json' };
import exceptionPlacementDoc from '../../../content/families/classify-exception-placement.json' with { type: 'json' };

const CHOICE_COUNT = { intro: 2, core: 4, stretch: 4, challenge: 4 };
const CHOICE_IDS = ['a', 'b', 'c', 'd'];

/** Eingefrorener Seed der autorisierten Default-Instanz von
 *  f-meta-error-classify-01 (sourceLineage.seed, expectedAnswer.defaultSeed).
 *  Der Fallkörper in content/families/classify-error-hypothesis.json ist
 *  byte-identisch mit genMetaErrorClassify(3401) (Fall off-by-one, korrekte
 *  Wahl an Position b der eingefrorenen Instanz). */
export const FROZEN_META_ERROR_SEED = 3401;

// Eigenregistrierung der öffentlichen Fallkörper (idempotent — die
// Registry übernimmt beim späteren Bundle-Load keine Fremdkörper).
// Lazy beim ersten Zugriff: auf Modulebene gelesene Import-Bindings
// können in gebündelten Chunk-Graphen noch uninitialisiert sein.
let choiceDocsRegistered = false;
function ensureChoiceDocs() {
  if (choiceDocsRegistered) return;
  choiceDocsRegistered = true;
  for (const doc of [
    stringImmutabilityDoc,
    setOperationDoc,
    errorHypothesisDoc,
    testAttitudeDoc,
    controlConstructDoc,
    pythonCollectionDoc,
    exceptionPlacementDoc,
  ]) {
    registerStaticCases(doc.familyId, doc.cases);
  }
}

/** Generische statische Choice-Maschine: Der Seed rotiert nur die Position
 *  der korrekten Antwort (intro zeigt 2, alle anderen Profile 4 Optionen).
 *  Die korrekte Antwort ist eine reine Funktion der caseId. Der Fallkörper
 *  kommt aus der Registry; die korrekte Option steht in der autorisierten
 *  Reihenfolge an Position 0 der choices-Liste. */
function generateStaticChoice(familyId, { seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const choiceCount = CHOICE_COUNT[difficulty];
  if (!choiceCount) throw new Error(`Unbekanntes Profil ${difficulty}`);
  ensureChoiceDocs();
  const meta = staticCaseBody(familyId, caseId);
  const correct = meta.choices.find((choice) => choice.correct)?.text;
  const distractors = meta.choices.filter((choice) => !choice.correct).map((choice) => choice.text);
  const options = [correct, ...distractors.slice(0, choiceCount - 1)];
  const rotation = variantCaseIndex(seed, options.length);
  const ids = CHOICE_IDS.slice(0, options.length);
  return {
    parameters: { caseId, difficulty, ...(meta.parameters || {}) },
    expected: { correctChoice: ids[rotation] },
    choices: buildRotatedChoices(options, rotation, ids),
    prompt: meta.prompt,
    fullSolution: meta.fullSolution,
    ...(meta.hints ? { hints: meta.hints } : {}),
    ...(meta.feedbackRules ? { feedbackRules: meta.feedbackRules } : {}),
    ...(meta.typicalErrors ? { typicalErrors: meta.typicalErrors } : {}),
    ...(meta.tolerancePolicy ? { tolerancePolicy: meta.tolerancePolicy } : {}),
    ...(meta.competencyIds ? { competencyIds: meta.competencyIds } : {}),
    ...(meta.masteryEligible !== undefined ? { masteryEligible: meta.masteryEligible } : {}),
  };
}

/** Unabhängiger Solver: Die korrekte Antwort folgt aus der caseId allein,
 *  nicht aus Seed, Rotation oder Profil. */
function solveStaticChoice(familyId, parameters) {
  ensureChoiceDocs();
  const meta = staticCaseBody(familyId, parameters?.caseId);
  return { correctText: meta.choices.find((choice) => choice.correct).text };
}

// --- classify-string-immutability (Shard-Fall, Quelle w02-e3) ---------------

export function generateStringImmutabilityFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice('classify-string-immutability', { seed, caseId, difficulty });
}

export function solveStringImmutability(parameters) {
  return solveStaticChoice('classify-string-immutability', parameters);
}

// --- classify-set-operation-semantics (Shard-Fall, Quelle w03-e2) -----------

export function generateSetOperationFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice('classify-set-operation-semantics', { seed, caseId, difficulty });
}

export function solveSetOperation(parameters) {
  return solveStaticChoice('classify-set-operation-semantics', parameters);
}

// --- classify-error-hypothesis (drei Shard-Fälle) ---------------------------
// base-vs-exponent-confusion: statisches Mitglied f-algebra-debug-01.
// seeded-error-pattern-cases: geseedetes Mitglied f-meta-error-classify-01,
// hier eingefroren auf die autorisierte Default-Instanz (Seed 3401). Der
// Shard führt authorityMode seeded; die Familien-Runtime friert den Inhalt
// ein (static), weil S4D1 keine Seed-Variation des Inhalts vorsieht —
// derselbe Freeze, den jede statische Migration eines Seed-Generators
// vornimmt (Präzedenz w01-e1 static neben w01-e8 seeded, family-model §4).
// error-journal-next-test: statisches Mitglied f-meta-error-log-01.

export function generateErrorHypothesisFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice('classify-error-hypothesis', { seed, caseId, difficulty });
}

export function solveErrorHypothesis(parameters) {
  return solveStaticChoice('classify-error-hypothesis', parameters);
}

// --- classify-test-attitude (Shard-Fall, Quelle f-testing-choice-01) --------

export function generateTestAttitudeFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice('classify-test-attitude', { seed, caseId, difficulty });
}

export function solveTestAttitude(parameters) {
  return solveStaticChoice('classify-test-attitude', parameters);
}

// --- classify-control-construct (Shard-Fall, Quelle f-control-choice-01) ----

export function generateControlConstructFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice('classify-control-construct', { seed, caseId, difficulty });
}

export function solveControlConstruct(parameters) {
  return solveStaticChoice('classify-control-construct', parameters);
}

// --- classify-python-collection-choice (Shard-Fall, f-collections-choice-01) -

export function generatePythonCollectionFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice('classify-python-collection-choice', { seed, caseId, difficulty });
}

export function solvePythonCollection(parameters) {
  return solveStaticChoice('classify-python-collection-choice', parameters);
}

// --- classify-exception-placement (Shard-Fall, Quelle f-files-choice-01) ----

export function generateExceptionPlacementFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice('classify-exception-placement', { seed, caseId, difficulty });
}

export function solveExceptionPlacement(parameters) {
  return solveStaticChoice('classify-exception-placement', parameters);
}

// --- Verträge (S4C-Format, reine Daten ohne Funktionen) ----------------------
// summaries wörtlich aus den Foundations-Vertragsdaten,
// competencyIds aus den Quelldefinitionen (test-attitude trägt zwei Claims).

const DIFFICULTY_PROFILES = ['intro', 'core', 'stretch', 'challenge'];

export const FOUNDATIONS_CHOICE_CONTRACTS = [
  {
    familyId: 'classify-string-immutability',
    familyGroup: 'classify-concept',
    summary: 'Ordnet eine String-Operation ihren Folgen aus der Unveränderlichkeit von Strings zu.',
    taskArchetype: 'choice-diagnose',
    authorityMode: 'static',
    masteryEligible: true,
    caseTypes: [{ caseId: 'string-item-assignment-typeerror' }],
    difficultyProfiles: [...DIFFICULTY_PROFILES],
    competencyIds: ['c-python-control-flow'],
    graderId: 'deterministic',
    activityType: 'single-choice',
  },
  {
    familyId: 'classify-set-operation-semantics',
    familyGroup: 'classify-concept',
    summary: 'Ordnet eine Mengenbeobachtung der richtigen Set-Operation und Eindeutigkeits-Semantik zu.',
    taskArchetype: 'choice-diagnose',
    authorityMode: 'static',
    masteryEligible: true,
    caseTypes: [{ caseId: 'dedup-and-intersection' }],
    difficultyProfiles: [...DIFFICULTY_PROFILES],
    competencyIds: ['c-python-collections'],
    graderId: 'deterministic',
    activityType: 'single-choice',
  },
  {
    familyId: 'classify-error-hypothesis',
    familyGroup: 'classify-concept',
    summary: 'Ordnet ein beobachtetes Fehlerbild der plausibelsten Fehlerhypothese zu.',
    taskArchetype: 'choice-diagnose',
    authorityMode: 'static',
    masteryEligible: true,
    caseTypes: [
      { caseId: 'base-vs-exponent-confusion' },
      { caseId: 'seeded-error-pattern-cases' },
      { caseId: 'error-journal-next-test' },
    ],
    difficultyProfiles: [...DIFFICULTY_PROFILES],
    competencyIds: ['c-algebra', 'c-meta-learning'],
    graderId: 'deterministic',
    activityType: 'single-choice',
  },
  {
    familyId: 'classify-test-attitude',
    familyGroup: 'classify-concept',
    summary: 'Ordnet eine Testpraxis der passenden Testhaltung zu.',
    taskArchetype: 'choice-diagnose',
    authorityMode: 'static',
    masteryEligible: true,
    caseTypes: [{ caseId: 'csv-off-by-one-reproduce-smallest' }],
    difficultyProfiles: [...DIFFICULTY_PROFILES],
    competencyIds: ['c-testing-debugging', 'c-meta-learning'],
    graderId: 'deterministic',
    activityType: 'single-choice',
  },
  {
    familyId: 'classify-control-construct',
    familyGroup: 'classify-concept',
    summary: 'Ordnet ein Code-Fragment dem passenden Kontrollkonstrukt zu.',
    taskArchetype: 'choice-diagnose',
    authorityMode: 'static',
    masteryEligible: true,
    caseTypes: [{ caseId: 'for-over-existing-collection' }],
    difficultyProfiles: [...DIFFICULTY_PROFILES],
    competencyIds: ['c-python-control-flow'],
    graderId: 'deterministic',
    activityType: 'single-choice',
  },
  {
    familyId: 'classify-python-collection-choice',
    familyGroup: 'classify-concept',
    summary: 'Ordnet eine Aufgabe der passenden Python-Collection zu.',
    taskArchetype: 'choice-diagnose',
    authorityMode: 'static',
    masteryEligible: true,
    caseTypes: [{ caseId: 'membership-set-for-dedup' }],
    difficultyProfiles: [...DIFFICULTY_PROFILES],
    competencyIds: ['c-python-collections'],
    graderId: 'deterministic',
    activityType: 'single-choice',
  },
  {
    familyId: 'classify-exception-placement',
    familyGroup: 'classify-concept',
    summary: 'Ordnet eine Ausnahmebehandlung dem passenden Platzierungsort zu.',
    taskArchetype: 'choice-diagnose',
    authorityMode: 'static',
    masteryEligible: true,
    caseTypes: [{ caseId: 'translate-error-to-issue' }],
    difficultyProfiles: [...DIFFICULTY_PROFILES],
    competencyIds: ['c-python-files-errors'],
    graderId: 'deterministic',
    activityType: 'single-choice',
  },
];

/** Vertrag + Runtime-Funktionen je Familie. Die Registry-Datei paart daraus
 *  `{...contract, generate, solve}` im S4C-Stil. */
export const FOUNDATIONS_CHOICE_FAMILY_SPECS = [
  { contract: FOUNDATIONS_CHOICE_CONTRACTS[0], generate: generateStringImmutabilityFamily, solve: solveStringImmutability },
  { contract: FOUNDATIONS_CHOICE_CONTRACTS[1], generate: generateSetOperationFamily, solve: solveSetOperation },
  { contract: FOUNDATIONS_CHOICE_CONTRACTS[2], generate: generateErrorHypothesisFamily, solve: solveErrorHypothesis },
  { contract: FOUNDATIONS_CHOICE_CONTRACTS[3], generate: generateTestAttitudeFamily, solve: solveTestAttitude },
  { contract: FOUNDATIONS_CHOICE_CONTRACTS[4], generate: generateControlConstructFamily, solve: solveControlConstruct },
  { contract: FOUNDATIONS_CHOICE_CONTRACTS[5], generate: generatePythonCollectionFamily, solve: solvePythonCollection },
  { contract: FOUNDATIONS_CHOICE_CONTRACTS[6], generate: generateExceptionPlacementFamily, solve: solveExceptionPlacement },
];
