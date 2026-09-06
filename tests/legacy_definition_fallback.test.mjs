// f-* reachability: catalog exercise definitions must resolve when week packs
// do not carry the id. Membership is discovery under declared roots, not a
// catalog file list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';
import { catalogRoot, discoverJson } from '../tools/content_roots.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('compiled bundle resolves a catalog f-* definition by id', () => {
  const bundle = compileContent({ projectRoot: root, profile: 'public' });
  const def = bundle.exerciseDefinitions.find((item) => item.definitionId === 'f-git-next-action-01');
  assert.ok(def, 'definition found');
  assert.equal(def.definitionId, 'f-git-next-action-01');
  assert.equal(def.generatorId, 'genGitNextAction');
  assert.ok(def.legacyWeekId, 'carries its origin week');
  assert.equal(typeof def.deterministicSeed, 'number');
});

test('every discovered f-* definition compiles and unknown ids stay absent', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'content/catalog.json'), 'utf8'));
  const files = discoverJson(join(root, 'content'), catalogRoot(catalog, 'exerciseDefinitions'));
  assert.ok(files.length >= 27, `expected the catalog definition files, got ${files.length}`);
  const bundle = compileContent({ projectRoot: root, profile: 'public' });
  const ids = new Set(bundle.exerciseDefinitions.map((item) => item.definitionId));
  for (const file of files) {
    const body = JSON.parse(readFileSync(join(root, 'content', file), 'utf8'));
    if (body.active === false || body.releaseStatus === 'local-only') continue;
    assert.ok(ids.has(body.definitionId), `${body.definitionId} resolvable`);
  }
  assert.equal(ids.has('f-does-not-exist'), false);
});
