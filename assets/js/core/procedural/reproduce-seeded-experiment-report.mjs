// Procedural family reproduce-seeded-experiment-report: the task text,
// starter code and reference solver stay fixed; the seed draws fresh
// experiment configs (seed/n/test_share/lam), manifests and corrupt table
// rows that get appended to the curated base test block as literal __check
// lines. Every drawn expectation is evaluated against a renamed __ref_ copy
// of the reference solver and __raised covers the ValueError paths, so the
// grading contract cannot drift. Mirrors reproduce-seeded-split.mjs.

import { RAISED_HELPER, refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, shuffle } from '../generator_draw_kit.mjs';

// Verbatim case payloads extracted from content/families/reproduce-seeded-experiment-report.json.
const CASE_PAYLOADS = {
  "seeded-experiment-manifest": { "difficulty": "core", "packages": ["numpy"], "starterCode": "import numpy as np\n\ndef run_experiment(config):\n    \"\"\"Deterministic seeded experiment; config['seed'] required (else ValueError).\"\"\"\n    # 1) seed pruefen, 2) rng + permutation, 3) Daten, 4) w und rmse\n    ...\n\ndef check_manifest(manifest):\n    \"\"\"Return True if manifest has seed, split, metric, versions; else ValueError.\"\"\"\n    required = ('seed', 'split', 'metric', 'versions')\n    # fehlende Schluessel sammeln und melden\n    ...\n", "baseTests": "import numpy as np\n\n__cfg = {'seed': 11, 'n': 40, 'test_share': 0.25, 'lam': 1.0}\n__r1 = run_experiment(__cfg)\n__r2 = run_experiment(__cfg)\n__check('Schluessel vorhanden', all(k in __r1 for k in ('seed', 'test_idx', 'w', 'rmse')))\n__check('zwei Laeufe identisch', __r1 == __r2)\n__check('Anzahl Testindizes 10', len(__r1['test_idx']) == 10)\n__alt = dict(__cfg)\n__alt['seed'] = 12\n__r3 = run_experiment(__alt)\n__check('anderer Seed, anderer Split', __r1['test_idx'] != __r3['test_idx'])\n__check('anderer Seed aendert Werte', (__r1['w'] != __r3['w']) or (__r1['rmse'] != __r3['rmse']))\n__check('gueltiges Manifest', check_manifest({'seed': 11, 'split': '30/10', 'metric': 'rmse', 'versions': {'numpy': '1.20.3'}}) is True)\ntry:\n    check_manifest({'seed': 11, 'split': '30/10', 'metric': 'rmse'})\n    __check('fehlender Schluessel abgelehnt', False, 'kein ValueError')\nexcept ValueError:\n    __check('fehlender Schluessel abgelehnt', True)\nexcept Exception as e:\n    __check('fehlender Schluessel abgelehnt', False, type(e).__name__)\ntry:\n    run_experiment({'n': 40})\n    __check('config ohne seed abgelehnt', False, 'kein ValueError')\nexcept ValueError:\n    __check('config ohne seed abgelehnt', True)\nexcept Exception as e:\n    __check('config ohne seed abgelehnt', False, type(e).__name__)", "referenceSolver": "import numpy as np\n\ndef run_experiment(config):\n    if \"seed\" not in config:\n        raise ValueError(\"config requires key: seed\")\n    seed = int(config[\"seed\"])\n    n = int(config.get(\"n\", 40))\n    test_share = float(config.get(\"test_share\", 0.25))\n    lam = float(config.get(\"lam\", 1.0))\n    rng = np.random.default_rng(seed)\n    perm = rng.permutation(n)\n    n_test = max(1, int(round(n * test_share)))\n    test_idx = perm[:n_test]\n    train_idx = perm[n_test:]\n    x = np.linspace(0.0, 1.0, n)\n    y = 2.0 * x + rng.normal(0.0, 0.1, size=n)\n    xt, yt = x[train_idx], y[train_idx]\n    xv, yv = x[test_idx], y[test_idx]\n    w = float((xt @ yt) / (xt @ xt + lam))\n    rmse = float(np.sqrt(np.mean((w * xv - yv) ** 2)))\n    return {\"seed\": seed, \"n\": n, \"test_idx\": [int(i) for i in test_idx],\n            \"w\": w, \"rmse\": rmse}\n\ndef check_manifest(manifest):\n    required = (\"seed\", \"split\", \"metric\", \"versions\")\n    if not isinstance(manifest, dict):\n        raise ValueError(\"manifest must be a dict\")\n    missing = [key for key in required if key not in manifest]\n    if missing:\n        raise ValueError(\"manifest fehlt: \" + \", \".join(missing))\n    return True", "prompt": "Implementiere den Reproduzierbarkeitsvertrag in zwei Funktionen. `run_experiment(config)` (config mit Pflichtschlüssel `seed`; optional `n`, `test_share`, `lam` mit Defaults 40, 0.25, 1.0; fehlt `seed` → `ValueError`) läuft deterministisch: `rng = np.random.default_rng(seed)`; `perm = rng.permutation(n)`; `n_test = max(1, round(n*test_share))`; `test_idx = perm[:n_test]` (als Liste int), `train_idx = perm[n_test:]`; `x = np.linspace(0, 1, n)`; `y = 2*x + rng.normal(0, 0.1, n)`; Ridge-1D-Gewicht `w = Σx_train·y_train/(Σx_train² + lam)`; `rmse` auf dem Testteil. Rückgabe `{'seed': int, 'n': int, 'test_idx': [...], 'w': float, 'rmse': float}`. `check_manifest(manifest)` prüft, dass ein dict die Schlüssel `seed`, `split`, `metric`, `versions` enthält — fehlt einer oder ist kein dict: `ValueError`; gültig: Rückgabe `True`.", "fullSolution": "import numpy as np\n\ndef run_experiment(config):\n    if \"seed\" not in config:\n        raise ValueError(\"config requires key: seed\")\n    seed = int(config[\"seed\"])\n    n = int(config.get(\"n\", 40))\n    test_share = float(config.get(\"test_share\", 0.25))\n    lam = float(config.get(\"lam\", 1.0))\n    rng = np.random.default_rng(seed)\n    perm = rng.permutation(n)\n    n_test = max(1, int(round(n * test_share)))\n    test_idx = perm[:n_test]\n    train_idx = perm[n_test:]\n    x = np.linspace(0.0, 1.0, n)\n    y = 2.0 * x + rng.normal(0.0, 0.1, size=n)\n    xt, yt = x[train_idx], y[train_idx]\n    xv, yv = x[test_idx], y[test_idx]\n    w = float((xt @ yt) / (xt @ xt + lam))\n    rmse = float(np.sqrt(np.mean((w * xv - yv) ** 2)))\n    return {\"seed\": seed, \"n\": n, \"test_idx\": [int(i) for i in test_idx],\n            \"w\": w, \"rmse\": rmse}\n\ndef check_manifest(manifest):\n    required = (\"seed\", \"split\", \"metric\", \"versions\")\n    if not isinstance(manifest, dict):\n        raise ValueError(\"manifest must be a dict\")\n    missing = [key for key in required if key not in manifest]\n    if missing:\n        raise ValueError(\"manifest fehlt: \" + \", \".join(missing))\n    return True", "competencyIds": ["c-ml-repro","c-numpy-basics"] },
  "repro-report-table-check": { "difficulty": "stretch", "packages": ["numpy"], "starterCode": "import numpy as np\n\ndef run_experiment(config):\n    \"\"\"Deterministic seeded experiment from w17-e4.\"\"\"\n    ...\n\ndef check_manifest(manifest):\n    \"\"\"Validate seed, split, metric, versions; ValueError when incomplete.\"\"\"\n    ...\n\ndef repro_report(configs):\n    \"\"\"Run each config twice; return {config_id: {'score': float, 'identical_rerun': bool}}.\"\"\"\n    # sortiert nach config_id: erst laufen lassen, dann vergleichen\n    ...\n\ndef check_table(table):\n    \"\"\"Raise ValueError on any incomplete or non-reproducible row; else return True.\"\"\"\n    ...\n", "baseTests": "import numpy as np\n\n__configs = [\n    {'config_id': 'a', 'seed': 1, 'n': 40, 'test_share': 0.25, 'lam': 0.5},\n    {'config_id': 'b', 'seed': 2, 'n': 40, 'test_share': 0.25, 'lam': 1.0},\n    {'config_id': 'c', 'seed': 3, 'n': 40, 'test_share': 0.25, 'lam': 2.0},\n]\n__table = repro_report(__configs)\n__check('drei Zeilen a/b/c', sorted(__table.keys()) == ['a', 'b', 'c'])\n__check('identical_rerun ueberall True', all(row['identical_rerun'] is True for row in __table.values()))\n__check('Scores sind positive floats', all(isinstance(row['score'], float) and row['score'] > 0.0 for row in __table.values()))\n__check('check_table akzeptiert', check_table(__table) is True)\n__table2 = repro_report(__configs)\n__check('Report selbst reproduzierbar', __table == __table2)\ntry:\n    check_table({'a': {'score': 0.1, 'identical_rerun': False}})\n    __check('fehlgeschlagene Wiederholung abgelehnt', False, 'kein ValueError')\nexcept ValueError:\n    __check('fehlgeschlagene Wiederholung abgelehnt', True)\nexcept Exception as e:\n    __check('fehlgeschlagene Wiederholung abgelehnt', False, type(e).__name__)\ntry:\n    check_table({})\n    __check('leere Tabelle abgelehnt', False, 'kein ValueError')\nexcept ValueError:\n    __check('leere Tabelle abgelehnt', True)\nexcept Exception as e:\n    __check('leere Tabelle abgelehnt', False, type(e).__name__)", "referenceSolver": "import numpy as np\n\ndef run_experiment(config):\n    if \"seed\" not in config:\n        raise ValueError(\"config requires key: seed\")\n    seed = int(config[\"seed\"])\n    n = int(config.get(\"n\", 40))\n    test_share = float(config.get(\"test_share\", 0.25))\n    lam = float(config.get(\"lam\", 1.0))\n    rng = np.random.default_rng(seed)\n    perm = rng.permutation(n)\n    n_test = max(1, int(round(n * test_share)))\n    test_idx = perm[:n_test]\n    train_idx = perm[n_test:]\n    x = np.linspace(0.0, 1.0, n)\n    y = 2.0 * x + rng.normal(0.0, 0.1, size=n)\n    xt, yt = x[train_idx], y[train_idx]\n    xv, yv = x[test_idx], y[test_idx]\n    w = float((xt @ yt) / (xt @ xt + lam))\n    rmse = float(np.sqrt(np.mean((w * xv - yv) ** 2)))\n    return {\"seed\": seed, \"n\": n, \"test_idx\": [int(i) for i in test_idx],\n            \"w\": w, \"rmse\": rmse}\n\ndef check_manifest(manifest):\n    required = (\"seed\", \"split\", \"metric\", \"versions\")\n    if not isinstance(manifest, dict):\n        raise ValueError(\"manifest must be a dict\")\n    missing = [key for key in required if key not in manifest]\n    if missing:\n        raise ValueError(\"manifest fehlt: \" + \", \".join(missing))\n    return True\n\ndef repro_report(configs):\n    table = {}\n    for config in sorted(configs, key=lambda c: str(c[\"config_id\"])):\n        first = run_experiment(config)\n        second = run_experiment(config)\n        table[str(config[\"config_id\"])] = {\n            \"score\": float(first[\"rmse\"]),\n            \"identical_rerun\": first == second,\n        }\n    return table\n\ndef check_table(table):\n    if not isinstance(table, dict) or not table:\n        raise ValueError(\"Tabelle leer oder kein dict\")\n    for config_id, row in table.items():\n        if not isinstance(row, dict) or \"score\" not in row or \"identical_rerun\" not in row:\n            raise ValueError(\"Zeile unvollstaendig: \" + str(config_id))\n        if not isinstance(row[\"score\"], float) or row[\"score\"] < 0:\n            raise ValueError(\"Score muss nichtnegativer float sein: \" + str(config_id))\n        if row[\"identical_rerun\"] is not True:\n            raise ValueError(\"Wiederholung nicht identisch: \" + str(config_id))\n    return True", "prompt": "Final Boss Reproduzierbarkeit: Implementiere `repro_report(configs)` und `check_table(table)` (und nutze dein `run_experiment`/`check_manifest` aus w17-e4 — implementiere alles, was du brauchst). `repro_report(configs)` erhält eine Liste von Config-Dicts mit `config_id` plus den Feldern für `run_experiment`; es führt jede Konfiguration **zweimal** aus und gibt ein Dictionary zurück: `{config_id: {'score': rmse_float, 'identical_rerun': bool}}`, sortiert nach config_id. `check_table(table)` validiert die Tabelle: nicht-leeres dict, jede Zeile mit `score` (nichtnegativer float) und `identical_rerun` (muss True sein) — jede Verletzung wirft `ValueError`, gültig gibt `True` zurück.", "fullSolution": "import numpy as np\n\ndef run_experiment(config):\n    if \"seed\" not in config:\n        raise ValueError(\"config requires key: seed\")\n    seed = int(config[\"seed\"])\n    n = int(config.get(\"n\", 40))\n    test_share = float(config.get(\"test_share\", 0.25))\n    lam = float(config.get(\"lam\", 1.0))\n    rng = np.random.default_rng(seed)\n    perm = rng.permutation(n)\n    n_test = max(1, int(round(n * test_share)))\n    test_idx = perm[:n_test]\n    train_idx = perm[n_test:]\n    x = np.linspace(0.0, 1.0, n)\n    y = 2.0 * x + rng.normal(0.0, 0.1, size=n)\n    xt, yt = x[train_idx], y[train_idx]\n    xv, yv = x[test_idx], y[test_idx]\n    w = float((xt @ yt) / (xt @ xt + lam))\n    rmse = float(np.sqrt(np.mean((w * xv - yv) ** 2)))\n    return {\"seed\": seed, \"n\": n, \"test_idx\": [int(i) for i in test_idx],\n            \"w\": w, \"rmse\": rmse}\n\ndef check_manifest(manifest):\n    required = (\"seed\", \"split\", \"metric\", \"versions\")\n    if not isinstance(manifest, dict):\n        raise ValueError(\"manifest must be a dict\")\n    missing = [key for key in required if key not in manifest]\n    if missing:\n        raise ValueError(\"manifest fehlt: \" + \", \".join(missing))\n    return True\n\ndef repro_report(configs):\n    table = {}\n    for config in sorted(configs, key=lambda c: str(c[\"config_id\"])):\n        first = run_experiment(config)\n        second = run_experiment(config)\n        table[str(config[\"config_id\"])] = {\n            \"score\": float(first[\"rmse\"]),\n            \"identical_rerun\": first == second,\n        }\n    return table\n\ndef check_table(table):\n    if not isinstance(table, dict) or not table:\n        raise ValueError(\"Tabelle leer oder kein dict\")\n    for config_id, row in table.items():\n        if not isinstance(row, dict) or \"score\" not in row or \"identical_rerun\" not in row:\n            raise ValueError(\"Zeile unvollstaendig: \" + str(config_id))\n        if not isinstance(row[\"score\"], float) or row[\"score\"] < 0:\n            raise ValueError(\"Score muss nichtnegativer float sein: \" + str(config_id))\n        if row[\"identical_rerun\"] is not True:\n            raise ValueError(\"Wiederholung nicht identisch: \" + str(config_id))\n    return True", "competencyIds": ["c-ml-repro","c-numpy-basics"] },
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
  graderId: 'pyodide',
  activityType: 'python-code',
};

// The __raised helper plus the renamed reference copy are emitted once at the
// top of the seeded block; all per-draw checks call into it.
const FAMILY = makeCaseFamily({
  contract: EXPERIMENT_CONTRACT,
  cases: EXPERIMENT_CASES,
  shapeError: 'Experiment-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n\n${seedCases.map((entry, i) => caseDef.emit(entry, i + 1)).join('\n')}`,
});

export const experimentCaseOk = FAMILY.caseOk;
export const genExperimentCase = FAMILY.genCase;
export const solveExperimentFamily = FAMILY.solve;
export const generateExperimentFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
