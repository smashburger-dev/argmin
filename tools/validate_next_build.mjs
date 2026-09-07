#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import { validateProjectReleaseTree } from './project_release_files.mjs';

import { OUTPUT_PRIVATE_MARKERS as privateMarkers, BINARY_EXT as binaryExtensions } from './content_policy.mjs';

const walk = (dir, out = [], root = dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Symlink im Next-Build: ${relative(root, path)}`);
    if (stat.isDirectory()) walk(path, out, root);
    else out.push(path);
  }
  return out;
};

export function validateNextBuild(buildDir) {
  const root = resolve(buildDir);
  if (!existsSync(root)) throw new Error(`Next-Build fehlt: ${root}`);
  const files = walk(root).map((path) => relative(root, path).replaceAll('\\', '/')).sort();
  if (!files.includes('index.html')) throw new Error('index.html fehlt');
  const unifiedBuild = files.includes('content/catalog.json');
  validateBuildTree(root, files, unifiedBuild);
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  validateBuildHtml(html);
  const initialJsFiles = initialJavaScriptFiles(html);
  const sizes = measureBuildFiles(root, files, initialJsFiles, unifiedBuild);
  validateBuildBudgets(files, initialJsFiles, sizes);
  return {
    files: files.length,
    jsFiles: files.filter((file) => file.endsWith('.js') && (!unifiedBuild || /^assets\/[^/]+\.js$/.test(file))).length,
    cssFiles: files.filter((file) => file.endsWith('.css') && (!unifiedBuild || /^assets\/[^/]+\.css$/.test(file))).length,
    ...sizes,
  };
}

function validateBuildTree(root, files, unifiedBuild) {
  if (!unifiedBuild) {
    for (const file of files) {
      // Vite benennt geteilte Chunks [name]-[hash].js; name darf Punkte
      // enthalten (z. B. jsxRuntime.module). Weiterhin nur assets/, nur
      // .js/.css, keine Unterverzeichnisse; Marker prüft der Scan unten.
      if (file !== 'index.html' && !/^assets\/[a-zA-Z0-9_.-]+\.(js|css)$/.test(file)) {
        throw new Error(`unerlaubte Datei im Next-Build: ${file}`);
      }
    }
  } else {
    const runtimeFiles = [
      'assets/js/runtime/pyodide_worker.mjs',
      'assets/js/runtime/workspace_protocol.mjs',
      'vendor/pyodide/pyodide.mjs',
      'vendor/pyodide/pyodide.asm.mjs',
      'vendor/pyodide/pyodide.asm.wasm',
      'vendor/pyodide/python_stdlib.zip',
      'vendor/pyodide/pyodide-lock.json',
    ];
    for (const file of runtimeFiles) if (!files.includes(file)) throw new Error(`Next-Laufzeitdatei fehlt: ${file}`);
    validateProjectReleaseTree(root);
  }
}

function validateBuildHtml(html) {
  if (!/http-equiv=["']Content-Security-Policy["']/i.test(html)) throw new Error('Content-Security-Policy fehlt');
  if (/<script\b[^>]*\bsrc=["']https?:/i.test(html)) throw new Error('externes Skript im Next-Build');
  if (/<link\b[^>]*\bhref=["']https?:/i.test(html)) throw new Error('externe Stylesheet- oder Icon-Quelle im Next-Build');
}

function initialJavaScriptFiles(html) {
  const initialJsFiles = new Set(
    [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
      .map((match) => match[1].replace(/^\.\//, '').replace(/^\//, '')),
  );
  // Static entry imports arrive as modulepreload links once Vite splits the
  // entry — they are as initial as the script tag itself.
  for (const match of html.matchAll(/<link\b[^>]*\brel=["']modulepreload["'][^>]*\bhref=["']([^"']+)["']/gi)) {
    initialJsFiles.add(match[1].replace(/^\.\//, '').replace(/^\//, ''));
  }
  for (const match of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']modulepreload["']/gi)) {
    initialJsFiles.add(match[1].replace(/^\.\//, '').replace(/^\//, ''));
  }
  return initialJsFiles;
}

function measureBuildFiles(root, files, initialJsFiles, unifiedBuild) {
  let jsGzipBytes = 0;
  let totalJsGzipBytes = 0;
  let cssGzipBytes = 0;
  for (const file of files) {
    const bytes = readFileSync(join(root, file));
    if (!binaryExtensions.test(file)) {
      const text = bytes.toString('utf8');
      for (const marker of privateMarkers) if (marker.test(text)) throw new Error(`privaten Marker ${marker} in ${file}`);
    }
    if (!/\.(js|css|html)$/.test(file)) continue;
    const nextJavaScript = file.endsWith('.js') && (!unifiedBuild || /^assets\/[^/]+\.js$/.test(file));
    const nextCss = file.endsWith('.css') && (!unifiedBuild || /^assets\/[^/]+\.css$/.test(file));
    if (nextJavaScript) {
      const compressed = gzipSync(bytes).length;
      totalJsGzipBytes += compressed;
      if (initialJsFiles.has(file)) jsGzipBytes += compressed;
      if (compressed > 250 * 1024) throw new Error(`Lazy-JavaScript-Chunk zu groß: ${file}, ${compressed} Bytes gzip`);
    }
    if (nextCss) cssGzipBytes += gzipSync(bytes).length;
  }
  return { jsGzipBytes, totalJsGzipBytes, cssGzipBytes };
}

function validateBuildBudgets(files, initialJsFiles, sizes) {
  if (!initialJsFiles.size || [...initialJsFiles].some((file) => !files.includes(file))) throw new Error('initialer JavaScript-Entry fehlt');
  // Budget 150 KiB gzip (ADR-0013): the initial chunk carries the app shell
  // plus the slim content index (@content-index). Lesson and exercise bodies
  // load per route through lazily imported chunks, each capped below.
  if (sizes.jsGzipBytes > 150 * 1024) throw new Error(`Initiales JavaScript-Budget überschritten: ${sizes.jsGzipBytes} Bytes gzip`);
  if (sizes.cssGzipBytes > 40 * 1024) throw new Error(`CSS-Budget überschritten: ${sizes.cssGzipBytes} Bytes gzip`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const result = validateNextBuild(process.argv[2] || join(projectRoot, 'build-next'));
  console.log(`Next-Build validiert: ${result.files} Dateien, JS ${(result.jsGzipBytes / 1024).toFixed(1)} KiB gzip, CSS ${(result.cssGzipBytes / 1024).toFixed(1)} KiB gzip`);
}
