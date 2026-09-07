import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicBundle = compileContent({ projectRoot: root, profile: 'public' });

test('tool cards preserve public runtimes, repositories and visualization routes', () => {
  assert.equal(publicBundle.tools.length, 7);
  assert.ok(publicBundle.tools.some((tool) => tool.toolId === 't-browser-python-workspace' && tool.routes.some((route) => route.href === '#/lab/w05-e8')));
  assert.ok(publicBundle.tools.some((tool) => tool.toolId === 't-sympy-equivalence' && tool.routes.some((route) => route.href === '#/exercise/w01-e2')));
  assert.ok(publicBundle.tools.some((tool) => tool.toolId === 't-matrix-column-visualization' && tool.routes.some((route) => route.href === '#/visualization/w05-viz1')));
  assert.ok(publicBundle.tools.some((tool) => tool.kind === 'repository' && tool.sourceRefs.includes('dlwp-notebooks')));
  assert.equal(publicBundle.tools.some((tool) => tool.availability === 'local-only'), false);
});

test('all lesson readings resolve to public source cards', () => {
  const sourceIds = new Set(publicBundle.sources.map((source) => source.sourceId));
  // Growth-counter rule: the public source count derives from sources.json,
  // never from a hardcoded number (ADR-0013 inherited-debt C).
  const allSources = JSON.parse(readFileSync(join(root, 'content/sources.json'), 'utf8')).sources;
  const expectedPublicSources = allSources.filter((source) => ['open', 'generated', 'link-only'].includes(source.contentClass)).length;
  assert.equal(publicBundle.sources.length, expectedPublicSources);
  for (const lesson of publicBundle.lessons) {
    assert.ok(lesson.sourceRefs.length > 0, `${lesson.lessonId} has no reading`);
    for (const reference of lesson.sourceRefs) assert.ok(sourceIds.has(reference.sourceId), `${lesson.lessonId} references ${reference.sourceId}`);
  }
});
