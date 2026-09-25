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
// (authorityMode überall static, außer classify-error-hypothesis: seeded).
//
// authorityMode der Verträge ist static (S4D1-Vorgabe), nur
// classify-error-hypothesis führt seeded: der Potenzgesetz-Fall zieht seinen
// Inhalt pro Seed (Fehlerart, Basis, Exponenten). Der eingefrorene
// seeded-error-pattern-cases-Fall bleibt als Fallkörper serialisiert
// (Distraktor-Reihenfolge = rotierte Bank-Reihenfolge). masteryEligible ist
// überall true (S4D1-Vorgabe; w02-e3/w03-e2 zählen im Content als reiner
// Bearbeitungsnachweis, in der Familien-Runtime als Mastery-Nachweis).
//
// Kein UI, kein Ledger, kein Content-Edit. Die Generatoren stehen bewusst
// NICHT in SEED_GENERATORS (Familien-Generatoren haben Falltyp und Profil,
// nicht nur einen Seed — S4C-Präzedenz generateGitOperationFamily).
import { rng, randInt, variantCaseIndex, buildRotatedChoices, CHOICE_IDS } from './generator_draw_kit.mjs';
import { registerStaticCases, staticCaseBody, variantOf } from '../domain/family_registry.mjs';
import stringImmutabilityDoc from '../../../content/families/classify-string-immutability.json' with { type: 'json' };
import setOperationDoc from '../../../content/families/classify-set-operation-semantics.json' with { type: 'json' };
import errorHypothesisDoc from '../../../content/families/classify-error-hypothesis.json' with { type: 'json' };
import testAttitudeDoc from '../../../content/families/classify-test-attitude.json' with { type: 'json' };
import controlConstructDoc from '../../../content/families/classify-control-construct.json' with { type: 'json' };
import pythonCollectionDoc from '../../../content/families/classify-python-collection-choice.json' with { type: 'json' };
import exceptionPlacementDoc from '../../../content/families/classify-exception-placement.json' with { type: 'json' };

const CHOICE_COUNT = { intro: 2, core: 4, stretch: 4, challenge: 4 };

/** Eingefrorener Seed der autorisierten Default-Instanz von
 *  f-meta-error-classify-01 (sourceLineage.seed, expectedAnswer.defaultSeed).
 *  Der Fallkörper in content/families/classify-error-hypothesis.json
 *  serialisiert die Inhalte von genMetaErrorClassify(3401) (Fall off-by-one)
 *  in kanonischer Ordnung: korrekte Wahl an Position a, Distraktoren in
 *  rotierter Bank-Reihenfolge. */
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

/** Generische statische Choice-Maschine: Der Seed waehlt den Variantenkoerper
 *  via variantOf (ohne Aufloesung zeigte jeder Seed denselben Fall) und
 *  rotiert die Position der korrekten Antwort (intro zeigt 2, alle anderen
 *  Profile 4 Optionen). Der Fallkörper kommt aus der Registry; die korrekte
 *  Option steht in der autorisierten Reihenfolge an Position 0 der
 *  choices-Liste. */
function generateStaticChoice(familyId, { seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const choiceCount = CHOICE_COUNT[difficulty];
  if (!choiceCount) throw new Error(`Unbekanntes Profil ${difficulty}`);
  ensureChoiceDocs();
  const meta = staticCaseBody(familyId, caseId);
  const { body: chosen, index } = variantOf(meta, seed);
  const correct = chosen.choices.find((choice) => choice.correct)?.text;
  const distractors = chosen.choices.filter((choice) => !choice.correct).map((choice) => choice.text);
  const options = [correct, ...distractors.slice(0, choiceCount - 1)];
  const rotation = variantCaseIndex(seed, options.length);
  const ids = CHOICE_IDS.slice(0, options.length);
  return {
    parameters: {
      caseId,
      difficulty,
      ...(Array.isArray(meta.variants) && meta.variants.length ? { variant: index } : {}),
      ...(chosen.parameters || {}),
    },
    expected: {},
    choices: buildRotatedChoices(options, rotation, ids),
    prompt: chosen.prompt,
    fullSolution: chosen.fullSolution,
    ...(chosen.hints ? { hints: chosen.hints } : {}),
    ...(chosen.feedbackRules ? { feedbackRules: chosen.feedbackRules } : {}),
    ...(chosen.typicalErrors ? { typicalErrors: chosen.typicalErrors } : {}),
    ...(chosen.competencyIds ? { competencyIds: chosen.competencyIds } : {}),
    ...(chosen.masteryEligible !== undefined ? { masteryEligible: chosen.masteryEligible } : {}),
  };
}

/** Unabhängiger Solver: Die korrekte Antwort folgt aus dem gezogenen
 *  Variantenkörper — parameters.variant loest ihn wie in
 *  staticFamilySpec.solve ueber den Index auf. */
function solveStaticChoice(familyId, parameters) {
  ensureChoiceDocs();
  const meta = staticCaseBody(familyId, parameters?.caseId);
  const { body } = variantOf(meta, parameters?.variant ?? 0);
  return { correctText: body.choices.find((choice) => choice.correct).text };
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

// --- classify-error-hypothesis (ein Seed-Fall, zwei Shard-Fälle) ------------
// base-vs-exponent-confusion: geseedeter Fall f-algebra-debug-01 — der Seed
// zieht Fehlerart, Basis und Exponenten; Prompt, Optionen und Lösung werden
// aus den Parametern erzeugt (Misconception-Raum: Basis mitmultipliziert,
// Exponenten multipliziert statt addiert, Potenz-Exponenten addiert statt
// multipliziert). Der Solver rekonstruiert correctText aus parameters.
// seeded-error-pattern-cases: geseedetes Mitglied f-meta-error-classify-01,
// hier eingefroren auf die autorisierte Default-Instanz (Seed 3401,
// staticBodyInstance).
// error-journal-next-test: statisches Mitglied f-meta-error-log-01.

const POWER_LAW_KINDS = ['product-base-multiplied', 'product-exp-multiplied', 'power-exp-added'];

const powerLawClaim = ({ kind, base, m, n }) => {
  if (kind === 'product-base-multiplied') return `$${base}^{${m}} \\cdot ${base}^{${n}} = ${base * base}^{${m + n}}$`;
  if (kind === 'product-exp-multiplied') return `$${base}^{${m}} \\cdot ${base}^{${n}} = ${base}^{${m * n}}$`;
  return `$(${base}^{${m}})^{${n}} = ${base}^{${m + n}}$`;
};

const powerLawCorrectText = ({ kind, base, m, n }) => {
  if (kind === 'product-base-multiplied') {
    return `Bei gleicher Basis werden die Exponenten addiert — die Basis bleibt $${base}$, richtig wäre $${base}^{${m + n}}$.`;
  }
  if (kind === 'product-exp-multiplied') {
    return `Bei gleicher Basis werden die Exponenten addiert, nicht multipliziert — richtig wäre $${base}^{${m + n}}$.`;
  }
  return `Beim Potenzieren einer Potenz werden die Exponenten multipliziert — richtig wäre $${base}^{${m * n}}$.`;
};

const powerLawDistractors = ({ kind, base, m, n }) => {
  if (kind === 'product-base-multiplied') {
    return [
      `Die Exponenten müssten multipliziert werden — richtig wäre $${base}^{${m * n}}$.`,
      `Nur der Exponent ist falsch; die Basis $${base * base}$ stimmt.`,
      `Potenzen mit gleicher Basis dürfen nicht multipliziert werden.`,
    ];
  }
  if (kind === 'product-exp-multiplied') {
    return [
      `Die Basis müsste mitmultipliziert werden — richtig wäre $${base * base}^{${m + n}}$.`,
      `Der Exponent $${m * n}$ stimmt; der Fehler liegt in der Basis.`,
      `Die Behauptung stimmt.`,
    ];
  }
  return [
    `Die Exponenten müssten addiert und die Basis quadriert werden — richtig wäre $${base * base}^{${m + n}}$.`,
    `Die Behauptung stimmt.`,
    `Potenzen dürfen nicht potenziert werden.`,
  ];
};

const powerLawSolution = ({ kind, base, m, n }) => {
  if (kind === 'product-base-multiplied') {
    return `$${base}^{${m}} \\cdot ${base}^{${n}} = ${base}^{${m}+${n}} = ${base}^{${m + n}}$. Bei gleicher Basis werden die Exponenten addiert — die Basis wird nicht zu $${base * base}$.`;
  }
  if (kind === 'product-exp-multiplied') {
    return `$${base}^{${m}} \\cdot ${base}^{${n}} = ${base}^{${m}+${n}} = ${base}^{${m + n}}$. Bei gleicher Basis werden die Exponenten addiert, nicht multipliziert.`;
  }
  return `$(${base}^{${m}})^{${n}} = ${base}^{${m} \\cdot ${n}} = ${base}^{${m * n}}$. Beim Potenzieren einer Potenz werden die Exponenten multipliziert, nicht addiert.`;
};

/** Seeded power-law error diagnosis: the seed draws the committed misrule,
 *  base and exponents; distractors are the other misrules (never a rephrase
 *  of the correct rule). Rotation keeps the pinned convention
 *  choices[|seed| % n]. */
function genPowerLawErrorCase({ seed, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const choiceCount = CHOICE_COUNT[difficulty];
  if (!choiceCount) throw new Error(`Unbekanntes Profil ${difficulty}`);
  const r = rng(seed >>> 0);
  const kind = POWER_LAW_KINDS[Math.floor(r() * POWER_LAW_KINDS.length)];
  const base = [2, 3, 5][randInt(r, 0, 2)];
  let m;
  let n;
  // m·n = m+n would make a wrong claim coincide with the correct value
  // (2^2·2^2 = 2^4 either way). 2(m+n) = m·n makes the "(b²)^(m+n)"
  // distractor claim the true value numerically (e.g. m=n=4). Both draws
  // are ambiguous for diagnosis, so they are excluded for every kind.
  const ambiguous = () => m * n === m + n || 2 * (m + n) === m * n;
  if (kind === 'power-exp-added') {
    do { m = randInt(r, 2, 4); n = randInt(r, 2, 4); } while (ambiguous());
  } else {
    do { m = randInt(r, 2, 6); n = randInt(r, 2, 4); } while (ambiguous());
  }
  const parameters = { caseId: 'base-vs-exponent-confusion', difficulty, kind, base, m, n };
  const correct = powerLawCorrectText(parameters);
  const distractors = powerLawDistractors(parameters);
  const drawn = choiceCount - 1 >= distractors.length
    ? distractors
    : [distractors[randInt(r, 0, distractors.length - 1)]];
  const options = [correct, ...drawn];
  const rotation = variantCaseIndex(seed, options.length);
  return {
    parameters,
    expected: {},
    choices: buildRotatedChoices(options, rotation, CHOICE_IDS.slice(0, options.length)),
    title: 'Potenzgesetz-Fehlerdiagnose',
    prompt: `Eine Lösung behauptet ${powerLawClaim(parameters)}. Welche Diagnose trifft den ersten Fehler?`,
    fullSolution: powerLawSolution(parameters),
    hints: [
      'Trenne Basis und Exponent: Welche Seite der Behauptung verändert welchen Teil?',
      kind === 'power-exp-added'
        ? `Rechne die linke Seite aus: $(${base}^{${m}})^{${n}} = ${base}^{${m} \\cdot ${n}}$.`
        : `Rechne die linke Seite aus: $${base}^{${m}} \\cdot ${base}^{${n}} = ${base}^{${m} + ${n}}$.`,
    ],
    masteryEligible: true,
  };
}

export function generateErrorHypothesisFamily({ seed, caseId, difficulty }) {
  if (caseId === 'base-vs-exponent-confusion') return genPowerLawErrorCase({ seed, difficulty });
  return generateStaticChoice('classify-error-hypothesis', { seed, caseId, difficulty });
}

export function solveErrorHypothesis(parameters) {
  if (parameters?.kind && parameters?.caseId === 'base-vs-exponent-confusion') {
    return { correctText: powerLawCorrectText(parameters) };
  }
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
    authorityMode: 'seeded',
    masteryEligible: true,
    caseTypes: [
      { caseId: 'base-vs-exponent-confusion' },
      { caseId: 'seeded-error-pattern-cases', propertyTest: false },
      { caseId: 'error-journal-next-test', propertyTest: false },
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
