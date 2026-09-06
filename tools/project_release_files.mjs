import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { catalogRoot, discoverProjects } from './content_roots.mjs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function safeRelativePath(path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || isAbsolute(path)) throw new Error(`Ungültiger Projektpfad: ${path}`);
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) throw new Error(`Ungültiger Projektpfad: ${path}`);
  return path;
}

function fileInside(root, path) {
  const safePath = safeRelativePath(path);
  let current = root;
  for (const part of safePath.split('/')) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error(`Projektpfad enthält einen Symlink: content/${path}`);
  }
  const absolute = resolve(root, safePath);
  if (absolute !== root && !absolute.startsWith(root + sep)) throw new Error(`Projektpfad verlässt Inhaltswurzel: ${path}`);
  if (!existsSync(absolute) || !lstatSync(absolute).isFile()) throw new Error(`Projektdatei fehlt: content/${path}`);
  return absolute;
}

function filesUnder(root, directory = root, out = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Projektdatei ist ein Symlink: ${relative(root, path)}`);
    if (stat.isDirectory()) filesUnder(root, path, out);
    else out.push(path);
  }
  return out;
}

export function projectReleaseFiles(contentRoot) {
  contentRoot = resolve(contentRoot);
  const catalog = readJson(join(contentRoot, 'catalog.json'));
  const projectFiles = catalog.roots
    ? discoverProjects(contentRoot, catalogRoot(catalog, 'projects'))
    : catalog.projectFiles;
  if (!Array.isArray(projectFiles)) throw new Error('Katalog enthält keine Projektdateien');
  const releaseFiles = new Set();
  for (const projectFile of projectFiles) {
    safeRelativePath(projectFile);
    if (!projectFile.startsWith('projects/') || !projectFile.endsWith('/project.json')) throw new Error(`Ungültige Projektdefinition: ${projectFile}`);
    const projectPath = fileInside(contentRoot, projectFile);
    const project = readJson(projectPath);
    const projectDir = dirname(projectFile).replaceAll('\\', '/');
    if (!Array.isArray(project.starterFiles) || !Array.isArray(project.solutionFiles)) throw new Error(`${projectFile}: starterFiles/solutionFiles fehlen`);
    releaseFiles.add(`content/${projectFile}`);
    for (const path of [...project.starterFiles, ...project.solutionFiles]) {
      const releasePath = `${projectDir}/${safeRelativePath(path)}`;
      fileInside(contentRoot, releasePath);
      releaseFiles.add(`content/${releasePath}`);
    }
    const manifestPath = `${projectDir}/check-manifest.json`;
    const manifest = readJson(fileInside(contentRoot, manifestPath));
    for (const required of manifest.requiredFiles || []) {
      const requiredPath = safeRelativePath(required?.path);
      if (!project.starterFiles.includes(requiredPath)) throw new Error(`${projectFile}: Pflichtdatei fehlt in starterFiles: ${requiredPath}`);
    }
  }
  return [...releaseFiles].sort();
}

export function validateProjectReleaseTree(buildRoot) {
  buildRoot = resolve(buildRoot);
  const expected = projectReleaseFiles(join(buildRoot, 'content'));
  const projectRoot = join(buildRoot, 'content/projects');
  const actual = filesUnder(projectRoot)
    .map((path) => relative(buildRoot, path).replaceAll('\\', '/'))
    .sort();
  const missing = expected.filter((path) => !actual.includes(path));
  const extra = actual.filter((path) => !expected.includes(path));
  if (missing.length || extra.length) throw new Error(`Projektdateimenge weicht ab. Fehlend: ${missing.join(', ')}; zusätzlich: ${extra.join(', ')}`);
  return expected;
}
