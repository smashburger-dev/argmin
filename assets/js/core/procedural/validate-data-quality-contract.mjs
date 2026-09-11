// Procedural family validate-data-quality-contract: the task text, starter
// code and reference solver stay fixed; the seed draws fresh row tables and
// schema violations that get appended to the curated base test block as
// literal __check lines. Expected values are asserted inline against a
// __ref_ copy of the reference solver (wrapped by __raised so ValueError
// paths compare by type and message), so the grading contract cannot drift.
// Mirrors palindromExtraCases in foundations_construct_families.mjs.

import { RAISED_HELPER } from './py_test_kit.mjs';

import { pick, randInt, rng, shuffle } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const PROFILE_STARTER = `def profile_table(rows):
    """Return {'total', 'missing', 'sentinel', 'duplicate_ids'} or raise ValueError."""
    # check schema per row first, then count
    ...
`;

const ROWS_STARTER = `def validate_rows(rows, contract):
    """Check rows against the contract; return list of (i, column, kind) errors."""
    # 1) column set per row: mismatch -> (i, None, "columns"), skip row
    # 2) per column in contract order: None/type check, then range
    # 3) after the row pass: unique columns -> (i, col, "duplicate")
    ...
`;

const PROFILE_BASE_TESTS = `rows = [
    {"id": "a", "wert": 3},
    {"id": "b", "wert": None},
    {"id": "a", "wert": -1},
    {"id": "c", "wert": -1},
    {"id": "d", "wert": 7},
    {"id": "b", "wert": 0},
]
p = profile_table(rows)
__check('total', p["total"] == 6)
__check('missing', p["missing"] == 1)
__check('sentinel', p["sentinel"] == 2)
__check('duplicate_ids distinct', p["duplicate_ids"] == 2)
try:
    profile_table([{"id": "a", "wert": 3}, {"id": "b"}])
    __check('fehlende Spalte -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('fehlende Spalte -> ValueError', True)
try:
    profile_table([{"id": "a", "wert": "3"}])
    __check('falscher Typ -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('falscher Typ -> ValueError', True)
try:
    profile_table([{"id": "a", "wert": True}])
    __check('bool -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('bool -> ValueError', True)`;

const ROWS_BASE_TESTS = `contract = {
    "columns": ["id", "alter", "umsatz"],
    "types": {"id": "str", "alter": "int", "umsatz": "number"},
    "nullable": ["umsatz"],
    "ranges": {"alter": [18, 99]},
    "unique": ["id"],
}
ok_rows = [
    {"id": "k1", "alter": 34, "umsatz": 120.5},
    {"id": "k2", "alter": 41, "umsatz": None},
    {"id": "k3", "alter": 29, "umsatz": 90},
]
__check('fehlerfreie Tabelle', validate_rows(ok_rows, contract) == [])
bad_rows = [
    {"id": "k1", "alter": 34, "umsatz": 120.5},
    {"id": "k2", "alter": "41", "umsatz": 3.0},
    {"id": "k3", "alter": 17, "umsatz": 2.0},
    {"id": "k1", "alter": 52, "umsatz": None},
    {"alter": 52, "umsatz": 1.0},
    {"id": "k9", "umsatz": 1.0},
    {"id": True, "alter": 30, "umsatz": 1.0},
    {"id": "k7", "alter": None, "umsatz": 1.0},
    {"id": "k8", "alter": 30, "umsatz": "viel"},
]
errs = validate_rows(bad_rows, contract)
__check('Anzahl Fehler', len(errs) == 8)
__check('Typfehler alter', (1, "alter", "type") in errs)
__check('Bereichsfehler alter', (2, "alter", "range") in errs)
__check('Duplikat id', (3, "id", "duplicate") in errs)
__check('fehlende Spalte Zeile 4', (4, None, "columns") in errs)
__check('fehlende Spalte Zeile 5', (5, None, "columns") in errs)
__check('bool ist kein str', (6, "id", "type") in errs)
__check('None nicht nullable', (7, "alter", "type") in errs)
__check('umsatz kein number', (8, "umsatz", "type") in errs)
__check('Bereichsgrenze inklusiv', validate_rows([{"id": "k1", "alter": 18, "umsatz": 1.0}, {"id": "k2", "alter": 99, "umsatz": 1.0}], contract) == [])`;

const PROFILE_REFERENCE = `def profile_table(rows):
    REQUIRED = {"id", "wert"}
    total = 0
    missing = 0
    sentinel = 0
    counts = {}
    for row in rows:
        if not isinstance(row, dict) or set(row.keys()) != REQUIRED:
            raise ValueError("schema violation: expected columns id, wert")
        rid, wert = row["id"], row["wert"]
        if not isinstance(rid, str):
            raise ValueError("schema violation: id must be str")
        if wert is not None and (not isinstance(wert, int) or isinstance(wert, bool)):
            raise ValueError("schema violation: wert must be int or None")
        total += 1
        if wert is None:
            missing += 1
        elif wert == -1:
            sentinel += 1
        counts[rid] = counts.get(rid, 0) + 1
    duplicate_ids = sum(1 for c in counts.values() if c > 1)
    return {"total": total, "missing": missing, "sentinel": sentinel, "duplicate_ids": duplicate_ids}`;

const ROWS_REFERENCE = `def validate_rows(rows, contract):
    columns = list(contract["columns"])
    types = contract.get("types", {})
    nullable = set(contract.get("nullable", []))
    ranges = contract.get("ranges", {})
    errors = []
    for i, row in enumerate(rows):
        if not isinstance(row, dict) or set(row.keys()) != set(columns):
            errors.append((i, None, "columns"))
            continue
        for col in columns:
            value = row[col]
            if value is None:
                if col not in nullable:
                    errors.append((i, col, "type"))
                continue
            expected = types.get(col)
            ok = True
            if expected == "str":
                ok = isinstance(value, str)
            elif expected == "int":
                ok = isinstance(value, int) and not isinstance(value, bool)
            elif expected == "number":
                ok = isinstance(value, (int, float)) and not isinstance(value, bool)
            if not ok:
                errors.append((i, col, "type"))
                continue
            if col in ranges:
                lo, hi = ranges[col]
                if not (lo <= value <= hi):
                    errors.append((i, col, "range"))
    for col in contract.get("unique", []):
        seen = set()
        for i, row in enumerate(rows):
            if not isinstance(row, dict) or set(row.keys()) != set(columns):
                continue
            value = row.get(col)
            if value in seen:
                errors.append((i, col, "duplicate"))
            else:
                seen.add(value)
    return errors`;

const PROFILE_PROMPT = 'Implementiere <code>profile_table(rows)</code>. Eingabe: <code>rows</code> ist eine Liste von Dictionaries mit genau den Spalten <code>"id"</code> (immer str) und <code>"wert"</code> (int oder None). Rückgabe: ein Dictionary mit <code>"total"</code> (Anzahl der Zeilen), <code>"missing"</code> (Anzahl Zeilen mit wert None), <code>"sentinel"</code> (Anzahl Zeilen mit wert -1) und <code>"duplicate_ids"</code> (Anzahl verschiedener ids, die in mehr als einer Zeile vorkommen). Schema-Verstöße führen zu <code>ValueError</code>, und zwar bevor irgendein Ergebnis zurückgegeben wird: falsche oder fehlende Spalten, id kein str, wert weder int noch None; <code>bool</code> gilt nicht als int. Der Testcode ist von deiner Eingabe getrennt und prüft Werte und Fehlerverhalten.';

const ROWS_PROMPT = 'Final Boss Datenqualitätsvertrag: Implementiere <code>validate_rows(rows, contract)</code>. Eingabe: <code>rows</code> ist eine Liste von Dictionaries; <code>contract</code> hat die Schlüssel <code>columns</code> (Liste der erwarteten Spalten — genau diese, keine fehlenden, keine zusätzlichen), <code>types</code> (Abbildung Spalte → <code>"str"</code> | <code>"int"</code> | <code>"number"</code>; <code>"int"</code> und <code>"number"</code> lehnen bool ab, <code>"number"</code> akzeptiert int und float), <code>nullable</code> (Liste der Spalten, in denen None erlaubt ist), <code>ranges</code> (Abbildung Spalte → [min, max] mit inklusiven Grenzen, nur für vorhandene numerische Werte) und <code>unique</code> (Liste der Spalten, deren Werte zeilenweise eindeutig sein müssen). Rückgabe: Liste von Fehler-Tupeln <code>(zeilenindex, spalte, art)</code> mit art aus <code>"columns"</code>, <code>"type"</code>, <code>"range"</code>, <code>"duplicate"</code>. Regeln: falsches Spaltenset einer Zeile → genau <code>(i, None, "columns")</code>, keine weiteren Prüfungen für diese Zeile; None außerhalb von nullable → <code>(i, spalte, "type")</code>; Typ- und Bereichsprüfung erfolgen je Zeile in der Reihenfolge von <code>columns</code>; nach dem Zeilendurchlauf wird jede <code>unique</code>-Spalte geprüft — jede Wiederholung nach dem ersten Auftreten ergibt <code>(i, spalte, "duplicate")</code>. Fehlerfreie Eingaben geben <code>[]</code> zurück. Der Testcode enthält eine fehlerfreie Tabelle und eine Tabelle mit allen Fehlerarten.';

const PROFILE_SOLUTION = `${PROFILE_REFERENCE}

# profile_table aus dem Test: total 6, missing 1, sentinel 2, duplicate_ids 2`;

const ROWS_SOLUTION = `${ROWS_REFERENCE}

# bad_rows aus dem Test liefern 8 Fehler: type/range/columns/duplicate wie oben spezifiziert`;

// The seeded block reuses the curated contract verbatim so the seeded tables
// stay comparable with the base assertions.
const ROWS_CONTRACT = {
  columns: ['id', 'alter', 'umsatz'],
  types: { id: 'str', alter: 'int', umsatz: 'number' },
  nullable: ['umsatz'],
  ranges: { alter: [18, 99] },
  unique: ['id'],
};

const BAD_ROW_KINDS = ['columns-missing', 'columns-extra', 'id-type', 'wert-type', 'wert-bool'];
const ROW_FLAW_KINDS = ['columns-missing', 'columns-extra', 'id-bool', 'alter-none', 'alter-low', 'alter-high', 'umsatz-str'];

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

// Renames the public functions of the reference solver so the test block can
// keep an inline oracle copy next to the seeded literals.
const refCopy = (source, names) => names.reduce(
  (text, name) => text.replaceAll(`def ${name}(`, `def __ref_${name}(`),
  source,
);

const drawBadRow = (r) => {
  const kind = pick(r, BAD_ROW_KINDS);
  if (kind === 'columns-missing') return { id: `x${randInt(r, 1, 9)}` };
  if (kind === 'columns-extra') return { id: `x${randInt(r, 1, 9)}`, wert: randInt(r, 0, 9), notiz: 'n' };
  if (kind === 'id-type') return { id: randInt(r, 1, 9), wert: randInt(r, 0, 9) };
  if (kind === 'wert-type') return { id: `x${randInt(r, 1, 9)}`, wert: String(randInt(r, 0, 9)) };
  return { id: `x${randInt(r, 1, 9)}`, wert: pick(r, [true, false]) };
};

const drawProfileRows = (r) => {
  const len = randInt(r, 4, 9);
  const poolSize = randInt(r, 2, 4);
  const pool = Array.from({ length: poolSize }, (_, i) => `k${randInt(r, 0, 89)}${i}`);
  return Array.from({ length: len }, () => {
    const roll = r();
    const wert = roll < 0.15 ? null : roll < 0.3 ? -1 : randInt(r, 0, 40);
    return { id: pick(r, pool), wert };
  });
};

const drawOkContractRow = (r) => ({
  id: `k${randInt(r, 1, 5)}`,
  alter: randInt(r, 18, 99),
  umsatz: r() < 0.3 ? null : randInt(r, 1, 500) + pick(r, [0, 0.5]),
});

const drawFlawedContractRow = (r) => {
  const kind = pick(r, ROW_FLAW_KINDS);
  const id = `k${randInt(r, 1, 5)}`;
  if (kind === 'columns-missing') return { id, umsatz: randInt(r, 1, 50) };
  if (kind === 'columns-extra') return { id, alter: randInt(r, 18, 99), umsatz: randInt(r, 1, 50), notiz: 'x' };
  if (kind === 'id-bool') return { id: true, alter: randInt(r, 18, 99), umsatz: randInt(r, 1, 50) };
  if (kind === 'alter-none') return { id, alter: null, umsatz: randInt(r, 1, 50) };
  if (kind === 'alter-low') return { id, alter: randInt(r, 5, 17), umsatz: randInt(r, 1, 50) };
  if (kind === 'alter-high') return { id, alter: randInt(r, 100, 140), umsatz: randInt(r, 1, 50) };
  return { id, alter: randInt(r, 18, 99), umsatz: 'viel' };
};

// Case definitions: the draw domains produce concrete row literals that get
// baked into the test block (honest distinctness — the drawn inputs differ,
// not just a seed literal).
export const DATA_QUALITY_CASES = {
  'profile-table-schema-counts': {
    difficulty: 'core',
    packages: PACKAGES,
    starterCode: PROFILE_STARTER,
    baseTests: PROFILE_BASE_TESTS,
    referenceSolver: PROFILE_REFERENCE,
    prompt: PROFILE_PROMPT,
    fullSolution: PROFILE_SOLUTION,
    prelude: `${RAISED_HELPER}\n\n${refCopy(PROFILE_REFERENCE, ['profile_table'])}`,
    draw(r) {
      return { rows: drawProfileRows(r), bad: drawBadRow(r) };
    },
    emit({ rows, bad }, index) {
      return [
        `__rows${index} = ${pyLit(rows)}`,
        `__check('seeded profile ${index}', __raised(profile_table, __rows${index}) == __raised(__ref_profile_table, __rows${index}))`,
        `__bad${index} = [${pyLit(bad)}]`,
        `__check('seeded schema error ${index}', __raised(profile_table, __bad${index}) == __raised(__ref_profile_table, __bad${index}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'validate-rows-contract-errors': {
    difficulty: 'stretch',
    packages: PACKAGES,
    starterCode: ROWS_STARTER,
    baseTests: ROWS_BASE_TESTS,
    referenceSolver: ROWS_REFERENCE,
    prompt: ROWS_PROMPT,
    fullSolution: ROWS_SOLUTION,
    prelude: `${refCopy(ROWS_REFERENCE, ['validate_rows'])}\n\n__contract = ${pyLit(ROWS_CONTRACT)}`,
    draw(r) {
      const len = randInt(r, 5, 10);
      const rows = Array.from({ length: len }, () => (r() < 0.7 ? drawOkContractRow(r) : drawFlawedContractRow(r)));
      return { rows };
    },
    emit({ rows }, index) {
      return [
        `__rows${index} = ${pyLit(rows)}`,
        `__check('seeded validate ${index}', validate_rows(__rows${index}, __contract) == __ref_validate_rows(__rows${index}, __contract))`,
      ].join('\n');
    },
    extraCount: 3,
  },
};

const seededBlock = (caseDef, seedCases) => [
  caseDef.prelude,
  ...seedCases.map((entry, i) => caseDef.emit(entry, i + 1)),
].join('\n\n');

const testsFor = (caseDef, seedCases) => `${caseDef.baseTests}\n\n# seeded extra cases\n${seededBlock(caseDef, seedCases)}`;

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function dataQualityCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === testsFor(caseDef, parameters.seedCases);
  } catch { return false; }
}

export function genDataQualityCase(seed, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, () => caseDef.draw(r));
  return {
    parameters: {
      packages: caseDef.packages,
      starterCode: caseDef.starterCode,
      tests: testsFor(caseDef, seedCases),
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
  };
}

export function solveDataQualityFamily(parameters) {
  const caseDef = Object.values(DATA_QUALITY_CASES).find((item) => dataQualityCaseOk(parameters, item));
  if (!caseDef) throw new Error('Datenqualitäts-Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

export const DATA_QUALITY_CONTRACT = {
  familyId: 'validate-data-quality-contract',
  familyGroup: 'validate-contract',
  summary: 'Implementiert Datenqualitätsverträge mit Schema-, Typ-, Bereichs- und Duplikatprüfungen.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'profile-table-schema-counts', propertyTest: false },
    { caseId: 'validate-rows-contract-errors', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-pandas-cleaning'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateDataQualityFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = DATA_QUALITY_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genDataQualityCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...DATA_QUALITY_CONTRACT, generate: generateDataQualityFamily, solve: solveDataQualityFamily };
