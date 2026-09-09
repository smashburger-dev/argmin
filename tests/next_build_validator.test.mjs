import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { validateNextBuild } from '../tools/validate_next_build.mjs';
import { projectReleaseFiles } from '../tools/project_release_files.mjs';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'ki-next-build-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"><div id="app"></div><script type="module" src="./assets/app.js"></script>');
  writeFileSync(join(dir, 'assets/app.js'), 'document.querySelector("#app").textContent = "ok";');
  writeFileSync(join(dir, 'assets/app.css'), ':root{color:#111;background:#fff}');
  return dir;
}

function writeFixtureFile(root, path, content = '') {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function unifiedFixture() {
  const dir = fixture();
  for (const path of [
    'assets/js/runtime/pyodide_worker.mjs',
    'assets/js/runtime/workspace_protocol.mjs',
    'vendor/pyodide/pyodide.mjs',
    'vendor/pyodide/pyodide.asm.mjs',
    'vendor/pyodide/pyodide.asm.wasm',
    'vendor/pyodide/python_stdlib.zip',
    'vendor/pyodide/pyodide-lock.json',
  ]) writeFixtureFile(dir, path);
  writeFixtureFile(dir, 'content/catalog.json', JSON.stringify({
    projectFiles: ['projects/rag-capstone/project.json'],
  }));
  writeFixtureFile(dir, 'content/projects/rag-capstone/project.json', JSON.stringify({
    starterFiles: ['phases.json', 'check-manifest.json'],
    solutionFiles: ['solution/pipeline.py'],
  }));
  writeFixtureFile(dir, 'content/projects/rag-capstone/phases.json', '{}');
  writeFixtureFile(dir, 'content/projects/rag-capstone/check-manifest.json', JSON.stringify({ requiredFiles: [] }));
  writeFixtureFile(dir, 'content/projects/rag-capstone/solution/pipeline.py');
  return dir;
}

test('next build validator accepts the bounded static shell', () => {
  const dir = fixture();
  try {
    const result = validateNextBuild(dir);
    assert.equal(result.jsFiles, 1);
    assert.equal(result.cssFiles, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('next build validator accepts bundled image assets but rejects stray files', () => {
  const dir = fixture();
  try {
    writeFixtureFile(dir, 'assets/argmin-split-BqxAsJyg.png', 'fake-png-bytes');
    validateNextBuild(dir);
    writeFixtureFile(dir, 'assets/notes.txt', 'stray');
    assert.throws(() => validateNextBuild(dir), /unerlaubte Datei im Next-Build/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('next build validator rejects private markers and external scripts', () => {
  const privateDir = fixture();
  const externalDir = fixture();
  try {
    writeFileSync(join(privateDir, 'assets/app.js'), 'const sourceId = "mml-book";');
    assert.throws(() => validateNextBuild(privateDir), /privaten Marker/);
    writeFileSync(join(externalDir, 'index.html'), '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'"><script src="https://example.org/app.js"></script>');
    assert.throws(() => validateNextBuild(externalDir), /externes Skript/);
  } finally {
    rmSync(privateDir, { recursive: true, force: true });
    rmSync(externalDir, { recursive: true, force: true });
  }
});

test('unified build accepts the exact manifest-derived project tree', () => {
  const dir = unifiedFixture();
  try {
    assert.equal(validateNextBuild(dir).jsFiles, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('unified build requires every project file declared by its manifest', () => {
  const dir = unifiedFixture();
  try {
    rmSync(join(dir, 'content/projects/rag-capstone/phases.json'));
    assert.throws(() => validateNextBuild(dir), /Projektdatei fehlt/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('unified build rejects undeclared project files', () => {
  const dir = unifiedFixture();
  try {
    writeFixtureFile(dir, 'content/projects/rag-capstone/private.tmp', 'unexpected');
    assert.throws(() => validateNextBuild(dir), /Projektdateimenge weicht ab/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('unified build rejects private markers in project text files', () => {
  const dir = unifiedFixture();
  try {
    writeFixtureFile(dir, 'content/projects/rag-capstone/solution/pipeline.py', 'source_id = "mml-book"');
    assert.throws(() => validateNextBuild(dir), /privaten Marker/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('project release resolution rejects symlinked parent directories', () => {
  const dir = unifiedFixture();
  const outside = mkdtempSync(join(tmpdir(), 'ki-next-project-outside-'));
  try {
    writeFixtureFile(outside, 'pipeline.py', 'outside');
    const solution = join(dir, 'content/projects/rag-capstone/solution');
    rmSync(solution, { recursive: true });
    symlinkSync(outside, solution, 'dir');
    assert.throws(() => projectReleaseFiles(join(dir, 'content')), /Symlink/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
