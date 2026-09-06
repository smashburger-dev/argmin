#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = (value) => createHash('sha256').update(value).digest('hex');

function dependencyKey(name, parentKey, packages) {
  const nested = parentKey ? `${parentKey}/node_modules/${name}` : `node_modules/${name}`;
  if (packages[nested]) return nested;
  let cursor = parentKey;
  while (cursor) {
    const marker = cursor.lastIndexOf('/node_modules/');
    cursor = marker >= 0 ? cursor.slice(0, marker) : '';
    const candidate = `${cursor ? `${cursor}/` : ''}node_modules/${name}`;
    if (packages[candidate]) return candidate;
  }
  const root = `node_modules/${name}`;
  if (packages[root]) return root;
  const matches = Object.keys(packages).filter((key) => key.endsWith(`/node_modules/${name}`));
  if (matches.length === 1) return matches[0];
  throw new Error(`Lockfile-Abhängigkeit nicht eindeutig auflösbar: ${name} von ${parentKey || 'root'}`);
}

function sourceUrl(metadata, name) {
  const repository = typeof metadata.repository === 'string' ? metadata.repository : metadata.repository?.url;
  if (repository) {
    const normalized = repository
      .replace(/^git\+/, '')
      .replace(/^git:\/\//, 'https://')
      .replace(/^git@github\.com:/, 'https://github.com/')
      .replace(/\.git$/, '');
    return /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(normalized)
      ? `https://github.com/${normalized}`
      : normalized;
  }
  if (metadata.homepage) return metadata.homepage;
  return `https://www.npmjs.com/package/${encodeURIComponent(name)}`;
}

function licenseFile(packageDirectory) {
  const candidates = readdirSync(packageDirectory)
    .filter((name) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(name))
    .filter((name) => statSync(join(packageDirectory, name)).isFile())
    .sort((left, right) => left.localeCompare(right));
  if (!candidates.length) throw new Error(`Lizenztext fehlt in ${packageDirectory}`);
  return join(packageDirectory, candidates[0]);
}

function outputName(name, version) {
  return `${name.replace(/^@/, '').replaceAll('/', '--')}-${version}.txt`;
}

export function collectNpmBundleNotices(projectRoot) {
  const lockPath = join(projectRoot, 'package-lock.json');
  const lockBytes = readFileSync(lockPath);
  const lock = JSON.parse(lockBytes);
  if (lock.lockfileVersion !== 3 || !lock.packages?.['']) throw new Error('package-lock.json muss Lockfile-Version 3 verwenden');
  const directNames = Object.keys(lock.packages[''].dependencies || {}).sort();
  const direct = new Set(directNames);
  const queue = directNames.map((name) => ({ name, parentKey: '' }));
  const visited = new Set();
  const components = [];
  while (queue.length) {
    const { name, parentKey } = queue.shift();
    const key = dependencyKey(name, parentKey, lock.packages);
    if (visited.has(key)) continue;
    visited.add(key);
    const packageDirectory = join(projectRoot, key);
    const metadata = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8'));
    const licensePath = licenseFile(packageDirectory);
    const licenseText = readFileSync(licensePath, 'utf8');
    const licenseExpression = typeof metadata.license === 'string' ? metadata.license : metadata.license?.type;
    if (!licenseExpression) throw new Error(`Lizenzausdruck fehlt für ${metadata.name}`);
    components.push({
      name: metadata.name,
      version: metadata.version,
      licenseExpression,
      sourceUrl: sourceUrl(metadata, metadata.name),
      dependencyType: direct.has(metadata.name) ? 'direct' : 'transitive',
      licenseFile: `vendor/licenses/npm/${outputName(metadata.name, metadata.version)}`,
      licenseFileSha256: hash(licenseText),
      licenseText,
    });
    const dependencies = { ...(lock.packages[key].dependencies || {}), ...(lock.packages[key].optionalDependencies || {}) };
    for (const dependency of Object.keys(dependencies).sort()) queue.push({ name: dependency, parentKey: key });
  }
  components.sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version));
  return {
    schemaVersion: 1,
    generatedFrom: 'package-lock.json',
    lockfileSha256: hash(lockBytes),
    rootDependencies: directNames,
    components,
  };
}

export function writeNpmBundleNotices(projectRoot, outputRoot) {
  const collected = collectNpmBundleNotices(projectRoot);
  const licenseDirectory = join(outputRoot, 'vendor/licenses/npm');
  mkdirSync(licenseDirectory, { recursive: true });
  for (const component of collected.components) {
    writeFileSync(join(outputRoot, component.licenseFile), component.licenseText);
  }
  const components = collected.components.map(({ licenseText, ...component }) => component);
  const manifest = { ...collected, components };
  const noticeDirectory = join(outputRoot, 'vendor/licenses');
  mkdirSync(noticeDirectory, { recursive: true });
  writeFileSync(join(noticeDirectory, 'NPM_BUNDLE_NOTICES.json'), JSON.stringify(manifest, null, 2) + '\n');
  const rows = components.map((component) => `| ${component.name} | ${component.version} | ${component.licenseExpression} | ${component.dependencyType} | [Upstream](${component.sourceUrl}) | [Text](${component.licenseFile.replace('vendor/licenses/', '')}) |`).join('\n');
  writeFileSync(join(noticeDirectory, 'NPM_BUNDLE_NOTICES.md'), `# npm-Bundle-Lizenzen\n\nErzeugt aus dem exakt gesperrten Produktionsgraphen in \`package-lock.json\`. Build- und Testabhängigkeiten sind nicht Teil des Browserbundles.\n\n| Paket | Version | Lizenz | Typ | Quelle | Lizenztext |\n|---|---:|---|---|---|---|\n${rows}\n`);
  return manifest;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const outputRoot = resolve(process.argv[2] || join(projectRoot, 'build-next'));
  if (!existsSync(outputRoot)) throw new Error(`Build-Ausgabe fehlt: ${outputRoot}`);
  const result = writeNpmBundleNotices(projectRoot, outputRoot);
  console.log(`npm-Bundle-Notice: ${result.components.length} Komponenten`);
}
