const clone = (value) => JSON.parse(JSON.stringify(value));
const privateOutputMarkers = /\bMML\b|mml-book|murphy-pml|cs50p-psets-harvard|library-private|private-extracts/i;

export function sanitizePublicValue(value) {
  if (typeof value === 'string') return value.replace(/\s*\((?:vgl\.\s*)?MML\b[^)]*\)/giu, '');
  if (Array.isArray(value)) return value.map(sanitizePublicValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizePublicValue(child)]));
  }
  return value;
}

export function createPublicContent(input) {
  const result = clone(input);
  const sources = result.sources || { sources: [] };
  sources.sources = (sources.sources || []).filter((source) => source.contentClass !== 'private');
  result.sources = sources;
  const sanitized = sanitizePublicValue(result);
  if (privateOutputMarkers.test(JSON.stringify(sanitized))) throw new Error('Public-Inhalt enthält privaten Quellenmarker');
  return sanitized;
}
