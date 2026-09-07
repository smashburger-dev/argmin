import { graders } from '../core/graders.js';

// S4D1: zentrale Familien-Runtime (eine Semantik, keine Duplikate).
// Hierher ausgelagert, damit exercise_registry.mjs und die dünnen
// Domänen-Registry-Module dieselbe Implementierung nutzen, ohne
// zirkulär voneinander abzuhängen.
const FAMILY_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const DIFFICULTY_ORDER = ['intro', 'core', 'stretch', 'challenge'];
const staticCases = new Map();

const variantOf = (body, seed) => {
  const all = [body, ...(body.variants || [])];
  const index = Math.abs(seed) % all.length;
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
  return cases[Math.abs(seed) % cases.length].caseId;
}

// S4D2: domänenspezifische Hinweise, strikt aus Instanzdaten abgeleitet
// (kein erfundener Content). Stufe 1 ist die kuratierte Strategie der
// Familie. Stufe 2 leitet aus Antwortdaten ab: Distraktor-Ausschluss,
// Richtung bei ganzen Zahlen, Parsons-Erstzeile, Trace-Zeilenzeiger.
// Null, wenn nichts ableitbar ist. Offenlegung läuft nicht hierüber,
// sondern als solution-revealed-Ereignis in der Ansicht.
const hintForChoice = ({ choices }) => {
  if (!Array.isArray(choices)) return undefined;
  const wrong = choices.find((choice) => !choice.correct);
  return wrong ? `„${wrong.text}“ scheidet aus.` : null;
};
const hintForNumeric = ({ expectedAnswer }, { answer, correct }) => {
  if (!(expectedAnswer && expectedAnswer.kind === 'integer' && correct === false)) return undefined;
  const want = expectedAnswer.value;
  const got = Number(answer);
  if (Number.isFinite(got) && got !== want) return got < want ? 'Gesucht ist eine größere Zahl.' : 'Gesucht ist eine kleinere Zahl.';
  return null;
};
const hintForParsons = ({ parameters, expectedAnswer }, { correct }) => {
  if (!(expectedAnswer && Array.isArray(expectedAnswer.solutionOrder) && correct === false)) return undefined;
  const fragments = parameters && Array.isArray(parameters.fragments) ? parameters.fragments : [];
  const first = fragments.find((fragment) => fragment && fragment.id === expectedAnswer.solutionOrder[0]);
  return first ? `Beginne mit: „${first.text}“.` : null;
};
const ACTIVITY_HINTS = {
  'single-choice': hintForChoice,
  numeric: hintForNumeric,
  parsons: hintForParsons,
};

/**
 * @param {{ summary?: string | null, activityType?: string, choices?: Array<{ id: string, text: string, correct?: boolean }> | null, parameters?: Record<string, unknown> | null, expectedAnswer?: Record<string, unknown> | null, traceTable?: unknown }} instance
 * @param {{ level?: number, answer?: unknown, correct?: boolean | null, firstBadRow?: number | null }} context
 */
export function familyHint(
  { summary = null, activityType = '', choices = null, parameters = null, expectedAnswer = null, traceTable = null } = {},
  { level = 0, answer = null, correct = null, firstBadRow = null } = {},
) {
  if (level === 1) return typeof summary === 'string' && summary ? summary : null;
  if (level !== 2) return null;
  const activityHint = ACTIVITY_HINTS[activityType]?.(
    { choices, parameters, expectedAnswer },
    { answer, correct },
  );
  if (activityHint !== undefined) return activityHint;
  if (traceTable && Number.isInteger(firstBadRow) && firstBadRow >= 0) {
    return `Rechne Zeile ${firstBadRow + 1} neu, der Rest steht.`;
  }
  return null;
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
      parameters: generated.parameters,
      choices: generated.choices,
      // Nur bei Rubric-Fällen gesetzt (hält Golden-Korpora stabil).
      ...(generated.rubric ? { rubric: generated.rubric } : null),
      expectedAnswer: generated.expected,
      fullSolution: generated.fullSolution,
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
