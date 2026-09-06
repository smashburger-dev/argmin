// Negative and positive tests for the cumulative gate reference rule
// (LM-R2): references must resolve against authored exercise files or be
// explicitly future-marked. Runs the validator against synthetic build dirs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { makeBuildDir, runValidator, cleanupDir, mutateCurriculum, rewriteManifest } from './build_dir_helper.mjs';

test('cumulative refs: real w05 ref plus future-marked ref pass the validator', () => {
  const dir = makeBuildDir();
  try {
    mutateCurriculum(dir, (cur) => {
      const w09 = cur.weeks.find((w) => w.weekId === 'w09');
      w09.gate = {
        gateId: 'w09-gate',
        title: 'Kumulativ (Test)',
        cumulativeExerciseRefs: [
          { weekId: 'w05', skillId: 'c-linalg-matrices' },
          { weekId: 'w02', skillId: 'c-python-controlflow', future: true, note: 'Test' },
        ],
      };
    });
    rewriteManifest(dir);
    const r = runValidator(dir);
    assert.equal(r.code, 0, `validator should pass, got:\n${r.out}`);
    assert.match(r.out, /Kumulative Gate-Referenzen: \d+ geprueft \(\d+ zukuenftig markiert\)/);
  } finally { cleanupDir(dir); }
});

test('cumulative refs: ref to an unauthored week without future flag fails', () => {
  const dir = makeBuildDir();
  try {
    // ADR-0014: w02 is authored now, so the unauthored-week scenario needs the
    // target pack removed from the synthetic build directory.
    rmSync(join(dir, 'content/exercises/w02.json'));
    mutateCurriculum(dir, (cur) => {
      cur.weeks.find((w) => w.weekId === 'w10').gate = {
        gateId: 'w10-gate',
        cumulativeExerciseRefs: [{ weekId: 'w02', skillId: 'c-python-control-flow' }],
      };
    });
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail on unmarked unauthored ref');
    assert.match(r.out, /w10 -> w02\/c-python-control-flow: Zielwoche nicht ausgearbeitet und nicht als zukuenftig markiert/);
  } finally { cleanupDir(dir); }
});

test('cumulative refs: wrong skillId on an authored week fails', () => {
  const dir = makeBuildDir();
  try {
    mutateCurriculum(dir, (cur) => {
      cur.weeks.find((w) => w.weekId === 'w09').gate.cumulativeExerciseRefs = [
        { weekId: 'w05', skillId: 'c-does-not-exist' },
      ];
    });
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail on unknown skillId');
    assert.match(r.out, /w09 -> w05\/c-does-not-exist: skillId .* nicht gefunden/);
  } finally { cleanupDir(dir); }
});

test('cumulative refs: self-reference and forward reference fail', () => {
  const dir = makeBuildDir();
  try {
    mutateCurriculum(dir, (cur) => {
      cur.weeks.find((w) => w.weekId === 'w11').gate = {
        gateId: 'w11-gate',
        cumulativeExerciseRefs: [
          { weekId: 'w11', skillId: 'c-ml-logistic' },
          { weekId: 'w20', skillId: 'c-dl-training' },
        ],
      };
    });
    const r = runValidator(dir);
    assert.notEqual(r.code, 0);
    assert.match(r.out, /w11 -> w11\/c-ml-logistic: Selbstreferenz/);
    assert.match(r.out, /w11 -> w20\/c-dl-training: kumulative Referenz muss in einer frueheren Woche liegen/);
  } finally { cleanupDir(dir); }
});

test('cumulative refs: malformed refs are reported, not crashed on', () => {
  const dir = makeBuildDir();
  try {
    mutateCurriculum(dir, (cur) => {
      cur.weeks.find((w) => w.weekId === 'w12').gate = {
        gateId: 'w12-gate',
        cumulativeExerciseRefs: [{ skillId: 'x' }, 'nonsense', { weekId: 'w99', skillId: 'y' }],
      };
    });
    const r = runValidator(dir);
    assert.notEqual(r.code, 0);
    assert.match(r.out, /w12 -> undefined\/x: weekId \(wNN\) und skillId sind Pflichtfelder/);
    assert.match(r.out, /w12 -> undefined\/undefined: weekId \(wNN\) und skillId sind Pflichtfelder/);
    assert.match(r.out, /w12 -> w99\/y: unbekannte Zielwoche/);
  } finally { cleanupDir(dir); }
});

test('exercise types: an unknown type fails the whitelist (LM-R4 rule)', () => {
  const dir = makeBuildDir();
  try {
    const p = join(dir, 'content/exercises/w05.json');
    const w05 = JSON.parse(readFileSync(p, 'utf8'));
    w05.exercises[0].type = 'hologram';
    writeFileSync(p, JSON.stringify(w05, null, 1));
    rewriteManifest(dir);
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail on unknown type');
    assert.match(r.out, /unbekannter Aufgabentyp "hologram"/);
  } finally { cleanupDir(dir); }
});
