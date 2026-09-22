import { graders } from '../core/graders.js';
import { variantCaseIndex } from '../core/generator_draw_kit.mjs';

// S4D1: zentrale Familien-Runtime (eine Semantik, keine Duplikate).
// Hierher ausgelagert, damit exercise_registry.mjs und die dünnen
// Domänen-Registry-Module dieselbe Implementierung nutzen, ohne
// zirkulär voneinander abzuhängen.
const FAMILY_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const DIFFICULTY_ORDER = ['intro', 'core', 'stretch', 'challenge'];
const staticCases = new Map();

export const variantOf = (body, seed) => {
  const all = [body, ...(body.variants || [])];
  const index = variantCaseIndex(seed, all.length);
  const variant = all[index];
  return {
    index,
    body: {
      ...body,
      ...variant,
      variants: undefined,
      parameters: { ...(body.parameters || {}), ...(variant.parameters || {}) },
    },
  };
};

export function registerStaticCases(familyId, cases) {
  if (!FAMILY_ID.test(familyId)) throw new Error(`Ungültige familyId ${familyId}`);
  if (!Array.isArray(cases)) throw new Error(`${familyId}: Fälle müssen eine Liste sein`);
  const byCase = new Map();
  for (const body of cases) {
    if (!body || typeof body.caseId !== 'string' || !FAMILY_ID.test(body.caseId)) {
      throw new Error(`${familyId}: Ungültige caseId`);
    }
    if (byCase.has(body.caseId)) throw new Error(`${familyId}: Fall doppelt: ${body.caseId}`);
    byCase.set(body.caseId, body);
  }
  const existing = staticCases.get(familyId);
  if (existing) {
    for (const [caseId, body] of byCase) {
      if (!existing.has(caseId)) existing.set(caseId, body);
    }
    return;
  }
  staticCases.set(familyId, byCase);
}

export function staticCaseBody(familyId, caseId) {
  const body = staticCases.get(familyId)?.get(caseId);
  if (!body) throw new Error(`${familyId}:${caseId}: Fallkörper nicht geladen`);
  return body;
}

export function staticFamilySpec(doc) {
  if (!doc?.contract) throw new Error(`${doc?.familyId || '(leer)'}: Statischer Vertrag fehlt`);
  const cases = Array.isArray(doc.cases) ? doc.cases : [];
  const isMasteryEligible = (item) => item.graderId !== 'manual-rubric' && item.masteryEligible === true;
  const difficultyProfiles = [...new Set(cases.map((item) => item.difficultyProfile))]
    .sort((left, right) => DIFFICULTY_ORDER.indexOf(left) - DIFFICULTY_ORDER.indexOf(right));
  return {
    ...doc.contract,
    familyId: doc.familyId,
    masteryEligible: cases.some(isMasteryEligible),
    difficultyProfiles,
    caseTypes: cases.map((item) => ({
      caseId: item.caseId,
      propertyTest: Array.isArray(item.variants) && item.variants.length > 0,
    })),
    generate: ({ seed, caseId, difficulty }) => {
      const body = staticCaseBody(doc.familyId, caseId);
      if (body.difficultyProfile !== difficulty) {
        throw new Error(`Unbekanntes Profil ${difficulty} für Fall ${caseId}`);
      }
      const { body: chosen, index } = variantOf(body, seed ?? 0);
      const {
        caseId: _caseId,
        difficultyProfile: _difficultyProfile,
        masteryEligible: _masteryEligible,
        sourceLineage: _sourceLineage,
        variants: _variants,
        ...generated
      } = chosen;
      return {
        ...generated,
        masteryEligible: isMasteryEligible(body),
        parameters: {
          caseId,
          difficulty,
          variant: index,
          ...(chosen.parameters || {}),
        },
      };
    },
    solve: (parameters) => {
      const { body } = variantOf(staticCaseBody(doc.familyId, parameters.caseId), parameters.variant ?? 0);
      const correct = (body.choices || []).find((choice) => choice.correct);
      return correct ? { correctText: correct.text } : {};
    },
  };
}

/** Static case straight from the registered body (no variant resolution). */
export const staticBodyInstance = (familyId, caseId, difficulty) => {
  const body = staticCaseBody(familyId, caseId);
  const { caseId: _caseId, difficultyProfile: _difficultyProfile, sourceLineage: _sourceLineage, ...generated } = body;
  return { ...generated, parameters: { caseId, difficulty, ...(body.parameters || {}) } };
};

/** Static case with seed-driven variant resolution: the variant index lands
 *  in parameters when the case body carries variants; masteryEligible is the
 *  case body's flag, suppressed for manual-rubric graders. */
export function staticVariantInstance(familyId, caseId, seed, difficulty) {
  const body = staticCaseBody(familyId, caseId);
  const { body: chosen, index } = variantOf(body, seed ?? 0);
  const {
    caseId: _caseId,
    difficultyProfile: _difficultyProfile,
    masteryEligible: _masteryEligible,
    sourceLineage: _sourceLineage,
    variants: _variants,
    ...generated
  } = chosen;
  return {
    ...generated,
    masteryEligible: chosen.graderId !== 'manual-rubric' && body.masteryEligible === true,
    parameters: {
      caseId,
      difficulty,
      ...(Array.isArray(body.variants) && body.variants.length ? { variant: index } : {}),
      ...(chosen.parameters || {}),
    },
  };
}

export function familyIdTokens(familyId) {
  return String(familyId).split('-').filter(Boolean).sort().join('\0');
}

function requireFamily(byId, familyId) {
  const family = byId.get(familyId);
  if (!family) throw new Error(`Unbekannte Familie ${familyId}`);
  return family;
}

function resolveCaseId(family, seed, caseId) {
  if (caseId != null) {
    if (!family.caseTypes.some((item) => item.caseId === caseId)) {
      throw new Error(`Unbekannter Fall ${caseId}`);
    }
    return caseId;
  }
  const cases = family.caseTypes.filter((item) => item.propertyTest !== false);
  if (!cases.length) throw new Error(`${family.familyId}: kein property-testfähiger Fall`);
  return cases[variantCaseIndex(seed, cases.length)].caseId;
}

// S4D2: domain hints derived strictly from instance data (no invented
// content). Level 1 is the family's curated summary. From level 2 the
// case's authored hints serve in order (hints[level-2]); only level 2 has
// an additional activity-type fallback. Without an authored hint, level 2
// derives from answer data where possible — distractor elimination,
// direction for integers, first Parsons line, trace row pointer — else a
// generic per-type strategy that never leaks the solution. A fallback
// returns undefined when the case carries no material it can honestly
// reason about (a bare {activityType} instance gets null, not a canned
// line). Disclosure is not part of this ladder; it runs as a
// solution-revealed event in the view.
const hintForChoice = ({ choices }) => {
  if (!Array.isArray(choices) || !choices.length) return undefined;
  // Naming a distractor only helps while at least one other wrong option
  // stays unknown — with a single wrong option the elimination IS the
  // answer, which would make the hint a disguised reveal.
  const wrongs = choices.filter((choice) => !choice.correct);
  if (wrongs.length >= 2) return `„${wrongs[0].text}“ scheidet aus.`;
  return 'Welche Option verletzt die Regel aus der Aufgabe? Schließe sie aus und begründe die Wahl.';
};
const hintForNumeric = ({ expectedAnswer }, { answer, correct }) => {
  if (expectedAnswer && expectedAnswer.kind === 'integer' && correct === false) {
    const want = expectedAnswer.value;
    const got = Number(answer);
    if (!Number.isFinite(got)) return 'Die Eingabe wird noch nicht als Zahl gelesen — Dezimalpunkt statt Komma?';
    if (got !== want) return got < want ? 'Gesucht ist eine größere Zahl.' : 'Gesucht ist eine kleinere Zahl.';
    return null;
  }
  // Before the first attempt there is no answer to compare — serve an
  // honest estimation strategy instead of a dead hint level.
  if (correct == null && expectedAnswer && expectedAnswer.kind === 'integer') {
    return 'Schätze das Ergebnis zuerst grob — ein plausibler Überschlag macht Rechenfehler sofort sichtbar.';
  }
  return undefined;
};
const hintForParsons = ({ parameters, expectedAnswer }, { correct }) => {
  if (expectedAnswer && Array.isArray(expectedAnswer.solutionOrder) && correct === false) {
    const fragments = parameters && Array.isArray(parameters.fragments) ? parameters.fragments : [];
    const first = fragments.find((fragment) => fragment && fragment.id === expectedAnswer.solutionOrder[0]);
    return first ? `Beginne mit: „${first.text}“.` : null;
  }
  if (correct == null && expectedAnswer && Array.isArray(expectedAnswer.solutionOrder)) {
    return 'Sortiere zuerst die Zeilen, deren Position sicher ist — Distraktoren fallen dabei von selbst auf.';
  }
  return undefined;
};
const hintForPythonCode = ({ parameters, expectedAnswer }) => (
  parameters || expectedAnswer
    ? 'Lies die Fehlermeldung von unten nach oben — die letzte Zeile nennt den Fehlertyp, die Zeilen darüber den Ort.'
    : undefined
);
const hintForCodeTrace = ({ parameters, expectedAnswer }) => (
  parameters || expectedAnswer
    ? 'Notiere nach jeder Zeile die Werte aller Variablen — eine Zuweisung verändert nur ihre eigene Variable.'
    : undefined
);
const hintForPredictOutput = ({ parameters, expectedAnswer, traceTable }, { firstBadRow }) => {
  if (traceTable) {
    if (Number.isInteger(firstBadRow) && firstBadRow >= 0) {
      return `Rechne Zeile ${firstBadRow + 1} neu, der Rest steht.`;
    }
    return 'Eine Zuweisung verändert nur ihre eigene Variable — alle anderen Werte übernimmst du unverändert in die nächste Zeile.';
  }
  if (expectedAnswer || parameters) {
    return 'Führe den Code Zeile für Zeile gedanklich aus und notiere jede Ausgabe sofort — Reihenfolge und Zeilenumbrüche zählen.';
  }
  return undefined;
};
const hintForMultipleChoice = ({ choices }) => {
  if (!Array.isArray(choices) || !choices.length) return undefined;
  // Same reveal guard as single-choice: naming the only wrong option
  // discloses the full correct set.
  const wrongs = choices.filter((choice) => !choice.correct);
  if (wrongs.length >= 2) return `„${wrongs[0].text}“ scheidet aus.`;
  return 'Prüfe jede Option einzeln auf wahr oder falsch, bevor du auswählst — mehrere können zutreffen.';
};
const hintForDiagnosis = ({ expectedAnswer }) => (
  expectedAnswer && expectedAnswer.kind === 'diagnosis'
    ? 'Benenne die eigentliche Fehlerursache in eigenen Worten: Welche Annahme stimmt nicht, und was folgt daraus?'
    : undefined
);
const hintForFading = ({ expectedAnswer }) => (
  expectedAnswer && expectedAnswer.kind === 'gaps'
    ? 'Betrachte jede Lücke im Kontext des Schritts davor: Welcher Wert muss stehen, damit der nächste Schritt stimmt?'
    : undefined
);
const hintForVector = ({ expectedAnswer }) => (
  expectedAnswer && Array.isArray(expectedAnswer.solution)
    ? 'Rechne komponentenweise — ein Vektor ist ein Tupel unabhängiger Zahlen.'
    : undefined
);
const hintForExpression = ({ expectedAnswer }) => (
  expectedAnswer && typeof expectedAnswer.expression === 'string'
    ? 'Forme schrittweise um — oder prüfe deinen Term mit einer konkreten Zahl für x.'
    : undefined
);
const ACTIVITY_HINTS = {
  'single-choice': hintForChoice,
  numeric: hintForNumeric,
  parsons: hintForParsons,
  'python-code': hintForPythonCode,
  'code-trace': hintForCodeTrace,
  'predict-output': hintForPredictOutput,
  'multiple-choice': hintForMultipleChoice,
  'diagnostic-rationale': hintForDiagnosis,
  'worked-example-fading': hintForFading,
  vector: hintForVector,
  'algebraic-expression': hintForExpression,
};

/**
 * @param {{ summary?: string | null, activityType?: string, choices?: Array<{ id: string, text: string, correct?: boolean }> | null, parameters?: Record<string, unknown> | null, expectedAnswer?: Record<string, unknown> | null, traceTable?: unknown, hints?: string[] | null }} instance
 * @param {{ level?: number, answer?: unknown, correct?: boolean | null, firstBadRow?: number | null }} context
 */
export function familyHint(
  { summary = null, activityType = '', choices = null, parameters = null, expectedAnswer = null, traceTable = null, hints = null } = {},
  { level = 0, answer = null, correct = null, firstBadRow = null } = {},
) {
  if (level === 1) return typeof summary === 'string' && summary ? summary : null;
  if (!Number.isInteger(level) || level < 2) return null;
  const authored = Array.isArray(hints) ? hints[level - 2] : null;
  if (typeof authored === 'string' && authored) return authored;
  if (level !== 2) return null;
  const material = { choices, parameters, expectedAnswer, traceTable };
  let activityHint = ACTIVITY_HINTS[activityType]?.(material, { answer, correct, firstBadRow });
  if (!activityHint && (answer !== null || correct !== null || firstBadRow !== null)) {
    // The context-refined fallback can come back empty for inputs it cannot
    // reason about — retry under the neutral context familyMaxHints counted,
    // so a promised level never dead-clicks.
    activityHint = ACTIVITY_HINTS[activityType]?.(material, { answer: null, correct: null, firstBadRow: null });
  }
  if (activityHint) return activityHint;
  // Defensive tail for non-predict-output instances carrying a traceTable:
  // predict-output itself serves the row pointer through its fallback.
  if (traceTable && Number.isInteger(firstBadRow) && firstBadRow >= 0) {
    return `Rechne Zeile ${firstBadRow + 1} neu, der Rest steht.`;
  }
  return null;
}

/** Number of hint levels the sequential ladder actually serves for this
 *  instance — what the view may promise on the hint button without a dead
 *  click. Level 1 counts only when the family summary is a non-empty
 *  string; authored `hints` fill levels 2..n in order, and level 2 (only)
 *  is additionally covered by the activity-type fallback when the case
 *  material supports it under a neutral context ({answer:null,
 *  correct:null, firstBadRow:null} — i.e. before any attempt). Hints that
 *  need a prior wrong answer to refine — like the numeric up/down pointer
 *  — are not counted, so the result is a floor, not a ceiling. The ladder
 *  is contiguous: counting stops at the first level familyHint would not
 *  serve, and a missing level-1 summary reports 0 even when authored hints
 *  exist (the first click would be dead).
 * @param {{ summary?: string | null, activityType?: string, choices?: Array<{ id: string, text: string, correct?: boolean }> | null, parameters?: Record<string, unknown> | null, expectedAnswer?: Record<string, unknown> | null, traceTable?: unknown, hints?: string[] | null }} instance */
export function familyMaxHints(
  { summary = null, activityType = '', choices = null, parameters = null, expectedAnswer = null, traceTable = null, hints = null } = {},
) {
  if (typeof summary !== 'string' || !summary) return 0;
  const authored = Array.isArray(hints) ? hints : [];
  let count = 1;
  for (let level = 2; ; level += 1) {
    const authoredHint = authored[level - 2];
    if (typeof authoredHint === 'string' && authoredHint) {
      count += 1;
      continue;
    }
    if (level === 2) {
      const fallback = ACTIVITY_HINTS[activityType]?.(
        { choices, parameters, expectedAnswer, traceTable },
        { answer: null, correct: null, firstBadRow: null },
      );
      if (typeof fallback === 'string' && fallback) {
        count += 1;
        continue;
      }
    }
    break;
  }
  return count;
}

export function createFamilyRegistry(families) {
  const byId = new Map();
  const byTokens = new Map();
  for (const family of families) {
    if (!FAMILY_ID.test(family.familyId)) throw new Error(`Ungültige familyId ${family.familyId}`);
    if (byId.has(family.familyId)) throw new Error(`Familie doppelt: ${family.familyId}`);
    const tokens = familyIdTokens(family.familyId);
    const taken = byTokens.get(tokens);
    if (taken) throw new Error(`Token-Multiset von ${family.familyId} kollidiert mit ${taken}`);
    if (typeof family.generate !== 'function' || typeof family.solve !== 'function') {
      throw new Error(`${family.familyId}: generate und solve fehlen`);
    }
    // S4D1: mindestens ein Falltyp. Kanonische Singletons haben genau einen
    // echten Shard-Fall; ein erfundener Zweitfall wäre Content-Authoring
    // und daher unzulässig (Ehrlichkeitsregel). Null Fälle bleiben fail-closed.
    if (!Array.isArray(family.caseTypes) || family.caseTypes.length < 1) {
      throw new Error(`${family.familyId}: mindestens ein Falltyp`);
    }
    byId.set(family.familyId, family);
    byTokens.set(tokens, family.familyId);
  }

  const get = (familyId) => byId.get(familyId) || null;

  function instantiate(familyId, seed, difficulty, caseId) {
    if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
    const family = requireFamily(byId, familyId);
    if (!family.difficultyProfiles.includes(difficulty)) throw new Error(`Unbekanntes Profil ${difficulty}`);
    const resolvedCase = resolveCaseId(family, seed, caseId);
    const generated = family.generate({ seed, caseId: resolvedCase, difficulty });
    // Procedural generators emit the per-seed instance but not the authored
    // case material that lives on the exemplar doc (hints, feedbackRules).
    // Fall back to the registered case body so authored hints reach learners.
    let authored = null;
    try { authored = staticCaseBody(familyId, resolvedCase); } catch { /* no doc body registered */ }
    const solved = family.solve(generated.parameters);
    const correct = (generated.choices || []).find((choice) => choice.correct);
    if (correct && solved.correctText && correct.text !== solved.correctText) {
      throw new Error(`${familyId}: Solver und Generator weichen ab`);
    }
    return {
      familyId,
      caseId: resolvedCase,
      difficulty,
      seed,
      deterministicSeed: seed,
      instanceId: `${familyId}:${resolvedCase}:${difficulty}:${seed}`,
      masteryEligible: generated.masteryEligible ?? family.masteryEligible,
      // S4D7: Antwortform und Grader gelten pro Fall (CaseTemplate
      // verbindet Familie und Archetyp); Fallwerte aus generate
      // schlagen die Familien-Defaults aus.
      activityType: generated.activityType ?? family.activityType,
      type: generated.activityType ?? family.activityType,
      graderId: generated.graderId ?? family.graderId,
      grader: generated.graderId ?? family.graderId,
      competencyIds: [...(generated.competencyIds ?? family.competencyIds)],
      prompt: generated.prompt,
      // Optionaler generischer Kartentitel je Fall (der Compiler bevorzugt
      // ihn gegenüber dem geseedeten Prompt; Familien ohne Titel sind
      // unverändert).
      ...(generated.title ? { title: generated.title } : null),
      parameters: generated.parameters,
      choices: generated.choices,
      // Nur bei Rubric-Fällen gesetzt (hält Golden-Korpora stabil).
      ...(generated.rubric ? { rubric: generated.rubric } : null),
      expectedAnswer: generated.expected,
      fullSolution: generated.fullSolution,
      // Authored feedback material for graders and the hint path; optional.
      ...(generated.feedbackRules ?? authored?.feedbackRules ? { feedbackRules: generated.feedbackRules ?? authored?.feedbackRules } : null),
      ...(generated.hints ?? authored?.hints ? { hints: generated.hints ?? authored?.hints } : null),
      ...(generated.typicalErrors ?? authored?.typicalErrors ? { typicalErrors: generated.typicalErrors ?? authored?.typicalErrors } : null),
      // S4D1: optionale Trace-Tabelle (Interaktionsvariante). Nur gesetzt,
      // wenn der Generator Zustände kennt; sonst undefined.
      ...(generated.traceTable ? { traceTable: generated.traceTable } : null),
    };
  }

  function grade(instance, answer) {
    return graders[instance.graderId].grade(instance, answer);
  }

  function assertFamilyPlacement(placement) {
    if (placement.definitionId) return;
    const family = requireFamily(byId, placement.familyId);
    if (placement.role === 'practice-space' && family.caseTypes.every((item) => item.propertyTest === false)) {
      throw new Error(`${family.familyId}: Statische Familien dürfen nicht im Übungsraum platziert werden`);
    }
    if (placement.difficulty && !family.difficultyProfiles.includes(placement.difficulty)) {
      throw new Error(`Unbekanntes Profil ${placement.difficulty}`);
    }
    if (placement.caseId != null) resolveCaseId(family, placement.seed ?? 0, placement.caseId);
  }

  return { get, instantiate, grade, assertFamilyPlacement };
}
