// S4D1 Choice-Familien: statische choice-diagnose-Runtime für Foundations.
//
// Jede Familie ordnet eine Beobachtung anhand eines Konzeptsystems einer
// Klasse zu (Referenzmodell = das Konzeptsystem, Lösungsweg = Zuordnen).
// Alle Inhalte sind wörtlich aus den autoritativen Family-Shards übernommen.
// Falltypen sind kanonische Foundations-Fälle (authorityMode überall static,
// außer seeded-error-pattern-cases: seeded).
//
// authorityMode der Verträge ist überall static (S4D1-Vorgabe): auch der
// seeded-error-pattern-cases-Fall ist auf die autorisierte Default-Instanz
// (deterministicSeed 3401, Fall off-by-one) eingefroren — der Seed rotiert
// nur die Antwortposition, niemals den Inhalt. masteryEligible ist überall
// true (S4D1-Vorgabe; w02-e3/w03-e2 zählen im Content als reiner
// Bearbeitungsnachweis, in der Familien-Runtime als Mastery-Nachweis).
//
// Kein UI, kein Ledger, kein Content-Edit. Die Generatoren stehen bewusst
// NICHT in SEED_GENERATORS (Familien-Generatoren haben Falltyp und Profil,
// nicht nur einen Seed — S4C-Präzedenz generateGitOperationFamily).
import { genMetaErrorClassify } from './foundations_fresh_generators.mjs';
import { variantCaseIndex, buildRotatedChoices } from './generator_draw_kit.mjs';

const CHOICE_COUNT = { intro: 2, core: 4, stretch: 4, challenge: 4 };
const CHOICE_IDS = ['a', 'b', 'c', 'd'];

/** Eingefrorener Seed der autorisierten Default-Instanz von
 *  f-meta-error-classify-01 (sourceLineage.seed, expectedAnswer.defaultSeed).
 *  genMetaErrorClassify(3401) ist byte-identisch mit der autorisierten
 *  Definition (Fall off-by-one, korrekte Wahl b). */
export const FROZEN_META_ERROR_SEED = 3401;

/** Generische statische Choice-Maschine: Der Seed rotiert nur die Position
 *  der korrekten Antwort (intro zeigt 2, alle anderen Profile 4 Optionen).
 *  Die korrekte Antwort ist eine reine Funktion der caseId. */
function generateStaticChoice(bank, { seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const choiceCount = CHOICE_COUNT[difficulty];
  if (!choiceCount) throw new Error(`Unbekanntes Profil ${difficulty}`);
  const meta = bank.find((item) => item.caseId === caseId);
  if (!meta) throw new Error(`Unbekannter Fall ${caseId}`);
  const options = [meta.correct, ...meta.distractors.slice(0, choiceCount - 1)];
  const rotation = variantCaseIndex(seed, options.length);
  const ids = CHOICE_IDS.slice(0, options.length);
  return {
    parameters: { caseId, difficulty, ...(meta.parameters || {}) },
    expected: { correctChoice: ids[rotation] },
    choices: buildRotatedChoices(options, rotation, ids),
    prompt: meta.prompt,
    fullSolution: meta.solution,
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
function solveStaticChoice(bank, parameters) {
  const meta = bank.find((item) => item.caseId === parameters?.caseId);
  if (!meta) throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
  return { correctText: meta.correct };
}

// --- classify-string-immutability (Shard-Fall, Quelle w02-e3) ---------------

export const STRING_IMMUTABILITY_CASES = [
  {
    caseId: 'string-item-assignment-typeerror',
    sourceId: 'w02-e3',
    prompt: 'Was passiert beim Ausführen dieses Programms?\n\n<code>name = "Ada"\nname[0] = "M"\nprint(name)</code>',
    correct: 'Das Programm bricht mit einem TypeError ab: Strings unterstützen keine Zuweisung an einzelne Zeichen.',
    distractors: [
      'Es gibt "Mda" aus, weil das erste Zeichen ersetzt wird.',
      'Es gibt "MAda" aus, weil das Zeichen eingefügt statt ersetzt wird.',
      'Es gibt "Ada" aus, weil Zuweisungen an Strings still ignoriert werden.',
    ],
    solution: 'name[0] = "M" wirft TypeError: \'str\' object does not support item assignment. Strings sind unveränderlich; jede Änderung erzeugt einen neuen String. Konzeptfrage: zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis.',
  },
];

export function generateStringImmutabilityFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice(STRING_IMMUTABILITY_CASES, { seed, caseId, difficulty });
}

export function solveStringImmutability(parameters) {
  return solveStaticChoice(STRING_IMMUTABILITY_CASES, parameters);
}

// --- classify-set-operation-semantics (Shard-Fall, Quelle w03-e2) -----------

export const SET_OPERATION_CASES = [
  {
    caseId: 'dedup-and-intersection',
    sourceId: 'w03-e2',
    prompt: 'Gegeben:\n\n<code>a = {"ki", "lern", "ki"}\nb = {"lern", "plattform"}</code>\n\nWelche Aussage über <code>len(a)</code> und <code>a &amp; b</code> ist korrekt?',
    correct: 'len(a) ist 2 und a & b ist {"lern"} — Mengen speichern jedes Element nur einmal, & bildet den Durchschnitt.',
    distractors: [
      'len(a) ist 3 und a & b ist {"lern"} — das doppelte "ki" bleibt erhalten.',
      'len(a) ist 2 und a & b ist {"ki", "lern", "plattform"} — & verbindet beide Mengen.',
      'len(a) ist 3 und a & b ist {"ki", "lern", "plattform"} — & verbindet und erhält Duplikate.',
    ],
    solution: 'a = {"ki", "lern"} (Duplikat entfällt), len(a) = 2. a & b = {"lern"}. Konzeptfrage: zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis.',
  },
];

export function generateSetOperationFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice(SET_OPERATION_CASES, { seed, caseId, difficulty });
}

export function solveSetOperation(parameters) {
  return solveStaticChoice(SET_OPERATION_CASES, parameters);
}

// --- classify-error-hypothesis (beide Shard-Fälle) ---------------------------
// base-vs-exponent-confusion: statisches Mitglied f-algebra-debug-01.
// seeded-error-pattern-cases: geseedetes Mitglied f-meta-error-classify-01,
// hier eingefroren auf die autorisierte Default-Instanz (Seed 3401). Der
// Shard führt authorityMode seeded; die Familien-Runtime friert den Inhalt
// ein (static), weil S4D1 keine Seed-Variation des Inhalts vorsieht —
// derselbe Freeze, den jede statische Migration eines Seed-Generators
// vornimmt (Präzedenz w01-e1 static neben w01-e8 seeded, family-model §4).

const frozenMetaError = genMetaErrorClassify(FROZEN_META_ERROR_SEED);

export const ERROR_HYPOTHESIS_CASES = [
  {
    caseId: 'base-vs-exponent-confusion',
    sourceId: 'f-algebra-debug-01',
    prompt: 'Eine Lösung behauptet `2^3 · 2^4 = 4^7`. Welche Diagnose trifft den ersten Fehler?',
    correct: 'Bei gleicher Basis werden die Exponenten addiert, aber die Basis bleibt 2.',
    distractors: [
      'Die Exponenten müssten multipliziert werden.',
      'Potenzen dürfen nie multipliziert werden.',
      'Nur das Ergebnis 7 ist falsch; die Basis 4 stimmt.',
    ],
    solution: '`2^3 · 2^4 = 2^(3+4) = 2^7`. Die Basis wird nicht zu 4.',
  },
  {
    caseId: 'seeded-error-pattern-cases',
    sourceId: 'f-meta-error-classify-01',
    prompt: frozenMetaError.prompt,
    correct: frozenMetaError.choices.find((choice) => choice.correct).text,
    distractors: frozenMetaError.choices.filter((choice) => !choice.correct).map((choice) => choice.text),
    solution: frozenMetaError.fullSolution,
  },
  {
    caseId: 'error-journal-next-test',
    sourceId: 'f-meta-error-log-01',
    sourceLineage: ['f-meta-error-log-01'],
    competencyIds: ['c-meta-learning'],
    masteryEligible: true,
    prompt: 'Eine generierte Gleichungsaufgabe wurde mit falschem Vorzeichen gelöst. Welcher Journaleintrag erzeugt den besten nächsten Lernschritt?',
    correct: 'Beobachtung und kleinste Reproduktion notieren, die Vorzeichenregel als Ursachenhypothese benennen und dieselbe Regel an einer frischen Instanz gezielt testen',
    distractors: [
      'Nur ‚Algebra schlecht‘ notieren und die gesamte Lektion erneut lesen',
      'Die Musterlösung abschreiben und den Fehler als erledigt markieren',
      'Den Kompetenzstatus manuell auf nachgewiesen setzen',
    ],
    solution: 'Der vollständige Eintrag enthält beobachtbares Symptom, kleinste Reproduktion, eine konkrete Ursachenhypothese und einen frischen Test. So entsteht eine überprüfbare Handlung statt eines pauschalen Urteils.',
    hints: [
      'Eine Hypothese muss durch einen nächsten Versuch widerlegbar sein.',
      'Trenne Beobachtung, Ursache und nächsten Test.',
    ],
    typicalErrors: ['pauschales Selbsturteil', 'Ursache ohne Gegenprobe', 'Musterlösung mit eigenem Abruf verwechseln'],
    tolerancePolicy: { mode: 'exact' },
  },
];

export function generateErrorHypothesisFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice(ERROR_HYPOTHESIS_CASES, { seed, caseId, difficulty });
}

export function solveErrorHypothesis(parameters) {
  return solveStaticChoice(ERROR_HYPOTHESIS_CASES, parameters);
}

// --- classify-test-attitude (Shard-Fall, Quelle f-testing-choice-01) --------

export const TEST_ATTITUDE_CASES = [
  {
    caseId: 'csv-off-by-one-reproduce-smallest',
    sourceId: 'f-testing-choice-01',
    prompt: 'Ein Test erwartet für die zweite Datenzeile CSV-Zeilennummer 3, dein Code meldet 2. Was ist der beste nächste Diagnoseschritt?',
    correct: 'Den kleinsten Fall reproduzieren und prüfen, ob Header und nullbasierter Index in der Umrechnung fehlen.',
    distractors: [
      'Die Erwartung ohne weitere Prüfung auf 2 ändern.',
      'Alle Tests vorübergehend löschen.',
      'Den Fehler mit `except Exception` unterdrücken.',
    ],
    solution: 'Die Differenz um eins spricht für Header- oder Indexumrechnung. Der kleine reproduzierbare Fall kann diese Hypothese bestätigen oder verwerfen.',
  },
];

export function generateTestAttitudeFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice(TEST_ATTITUDE_CASES, { seed, caseId, difficulty });
}

export function solveTestAttitude(parameters) {
  return solveStaticChoice(TEST_ATTITUDE_CASES, parameters);
}

// --- classify-control-construct (Shard-Fall, Quelle f-control-choice-01) ----

export const CONTROL_CONSTRUCT_CASES = [
  {
    caseId: 'for-over-existing-collection',
    sourceId: 'f-control-choice-01',
    prompt: 'Du willst jeden Wert einer bereits vorhandenen Liste genau einmal prüfen. Welche Schleifenform drückt diese Absicht am direktesten aus?',
    correct: '`for value in values:`',
    distractors: [
      '`while True:` ohne expliziten Abbruch',
      'Eine rekursive Funktion ohne Basisfall',
      'Ein einzelnes `if`, das nur das erste Element prüft',
    ],
    solution: '`for value in values` iteriert direkt über jedes vorhandene Element. Eine while-Schleife ist passender, wenn die Wiederholung von einer sich ändernden Bedingung statt von einer vorhandenen Collection abhängt.',
  },
];

export function generateControlConstructFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice(CONTROL_CONSTRUCT_CASES, { seed, caseId, difficulty });
}

export function solveControlConstruct(parameters) {
  return solveStaticChoice(CONTROL_CONSTRUCT_CASES, parameters);
}

// --- classify-python-collection-choice (Shard-Fall, f-collections-choice-01) -

export const PYTHON_COLLECTION_CASES = [
  {
    caseId: 'membership-set-for-dedup',
    sourceId: 'f-collections-choice-01',
    prompt: 'Du verarbeitest IDs in Reihenfolge und willst bei jeder ID schnell prüfen, ob sie bereits vorkam. Welche zusätzliche Struktur passt am besten?',
    correct: 'Ein Set `seen`, das jede erstmals gelesene ID aufnimmt.',
    distractors: [
      'Eine Zahl, die nur die bisherige Zeilenanzahl speichert.',
      'Ein String mit allen IDs ohne Trennzeichen.',
      'Nur die zuletzt gelesene ID.',
    ],
    solution: 'Ein Set speichert eindeutige IDs. `id in seen` prüft, ob die ID bereits verarbeitet wurde.',
  },
];

export function generatePythonCollectionFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice(PYTHON_COLLECTION_CASES, { seed, caseId, difficulty });
}

export function solvePythonCollection(parameters) {
  return solveStaticChoice(PYTHON_COLLECTION_CASES, parameters);
}

// --- classify-exception-placement (Shard-Fall, Quelle f-files-choice-01) ----

export const EXCEPTION_PLACEMENT_CASES = [
  {
    caseId: 'translate-error-to-issue',
    sourceId: 'f-files-choice-01',
    prompt: '`parse_age` wirft bei ungültigem Text `ValueError`. Wo sollte der CLI-Datenprüfer diesen erwarteten Fehler behandeln?',
    correct: 'Dort, wo eine Zeile in einen konkreten Issue-Eintrag übersetzt werden kann.',
    distractors: [
      'Ganz innen mit `except Exception: pass`, damit kein Fehler sichtbar bleibt.',
      'Gar nicht; jede ungültige CSV-Zelle soll das ganze Programm beenden.',
      'In jedem Funktionsaufruf unabhängig davon, ob eine Entscheidung möglich ist.',
    ],
    solution: 'Der Aufrufer kennt Zeilennummer und Spalte und kann den ValueError dort in einen präzisen Issue-Eintrag übersetzen.',
  },
];

export function generateExceptionPlacementFamily({ seed, caseId, difficulty }) {
  return generateStaticChoice(EXCEPTION_PLACEMENT_CASES, { seed, caseId, difficulty });
}

export function solveExceptionPlacement(parameters) {
  return solveStaticChoice(EXCEPTION_PLACEMENT_CASES, parameters);
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
