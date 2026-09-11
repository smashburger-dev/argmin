#!/usr/bin/env node
// Public build: copies a strictly allowlisted set of artifacts into
// build-next/. Fail-closed in both directions:
//   1. Nothing is copied that is not on the allowlist (no recursive copies
//      of vendor trees, no spikes, no source repos, no temp files).
//   2. If a private canary file or private marker shows up anywhere in the
//      allowlisted source tree or in the produced build, the build FAILS.
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { OUTPUT_PRIVATE_MARKERS as SHARED_OUTPUT_PRIVATE_MARKERS, CANARY_NAME as SHARED_CANARY_NAME, BINARY_EXT as SHARED_BINARY_EXT } from './content_policy.mjs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { compileContent } from './compile_content.mjs';
import { validateNextBuild } from './validate_next_build.mjs';
import { writeNpmBundleNotices } from './build_npm_notices.mjs';
import { projectReleaseFiles } from './project_release_files.mjs';
import { sanitizePublicValue } from './public_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const outputArg = argument('--out');
const nextDirArg = argument('--next-dir');
const out = outputArg ? resolve(root, outputArg) : join(root, 'build-next');
if (out === root || !out.startsWith(root + sep)) throw new Error('Public-Ausgabe muss innerhalb des Projekts liegen');

// --- allowlist (the only artifacts allowed to ship) ---------------------------
// Exact files plus directory rules with extension filters.
const ALLOWED_FILES = [
  'LICENSE',
  'LICENSE-CONTENT.md',
  'assets/js/core/exercise_runtime.js',
  'assets/js/core/learning_ledger.mjs',
  'assets/js/core/graders.js',
  'assets/js/core/progress_store.js',
  'assets/js/core/progress_migration.mjs',
  'assets/js/core/review_scheduler.js',
  'assets/js/core/linalg_generators.mjs',
  'assets/js/core/foundations_generators.mjs',
  'assets/js/core/generator_draw_kit.mjs',
  'assets/js/core/foundations_fresh_generators.mjs',
  'assets/js/core/foundations_choice_families.mjs',
  'assets/js/core/foundations_construct_families.mjs',
  'assets/js/core/foundations_trace_families.mjs',
  'assets/js/core/foundations_linalg_families.mjs',
  'assets/js/core/linalg_numpy_fresh_generators.mjs',
  'assets/js/core/data_ml_generators.mjs',
  'assets/js/core/data_ml_families.mjs',
  'assets/js/domain/activity_route.mjs',
  'assets/js/domain/expression_eval.mjs',
  'assets/js/domain/competency_graph.mjs',
  'assets/js/domain/evidence_engine.mjs',
  'assets/js/domain/learning_event.mjs',
  'assets/js/domain/learning_policy.mjs',
  'assets/js/domain/diagnostic_engine.mjs',
  'assets/js/domain/plan_engine.mjs',
  'assets/js/domain/exercise_registry.mjs',
  'assets/js/domain/family_registry.mjs',
  'assets/js/domain/foundations_construct_registry.mjs',
  'assets/js/domain/foundations_trace_registry.mjs',
  'assets/js/domain/foundations_linalg_registry.mjs',
  'assets/js/domain/procedural_registry.mjs',
  'assets/js/domain/project_report.mjs',
  'assets/js/runtime/pyodide_runner.js',
  'assets/js/runtime/pyodide_worker.mjs',
  'assets/js/runtime/workspace_protocol.mjs',
  'content/sources.json',
  'content/catalog.json',
  'content/competency-family-coverage.json',
  'content/source-rights.json',
  'content/competencies/core.json',
  'content/tracks/core.json',
  'content/milestones/core.json',
  'content/tools/core.json',
  'content/foundations/inventory.md',
  'content/lessons/foundations/algebra.json',
  'content/lessons/foundations/algebra.md',
  'content/lessons/foundations/linear-function.viz.json',
  'content/lessons/foundations/algebra-transformations.json',
  'content/lessons/foundations/algebra-transformations.md',
  'content/lessons/foundations/distributive-law.viz.json',
  'content/lessons/foundations/python-state.json',
  'content/lessons/foundations/python-state.md',
  'content/lessons/foundations/code-reading.json',
  'content/lessons/foundations/code-reading.md',
  'content/lessons/foundations/functions.json',
  'content/lessons/foundations/functions.md',
  'content/lessons/foundations/function-composition.viz.json',
  'content/lessons/foundations/learning.json',
  'content/lessons/foundations/learning.md',
  'content/lessons/foundations/control-flow.json',
  'content/lessons/foundations/control-flow.md',
  'content/lessons/foundations/threshold-branch.viz.json',
  'content/lessons/foundations/collections.json',
  'content/lessons/foundations/collections.md',
  'content/lessons/foundations/running-sum.viz.json',
  'content/lessons/foundations/files-errors.json',
  'content/lessons/foundations/files-errors.md',
  'content/lessons/foundations/testing-debugging.json',
  'content/lessons/foundations/testing-debugging.md',
  'content/lessons/foundations/git.json',
  'content/lessons/foundations/git.md',
  'content/lessons/linear-algebra/matrices.json',
  'content/lessons/linear-algebra/matrices.md',
  'content/lessons/linear-algebra/column-picture.viz.json',
  'content/lessons/linear-algebra/systems.json',
  'content/lessons/linear-algebra/systems.md',
  'content/lessons/linear-algebra/two-lines.viz.json',
  'content/lessons/linear-algebra/gauss.json',
  'content/lessons/linear-algebra/gauss.md',
  'content/lessons/linear-algebra/row-operation.viz.json',
  'content/lessons/linear-algebra/independence.json',
  'content/lessons/linear-algebra/independence.md',
  'content/lessons/linear-algebra/span-2d.viz.json',
  'content/lessons/linear-algebra/numpy.json',
  'content/lessons/linear-algebra/numpy.md',
  'content/lessons/linear-algebra/matrix-transform.viz.json',
  'content/lessons/data-ml/data-cleaning.json',
  'content/lessons/data-ml/data-cleaning.md',
  'content/lessons/data-ml/eda-distributions.json',
  'content/lessons/data-ml/eda-distributions.md',
  'content/lessons/data-ml/normal-density.viz.json',
  'content/lessons/data-ml/gradient-regression.json',
  'content/lessons/data-ml/gradient-regression.md',
  'content/lessons/data-ml/mse-bowl.viz.json',
  'content/lessons/data-ml/ml-baseline.json',
  'content/lessons/data-ml/ml-baseline.md',
  'content/lessons/data-ml/ml-linear.json',
  'content/lessons/data-ml/ml-linear.md',
  'content/lessons/data-ml/residuals.viz.json',
  'content/lessons/data-ml/ml-logistic.json',
  'content/lessons/data-ml/ml-logistic.md',
  'content/lessons/data-ml/sigmoid-threshold.viz.json',
  'content/lessons/data-ml/ml-cv.json',
  'content/lessons/data-ml/ml-cv.md',
  'content/lessons/data-ml/bias-variance.viz.json',
  'content/lessons/data-ml/ml-error-analysis.json',
  'content/lessons/data-ml/ml-error-analysis.md',
  'content/lessons/data-ml/ml-regularization.json',
  'content/lessons/data-ml/ml-regularization.md',
  'content/lessons/data-ml/ridge-shrink.viz.json',
  'content/lessons/data-ml/ml-ensembles.json',
  'content/lessons/data-ml/ml-ensembles.md',
  'content/lessons/data-ml/ml-svm-pca.json',
  'content/lessons/data-ml/ml-svm-pca.md',
  'content/lessons/data-ml/pca-axis.viz.json',
  'content/lessons/data-ml/ml-repro.json',
  'content/lessons/data-ml/ml-repro.md',
  'content/explanations/foundations/control-order.json',
  'content/explanations/foundations/collection-state.json',
  'content/explanations/foundations/error-boundary.json',
  'content/explanations/foundations/off-by-one.json',
  'content/explanations/foundations/git-workflow.json',
  // KaTeX (MIT) — display runtime
  'vendor/katex/dist/katex.min.css',
  'vendor/katex/dist/katex.min.js',
  'vendor/katex/dist/contrib/auto-render.min.js',
  'vendor/katex/LICENSE',
  // JSXGraph (MIT OR LGPL, MIT chosen) — visualization
  'vendor/jsxgraph/jsxgraphcore.js',
  'vendor/jsxgraph/jsxgraph.css',
  'vendor/jsxgraph/LICENSE.MIT',
  // Pyodide (MPL-2.0) — python worker runtime + whitelisted wheels
  'vendor/pyodide/pyodide.mjs',
  'vendor/pyodide/pyodide.asm.mjs',
  'vendor/pyodide/pyodide.asm.wasm',
  'vendor/pyodide/python_stdlib.zip',
  'vendor/pyodide/pyodide-lock.json',
  'vendor/pyodide/numpy-2.4.6-cp314-cp314-pyemscripten_2026_0_wasm32.whl',
  'vendor/pyodide/sympy-1.14.0-py3-none-any.whl',
  'vendor/pyodide/mpmath-1.4.1-py3-none-any.whl',
  'vendor/pyodide/package.json',
  'vendor/licenses/THIRD_PARTY_NOTICES.json',
  'vendor/licenses/pyodide-314.0.5-MPL-2.0.txt',
  'vendor/licenses/python-3.14.2-PSF-LICENSE.txt',
  'vendor/licenses/numpy-2.4.6-LICENSES.txt',
  'vendor/licenses/sympy-1.14.0-LICENSES.txt',
  'vendor/licenses/mpmath-1.4.1-BSD-3-Clause.txt',
  // MathLive (MIT) — math input
  'vendor/mathlive/mathlive.min.mjs',
  'vendor/mathlive/LICENSE.txt',
  'vendor/mathlive/package.json',
  // W18-W30 content (ADR-0013)
  'assets/js/core/deep_learning_generators.mjs',
  'assets/js/core/transformer_generators.mjs',
  'assets/js/core/genai_research_generators.mjs',
  'assets/js/core/capstone_generators.mjs',
  'content/lessons/deep-learning/dl-autograd-checkpoint.md',
  'content/lessons/deep-learning/dl-autograd.json',
  'content/lessons/deep-learning/dl-autograd.md',
  'content/lessons/deep-learning/dl-regularization-checkpoint.md',
  'content/lessons/deep-learning/dl-regularization.json',
  'content/lessons/deep-learning/dl-regularization.md',
  'content/lessons/deep-learning/early-stopping.viz.json',
  'content/lessons/deep-learning/dl-tensors-checkpoint.md',
  'content/lessons/deep-learning/dl-tensors.json',
  'content/lessons/deep-learning/dl-tensors.md',
  'content/lessons/deep-learning/activations.viz.json',
  'content/lessons/deep-learning/dl-training-checkpoint.md',
  'content/lessons/deep-learning/dl-training.json',
  'content/lessons/deep-learning/dl-training.md',
  'content/lessons/deep-learning/lr-step.viz.json',
  'content/lessons/transformer-llm/tf-attention-checkpoint.md',
  'content/lessons/transformer-llm/tf-attention.json',
  'content/lessons/transformer-llm/tf-attention.md',
  'content/lessons/transformer-llm/softmax-temperature.viz.json',
  'content/lessons/transformer-llm/tf-finetuning-checkpoint.md',
  'content/lessons/transformer-llm/tf-finetuning.json',
  'content/lessons/transformer-llm/tf-finetuning.md',
  'content/lessons/transformer-llm/lr-warmup-cosine.viz.json',
  'content/lessons/transformer-llm/tf-inference-checkpoint.md',
  'content/lessons/transformer-llm/tf-inference.json',
  'content/lessons/transformer-llm/tf-inference.md',
  'content/lessons/transformer-llm/tf-papers-checkpoint.md',
  'content/lessons/transformer-llm/tf-papers.json',
  'content/lessons/transformer-llm/tf-papers.md',
  'content/lessons/transformer-llm/tf-tokenizer-checkpoint.md',
  'content/lessons/transformer-llm/tf-tokenizer.json',
  'content/lessons/transformer-llm/tf-tokenizer.md',
  'content/lessons/genai-systems/genai-evaluation.json',
  'content/lessons/genai-systems/genai-evaluation.md',
  'content/lessons/genai-systems/precision-recall-threshold.viz.json',
  'content/lessons/genai-systems/genai-evaluation-checkpoint.md',
  'content/lessons/genai-systems/genai-prototype.json',
  'content/lessons/genai-systems/genai-prototype.md',
  'content/lessons/genai-systems/genai-prototype-checkpoint.md',
  'content/lessons/genai-systems/genai-security.json',
  'content/lessons/genai-systems/genai-security.md',
  'content/lessons/genai-systems/genai-security-checkpoint.md',
  'content/lessons/genai-systems/rag-retrieval.json',
  'content/lessons/genai-systems/rag-retrieval.md',
  'content/lessons/genai-systems/rag-retrieval-checkpoint.md',
  'content/lessons/research/research-question.json',
  'content/lessons/research/research-question.md',
  'content/lessons/research/research-question-checkpoint.md',
  'content/lessons/research/research-cards.json',
  'content/lessons/research/research-cards.md',
  'content/lessons/research/research-cards-checkpoint.md',
  'content/lessons/research/responsible-ai.json',
  'content/lessons/research/responsible-ai.md',
  'content/lessons/research/responsible-ai-checkpoint.md',
  'content/lessons/research/capstone-baseline.json',
  'content/lessons/research/capstone-baseline.md',
  'content/lessons/research/capstone-baseline-checkpoint.md',
  'content/lessons/research/capstone-pipeline.json',
  'content/lessons/research/capstone-pipeline.md',
  'content/lessons/research/chunk-overlap.viz.json',
  'content/lessons/research/capstone-pipeline-checkpoint.md',
];
const ALLOWED_DIRS = [
  // dir, extension filter (fonts only ship as woff2)
  { dir: 'vendor/katex/dist/fonts', ext: '.woff2' },
  { dir: 'vendor/mathlive/fonts', ext: '.woff2' },
  { dir: 'content/modules', ext: '.json' },
  { dir: 'content/families', ext: '.json' },
  { dir: 'assets/js/core/procedural', ext: '.mjs' },
];
// Source directories scanned for private canaries before copying.
const SCAN_DIRS = ['assets', 'content'];
const SCAN_FILES = ['index.html'];

const PRIVATE_MARKERS = [
  /library-staging/i,
  /private-extracts/i,
  /(^|\/)library(-private)?\//i,
  /\/Users\/no8/i,
  /Draft \(2024-01-15\) of "Mathematics for Machine Learning"/i,
  // Tombstone: Numbas retired in S1B; a numbas-src revival must stay fail-closed private.
  /numbas-src/i,
];
const OUTPUT_PRIVATE_MARKERS = SHARED_OUTPUT_PRIVATE_MARKERS;
const CANARY_NAME = SHARED_CANARY_NAME;
const BINARY_EXT = SHARED_BINARY_EXT;

function walk(dir, acc = []) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
}
const fail = (msg) => { console.error('BUILD FEHLGESCHLAGEN: ' + msg); process.exit(1); };
// --- 1) canary scan of the allowlisted source tree ----------------------------
for (const d of SCAN_DIRS) {
  for (const f of walk(join(root, d))) {
    const rel = relative(root, f);
    if (CANARY_NAME.test(rel) || /\.pdf$/i.test(rel) || /\.local\.json$/i.test(rel)) {
      fail(`private oder lokale Datei im erlaubten Quellbaum: ${rel}`);
    }
    if (BINARY_EXT.test(rel)) continue;
    const text = readFileSync(f, 'utf8');
    for (const m of PRIVATE_MARKERS) {
      if (m.test(text)) fail(`privater Marker in ${rel}: ${m}`);
    }
  }
}
for (const f of SCAN_FILES) {
  const text = readFileSync(join(root, f), 'utf8');
  for (const m of PRIVATE_MARKERS) {
    if (m.test(text)) fail(`privater Marker in ${f}: ${m}`);
  }
}

// --- 2) resolve allowlist and copy exactly those artifacts --------------------
const targets = [...ALLOWED_FILES, ...projectReleaseFiles(join(root, 'content'))];
for (const { dir, ext } of ALLOWED_DIRS) {
  for (const f of walk(join(root, dir))) {
    if (f.endsWith(ext)) targets.push(relative(root, f));
  }
}
for (const rel of targets) {
  if (!existsSync(join(root, rel))) fail(`Allowlist-Eintrag fehlt im Quellbaum: ${rel}`);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const rel of targets) {
  mkdirSync(join(out, dirname(rel)), { recursive: true });
  cpSync(join(root, rel), join(out, rel));
}

// --- 3) public content pass -----------------------------------------------------
const toolDocument = JSON.parse(readFileSync(join(out, 'content/tools/core.json'), 'utf8'));
toolDocument.tools = (toolDocument.tools || []).filter((tool) => tool.availability === 'public' && tool.releaseStatus !== 'local-only');
writeFileSync(join(out, 'content/tools/core.json'), JSON.stringify(toolDocument, null, 2) + '\n');
const sourceDocument = JSON.parse(readFileSync(join(out, 'content/sources.json'), 'utf8'));
sourceDocument.sources = sanitizePublicValue((sourceDocument.sources || [])
  .filter((source) => source.contentClass !== 'private')
  .map((source) => {
    const publicSource = { ...source };
    delete publicSource.localFile;
    delete publicSource.localPath;
    return publicSource;
  }));
writeFileSync(join(out, 'content/sources.json'), JSON.stringify(sourceDocument, null, 2) + '\n');

const contentBundle = compileContent({ projectRoot: root, profile: 'public' });
writeFileSync(join(out, 'content/content-bundle.json'), JSON.stringify(contentBundle, null, 2) + '\n');

let npmBundleNotices = null;
if (nextDirArg) {
  const nextSource = resolve(root, nextDirArg);
  if (nextSource === root || !nextSource.startsWith(root + sep)) fail('Next-Artefakt muss innerhalb des Projekts liegen');
  validateNextBuild(nextSource);
  for (const source of walk(nextSource)) {
    const rel = relative(nextSource, source).replaceAll('\\', '/');
    // Gleiches Namensmuster wie validate_next_build: Vite-Chunks dürfen Punkte tragen.
    if (rel !== 'index.html' && !/^assets\/[a-zA-Z0-9_.-]+\.(js|css|png|svg|webp|avif)$/.test(rel)) fail(`unerlaubte Next-Datei: ${rel}`);
    targets.push(rel);
    mkdirSync(join(out, dirname(rel)), { recursive: true });
    cpSync(source, join(out, rel));
  }
  npmBundleNotices = writeNpmBundleNotices(root, out);
  targets.push(
    'vendor/licenses/NPM_BUNDLE_NOTICES.json',
    'vendor/licenses/NPM_BUNDLE_NOTICES.md',
    ...npmBundleNotices.components.map((component) => component.licenseFile),
  );
}

const noticeManifestPath = join(out, 'vendor/licenses/THIRD_PARTY_NOTICES.json');
let thirdPartyNotices = null;
try { thirdPartyNotices = JSON.parse(readFileSync(noticeManifestPath, 'utf8')); } catch { thirdPartyNotices = null; }
if (!thirdPartyNotices || thirdPartyNotices.schemaVersion !== 1 || !Array.isArray(thirdPartyNotices.components)) {
  fail('Drittanbieter-Notice ist kein gueltiges Schema-1-Manifest');
}
for (const component of thirdPartyNotices.components) {
  if (!component.id || !component.name || !component.version || !component.licenseExpression || !component.sourceUrl) {
    fail(`Drittanbieter-Notice unvollstaendig: ${component.id || '(leer)'}`);
  }
  if (!Array.isArray(component.licenseFiles) || !component.licenseFiles.length) {
    fail(`Drittanbieter-Notice ohne Lizenzdatei: ${component.id}`);
  }
  for (const licenseFile of component.licenseFiles) {
    const p = join(out, licenseFile);
    if (!existsSync(p)) fail(`Drittanbieter-Lizenz fehlt: ${licenseFile}`);
    const expectedHash = component.licenseFileSha256?.[licenseFile];
    const actualHash = createHash('sha256').update(readFileSync(p)).digest('hex');
    if (!/^[a-f0-9]{64}$/.test(String(expectedHash || '')) || actualHash !== expectedHash) {
      fail(`Drittanbieter-Lizenz-Hash ungueltig: ${licenseFile}`);
    }
  }
}
const noticeRows = thirdPartyNotices.components.map((component) => {
  const licenseLinks = component.licenseFiles.map((licenseFile) => {
    const href = relative('vendor/licenses', licenseFile).replaceAll('\\', '/');
    return `[${licenseFile.split('/').pop()}](${href})`;
  }).join(', ');
  return `| ${component.name} | ${component.version} | ${component.licenseExpression} | [Upstream](${component.sourceUrl}) | ${licenseLinks} |`;
}).join('\n');
writeFileSync(join(out, 'vendor/licenses/THIRD_PARTY_NOTICES.md'), `# Drittanbieter-Lizenzen

Diese Liste wird aus \`THIRD_PARTY_NOTICES.json\` erzeugt. Die ausgelieferten Lizenztexte sind versionsgenau gehasht.

| Komponente | Version | Lizenz | Quelle | Lizenztexte |
|---|---:|---|---|---|
${noticeRows}
`);
const softwareSummary = [
  ...thirdPartyNotices.components.map((component) => `${component.name} ${component.version} (${component.licenseExpression})`),
  ...(npmBundleNotices?.components || []).map((component) => `${component.name} ${component.version} (${component.licenseExpression})`),
].join(', ');
const npmNoticeLine = npmBundleNotices
  ? 'Gebündelte npm-Komponenten: [npm-Bundle-Lizenzen](vendor/licenses/NPM_BUNDLE_NOTICES.md).\n'
  : '';

// Public marker + attribution (CC BY 4.0 for generated content, dependency
// licenses shipped next to the artifacts). Embeds a build manifest (path +
// SHA-256 for every produced file except this one) so that
// tools/validate_content.mjs --dir build-next can enforce that the build
// contains EXACTLY the files this script produced, byte for byte.
const manifestEntries = walk(out)
  .map((p) => relative(out, p))
  .sort()
  .map((rel) => ({ path: rel, sha256: createHash('sha256').update(readFileSync(join(out, rel))).digest('hex') }));
const manifestJson = JSON.stringify({ algorithm: 'sha256', files: manifestEntries });
writeFileSync(join(out, 'PUBLIC-BUILD.md'), `# Public Build

Eigene Software: MIT, siehe [LICENSE](LICENSE).
Eigene Lerninhalte: CC BY 4.0, siehe [LICENSE-CONTENT.md](LICENSE-CONTENT.md).
Private oder nicht distributierbare Volltexte, PDFs, Extrakte und Spikes sind nicht enthalten.
Drittanbieter-Lizenzen: ${softwareSummary}.
Vollständige versionsgenaue Texte und Quelllinks: [Drittanbieter-Lizenzen](vendor/licenses/THIRD_PARTY_NOTICES.md).
${npmNoticeLine}Keine externen Runtime-Anfragen; alle Abhängigkeiten sind lokal vendored und gepinnt (siehe docs/dependency-matrix.md im Quellbaum).

## Build-Manifest

Enthält jeden erzeugten Dateipfad mit SHA-256 (außer dieser Datei selbst).
Der Validator prüft Dateimenge und Hashes exakt dagegen; jede zusätzliche,
fehlende oder veränderte Datei lässt die Validierung fehlschlagen.

\`\`\`json
${manifestJson}
\`\`\`
`);

// --- 4) verify the produced tree: nothing extra, nothing private ---------------
const produced = walk(out).map((p) => relative(out, p)).sort();
const expected = [...new Set([...targets, 'content/content-bundle.json', 'vendor/licenses/THIRD_PARTY_NOTICES.md', 'PUBLIC-BUILD.md'])].sort();
if (produced.length !== expected.length) {
  const extra = produced.filter((p) => !expected.includes(p));
  const missing = expected.filter((p) => !produced.includes(p));
  fail(`Build-Baum weicht ab. Zusätzlich: ${extra.join(', ')} — Fehlend: ${missing.join(', ')}`);
}
for (const rel of produced) {
  if (CANARY_NAME.test(rel) || /\.pdf$/i.test(rel) || /\.local\.json$/i.test(rel)) fail(`private oder lokale Datei im Build: ${rel}`);
  if (BINARY_EXT.test(rel)) continue;
  const text = readFileSync(join(out, rel), 'utf8');
  for (const m of OUTPUT_PRIVATE_MARKERS) {
    if (m.test(text)) fail(`privater Marker im Build, ${rel}: ${m}`);
  }
}

const nFiles = produced.length;
let bytes = 0;
for (const rel of produced) bytes += statSync(join(out, rel)).size;
console.log(`build-next erstellt: ${out}`);
console.log(`  Dateien: ${nFiles}, Groesse: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
