// Procedural family validate-text-normalize-match: the task text, starter
// code and reference solver stay fixed; the seed draws fresh research
// questions (metric/comparison/absolute wording) and Je-desto hypotheses
// that get appended to the curated base test block as literal __check
// lines. The is_testable verdict and the uv/dv split are asserted as
// literals (the JS draw oracles mirror the substring/segment contract), a
// renamed __ref copy oracles the full result dict and __raised covers the
// ValueError path for non Je-desto input. Mirrors the capsule recipe of
// formula-descriptive-stats-numpy.mjs.

import { pyLit, RAISED_HELPER, refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/validate-text-normalize-match.json' with { type: 'json' };

// Verbatim case payloads extracted from content/families/validate-text-normalize-match.json.
const CASE_PAYLOADS = {
  "text-normalize-match": {
    difficulty: "core",
    },
};

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
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: TEXT_MATCH_CONTRACT,
  cases: TEXT_MATCH_CASES,
  shapeError: 'Text-Normalisierungs-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const prelude = `${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}`;
    const checks = seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n');
    return `# seeded extra cases\n${prelude}\n\n${checks}`;
  },
});

