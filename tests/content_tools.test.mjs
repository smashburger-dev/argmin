import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicBundle = compileContent({ projectRoot: root, profile: 'public' });
const localBundle = compileContent({ projectRoot: root, profile: 'local-private' });

test('tool cards preserve public runtimes, repositories and visualization routes', () => {
  assert.equal(publicBundle.tools.length, 7);
  assert.ok([7, 8].includes(localBundle.tools.length));
  assert.ok(publicBundle.tools.some((tool) => tool.toolId === 't-browser-python-workspace' && tool.routes.some((route) => route.href === '#/lab/w05-e8')));
  assert.ok(publicBundle.tools.some((tool) => tool.toolId === 't-sympy-equivalence' && tool.routes.some((route) => route.href === '#/exercise/w01-e2')));
  assert.ok(publicBundle.tools.some((tool) => tool.toolId === 't-matrix-column-visualization' && tool.routes.some((route) => route.href === '#/visualization/w05-viz1')));
  assert.ok(publicBundle.tools.some((tool) => tool.kind === 'repository' && tool.sourceRefs.includes('dlwp-notebooks')));
  if (localBundle.tools.length === 8) assert.ok(localBundle.tools.some((tool) => tool.availability === 'local-only'));
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

test('local reading paths stay profile-bound', () => {
  assert.equal(publicBundle.sources.some((source) => source.localPath || source.localFile), false);
  if (localBundle.sources.length > publicBundle.sources.length) assert.ok(localBundle.sources.some((source) => source.localPath));
  else assert.equal(localBundle.sources.some((source) => source.localPath || source.localFile), false);
});

test('legacy visualization and native tool card stay linked', () => {
  const weekFive = publicBundle.legacyProjection.weeks.find((week) => week.weekId === 'w05');
  assert.equal(weekFive.visualization.vizId, 'w05-viz1');
  assert.equal(weekFive.visualization.type, 'jsxgraph');
  const tool = publicBundle.tools.find((item) => item.toolId === 't-matrix-column-visualization');
  assert.ok(tool.competencyIds.includes('c-linalg-systems'));
});
