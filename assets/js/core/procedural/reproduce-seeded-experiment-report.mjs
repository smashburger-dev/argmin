// Procedural family reproduce-seeded-experiment-report: the task text,
// starter code and reference solver stay fixed; the seed draws fresh
// experiment configs (seed/n/test_share/lam), manifests and corrupt table
// rows that get appended to the curated base test block as literal __check
// lines. Every drawn expectation is evaluated against a renamed __ref_ copy
// of the reference solver and __raised covers the ValueError paths, so the
// grading contract cannot drift. Mirrors reproduce-seeded-split.mjs.

import { pyLit, RAISED_HELPER, refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, shuffle } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/reproduce-seeded-experiment-report.json' with { type: 'json' };

// Verbatim case payloads extracted from content/families/reproduce-seeded-experiment-report.json.
const CASE_PAYLOADS = {
  "seeded-experiment-manifest": { "difficulty": "core", "competencyIds": ["c-ml-repro","c-numpy-basics"] },
  "repro-report-table-check": { "difficulty": "stretch", "competencyIds": ["c-ml-repro","c-numpy-basics"] },
};

// Draw banks: experiment config knobs, manifest field pools and the corrupt
// table shapes that must hit the check_table ValueError arms.
const N_BANK = [20, 30, 40, 60, 80];
const SHARE_BANK = [0.2, 0.25, 0.3];
const LAM_BANK = [0.1, 0.5, 1.0, 2.0];
const NUMPY_VERSIONS = ['1.20.3', '1.24.0', '2.0.0'];
const MANIFEST_KEYS = ['seed', 'split', 'metric', 'versions'];
const CONFIG_ID_POOL = ['a', 'b', 'c', 'd', 'e'];

const drawConfig = (r) => ({
  seed: randInt(r, 0, 9999),
  n: pick(r, N_BANK),
  test_share: pick(r, SHARE_BANK),
  lam: pick(r, LAM_BANK),
});

const drawManifest = (r, seed) => ({
  seed,
  split: `${randInt(r, 2, 9) * 10}/${randInt(r, 1, 4) * 10}`,
  metric: 'rmse',
  versions: { numpy: pick(r, NUMPY_VERSIONS) },
});

// Corrupt tables for check_table: every row shape the contract rejects.
const BAD_TABLES = [
  { a: { score: 0.1, identical_rerun: false } },
  {},
  { x: { score: 1.5 } },
  { y: { identical_rerun: true } },
  { z: { score: -0.5, identical_rerun: true } },
];

export const EXPERIMENT_CASES = {
  'seeded-experiment-manifest': {
    ...CASE_PAYLOADS['seeded-experiment-manifest'],
    competencyIds: ['c-ml-repro', 'c-numpy-basics'],
    refNames: ['run_experiment', 'check_manifest'],
    // Full config plus a valid manifest, a manifest with one dropped
    // required key and a seed-less config for the two ValueError arms.
    draw(r) {
      const config = drawConfig(r);
      const manifest = drawManifest(r, config.seed);
      const badManifest = { ...manifest };
      delete badManifest[pick(r, MANIFEST_KEYS)];
      const badConfig = r() < 0.5 ? {} : { n: pick(r, N_BANK) };
      return { config, manifest, badManifest, badConfig };
    },
    emit(entry, index) {
      const p = `__ex${index}`;
      return [
        `${p}_cfg = ${pyLit(entry.config)}`,
        `__check('seeded experiment ${index}', run_experiment(${p}_cfg) == __ref_run_experiment(${p}_cfg))`,
        `${p}_man = ${pyLit(entry.manifest)}`,
        `__check('seeded manifest ${index}', check_manifest(${p}_man) == __ref_check_manifest(${p}_man))`,
        `${p}_badman = ${pyLit(entry.badManifest)}`,
        `__check('seeded manifest fehler ${index}', __raised(check_manifest, ${p}_badman) == __raised(__ref_check_manifest, ${p}_badman))`,
        `__check('seeded experiment fehler ${index}', __raised(run_experiment, ${pyLit(entry.badConfig)}) == __raised(__ref_run_experiment, ${pyLit(entry.badConfig)}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'repro-report-table-check': {
    ...CASE_PAYLOADS['repro-report-table-check'],
    competencyIds: ['c-ml-repro', 'c-numpy-basics'],
    refNames: ['run_experiment', 'check_manifest', 'repro_report', 'check_table'],
    // 2-4 configs with drawn ids plus one corrupt table from the bank; the
    // produced table feeds both check_table sides through __raised.
    draw(r) {
      const ids = shuffle(r, [...CONFIG_ID_POOL]).slice(0, randInt(r, 2, 4));
      const configs = ids.map((id) => ({ config_id: id, ...drawConfig(r) }));
      const badTable = pick(r, BAD_TABLES);
      return { configs, badTable };
    },
    emit(entry, index) {
      const p = `__rt${index}`;
      return [
        `${p}_cfgs = ${pyLit(entry.configs)}`,
        `${p}_tab = repro_report(${p}_cfgs)`,
        `__check('seeded bericht ${index}', ${p}_tab == __ref_repro_report(${p}_cfgs))`,
        `__check('seeded tabelle ok ${index}', __raised(check_table, ${p}_tab) == __raised(__ref_check_table, ${p}_tab))`,
        `${p}_bad = ${pyLit(entry.badTable)}`,
        `__check('seeded tabelle fehler ${index}', __raised(check_table, ${p}_bad) == __raised(__ref_check_table, ${p}_bad))`,
      ].join('\n');
    },
    extraCount: 3,
  },
};

export const EXPERIMENT_CONTRACT = {
  familyId: 'reproduce-seeded-experiment-report',
  familyGroup: 'reproduce-hash',
  summary: 'Führt ein geseedetes Experiment deterministisch aus (feste Ziehungsreihenfolge, Doppel-Lauf) und prüft Manifest- bzw. Tabellenfelder gegen Typ- und Wertregeln.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'seeded-experiment-manifest', propertyTest: false },
    { caseId: 'repro-report-table-check', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-ml-repro', 'c-numpy-basics'],
};

// The __raised helper plus the renamed reference copy are emitted once at the
// top of the seeded block; all per-draw checks call into it.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: EXPERIMENT_CONTRACT,
  cases: EXPERIMENT_CASES,
  shapeError: 'Experiment-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n\n${seedCases.map((entry, i) => caseDef.emit(entry, i + 1)).join('\n')}`,
});

