// Negative tests for the public-build validator: a build directory must
// contain EXACTLY the files listed in the PUBLIC-BUILD.md manifest, byte for
// byte. An extra file, a missing file, or a modified file must turn the
// validator red. Runs the validator as a subprocess against a synthetic
// build dir so no real build-public/ is touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { makeBuildDir, rewriteManifest, runValidator, cleanupDir } from './build_dir_helper.mjs';

test('validator accepts a build dir that matches its manifest exactly', () => {
  const dir = makeBuildDir();
  try {
    const r = runValidator(dir);
    assert.equal(r.code, 0, `validator should pass, got:\n${r.out}`);
  } finally { cleanupDir(dir); }
});

test('validator fails on one additional file in the build', () => {
  const dir = makeBuildDir();
  try {
    writeFileSync(join(dir, 'extra-note.md'), '# not part of the build\n');
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail on an extra file');
    assert.match(r.out, /zusaetzliche Datei im Build: extra-note\.md/);
  } finally { cleanupDir(dir); }
});

test('validator fails on a modified file (sha256 mismatch)', () => {
  const dir = makeBuildDir();
  try {
    const p = join(dir, 'content/sources.json');
    writeFileSync(p, readFileSync(p, 'utf8') + '\n');
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail on a modified file');
    assert.match(r.out, /SHA-256 weicht ab: content\/sources\.json/);
  } finally { cleanupDir(dir); }
});

test('validator fails on a file removed from the build', () => {
  const dir = makeBuildDir();
  try {
    rmSync(join(dir, 'assets/app.css'));
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail on a missing manifest file');
    assert.match(r.out, /Datei laut Manifest fehlt: assets\/app\.css/);
  } finally { cleanupDir(dir); }
});

test('validator rejects a private source marker outside the legacy source registry', () => {
  const dir = makeBuildDir();
  try {
    writeFileSync(join(dir, 'content/rogue.json'), '{"sourceId":"mml-book"}\n');
    rewriteManifest(dir);
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must reject private source markers');
    assert.match(r.out, /privaten Marker.*mml-book/);
  } finally { cleanupDir(dir); }
});

test('validator rejects a local overlay file even when the manifest includes it', () => {
  const dir = makeBuildDir();
  try {
    writeFileSync(join(dir, 'content/catalog.local.json'), '{}\n');
    rewriteManifest(dir);
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must reject local overlays');
    assert.match(r.out, /lokale Overlay-Datei.*catalog\.local\.json/);
  } finally { cleanupDir(dir); }
});

test('validator fails when the compiled content bundle is missing from a rebuilt manifest', () => {
  const dir = makeBuildDir();
  try {
    rmSync(join(dir, 'content/content-bundle.json'));
    rewriteManifest(dir);
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must require the compiled content bundle');
    assert.match(r.out, /Public-Build fehlt content\/content-bundle\.json/);
  } finally { cleanupDir(dir); }
});

test('validator fails when a shipped runtime has no referenced license file', () => {
  const dir = makeBuildDir();
  try {
    rmSync(join(dir, 'vendor/licenses/pyodide-MPL-2.0.txt'));
    rewriteManifest(dir);
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail when a runtime license is missing');
    assert.match(r.out, /Lizenzdatei fehlt.*pyodide-MPL-2\.0\.txt/);
  } finally { cleanupDir(dir); }
});

test('validator fails when a referenced license file no longer matches its notice hash', () => {
  const dir = makeBuildDir();
  try {
    const noticePath = join(dir, 'vendor/licenses/THIRD_PARTY_NOTICES.json');
    const licensePath = join(dir, 'vendor/licenses/pyodide-MPL-2.0.txt');
    const notices = JSON.parse(readFileSync(noticePath, 'utf8'));
    notices.components[0].licenseFileSha256 = {
      'vendor/licenses/pyodide-MPL-2.0.txt': '0'.repeat(64),
    };
    writeFileSync(noticePath, JSON.stringify(notices, null, 2));
    writeFileSync(licensePath, 'changed license text\n');
    rewriteManifest(dir);
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail when a license hash differs');
    assert.match(r.out, /Lizenzdatei-Hash weicht ab.*pyodide-MPL-2\.0\.txt/);
  } finally { cleanupDir(dir); }
});

test('validator fails when a shipped runtime is not covered by any notice component', () => {
  const dir = makeBuildDir();
  try {
    writeFileSync(join(dir, 'vendor/pyodide/unclaimed.mjs'), 'export {};\n');
    rewriteManifest(dir);
    const r = runValidator(dir);
    assert.notEqual(r.code, 0, 'validator must fail for an unclaimed runtime');
    assert.match(r.out, /deckt Runtime-Artefakt nicht ab.*unclaimed\.mjs/);
  } finally { cleanupDir(dir); }
});
