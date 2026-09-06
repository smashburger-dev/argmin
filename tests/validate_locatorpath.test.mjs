// Negative tests for the locatorPath/localPath validator rules:
//  - root mode: every locatorPath/localPath target MUST exist on disk
//  - public mode: locatorPath/localPath MUST be absent (private-build-only)
// Runs the real validator as a subprocess against synthetic project roots.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeBuildDir, runValidator, cleanupDir, mutateCurriculum, rewriteManifest } from './build_dir_helper.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Synthetic PROJECT ROOT (validator runs in root mode from here): copy of
 *  the real content plus empty placeholder files for every library target,
 *  so the positive control passes and single mutations fail isolated. */
function makeRootDir() {
  const dir = mkdtempSync(join(tmpdir(), 'ki-validator-root-'));
  mkdirSync(join(dir, 'tools'), { recursive: true });
  mkdirSync(join(dir, 'content/exercises'), { recursive: true });
  cpSync(join(root, 'tools/validate_content.mjs'), join(dir, 'tools/validate_content.mjs'));
  cpSync(join(root, 'tools/content_policy.mjs'), join(dir, 'tools/content_policy.mjs'));
  cpSync(join(root, 'content/curriculum.json'), join(dir, 'content/curriculum.json'));
  cpSync(join(root, 'content/sources.json'), join(dir, 'content/sources.json'));
  const cur = JSON.parse(readFileSync(join(dir, 'content/curriculum.json'), 'utf8'));
  const src = JSON.parse(readFileSync(join(dir, 'content/sources.json'), 'utf8'));
  for (const f of readdirSync(join(root, 'content/exercises'))) {
    if (/^w\d{2}\.json$/.test(f)) cpSync(join(root, 'content/exercises', f), join(dir, 'content/exercises', f));
  }
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

function runRootValidator(dir) {
  try {
    const out = execFileSync(process.execPath, [join(dir, 'tools/validate_content.mjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out: String(out) };
  } catch (err) {
    return { code: err.status, out: String(err.stdout) + String(err.stderr) };
  }
}

test('root mode: validator passes when every locatorPath/localPath target exists', () => {
  const dir = makeRootDir();
  try {
    const r = runRootValidator(dir);
    assert.equal(r.code, 0, `validator should pass, got:\n${r.out}`);
    assert.match(r.out, /Lesezugänge: \d+ localPath\/locatorPath geprueft/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('root mode: missing locatorPath target fails the validator', () => {
  const dir = makeRootDir();
  try {
    const p = join(dir, 'content/curriculum.json');
    const cur = JSON.parse(readFileSync(p, 'utf8'));
    const w1 = cur.weeks.find((w) => w.weekId === 'w01');
    w1.learningUnits[0].sources[0].locatorPath = 'library/open/de/does-not-exist.html';
    writeFileSync(p, JSON.stringify(cur));
    const r = runRootValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail on a dangling locatorPath');
    assert.match(r.out, /locatorPath-Ziel existiert nicht: library\/open\/de\/does-not-exist\.html/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('root mode: malformed locatorPath (outside the library mirrors) fails', () => {
  const dir = makeRootDir();
  try {
    const p = join(dir, 'content/curriculum.json');
    const cur = JSON.parse(readFileSync(p, 'utf8'));
    const w1 = cur.weeks.find((w) => w.weekId === 'w01');
    w1.learningUnits[0].sources[0].locatorPath = 'content/curriculum.json'; // exists, but not a library path
    writeFileSync(p, JSON.stringify(cur));
    const r = runRootValidator(dir);
    assert.notEqual(r.code, 0, 'validator must reject locatorPath outside library/');
    assert.match(r.out, /locatorPath ungueltig/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('public mode: a leftover locatorPath in the build fails the validator', () => {
  const dir = makeBuildDir();
  try {
    mutateCurriculum(dir, (cur) => {
      const w1 = cur.weeks.find((w) => w.weekId === 'w01');
      w1.learningUnits[1].sources[0].locatorPath = 'library/open/py-tutorial-official/html/interpreter.html';
    });
    rewriteManifest(dir);
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail on locatorPath in a public build');
    assert.match(r.out, /Public-Build enthält locatorPath/);
  } finally { cleanupDir(dir); }
});

test('public mode: a leftover source localPath in the build fails the validator', () => {
  const dir = makeBuildDir();
  try {
    const p = join(dir, 'content/sources.json');
    const src = JSON.parse(readFileSync(p, 'utf8'));
    src.sources.find((s) => s.sourceId === 'serlo-algebra-grundlagen-w01').localPath = 'library/open/de/serlo-gleichungen-1393.html';
    writeFileSync(p, JSON.stringify(src, null, 1));
    rewriteManifest(dir);
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail on localPath in a public build');
    assert.match(r.out, /Public-Build enthält localPath/);
  } finally { cleanupDir(dir); }
});
