import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { makeBuildDir, runValidator, cleanupDir } from './build_dir_helper.mjs';

test('validator accepts a public build with a valid compiled bundle', () => {
  const dir = makeBuildDir();
  try {
    const result = runValidator(dir);
    assert.equal(result.code, 0, result.out);
  } finally { cleanupDir(dir); }
});

test('validator rejects a private marker embedded in a family document', () => {
  const dir = makeBuildDir();
  try {
    const path = join(dir, 'content/content-bundle.json');
    const bundle = JSON.parse(readFileSync(path, 'utf8'));
    bundle.lessons[0].title = 'mml-book';
    writeFileSync(path, JSON.stringify(bundle));
    const result = runValidator(dir);
    assert.notEqual(result.code, 0);
    assert.match(result.out, /privaten (?:Quellen)?Marker/);
  } finally { cleanupDir(dir); }
});

test('validator fails when the compiled content bundle is missing', () => {
  const dir = makeBuildDir();
  try {
    rmSync(join(dir, 'content/content-bundle.json'));
    const result = runValidator(dir);
    assert.notEqual(result.code, 0);
    assert.match(result.out, /Content-Bundle fehlt/);
  } finally { cleanupDir(dir); }
});

test('validator rejects a malformed compiled bundle', () => {
  const dir = makeBuildDir();
  try {
    const path = join(dir, 'content/content-bundle.json');
    const bundle = JSON.parse(readFileSync(path, 'utf8'));
    delete bundle.lessons;
    writeFileSync(path, JSON.stringify(bundle));
    const result = runValidator(dir);
    assert.notEqual(result.code, 0);
  } finally { cleanupDir(dir); }
});
