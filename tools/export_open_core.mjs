#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { OUTPUT_PRIVATE_MARKERS } from './content_policy.mjs';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent, writeSplitArtifacts } from './compile_content.mjs';
import { buildCoverageArtifacts } from './build_coverage_matrix.mjs';
import { expectedPublicCounts } from '../tests/helpers/content_counts.mjs';
import { projectReleaseFiles } from './project_release_files.mjs';

const topFiles = [
  'LICENSE', 'LICENSE-CONTENT.md', 'AGENTS.md', 'package.json', 'package-lock.json',
  'tsconfig.json', 'vite.config.ts', 'playwright.config.ts', 'index.html',
];
const assetFiles = [
  'assets/js/core/exercise_runtime.js',
  'assets/js/core/learning_ledger.mjs',
  'assets/js/core/graders.js',
  'assets/js/core/data_ml_generators.mjs',
  'assets/js/core/data_ml_families.mjs',
  'assets/js/core/w18_w21_generators.mjs',
  'assets/js/core/w22_w26_generators.mjs',
  'assets/js/core/w27_w30_generators.mjs',
  'assets/js/core/w31_w39_generators.mjs',
  'assets/js/core/generator_draw_kit.mjs',
  'assets/js/core/foundations_fresh_generators.mjs',
  'assets/js/core/foundations_choice_families.mjs',
  'assets/js/core/foundations_construct_families.mjs',
  'assets/js/core/foundations_trace_families.mjs',
  'assets/js/core/foundations_linalg_families.mjs',
  'assets/js/core/linalg_numpy_fresh_generators.mjs',
  'assets/js/core/progress_migration.mjs',
  'assets/js/core/progress_store.js',
  'assets/js/core/review_scheduler.js',
  'assets/js/core/w01_generators.mjs',
  'assets/js/core/w05_generators.mjs',
  'assets/js/domain/activity_route.mjs',
  'assets/js/domain/competency_graph.mjs',
  'assets/js/domain/diagnostic_engine.mjs',
  'assets/js/domain/evidence_engine.mjs',
  'assets/js/domain/learning_event.mjs',
  'assets/js/domain/learning_module.mjs',
  'assets/js/domain/learning_policy.mjs',
  'assets/js/domain/exercise_registry.mjs',
  'assets/js/domain/family_registry.mjs',
  'assets/js/domain/foundations_choice_registry.mjs',
  'assets/js/domain/foundations_construct_registry.mjs',
  'assets/js/domain/foundations_trace_registry.mjs',
  'assets/js/domain/foundations_linalg_registry.mjs',
  'assets/js/domain/plan_engine.mjs',
  'assets/js/domain/project_report.mjs',
  'assets/js/runtime/pyodide_runner.js',
  'assets/js/runtime/pyodide_worker.mjs',
  'assets/js/runtime/workspace_protocol.mjs',
];
const toolFiles = [
  'tools/build_coverage_matrix.mjs',
  'tools/build_npm_notices.mjs',
  'tools/build_public.mjs',
  'tools/compile_content.mjs',
  'tools/export_open_core.mjs',
  'tools/learner_project_check.py',
  'tools/markdown_content.mjs',
  'tools/measure_next_timing.mjs',
  'tools/migrate_attempts_v3.mjs',
  'tools/public_content.mjs',
  'tools/project_release_files.mjs',
  'tools/pyodide_contract_matrix.mjs',
  'tools/content_policy.mjs',
  'tools/content_roots.mjs',
  'tools/validate_content.mjs',
  'tools/validate_next_build.mjs',
];
const excludedTestFiles = new Set([
  'tests/open_core_export.test.mjs',
]);
const docFiles = [
  'docs/adr/0005-progress-indexeddb.md',
  'docs/adr/0008-review-scheduling-of3.md',
  'docs/adr/0009-competency-learning-core.md',
  'docs/adr/0010-browser-and-local-code-workspaces.md',
  'docs/adr/0011-open-core-release-candidate.md',
  'docs/adr/0012-w06-w17-runtime.md',
  'docs/adr/0013-w18-w30-runtime-content-delivery.md',
  'docs/adr/0014-w31-w39-research-capstone.md',
  'docs/adr/0015-seeded-variation-nonnumeric-and-retention-timelines.md',
  'docs/adr/0016-coverage-semantics.md',
];
const hash = (value) => createHash('sha256').update(value).digest('hex');

function assertInside(root, path) {
  const absolute = resolve(root, path);
  if (absolute !== root && !absolute.startsWith(root + sep)) throw new Error(`Pfad verlässt Exportwurzel: ${path}`);
  return absolute;
}

function copyFile(sourceRoot, targetRoot, path) {
  const source = assertInside(sourceRoot, path);
  const target = assertInside(targetRoot, path);
  if (!existsSync(source) || !lstatSync(source).isFile()) throw new Error(`Exportquelle fehlt: ${path}`);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target);
}

function copyTree(source, target) {
  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(source)) {
    const sourcePath = join(source, name);
    const targetPath = join(target, name);
    const stat = lstatSync(sourcePath);
    if (stat.isSymbolicLink()) throw new Error(`Symlink im Exportbaum: ${sourcePath}`);
    if (stat.isDirectory()) copyTree(sourcePath, targetPath);
    else cpSync(sourcePath, targetPath);
  }
}

const ignoredManifestDirectories = new Set([
  '.git', '.next-ui', '.next-local-ui', '.content-build', 'node_modules', 'build-public', 'build-next',
  'playwright-report', 'test-results', '__pycache__',
]);

function filesUnder(root, directory = root, out = []) {
  for (const name of readdirSync(directory)) {
    if (ignoredManifestDirectories.has(name)) continue;
    const path = join(directory, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Symlink im Export: ${relative(root, path)}`);
    if (stat.isDirectory()) filesUnder(root, path, out);
    else out.push(relative(root, path).replaceAll('\\', '/'));
  }
  return out;
}

function openCoreCounts(sourceRoot) {
  const expected = expectedPublicCounts(sourceRoot);
  const contentRoot = join(sourceRoot, 'content');
  const catalog = JSON.parse(readFileSync(join(contentRoot, 'catalog.json'), 'utf8'));
  const read = (path) => JSON.parse(readFileSync(join(contentRoot, path), 'utf8'));
  const draftCompetencies = discoverJson(contentRoot, catalogRoot(catalog, 'competencies'))
    .flatMap((file) => read(file).competencies)
    .filter((item) => item.releaseStatus === 'draft').length;
  return { ...expected, draftCompetencies, solverVerified: 0 };
}

function publicReadme(counts) {
  return `# KI-Lernplattform\n\nLokale deutschsprachige Lernplattform für selbstständige Lernende ab 16 Jahren. Der öffentliche Kern enthält einen kompetenzbasierten Foundations-Pfad, deterministische Grader, Pyodide, einen Browser-Codeworkspace und einen lokalen Projekt-Runner.\n\n## Start\n\n\`\`\`bash\nnpm ci\nnpm run dev:next\n\`\`\`\n\nÖffne anschließend \`http://127.0.0.1:4173/index.html#/today\`.\n\n## Prüfen und bauen\n\n\`\`\`bash\nnpm run verify:release\n\`\`\`\n\nDer kombinierte Static-Build landet in \`build-next/\`. Er enthält ein exaktes SHA-256-Manifest, vollständige Runtime-Lizenzen und Notices für die produktiv gebündelten npm-Pakete.\n\n## Inhalt\n\n- ${counts.competencies} Kompetenzknoten, davon ${counts.draftCompetencies} Draft-Kompetenzen\n- ${counts.lessons} eigene deutsche Lektionen\n- ${counts.exercises} öffentliche Aufgaben, davon ${counts.solverVerified} solver-verifizierte Definitionen\n- ein vierstufiger CLI-Datenprüfer\n- ${counts.explanations} statische Fehlerkarten\n\nDie neuen Lektionen bleiben bis zu einer unabhängigen menschlichen Prüfung als \`draft\` markiert. Der Projekt-Runner installiert pytest nicht. Fehlt pytest, meldet er \`tool-missing\`.\n\n## Lizenzen\n\nEigene Software: MIT, siehe \`LICENSE\`. Eigene Lerninhalte: CC BY 4.0, siehe \`LICENSE-CONTENT.md\`. Dateien unter \`vendor/\` und gebündelte npm-Pakete behalten ihre Upstream-Lizenzen.\n`;
}

function openCoreTest() {
  return `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { dirname, join } from 'node:path';\nimport { fileURLToPath } from 'node:url';\nimport { compileContent } from '../tools/compile_content.mjs';\nimport { expectedPublicCounts } from './helpers/content_counts.mjs';\n\nconst root = join(dirname(fileURLToPath(import.meta.url)), '..');\n\ntest('public source compiles without a private overlay', () => {\n  const first = compileContent({ projectRoot: root, profile: 'public' });\n  const second = compileContent({ projectRoot: root, profile: 'public' });\n  assert.equal(first.contentVersion, second.contentVersion);\n  const expected = expectedPublicCounts(root);\n  assert.equal(first.competencies.length, expected.competencies);\n  assert.equal(first.lessons.length, expected.lessons);\n  assert.equal(first.projects.length, expected.projects);\n  assert.doesNotMatch(JSON.stringify(first), /library-private|private-extracts|\\bMML\\b|mml-book|murphy-pml/);\n});\n`;
}

function publicAgents() {
  return `# KI-Lernplattform\n\n## Produktvertrag\n\n- Der Kompetenzkatalog ist das kanonische Modell. Die 39-Wochen-Roadmap ist eine Legacy-Projektion.\n- Runtime-Abhängigkeiten laufen ohne CDN.\n- Fortschritt bleibt standardmäßig in IndexedDB.\n- Nur deterministische Grader entscheiden über fachliche Korrektheit.\n- Der Public-Build muss bei privaten Markern, fehlenden Lizenzen oder abweichenden Hashes scheitern.\n\n## Verifikation\n\n\`\`\`bash\nnpm run verify:release\n\`\`\`\n\nÄndere \`build-public/\`, \`build-next/\`, \`.content-build/\` und \`.next-ui/\` nie direkt.\n`;
}

function publicGitignore() {
  return `/node_modules/\n/build-public/\n/build-next/\n/.next-ui/\n/.next-local-ui/\n/.content-build/\n/playwright-report/\n/test-results/\n/.tmp-*/\n.env\n.env.*\n!.env.example\n.DS_Store\n__pycache__/\n*.pyc\n`;
}

export function sanitizeOpenCoreSource(targetRoot) {
  const replacements = [
    ['mml-book', 'private-source-a'],
    ['murphy-pml', 'private-source-b'],
    ['cs50p-psets-harvard', 'private-source-c'],
    ['library-private', 'restricted-library'],
    ['private-extracts', 'restricted-extracts'],
    ['MML', 'private-source'],
    ['Draft (2024-01-15) of "Mathematics for Machine Learning"', 'private source canary'],
    ['Mathematics for Machine Learning', 'private source canary'],
    ['/Users/no8', '/Users/example'],
  ];
  const sanitizable = (path) => path === 'README.md' || path === 'AGENTS.md' || path.startsWith('docs/');
  for (const path of filesUnder(targetRoot).filter(sanitizable)) {
    const absolute = join(targetRoot, path);
    let text = readFileSync(absolute, 'utf8');
    for (const [search, replacement] of replacements) text = text.replaceAll(search, replacement);
    writeFileSync(absolute, text);
  }
}

export function writeOpenCoreManifest(targetRoot, sourceRoot = targetRoot) {
  const paths = filesUnder(targetRoot).filter((path) => path !== 'OPEN-CORE-MANIFEST.json').sort();
  const manifest = {
    schemaVersion: 1,
    profile: 'public-source',
    generatedFrom: basename(sourceRoot),
    files: paths.map((path) => ({ path, sha256: hash(readFileSync(join(targetRoot, path))) })),
  };
  writeFileSync(join(targetRoot, 'OPEN-CORE-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

export function validateOpenCoreManifest(targetRoot) {
  try {
    const manifest = JSON.parse(readFileSync(join(targetRoot, 'OPEN-CORE-MANIFEST.json'), 'utf8'));
    if (manifest.schemaVersion !== 1 || manifest.profile !== 'public-source' || !Array.isArray(manifest.files)) throw new Error('Manifestkopf ungültig');
    const expected = manifest.files.map((entry) => entry.path).sort();
    const actual = filesUnder(targetRoot).filter((path) => path !== 'OPEN-CORE-MANIFEST.json').sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('Dateimenge weicht ab');
    for (const entry of manifest.files) {
      if (!/^[a-f0-9]{64}$/.test(entry.sha256) || hash(readFileSync(join(targetRoot, entry.path))) !== entry.sha256) throw new Error(`Hash weicht ab: ${entry.path}`);
    }
    return { ok: true, files: actual.length };
  } catch (error) {
    return { ok: false, error: String(error.message || error) };
  }
}

export function exportOpenCore(sourceRoot, targetRoot, { includeVendor = true } = {}) {
  const source = resolve(sourceRoot);
  const target = resolve(targetRoot);
  if (existsSync(target)) throw new Error(`Exportziel existiert bereits: ${target}`);
  const publicBuild = join(source, 'build-next');
  if (!existsSync(join(publicBuild, 'PUBLIC-BUILD.md'))) throw new Error('build-next fehlt; zuerst npm run build:release ausführen');
  const builtBundlePath = join(publicBuild, 'content/content-bundle.json');
  if (!existsSync(builtBundlePath)) throw new Error('build-next enthält kein Content-Bundle');
  const sourceBundle = compileContent({ projectRoot: source, profile: 'public' });
  const builtBundle = JSON.parse(readFileSync(builtBundlePath, 'utf8'));
  if (builtBundle.contentVersion !== sourceBundle.contentVersion) throw new Error('build-next ist gegenüber dem Quellbaum veraltet');
  const testFiles = filesUnder(join(source, 'tests'))
    .map((path) => `tests/${path}`)
    .filter((path) => !excludedTestFiles.has(path));
  mkdirSync(target, { recursive: false });
  for (const path of [...topFiles, ...assetFiles, ...toolFiles, ...testFiles, ...docFiles]) copyFile(source, target, path);
  copyTree(join(source, 'src'), join(target, 'src'));
  copyTree(join(source, 'schemas'), join(target, 'schemas'));
  copyTree(join(publicBuild, 'content'), join(target, 'content'));
  for (const path of projectReleaseFiles(join(source, 'content'))) copyFile(source, target, path);
  if (includeVendor) copyTree(join(publicBuild, 'vendor'), join(target, 'vendor'));
  const counts = openCoreCounts(sourceRoot);
  writeFileSync(join(target, 'README.md'), publicReadme(counts));
  writeFileSync(join(target, 'AGENTS.md'), publicAgents());
  writeFileSync(join(target, '.gitignore'), publicGitignore());
  writeFileSync(join(target, 'tests/open_core_content.test.mjs'), openCoreTest());
  const bundle = compileContent({ projectRoot: target, profile: 'public' });
  writeFileSync(join(target, 'content/content-bundle.json'), JSON.stringify(bundle, null, 2) + '\n');
  const generatedContent = join(target, '.content-build/public');
  mkdirSync(generatedContent, { recursive: true });
  writeFileSync(join(generatedContent, 'content-bundle.json'), JSON.stringify(bundle, null, 2) + '\n');
  writeSplitArtifacts(bundle, join(generatedContent, 'split'));
  const coverage = buildCoverageArtifacts(target);
  writeFileSync(join(target, 'content/competency-family-coverage.json'), JSON.stringify(coverage, null, 2) + '\n');
  const contentText = filesUnder(join(target, 'content'))
    .filter((path) => !/\.(wasm|zip|whl|pyc)$/i.test(path))
    .map((path) => readFileSync(join(target, 'content', path), 'utf8'))
    .join('\n');
  const leakedMarker = OUTPUT_PRIVATE_MARKERS.find((marker) => marker.test(contentText));
  if (leakedMarker) throw new Error(`Privater Marker im exportierten Content: ${leakedMarker}`);
  sanitizeOpenCoreSource(target);
  const manifest = writeOpenCoreManifest(target, source);
  const validation = validateOpenCoreManifest(target);
  if (!validation.ok) throw new Error(`Open-Core-Manifest ungültig: ${validation.error}`);
  return { files: manifest.files.length + 1, contentVersion: bundle.contentVersion };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const targetArg = process.argv[2];
  if (!targetArg) throw new Error('Nutzung: node tools/export_open_core.mjs <neues-zielverzeichnis>');
  const result = exportOpenCore(sourceRoot, targetArg);
  console.log(`Open-Core-Export erstellt: ${resolve(targetArg)} (${result.files} Dateien, Content ${result.contentVersion.slice(0, 12)})`);
}
