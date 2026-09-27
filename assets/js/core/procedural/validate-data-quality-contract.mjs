// Procedural family validate-data-quality-contract: the task text, starter
// code and reference solver stay fixed; the seed draws fresh row tables and
// schema violations that get appended to the curated base test block as
// literal __check lines. Expected values are asserted inline against a
// __ref_ copy of the reference solver (wrapped by __raised so ValueError
// paths compare by type and message), so the grading contract cannot drift.
// Mirrors palindromExtraCases in foundations_construct_families.mjs.

import { pyLit, refCopy, RAISED_HELPER } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/validate-data-quality-contract.json' with { type: 'json' };

const anchor = (caseId) => doc.cases.find((entry) => entry.caseId === caseId);
const PROFILE_REFERENCE = anchor('profile-table-schema-counts').expected.referenceSolver;

const ROWS_REFERENCE = anchor('validate-rows-contract-errors').expected.referenceSolver;

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
};

// The per-case prelude (raised helper plus renamed reference copy / contract
// literal) is emitted once at the top of the seeded block; all per-draw
// checks call into it.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: DATA_QUALITY_CONTRACT,
  cases: DATA_QUALITY_CASES,
  shapeError: 'Datenqualitäts-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${[
      caseDef.prelude,
      ...seedCases.map((entry, i) => caseDef.emit(entry, i + 1)),
    ].join('\n\n')}`,
});

