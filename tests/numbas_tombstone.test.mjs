// Numbas tombstone (S1B): the Numbas runtime and the .exam format are
// retired. These tests prove that every Numbas revival variant fails CLOSED
// through the real validation/compile entry points — WITHOUT reintroducing
// any Numbas runtime. Three synthetic revival variants, each in a fresh
// temp root (content/ + schemas/ copy, same convention as the perturbed
// roots in verify_session_b_coverage_retention.test.mjs):
//   1. legacy week-pack exercise with grader: "numbas"
//   2. legacy week-pack exercise with type: "numbas-exam"
//   3. authored exercise definition referencing an examFile
// Retired means retired in EVERY profile: each variant must throw in both
// the public and the local-private compile (fail-closed schema contracts),
// and the type variant must also fail tools/validate_content.mjs in root
// mode (KNOWN_TYPES no longer knows numbas-exam).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';
import { buildLegacyMap } from '../tools/migrate_legacy_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Fresh content copy under /tmp with one Numbas revival applied. The legacy
 *  exercise-competency map is regenerated the same way
 *  tools/migrate_legacy_content.mjs does, so the compile gate stays intact
 *  and the revival itself is the only failure. */
function makeRevivalRoot(label, mutate) {
  const tmp = mkdtempSync(join(tmpdir(), `ki-numbas-tombstone-${label}-`));
  cpSync(join(root, 'content'), join(tmp, 'content'), { recursive: true });
  cpSync(join(root, 'schemas'), join(tmp, 'schemas'), { recursive: true });
  mutate(tmp);
  writeFileSync(join(tmp, 'content/legacy/exercise-competency-map.json'), `${JSON.stringify(buildLegacyMap(tmp), null, 2)}\n`);
  return tmp;
}

/** Clone a valid w01 week-pack exercise and apply one patch, so every field
 *  except the revived Numbas field satisfies the contract — the rejection
 *  must come from the tombstone, not from a broken fixture. */
function addClonedW01Exercise(tmp, exerciseId, patch) {
  const path = join(tmp, 'content/exercises/w01.json');
  const pack = JSON.parse(readFileSync(path, 'utf8'));
  const revival = structuredClone(pack.exercises[0]);
  revival.exerciseId = exerciseId;
  Object.assign(revival, patch);
  pack.exercises.push(revival);
  writeFileSync(path, JSON.stringify(pack));
}

const REVIVALS = [
  ['grader-numbas', (tmp) => {
    // Legacy spelling: grader "numbas" adapts to graderId and must die on
    // the schema enum (deterministic/pyodide/pyodide-sympy/manual-rubric).
    addClonedW01Exercise(tmp, 'w01-tombstone-grader', { grader: 'numbas' });
  }, /graderId must be equal to one of the allowed values/],
  ['type-numbas-exam', (tmp) => {
    // Legacy spelling: type "numbas-exam" adapts to activityType and must
    // die on the schema enum (the retired exam format has no answer type).
    addClonedW01Exercise(tmp, 'w01-tombstone-type', { type: 'numbas-exam' });
  }, /activityType must be equal to one of the allowed values/],
  ['exam-file-reference', (tmp) => {
    // Authored spelling: an examFile reference is an unknown property — the
    // strict exercise-definition schema (additionalProperties: false)
    // rejects it instead of silently dropping the field.
    const path = join(tmp, 'content/exercise-definitions/foundations/control-choice.json');
    const definition = JSON.parse(readFileSync(path, 'utf8'));
    definition.examFile = 'exams/numbas-revival.exam';
    writeFileSync(path, JSON.stringify(definition));
  }, /exercise-definition: .*must NOT have additional properties/],
];

for (const [label, mutate, message] of REVIVALS) {
  test(`numbas revival via ${label} fails closed in every compile profile`, () => {
    const tmp = makeRevivalRoot(label, mutate);
    try {
      for (const profile of ['public', 'local-private']) {
        assert.throws(
          () => compileContent({ projectRoot: tmp, profile, cache: 'none' }),
          message,
          `Profil ${profile} muss die Numbas-Revival (${label}) fail-closed abweisen`,
        );
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
}

/** Root-mode validator harness (same convention as makeRootDir in
 *  validate_locatorpath.test.mjs): synthetic project root with the real
 *  validator, curriculum, sources and week files, plus placeholder files for
 *  every locatorPath/localPath target, so the numbas type error is the only
 *  validation problem. */
function makeValidatorRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'ki-numbas-validator-'));
  mkdirSync(join(dir, 'tools'), { recursive: true });
  mkdirSync(join(dir, 'content/exercises'), { recursive: true });
  cpSync(join(root, 'tools/validate_content.mjs'), join(dir, 'tools/validate_content.mjs'));
  cpSync(join(root, 'tools/content_policy.mjs'), join(dir, 'tools/content_policy.mjs'));
  cpSync(join(root, 'content/curriculum.json'), join(dir, 'content/curriculum.json'));
  cpSync(join(root, 'content/sources.json'), join(dir, 'content/sources.json'));
  for (const f of readdirSync(join(root, 'content/exercises'))) {
    if (/^w\d{2}\.json$/.test(f)) cpSync(join(root, 'content/exercises', f), join(dir, 'content/exercises', f));
  }
  const cur = JSON.parse(readFileSync(join(dir, 'content/curriculum.json'), 'utf8'));
  const src = JSON.parse(readFileSync(join(dir, 'content/sources.json'), 'utf8'));
  const touch = (rel) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), '<!-- placeholder for validator existence test -->\n');
  };
  for (const w of cur.weeks) {
    for (const u of w.learningUnits || []) {
      for (const s of u.sources || []) if (s.locatorPath) touch(s.locatorPath);
    }
  }
  for (const s of src.sources) if (s.localPath) touch(s.localPath);
  return dir;
}

test('root mode: validator rejects the retired numbas-exam type (KNOWN_TYPES tombstone)', () => {
  const dir = makeValidatorRoot();
  try {
    addClonedW01Exercise(dir, 'w01-tombstone-type', { type: 'numbas-exam' });
    let result;
    try {
      const out = execFileSync(process.execPath, [join(dir, 'tools/validate_content.mjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
      result = { code: 0, out: String(out) };
    } catch (err) {
      result = { code: err.status, out: String(err.stdout) + String(err.stderr) };
    }
    assert.notEqual(result.code, 0, 'Validator muss die Numbas-Revival fail-closed abweisen');
    assert.match(result.out, /unbekannter Aufgabentyp "numbas-exam"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
