// Procedural family aggregate-evidence-rule-audit: mixed-activity family.
// The numeric case draws hit/disqualified/definition counts (the authored
// variant base-case feedback keys are replaced by per-draw rules). The
// predict-output trace draws coherent same-month dates and a lock flag; a
// JS mirror recomputes both lines — this also fixes the authored variants,
// which carried literal "\\n" text instead of real newlines in
// expected.output and were unwinnable. The python-code case keeps the
// curated base tests verbatim and appends seeded fixtures asserted with ==
// against a __ref_-copy of the reference (pure Python truth).
// Mirrors optimize-decode-greedy-loop.mjs.

import { randInt, pick, rng } from '../generator_draw_kit.mjs';
import { refCopy, pyLit } from './py_test_kit.mjs';

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// --- case evidence-rule-count (numeric, deterministic) ---------------------

const COUNT_PROMPT = (p) =>
  `Eine Lernende erzielt Treffer auf ${p.hits} verschiedenen Instanzen und sieht ${p.definitions} Definitionen auf weiteren Instanzen an. Kurz vor dem Abschluss öffnen sich Lösungsanzeigen auf ${p.disqualified} Treffer-Instanz(en). Wie viele unabhängige Treffer zählen noch?`;

const COUNT_SOLUTION = (p) =>
  `Von ${p.hits} Treffer-Instanzen werden ${p.disqualified} durch Lösungsanzeigen disqualifiziert. Es bleiben ${p.hits}−${p.disqualified}=${p.hits - p.disqualified} unabhängige Treffer; Definitionen zählen in einer eigenen Regel.`;

function drawCount(r) {
  const hits = randInt(r, 2, 9);
  const disqualified = randInt(r, 1, Math.min(5, hits - 1));
  const definitions = randInt(r, 1, 5);
  return { hits, disqualified, definitions };
}

// The correct value must never appear as a standalone number in the prompt
// (authored variants leaked expected === definitions four times).
const countOk = (p) => p.hits - p.disqualified !== p.definitions;

function countFeedbackRules(p) {
  const rules = [
    { if: `value === ${p.hits}`, then: `${p.hits} ignoriert die Lösungsanzeigen: die betroffenen Instanzen zählen nicht mehr als unabhängige Treffer.` },
    { if: `value === ${p.hits + p.definitions}`, then: 'Definitionen sind keine Treffer — sie zählen in einer eigenen Regel (mindestens zwei verschiedene).' },
  ];
  // hits === 2·disqualified würde diese Regel auf die richtige Antwort feuern.
  if (p.disqualified !== p.hits - p.disqualified) {
    rules.push({ if: `value === ${p.disqualified}`, then: 'Das ist die Sperrzahl, nicht der Rest: von den Treffern abziehen.' });
  }
  return rules;
}

// --- case final-diagnosis-trace (predict-output, deterministic) ------------

const TRACE_HEAD = `def diagnose(ereignisse):
    gesperrt = {e["instanz"] for e in ereignisse if e["art"] == "loesungsanzeige"}
    treffer = {e["instanz"] for e in ereignisse if e["art"] == "hit"} - gesperrt
    tag = {e["instanz"]: e["tag"] for e in ereignisse if e["art"] == "hit"}
    tage = sorted(tag[i] for i in treffer)
    abstand = (int(tage[-1][-2:]) - int(tage[0][-2:])) if len(tage) > 1 else 0
    if len(treffer) >= 2 and abstand >= 14:
        return "erfuellt"
    return "nicht_erfuellt"
`;

function drawTrace(r) {
  const year = pick(r, [2026, 2027]);
  const month = randInt(r, 1, 12);
  const diff = randInt(r, 11, 21);
  const dayA = randInt(r, 1, 28 - diff); // same month; the snippet reads tag[-2:]
  const gesperrt = r() < 0.55;
  return { year, month, dayA, diff, gesperrt };
}

function buildTraceSnippet(p) {
  const tagA = iso(p.year, p.month, p.dayA);
  const tagB = iso(p.year, p.month, p.dayA + p.diff);
  const lock = p.gesperrt
    ? `    {"tag": "${tagB}", "instanz": "b", "art": "loesungsanzeige"},\n`
    : '';
  return `${TRACE_HEAD}
E = [
    {"tag": "${tagA}", "instanz": "a", "art": "hit"},
    {"tag": "${tagB}", "instanz": "b", "art": "hit"},
${lock}    {"tag": "${tagA}", "instanz": "c", "art": "definition"},
]
print(diagnose(E))
E2 = [e for e in E if e["art"] != "loesungsanzeige"] + [
    {"tag": "${tagB}", "instanz": "b", "art": "hit"}
]
print(diagnose(E2))`;
}

const traceLine2 = (p) => (p.diff >= 14 ? 'erfuellt' : 'nicht_erfuellt');
const traceLine1 = (p) => (p.gesperrt ? 'nicht_erfuellt' : traceLine2(p));
const traceOutput = (p) => `${traceLine1(p)}\n${traceLine2(p)}`;

const buildTracePrompt = (p) =>
  `Abschlussdiagnose von Hand ausführen: Was gibt dieses Programm aus? E nutzt Treffer an ${iso(p.year, p.month, p.dayA)} und ${iso(p.year, p.month, p.dayA + p.diff)}; eine Lösungsanzeige auf b ist ${p.gesperrt ? 'vorhanden' : 'nicht vorhanden'}. ${p.gesperrt ? 'E2 ersetzt sie durch einen weiteren Treffer.' : 'E2 fügt einen weiteren Treffer auf b hinzu.'}`;

const buildTraceSolution = (p) => {
  const line1 = p.gesperrt
    ? 'E: b ist gesperrt, daher bleibt nur a und es fehlen zwei Treffer → nicht_erfuellt.'
    : `E: a und b zählen und der Abstand ${p.diff} wird geprüft → ${traceLine1(p)}.`;
  return `${line1} E2 zählt a und b; der Tagesabstand ist ${p.diff} → ${traceLine2(p)}.`;
};

// --- case final-diagnosis-rules (python-code, pyodide) ---------------------

const RULES_STARTER = `from datetime import date


def final_diagnosis(ereignisse):
    """Evidenzregeln: 2 Treffer, 2 Definitionen, 14 Tage, Loesungsanzeige sperrt Instanzen."""
    ...

`;

const RULES_BASE_TESTS = `from datetime import date

E_OK = [
    {"tag": "2026-05-04", "instanz": "w35-e6", "art": "definition"},
    {"tag": "2026-05-05", "instanz": "w37-e4", "art": "definition"},
    {"tag": "2026-05-05", "instanz": "w36-e4", "art": "hit"},
    {"tag": "2026-05-20", "instanz": "w38-e6", "art": "hit"},
]
r = final_diagnosis(E_OK)
__check('erfuellt', r["status"] == "erfuellt")
__check('zaehlungen', (r["treffer"], r["definitionen"], r["abstand_tage"]) == (2, 2, 15))
__check('keine gesperrten', r["disqualifizierte"] == [])
E_ZU_KURZ = [
    {"tag": "2026-05-01", "instanz": "w35-e6", "art": "definition"},
    {"tag": "2026-05-02", "instanz": "w37-e4", "art": "definition"},
    {"tag": "2026-05-05", "instanz": "w36-e4", "art": "hit"},
    {"tag": "2026-05-13", "instanz": "w38-e6", "art": "hit"},
]
r = final_diagnosis(E_ZU_KURZ)
__check('abstand zu klein', r["status"] == "nicht_erfuellt" and r["abstand_tage"] == 8)
E_GESPERRT = E_OK + [
    {"tag": "2026-05-21", "instanz": "w38-e6", "art": "loesungsanzeige"},
]
r = final_diagnosis(E_GESPERRT)
__check('instanz gesperrt', r["disqualifizierte"] == ["w38-e6"] and r["treffer"] == 1)
__check('doppelte hits eine instanz', final_diagnosis(E_OK + [{"tag": "2026-05-06", "instanz": "w36-e4", "art": "hit"}])["treffer"] == 2)
__check('leere liste', final_diagnosis([])["status"] == "nicht_erfuellt")`;

const RULES_REFERENCE = `from datetime import date


def final_diagnosis(ereignisse):
    gesperrt = {e["instanz"] for e in ereignisse if e["art"] == "loesungsanzeige"}
    treffer_daten = {e["instanz"]: date.fromisoformat(e["tag"]) for e in ereignisse if e["art"] == "hit" and e["instanz"] not in gesperrt}
    definitionen = {e["instanz"] for e in ereignisse if e["art"] == "definition" and e["instanz"] not in gesperrt}
    if len(treffer_daten) > 1:
        abstand = (max(treffer_daten.values()) - min(treffer_daten.values())).days
    else:
        abstand = 0
    status = "erfuellt" if len(treffer_daten) >= 2 and len(definitionen) >= 2 and abstand >= 14 else "nicht_erfuellt"
    return {"status": status, "treffer": len(treffer_daten), "definitionen": len(definitionen), "abstand_tage": abstand, "disqualifizierte": sorted(gesperrt)}

# E_OK -> (2, 2, 15) erfuellt; Loesungsanzeige auf w38-e6 -> treffer faellt auf 1`;

const RULES_PROMPT = 'Evidenzregeln implementieren: <code>final_diagnosis(ereignisse)</code> erhält <code>{"tag": "JJJJ-MM-TT", "instanz": str, "art": "hit"|"definition"|"loesungsanzeige"}</code>. Rückgabe <code>{"status", "treffer", "definitionen", "abstand_tage", "disqualifizierte"}</code>: Treffer = verschiedene Instanzen mit art „hit“, deren Instanz NICHT eine Lösungsanzeige hat; definitionen = verschiedene Instanzen mit art „definition“ ohne Lösungsanzeige; abstand_tage = Tage zwischen frühestem und spätem Treffer-Datum (0 bei weniger als zwei Treffern). status „erfuellt“ nur wenn treffer ≥ 2 UND definitionen ≥ 2 UND abstand_tage ≥ 14, sonst „nicht_erfuellt“. disqualifizierte = sortierte Liste der gesperrten Instanzen. Nutze datetime.date.fromisoformat.';

const RULES_SOLUTION = `${RULES_REFERENCE}# Instanzen zaehlen, Loesungsanzeige sperrt genau ihre Instanz, Abstand nur ueber Treffer.`;

const RULES_PREAMBLE = refCopy(RULES_REFERENCE, ['final_diagnosis']);

// Case definitions: the numeric case draws three counts, the trace draws
// coherent same-month dates plus a lock flag, the code case bakes drawn
// event fixtures into the test block (honest distinctness).
export const EVIDENCE_CASES = {
  'evidence-rule-count': {
    caseId: 'evidence-rule-count',
    difficulty: 'core',
    kind: 'numeric',
    activityType: 'numeric',
    graderId: 'deterministic',
    competencyIds: ['c-capstone-pipeline', 'c-research-capstone'],
  },
  'final-diagnosis-trace': {
    caseId: 'final-diagnosis-trace',
    difficulty: 'core',
    kind: 'predict-output',
    activityType: 'predict-output',
    graderId: 'deterministic',
    competencyIds: ['c-capstone-pipeline', 'c-python-reading'],
    buildSnippet: buildTraceSnippet,
  },
  'final-diagnosis-rules': {
    caseId: 'final-diagnosis-rules',
    difficulty: 'stretch',
    kind: 'python-code',
    activityType: 'python-code',
    graderId: 'pyodide',
    packages: [],
    starterCode: RULES_STARTER,
    baseTests: RULES_BASE_TESTS,
    referenceSolver: RULES_REFERENCE,
    prompt: RULES_PROMPT,
    fullSolution: RULES_SOLUTION,
    preamble: RULES_PREAMBLE,
    drawCase(r) {
      const month = randInt(r, 1, 12);
      const diff = randInt(r, 10, 20); // mixes erfuellt/nicht_erfuellt arms
      const dayA = randInt(r, 1, 28 - diff);
      return { year: pick(r, [2026, 2027]), month, dayA, diff, gesperrt: r() < 0.5 };
    },
    extraCount: 2,
  },
};

// Seeded fixture block: two drawn event lists asserted against the renamed
// oracle copy — the reference recomputes truth at runtime, no JS mirror.
function rulesSeededBlock(entry, index) {
  const tagA = iso(entry.year, entry.month, entry.dayA);
  const tagB = iso(entry.year, entry.month, entry.dayA + entry.diff);
  const events = [
    { tag: tagA, instanz: `s${index}a`, art: 'definition' },
    { tag: tagA, instanz: `s${index}b`, art: 'definition' },
    { tag: tagA, instanz: `s${index}c`, art: 'hit' },
    { tag: tagB, instanz: `s${index}d`, art: 'hit' },
  ];
  if (entry.gesperrt) events.push({ tag: tagB, instanz: `s${index}d`, art: 'loesungsanzeige' });
  return [
    `__E${index} = ${pyLit(events)}`,
    `__check('seeded diagnose ${index}', final_diagnosis(__E${index}) == __ref_final_diagnosis(__E${index}))`,
  ].join('\n');
}

function rulesTestsFor(caseDef, seedCases) {
  const extras = seedCases.map((entry, i) => rulesSeededBlock(entry, i + 1)).join('\n');
  return `${caseDef.baseTests}\n\n# seeded extra cases\n${caseDef.preamble}\n${extras}`;
}

// --- capsule shapes ---------------------------------------------------------

export function evidenceCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (caseDef.kind === 'numeric') {
      const { hits, disqualified, definitions } = parameters;
      if (!Number.isInteger(hits) || hits < 2 || hits > 9) return false;
      if (!Number.isInteger(disqualified) || disqualified < 1 || disqualified > Math.min(5, hits - 1)) return false;
      if (!Number.isInteger(definitions) || definitions < 1 || definitions > 5) return false;
      return countOk(parameters);
    }
    if (caseDef.kind === 'predict-output') {
      const { year, month, dayA, diff, gesperrt } = parameters;
      if (![2026, 2027].includes(year) || !Number.isInteger(month) || month < 1 || month > 12) return false;
      if (!Number.isInteger(diff) || diff < 11 || diff > 21) return false;
      if (!Number.isInteger(dayA) || dayA < 1 || dayA + diff > 28) return false;
      if (typeof gesperrt !== 'boolean') return false;
      return parameters.snippet === buildTraceSnippet(parameters);
    }
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === rulesTestsFor(caseDef, parameters.seedCases);
  } catch { return false; }
}

export function genEvidenceCase(seed, caseDef) {
  if (caseDef.kind === 'numeric') {
    const r = rng(seed);
    let drawn = drawCount(r);
    while (!countOk(drawn)) drawn = drawCount(r);
    return {
      parameters: { caseId: caseDef.caseId, difficulty: caseDef.difficulty, ...drawn },
      expected: { kind: 'integer', value: drawn.hits - drawn.disqualified },
      prompt: COUNT_PROMPT(drawn),
      fullSolution: COUNT_SOLUTION(drawn),
      feedbackRules: countFeedbackRules(drawn),
      competencyIds: caseDef.competencyIds,
      activityType: caseDef.activityType,
      graderId: caseDef.graderId,
    };
  }
  if (caseDef.kind === 'predict-output') {
    const drawn = drawTrace(rng(seed));
    return {
      parameters: { caseId: caseDef.caseId, difficulty: caseDef.difficulty, ...drawn, snippet: buildTraceSnippet(drawn) },
      expected: { kind: 'output-lines', output: traceOutput(drawn) },
      prompt: buildTracePrompt(drawn),
      fullSolution: buildTraceSolution(drawn),
      competencyIds: caseDef.competencyIds,
      activityType: caseDef.activityType,
      graderId: caseDef.graderId,
    };
  }
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, () => caseDef.drawCase(r));
  return {
    parameters: {
      caseId: caseDef.caseId,
      difficulty: caseDef.difficulty,
      packages: caseDef.packages,
      starterCode: caseDef.starterCode,
      tests: rulesTestsFor(caseDef, seedCases),
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
    competencyIds: caseDef.competencyIds,
    activityType: caseDef.activityType,
    graderId: caseDef.graderId,
  };
}

export function solveEvidenceFamily(parameters) {
  const byId = EVIDENCE_CASES[parameters?.caseId];
  if (byId && evidenceCaseOk(parameters, byId)) {
    if (byId.kind === 'numeric') return { value: parameters.hits - parameters.disqualified };
    if (byId.kind === 'predict-output') return { output: traceOutput(parameters) };
    return { referenceCode: byId.referenceSolver };
  }
  const codeDef = EVIDENCE_CASES['final-diagnosis-rules'];
  if (evidenceCaseOk(parameters, codeDef)) return { referenceCode: codeDef.referenceSolver };
  throw new Error('Evidenzregel-Parameter verletzen die Kapselform');
}

export const EVIDENCE_CONTRACT = {
  familyId: 'aggregate-evidence-rule-audit',
  familyGroup: 'aggregate-count',
  summary: 'Wendet Evidenzregeln auf Treffer, Definitionen und Sperrungen an.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'evidence-rule-count' },
    { caseId: 'final-diagnosis-trace' },
    { caseId: 'final-diagnosis-rules' },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-capstone-pipeline', 'c-python-reading', 'c-research-capstone'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export function generateEvidenceFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = EVIDENCE_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genEvidenceCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...EVIDENCE_CONTRACT, generate: generateEvidenceFamily, solve: solveEvidenceFamily };
