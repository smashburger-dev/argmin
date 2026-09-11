// Procedural family validate-text-normalize-match: the task text, starter
// code and reference solver stay fixed; the seed draws fresh research
// questions (metric/comparison/absolute wording) and Je-desto hypotheses
// that get appended to the curated base test block as literal __check
// lines. The is_testable verdict and the uv/dv split are asserted as
// literals (the JS draw oracles mirror the substring/segment contract), a
// renamed __ref copy oracles the full result dict and __raised covers the
// ValueError path for non Je-desto input. Mirrors the capsule recipe of
// formula-descriptive-stats-numpy.mjs.

import { RAISED_HELPER, refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';

// Verbatim case payloads extracted from content/families/validate-text-normalize-match.json.
const CASE_PAYLOADS = {
  "text-normalize-match": {
    difficulty: "core",
    packages: [],
    starterCode: "METRIKEN = [\"recall@\", \"anteil\", \"quote\", \"f1\", \"genauigkeit\", \"dauer\", \"kosten\"]\nVERGLEICHE = [\"höher\", \"niedriger\", \"geringer\", \"steigt\", \"sinkt\", \"unterscheidet sich\", \"verschieden\", \"gleich\"]\nABSOLUTE = [\"immer\", \"niemals\", \"optimal\", \"beste\", \"generell\"]\n\n\ndef is_testable(frage):\n    \"\"\"True iff Metrik und Vergleich als Teilstring enthalten sind und kein absolutes Wort vorkommt.\"\"\"\n    ...\n\ndef extract_variables(hypothese):\n    \"\"\"{'uv': .., 'dv': ..} aus einer Je-desto-Form; sonst ValueError('keine Je-desto-Form').\"\"\"\n    ...\n\n",
    baseTests: "__check('metrik und vergleich -> testable', is_testable(\"Steigt der Anteil korrekt beantworteter Fixtur-Fragen, wenn die Chunkgroesse verdoppelt wird?\") is True)\n__check('ohne metrik nicht testable', is_testable(\"Fuehlt sich die bearbeitung schneller an?\") is False)\n__check('absolute behauptung verworfen', is_testable(\"Ist die neue Version generell besser geeignet?\") is False)\n__check('optimal verworfen trotz metrik', is_testable(\"Warum ist die recall@5-Quote optimal?\") is False)\n__check('dauer und vergleich -> testable', is_testable(\"Ist die dauer der nutzung höher als vorher ohne kennzahl?\") is True)\n__check('grossbuchstaben egal', is_testable(\"Sinkt die Quote der ablehnungen?\") is True)\n__check('metrik allein genuegt nicht', is_testable(\"Wie hoch ist die genauigkeit?\") is False)\n__check('uv und dv zerlegt', extract_variables(\"Je größer die Chunkgröße, desto höher der Anteil korrekter Antworten\") == {\"uv\": \"die chunkgröße\", \"dv\": \"der anteil korrekter antworten\"})\n__check('richtung wird abgeschnitten', extract_variables(\"Je kleiner das Modell, desto geringer die kosten je lauf\") == {\"uv\": \"das modell\", \"dv\": \"die kosten je lauf\"})\n__check('punkt am ende entfernt', extract_variables(\"Je größer die Chunkgröße, desto höher der Anteil korrekter Antworten.\") == {\"uv\": \"die chunkgröße\", \"dv\": \"der anteil korrekter antworten\"})\ntry:\n    extract_variables(\"Die Chunkgröße beeinflusst die Quote.\")\n    __check('keine je-desto-form -> ValueError', False, 'kein ValueError')\nexcept ValueError:\n    __check('keine je-desto-form -> ValueError', True)\nprint(\"ok w31-e4\")",
    referenceSolver: "METRIKEN = [\"recall@\", \"anteil\", \"quote\", \"f1\", \"genauigkeit\", \"dauer\", \"kosten\"]\nVERGLEICHE = [\"höher\", \"niedriger\", \"geringer\", \"steigt\", \"sinkt\", \"unterscheidet sich\", \"verschieden\", \"gleich\"]\nABSOLUTE = [\"immer\", \"niemals\", \"optimal\", \"beste\", \"generell\"]\n\n\ndef is_testable(frage):\n    text = frage.lower()\n    if any(wort in text for wort in ABSOLUTE):\n        return False\n    if not any(m in text for m in METRIKEN):\n        return False\n    return any(v in text for v in VERGLEICHE)\n\n\ndef extract_variables(hypothese):\n    kern = hypothese.strip().rstrip(\".\")\n    teile = kern.split(\", desto \")\n    if len(teile) != 2 or not teile[0].startswith(\"Je \"):\n        raise ValueError(\"keine Je-desto-Form\")\n    uv = \" \".join(teile[0].split()[2:]).lower()\n    dv = \" \".join(teile[1].split()[1:]).lower()\n    return {\"uv\": uv, \"dv\": dv}",
    prompt: "Implementiere die Prüfbarkeit von Forschungsfragen. <code>is_testable(frage)</code> liefert <code>True</code> genau dann, wenn die Kleinbuchstaben-Fassung der Frage mindestens eine Metrik aus METRIKEN als Teilstring enthält, mindestens ein Vergleichswort aus VERGLEICHE enthält und KEIN absolutes Wort aus ABSOLUTE enthält (Reihenfolge: absolute Wörter verwerfen zuerst, dann Metrik, dann Vergleich). <code>extract_variables(hypothese)</code> zerlegt eine Je-desto-Hypothese: Text strippen und Punkt am Ende entfernen, an <code>&quot;, desto &quot;</code> in genau zwei Teile splitten, der vordere Teil muss mit <code>Je </code> beginnen — sonst <code>ValueError(\"keine Je-desto-Form\")</code>; UV = Wörter des vorderen Teils ab Index 2, DV = Wörter des hinteren Teils ab Index 1, beide kleingeschrieben und mit einfachen Leerzeichen verbunden. Der Testcode bringt eigene Fragen und Hypothesen mit.",
    fullSolution: "METRIKEN = [\"recall@\", \"anteil\", \"quote\", \"f1\", \"genauigkeit\", \"dauer\", \"kosten\"]\nVERGLEICHE = [\"höher\", \"niedriger\", \"geringer\", \"steigt\", \"sinkt\", \"unterscheidet sich\", \"verschieden\", \"gleich\"]\nABSOLUTE = [\"immer\", \"niemals\", \"optimal\", \"beste\", \"generell\"]\n\n\ndef is_testable(frage):\n    text = frage.lower()\n    if any(wort in text for wort in ABSOLUTE):\n        return False\n    if not any(m in text for m in METRIKEN):\n        return False\n    return any(v in text for v in VERGLEICHE)\n\n\ndef extract_variables(hypothese):\n    kern = hypothese.strip().rstrip(\".\")\n    teile = kern.split(\", desto \")\n    if len(teile) != 2 or not teile[0].startswith(\"Je \"):\n        raise ValueError(\"keine Je-desto-Form\")\n    uv = \" \".join(teile[0].split()[2:]).lower()\n    dv = \" \".join(teile[1].split()[1:]).lower()\n    return {\"uv\": uv, \"dv\": dv}\n\n# alle Fixtur-Urteile der Tests werden reproduziert (lokal python3-verifiziert)",
  },
};

// Minimal JS -> Python literal serializer for the JSON-safe draw structures
// (dicts, lists, strings, numbers, booleans, null). Double-quoted strings are
// valid Python; True/False/None cover bool and null.
const pyLit = (value) => {
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pyLit).join(', ')}]`;
  return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${pyLit(v)}`).join(', ')}}`;
};

// Returns ("ok", result) or (exception type, message): lets one comparison
// cover both value returns and the contracted ValueError paths.


// JS mirror of the is_testable contract on the draw pools: absolute wording
// vetoes first, then a metric and a comparison substring are required.
const METRIK_WORTER = ['recall@', 'anteil', 'quote', 'f1', 'genauigkeit', 'dauer', 'kosten'];
const VERGLEICH_WORTER = ['höher', 'niedriger', 'geringer', 'steigt', 'sinkt', 'unterscheidet sich', 'verschieden', 'gleich'];
const ABSOLUT_WORTER = ['immer', 'niemals', 'optimal', 'beste', 'generell'];

const testableOracle = (frage) => {
  const text = frage.toLowerCase();
  if (ABSOLUT_WORTER.some((wort) => text.includes(wort))) return false;
  if (!METRIK_WORTER.some((m) => text.includes(m))) return false;
  return VERGLEICH_WORTER.some((v) => text.includes(v));
};

// Draw pools: metric phrases carry a METRIKEN substring, the comparison
// templates carry a VERGLEICHE word, and the absolute templates an ABSOLUTE
// word. Context and condition phrases are checked to be marker-free.
const METRIK_PHRASEN = [
  'die Quote',
  'der Anteil',
  'die Dauer',
  'die Kosten',
  'die Genauigkeit',
  'der recall@5-Wert',
  'der f1-Wert',
];
const KONTEXT_PHRASEN = [
  'korrekter Antworten',
  'pro Anfrage',
  'im Testlauf',
  'der Klassifikation',
  'der Pipeline',
];
const BEDINGUNG_PHRASEN = [
  'groesseren Chunks',
  'mehr Daten',
  'doppeltem Budget',
  'kleinerem Modell',
  'dem neuen Prompt',
  'kuerzerem Kontext',
];

const TESTBAR_TEMPLATES = [
  (m, k, b) => `Steigt ${m} ${k} bei ${b}?`,
  (m, k, b) => `Sinkt ${m} ${k} durch ${b}?`,
  (m, k, b) => `Ist ${m} ${k} höher bei ${b}?`,
  (m, k, b) => `Bleibt ${m} ${k} gleich bei ${b}?`,
  (m, k) => `Unterscheidet sich ${m} ${k} zwischen den Modellen?`,
];
const NUR_METRIK_TEMPLATES = [
  (m, k) => `Wie hoch ist ${m} ${k}?`,
  (m, k) => `Wie gross ist ${m} ${k}?`,
];
const NUR_VERGLEICH_TEMPLATES = [
  () => 'Sinkt die Zufriedenheit der Nutzer?',
  () => 'Steigt die Akzeptanz im Feld?',
  () => 'Bleibt die Stimmung im Team gleich?',
];
const ABSOLUT_TEMPLATES = [
  (m, k) => `Ist ${m} ${k} immer hoch?`,
  (m, k) => `Warum ist ${m} ${k} optimal?`,
  (m) => `Ist ${m} generell besser?`,
];

// One drawn question: roughly half testable, the rest split over the three
// rejection paths (metric only, comparison only, absolute veto).
const drawFrage = (r) => {
  const m = pick(r, METRIK_PHRASEN);
  const k = pick(r, KONTEXT_PHRASEN);
  const b = pick(r, BEDINGUNG_PHRASEN);
  const roll = r();
  if (roll < 0.5) return pick(r, TESTBAR_TEMPLATES)(m, k, b);
  if (roll < 0.7) return pick(r, NUR_METRIK_TEMPLATES)(m, k);
  if (roll < 0.85) return pick(r, NUR_VERGLEICH_TEMPLATES)();
  return pick(r, ABSOLUT_TEMPLATES)(m, k);
};

// Je-desto pools: adjectives are single words so the fixed word-index split
// (uv = words from index 2, dv = words from index 1) stays intact.
const JE_ADJ = ['größer', 'kleiner', 'länger', 'kürzer', 'breiter'];
const UV_PHRASEN = [
  'die Chunkgröße',
  'das Modell',
  'der Kontext',
  'die Stichprobe',
  'der Datensatz',
  'die Batchgröße',
  'der Prompt',
];
const DESTO_ADJ = ['höher', 'niedriger', 'geringer', 'besser', 'länger', 'kürzer', 'größer'];
const DV_PHRASEN = [
  'der Anteil korrekter Antworten',
  'die Kosten je Lauf',
  'die Latenz',
  'die Quote',
  'der Fehleranteil',
  'der Nutzen',
  'die Ausgaben',
];
const KAPUTTE_HYPOTHESEN = [
  'Die Chunkgröße beeinflusst die Quote.',
  'Mehr Daten helfen dem Modell, desto besser wird es.',
  'Je länger der Kontext, umso höher die Kosten.',
  'Größere Datensaetze, desto besser die Ergebnisse',
];

// One drawn hypothesis pair: a well-formed Je-desto string (with optional
// trailing dot) plus a malformed input that must hit the ValueError path.
const drawHypothesen = (r) => {
  const uv = pick(r, UV_PHRASEN);
  const dv = pick(r, DV_PHRASEN);
  const dot = r() < 0.4 ? '.' : '';
  return {
    text: `Je ${pick(r, JE_ADJ)} ${uv}, desto ${pick(r, DESTO_ADJ)} ${dv}${dot}`,
    uv: uv.toLowerCase(),
    dv: dv.toLowerCase(),
    kaputt: pick(r, KAPUTTE_HYPOTHESEN),
  };
};

export const TEXT_MATCH_CASES = {
  'text-normalize-match': {
    ...CASE_PAYLOADS['text-normalize-match'],
    refNames: ['METRIKEN', 'VERGLEICHE', 'ABSOLUTE', 'is_testable', 'extract_variables'],
    draw(r) {
      return { frage: drawFrage(r), hypothesen: drawHypothesen(r) };
    },
    extraCount: 3,
  },
};

// Per-draw seeded check lines: literal verdict for is_testable, literal
// uv/dv values plus a full-dict oracle compare, and the malformed input
// through the __raised ValueError comparison.
function seededChecks(entry, index) {
  const p = `__tm${index}`;
  const { frage, hypothesen } = entry;
  const testbar = testableOracle(frage) ? 'True' : 'False';
  return [
    `${p}_frage = ${pyLit(frage)}`,
    `__check('seeded testbar ${index}', is_testable(${p}_frage) is ${testbar})`,
    `__check('seeded testbar ref ${index}', is_testable(${p}_frage) is __ref_is_testable(${p}_frage))`,
    `${p}_hyp = ${pyLit(hypothesen.text)}`,
    `__check('seeded uv ${index}', extract_variables(${p}_hyp)["uv"] == ${pyLit(hypothesen.uv)})`,
    `__check('seeded dv ${index}', extract_variables(${p}_hyp)["dv"] == ${pyLit(hypothesen.dv)})`,
    `__check('seeded variablen ref ${index}', extract_variables(${p}_hyp) == __ref_extract_variables(${p}_hyp))`,
    `${p}_kaputt = ${pyLit(hypothesen.kaputt)}`,
    `__check('seeded je-desto fehler ${index}', __raised(extract_variables, ${p}_kaputt) == __raised(__ref_extract_variables, ${p}_kaputt))`,
  ].join('\n');
}

export const TEXT_MATCH_CONTRACT = {
  familyId: 'validate-text-normalize-match',
  familyGroup: 'validate-contract',
  summary: 'Normalisiert Text und prüft danach den Übereinstimmungsvertrag.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'text-normalize-match', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-research-question', 'c-python-functions'],
};

// The renamed reference copy plus the __raised helper are emitted once at
// the top of the seeded block; all per-draw checks call into them.
const FAMILY = makeCaseFamily({
  contract: TEXT_MATCH_CONTRACT,
  cases: TEXT_MATCH_CASES,
  shapeError: 'Text-Normalisierungs-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const prelude = `${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}`;
    const checks = seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n');
    return `# seeded extra cases\n${prelude}\n\n${checks}`;
  },
});

export const textMatchCaseOk = FAMILY.caseOk;
export const genTextMatchCase = FAMILY.genCase;
export const solveTextMatchFamily = FAMILY.solve;
export const generateTextMatchFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
