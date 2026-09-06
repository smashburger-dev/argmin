import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectNpmBundleNotices } from '../tools/build_npm_notices.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('npm bundle notices cover production dependencies and exclude build-only packages', () => {
  const result = collectNpmBundleNotices(root);
  const names = new Set(result.components.map((component) => component.name));
  for (const name of ['preact', 'codemirror', '@codemirror/state', '@codemirror/view', '@codemirror/lang-python']) {
    assert.equal(names.has(name), true, `${name} missing from npm notices`);
  }
  for (const name of ['vite', 'typescript', '@playwright/test', '@axe-core/playwright']) {
    assert.equal(names.has(name), false, `${name} must remain build-only`);
  }
  assert.equal(result.components.every((component) => /^[a-f0-9]{64}$/.test(component.licenseFileSha256)), true);
  assert.equal(result.components.every((component) => component.licenseText.length > 20), true);
  assert.equal(result.components.every((component) => component.sourceUrl.startsWith('https://')), true);
  assert.equal(result.lockfileSha256.length, 64);
});
