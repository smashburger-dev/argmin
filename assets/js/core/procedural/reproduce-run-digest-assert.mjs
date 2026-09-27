// Procedural family reproduce-run-digest-assert: the task text, starter code
// and reference solver stay fixed; the seed draws fresh baseline configs,
// freeze fixtures (word lists plus min_laenge) and readme/run/phrasen triples
// that get appended to the curated base test block as literal __check lines.
// Every drawn expectation is evaluated against a renamed __ref_ copy of the
// reference solver and __raised covers the AssertionError freeze path, so the
// grading contract cannot drift. Mirrors reproduce-seeded-split.mjs.

import { pyLit, RAISED_HELPER, refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, shuffle } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/reproduce-run-digest-assert.json' with { type: 'json' };

// Verbatim case payloads extracted from content/families/reproduce-run-digest-assert.json.
const CASE_PAYLOADS = {
  "run-digest-assert": { "difficulty": "stretch", "competencyIds": ["c-research-capstone","c-python-functions"] },
  "pipeline-freeze-report": { "difficulty": "challenge", "competencyIds": ["c-capstone-pipeline","c-ml-repro"] },
  "reproduction-verdict-rules": { "difficulty": "challenge", "competencyIds": ["c-capstone-pipeline","c-ml-repro"] },
};

// Draw pools: doc-id register shared by all three cases, German word list
// for the freeze stage and overclaim phrases/readme templates for the
// verdict rules. All pools stay quote- and backslash-free.
const DOC_IDS = ['faq-3', 'faq-7', 'vertrag-1', 'vertrag-2', 'handbuch-5', 'faq-11'];
const WORD_POOL = ['Affe', 'Banane', 'Zitrone', 'Apfel', 'Birne', 'Kirsche', 'Melone', 'Traube', 'Pfirsich', 'Ananas', 'Quitte', 'Orange'];
const PHRASEN_POOL = ['produktionsreif', 'sicher gegen', 'fehlerfrei', 'garantiert', 'bewiesen'];
const README_CLEAN = [
  'Ehrlicher Bericht mit bekannten Grenzen.',
  'Guter Text.',
  'Ergebnisse unter Vorbehalt.',
  'Erste Pilotdaten, kleine Stichprobe.',
];

export const DIGEST_CASES = {
  'run-digest-assert': {
    ...CASE_PAYLOADS['run-digest-assert'],
    competencyIds: ['c-research-capstone', 'c-python-functions'],
    refNames: ['run_baseline', '_baseline_werte'],
    // k plus 4-7 case dicts; the first case is forced to a top-1 hit so
    // antwort_getrennt never divides by zero on either side.
    draw(r) {
      const count = randInt(r, 4, 7);
      const faelle = Array.from({ length: count }, (_, j) => {
        const relevante = shuffle(r, [...DOC_IDS]).slice(0, randInt(r, 1, 2));
        const top = shuffle(r, [...DOC_IDS]).slice(0, randInt(r, 1, 3));
        return { id: `fall-${j + 1}`, relevante, top, korrekt: r() < 0.6 };
      });
      faelle[0].top = [faelle[0].relevante[0], ...faelle[0].top].slice(0, 3);
      return { config: { k: randInt(r, 1, 3), faelle } };
    },
    emit(entry, index) {
      const p = `__rb${index}`;
      return [
        `${p}_cfg = ${pyLit(entry.config)}`,
        `__check('seeded baseline ${index}', run_baseline(${p}_cfg) == __ref_run_baseline(${p}_cfg))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'pipeline-freeze-report': {
    ...CASE_PAYLOADS['pipeline-freeze-report'],
    competencyIds: ['c-capstone-pipeline', 'c-ml-repro'],
    refNames: ['kanon', 'run_pipeline'],
    // Word list plus min_laenge; the pin is computed in the emitted test via
    // the renamed __ref_kanon, and the tamper config appends a word so the
    // freeze pin misses -> AssertionError on both sides.
    draw(r) {
      const daten = shuffle(r, [...WORD_POOL]).slice(0, randInt(r, 4, 7));
      const tampered = [...daten, pick(r, WORD_POOL)];
      return { daten, minLaenge: randInt(r, 3, 7), tampered };
    },
    emit(entry, index) {
      const p = `__fp${index}`;
      return [
        `${p}_daten = ${pyLit(entry.daten)}`,
        `${p}_cfg = {"daten": ${p}_daten, "min_laenge": ${entry.minLaenge}, "pins": {"daten": hashlib.sha256(__ref_kanon(${p}_daten).encode("utf-8")).hexdigest()}}`,
        `__check('seeded pipeline ${index}', run_pipeline(${p}_cfg) == __ref_run_pipeline(${p}_cfg))`,
        `${p}_bad = {"daten": ${pyLit(entry.tampered)}, "min_laenge": ${entry.minLaenge}, "pins": {"daten": hashlib.sha256(__ref_kanon(${p}_daten).encode("utf-8")).hexdigest()}}`,
        `__check('seeded freeze ${index}', __raised(run_pipeline, ${p}_bad) == __raised(__ref_run_pipeline, ${p}_bad))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'reproduction-verdict-rules': {
    ...CASE_PAYLOADS['reproduction-verdict-rules'],
    competencyIds: ['c-capstone-pipeline', 'c-ml-repro'],
    refNames: ['kanon', 'repro_check'],
    // readme (sometimes carrying an overclaim phrase), 1-3 runs that either
    // repeat one result (key order permuted) or diverge, and a phrase list.
    draw(r) {
      const phrasen = shuffle(r, [...PHRASEN_POOL]).slice(0, randInt(r, 1, 3));
      const readme = r() < 0.45
        ? `${pick(r, README_CLEAN)} Das System ist ${pick(r, phrasen)}.`
        : pick(r, README_CLEAN);
      const run = { metriken: { recall_at_k: randInt(r, 1, 9) / 10, answered: randInt(r, 1, 9) } };
      const count = randInt(r, 1, 3);
      const differ = count > 1 && r() < 0.45;
      const laeufe = [];
      for (let j = 0; j < count; j += 1) {
        if (differ && j === count - 1) {
          laeufe.push({ metriken: { recall_at_k: run.metriken.recall_at_k, answered: run.metriken.answered + 1 } });
        } else if (j % 2 === 1) {
          laeufe.push({ metriken: { answered: run.metriken.answered, recall_at_k: run.metriken.recall_at_k } });
        } else {
          laeufe.push({ metriken: { recall_at_k: run.metriken.recall_at_k, answered: run.metriken.answered } });
        }
      }
      return { readme, laeufe, phrasen };
    },
    emit(entry, index) {
      const p = `__rv${index}`;
      return [
        `${p}_laeufe = ${pyLit(entry.laeufe)}`,
        `__check('seeded repro ${index}', repro_check(${pyLit(entry.readme)}, ${p}_laeufe, ${pyLit(entry.phrasen)}) == __ref_repro_check(${pyLit(entry.readme)}, ${p}_laeufe, ${pyLit(entry.phrasen)}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
};

export const DIGEST_CONTRACT = {
  familyId: 'reproduce-run-digest-assert',
  familyGroup: 'reproduce-hash',
  summary: 'Sichert einen eingefrorenen Lauf-Digest gegen stille Abweichungen.',
  taskArchetype: 'code-test',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'run-digest-assert', propertyTest: false },
    { caseId: 'pipeline-freeze-report', propertyTest: false },
    { caseId: 'reproduction-verdict-rules', propertyTest: false },
  ],
  difficultyProfiles: ['stretch', 'challenge'],
  competencyIds: ['c-python-functions', 'c-research-capstone'],
};

// The __raised helper plus the renamed reference copy are emitted once at the
// top of the seeded block; all per-draw checks call into it.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: DIGEST_CONTRACT,
  cases: DIGEST_CASES,
  shapeError: 'Lauf-Digest-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n\n${seedCases.map((entry, i) => caseDef.emit(entry, i + 1)).join('\n')}`,
});

