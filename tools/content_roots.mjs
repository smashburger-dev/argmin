import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sortedEntries(dir) {
  return readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
}

function walkPrefixed(absDir, prefix, acc) {
  for (const entry of sortedEntries(absDir)) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = join(absDir, entry.name);
    if (entry.isSymbolicLink() || lstatSync(abs).isSymbolicLink()) {
      throw new Error(`Symlink unter Content-Wurzel: ${rel}`);
    }
    if (entry.isDirectory()) walkPrefixed(abs, rel, acc);
    else acc.push(rel);
  }
  return acc;
}

export function listRootFiles(contentRoot, rootDir) {
  if (!rootDir || rootDir.includes('..') || rootDir.startsWith('/') || rootDir.includes('\\')) {
    throw new Error(`Ungültige Content-Wurzel ${JSON.stringify(rootDir)}`);
  }
  const abs = join(contentRoot, rootDir);
  if (!existsSync(abs)) return [];
  return walkPrefixed(abs, rootDir, []);
}

export function isSourceJson(path) {
  return path.endsWith('.json');
}

export function discoverJson(contentRoot, rootDir) {
  return listRootFiles(contentRoot, rootDir).filter(isSourceJson);
}

export function discoverProjects(contentRoot, rootDir) {
  return discoverJson(contentRoot, rootDir).filter((path) => path.endsWith('/project.json'));
}

export function assertNoOrphans(rootDir, files, claimed) {
  const allowed = new Set(claimed);
  const orphans = files.filter((path) => !allowed.has(path));
  if (orphans.length) throw new Error(`Verwaiste Dateien unter ${rootDir}: ${orphans.join(', ')}`);
}

export function jsonOnlyClaims(files) {
  return files.filter(isSourceJson);
}

export function lessonClaims(lessonFiles, lessons) {
  const claimed = [...lessonFiles];
  for (const lesson of lessons) {
    for (const block of lesson.blocks || []) {
      if (block.contentRef) claimed.push(block.contentRef);
    }
  }
  return claimed;
}

export function projectPackageClaims(contentRoot, projectFiles) {
  const claimed = [];
  for (const projectFile of projectFiles) {
    const dir = projectFile.slice(0, -'/project.json'.length);
    claimed.push(...listRootFiles(contentRoot, dir));
  }
  return claimed;
}

export function catalogRoot(catalog, key) {
  const dir = catalog?.roots?.[key];
  if (typeof dir !== 'string' || !dir) throw new Error(`Katalogwurzel fehlt: ${key}`);
  return dir;
}
