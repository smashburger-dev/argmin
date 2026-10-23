#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BUILD = join(ROOT, 'build-next');
const OUT = join(ROOT, 'docs/figuren-completion/size-evidence.json');

function requireGo() {
  if (!process.argv.includes('--go')) throw new Error('Absichtlich nicht gestartet: nach Koordinator-GO mit --go ausführen.');
}

function sha256(buffer) { return createHash('sha256').update(buffer).digest('hex'); }
function insideBuild(path) { return path === BUILD || path.startsWith(BUILD + sep); }
function rel(path) { return relative(BUILD, path).split(sep).join('/'); }

function resolveHtmlAsset(url) {
  if (typeof url !== 'string' || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return null;
  const pathname = url.split(/[?#]/, 1)[0];
  const path = resolve(BUILD, pathname.startsWith('/') ? `.${pathname}` : pathname);
  return insideBuild(path) ? path : null;
}

function htmlAttribute(tag, name) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match?.slice(1).find((value) => value !== undefined) ?? null;
}

function filesUnder(root) {
  const files = [];
  if (!existsSync(root)) return files;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function importsFrom(source) {
  const imports = [];
  const addMatches = (kind, pattern, capture = 1) => {
    for (const match of source.matchAll(pattern)) imports.push({ kind, specifier: match[capture] });
  };
  addMatches('static', /\b(?:import|export)\s*(?:[^'";()]*?\bfrom\s*)?(['"])([^'"]+)\1/gm, 2);
  addMatches('dynamic', /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/gm, 2);
  addMatches('dynamic', /\bimport\s*\(\s*`([^`$]*)`\s*\)/gm);
  return imports;
}

function resolveImport(from, specifier) {
  if (/^(?:https?:|data:|blob:|#)/.test(specifier)) return null;
  const path = specifier.startsWith('/') ? resolve(BUILD, '.' + specifier) : resolve(dirname(from), specifier);
  return insideBuild(path) && existsSync(path) && extname(path) === '.js' ? path : null;
}

function closure(roots, graph, kinds = ['static', 'dynamic']) {
  const seen = new Set();
  const queue = [...roots];
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    for (const edge of graph.get(path) ?? []) if (kinds.includes(edge.kind)) queue.push(edge.path);
  }
  return seen;
}

function measure(paths) {
  const entries = [...paths].sort().map((path) => {
    const bytes = readFileSync(path);
    return { path: rel(path), bytes: bytes.byteLength, gzipBytes: gzipSync(bytes).byteLength, sha256: sha256(bytes) };
  });
  return { files: entries.length, bytes: entries.reduce((sum, item) => sum + item.bytes, 0),
    gzipBytes: entries.reduce((sum, item) => sum + item.gzipBytes, 0), entries };
}

function collectJavascript() {
  const html = readFileSync(join(BUILD, 'index.html'), 'utf8');
  const rootPaths = [...html.matchAll(/<script\b[^>]*>/gi)].flatMap(([tag]) => {
    if (htmlAttribute(tag, 'type')?.toLowerCase() !== 'module') return [];
    const src = htmlAttribute(tag, 'src');
    if (!src || !/\.js(?:[?#]|$)/i.test(src)) return [];
    const path = resolveHtmlAsset(src);
    return path ? [path] : [];
  });
  if (!rootPaths.length) throw new Error('Kein Modul-Entry in build-next/index.html gefunden.');
  const graph = new Map();
  const queue = [...rootPaths];
  while (queue.length) {
    const path = queue.shift();
    if (graph.has(path)) continue;
    if (!existsSync(path)) throw new Error(`Import fehlt im Release: ${rel(path)}`);
    const edges = importsFrom(readFileSync(path, 'utf8')).flatMap(({ kind, specifier }) => {
      const imported = resolveImport(path, specifier);
      return imported ? [{ kind, path: imported, specifier }] : [];
    });
    graph.set(path, edges);
    queue.push(...edges.map((edge) => edge.path));
  }
  return { html, rootPaths, graph };
}

function main() {
  requireGo();
  if (!existsSync(join(BUILD, 'index.html'))) throw new Error('build-next/index.html fehlt; der Runner baut nicht selbst.');
  const { html, rootPaths, graph } = collectJavascript();
  const staticPaths = closure(rootPaths, graph, ['static']);
  const allPaths = closure(rootPaths, graph, ['static', 'dynamic']);
  const lazyPaths = new Set([...allPaths].filter((path) => !staticPaths.has(path)));
  const figureRuntimeRoots = [...allPaths].filter((path) => /(?:^|\/)FigureRuntime[^/]*\.js$/i.test(path));
  const figureRuntimeStatic = closure(figureRuntimeRoots, graph, ['static']);
  const figureRuntimeClosure = closure(figureRuntimeRoots, graph, ['static', 'dynamic']);
  const cssPaths = new Set([
    ...[...html.matchAll(/<link\b[^>]*>/gi)].flatMap(([tag]) => {
      if (htmlAttribute(tag, 'rel')?.toLowerCase() !== 'stylesheet') return [];
      const href = htmlAttribute(tag, 'href');
      if (!href || !/\.css(?:[?#]|$)/i.test(href)) return [];
      const path = resolveHtmlAsset(href);
      return path && existsSync(path) ? [path] : [];
    }),
    ...filesUnder(join(BUILD, 'assets')).filter((path) => extname(path) === '.css'),
  ]);
  const runtimeExtensions = new Set(['.wasm', '.data', '.py', '.zip', '.bin', '.whl']);
  const runtimePaths = filesUnder(BUILD).filter((path) => runtimeExtensions.has(extname(path).toLowerCase()));
  const bundleBytes = measure(allPaths);
  const result = {
    measuredAt: new Date().toISOString(),
    method: 'Node zlib.gzipSync(buffer) with default options; one gzip stream per served file, then sums; no build or server started.',
    runtime: { node: process.version, zlib: process.versions.zlib },
    git: { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() },
    releaseInputs: ['index.html', 'content/content-bundle.json'].map((path) => {
      const bytes = readFileSync(join(BUILD, path));
      return { path: `build-next/${path}`, bytes: bytes.byteLength, sha256: sha256(bytes) };
    }),
    javascript: {
      entrypoints: rootPaths.map(rel),
      entryAndStaticTransitiveImports: measure(staticPaths),
      dynamicallyImportedTransitiveChunks: measure(lazyPaths),
      completeTransitiveClosure: bundleBytes,
      figureRuntime: {
        entrypoints: figureRuntimeRoots.map(rel),
        entryAndStaticTransitiveImports: measure(figureRuntimeStatic),
        dynamicallyImportedTransitiveChunks: measure(new Set([...figureRuntimeClosure].filter((path) => !figureRuntimeStatic.has(path)))),
        completeTransitiveClosure: measure(figureRuntimeClosure),
        note: 'FigureRuntime entry and reachable imports, independently summed per file with the same gzip method. The shared main chunk may expand this closure to the full application graph.'
      },
      importEdges: [...graph.entries()].flatMap(([from, edges]) => edges.map((edge) => ({ from: rel(from), to: rel(edge.path), kind: edge.kind }))),
      parserNote: 'Counts only relative/public local .js static and literal dynamic imports reachable from the HTML module entry. URL/data/blob/external imports are omitted.'
    },
    css: { ...measure(cssPaths), note: 'All built CSS files, including lazy CSS chunks, measured separately from JavaScript.' },
    nativeAndRuntime: { ...measure(runtimePaths), note: 'WASM/data/Python/archive payloads measured separately; informational and excluded from JS/CSS budgets.' },
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ path: OUT, jsFiles: bundleBytes.files, jsBytes: bundleBytes.bytes,
    jsGzipBytes: bundleBytes.gzipBytes, staticFiles: staticPaths.size, dynamicFiles: lazyPaths.size,
    runtimeFiles: runtimePaths.length, runtimeBytes: result.nativeAndRuntime.bytes }));
}

main();
