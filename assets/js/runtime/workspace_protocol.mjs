const MAX_FILES = 50;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 1_000_000;
const encoder = new TextEncoder();

function validPath(path) {
  if (typeof path !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path) || path.startsWith('/') || path.includes('\\')) return false;
  const segments = path.split('/');
  return segments.every((segment) => segment && segment !== '.' && segment !== '..');
}

export function normalizeWorkspacePayload({ files = [], entrypoint = null } = {}) {
  if (!Array.isArray(files)) throw new TypeError('files muss ein Array sein');
  if (files.length > MAX_FILES) throw new Error(`Ein Workspace darf höchstens ${MAX_FILES} Dateien enthalten`);
  const seen = new Set();
  let totalBytes = 0;
  const normalized = files.map((file) => {
    if (!file || !validPath(file.path)) throw new Error(`ungültiger Dateipfad: ${file?.path ?? '(leer)'}`);
    if (seen.has(file.path)) throw new Error(`doppelter Dateipfad: ${file.path}`);
    if (typeof file.content !== 'string') throw new TypeError(`${file.path}: Inhalt muss Text sein`);
    seen.add(file.path);
    const bytes = encoder.encode(file.content).byteLength;
    if (bytes > MAX_FILE_BYTES) throw new Error(`${file.path}: Datei ist zu groß`);
    totalBytes += bytes;
    return { path: file.path, content: file.content, bytes };
  }).sort((a, b) => a.path.localeCompare(b.path));
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error(`Workspace ist zu groß: ${totalBytes} Bytes`);
  if (entrypoint !== null && (!validPath(entrypoint) || !seen.has(entrypoint))) throw new Error(`Entrypoint fehlt: ${entrypoint}`);
  if (normalized.length && entrypoint === null) throw new Error('Entrypoint fehlt');
  return { files: normalized, entrypoint, totalBytes };
}

export const WORKSPACE_LIMITS = Object.freeze({
  maxFiles: MAX_FILES,
  maxFileBytes: MAX_FILE_BYTES,
  maxTotalBytes: MAX_TOTAL_BYTES,
});
