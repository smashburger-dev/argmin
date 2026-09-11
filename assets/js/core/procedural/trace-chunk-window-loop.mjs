// Procedural family trace-chunk-window-loop: the snippet shape, prompt and
// base oracle stay fixed; the seed draws the window text (consecutive
// lowercase letters, length 6-12 at any alphabet offset), the chunk size
// (3-6) and the overlap (1..size-1, so the stride size - overlap is always
// >= 1 and the while-loop provably terminates). The solver mirrors the
// Python loop one-to-one — window count and the possibly truncated last
// window are recomputed from the drawn parameters, never hardcoded. The
// expected keeps the base form { kind: 'output-lines', output }.

import { randInt, rng } from '../generator_draw_kit.mjs';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

const BASE_SNIPPET = `def chunk(text, size, overlap):
    parts = []
    start = 0
    while start < len(text):
        parts.append(text[start:start + size])
        start += size - overlap
    return parts

text = "abcdefgh"
print(len(chunk(text, 4, 2)))
print(chunk(text, 4, 2)[-1])`;

const BASE_OUTPUT = '4\ngh';

const PROMPT = 'Chunking lesen und vorhersagen: Was gibt dieses Programm aus? Sage beide <code>print</code>-Zeilen vorher, ohne den Code auszuführen. Das Fenster startet bei 0 und wandert um <code>size - overlap</code> weiter, solange <code>start &lt; len(text)</code>.';

const BASE_SOLUTION = 'Starts: 0, 2, 4, 6 (jeweils &lt; 8), also 4 Fenster: abcd, cdef, efgh, gh. Ausgabe: <code>4</code> und <code>gh</code>. Die Fensterzahl ist ⌈8/2⌉ = 4.';

// Case definition: the draw domain is documented above; base fields pin the
// curated oracle case verbatim (anchor tests compare them against the JSON).
export const CHUNK_CASES = {
  'chunk-window-loop': {
    caseId: 'chunk-window-loop',
    difficulty: 'core',
    baseSnippet: BASE_SNIPPET,
    baseOutput: BASE_OUTPUT,
    prompt: PROMPT,
    baseSolution: BASE_SOLUTION,
    competencyIds: ['c-genai-rag', 'c-python-reading'],
  },
};

// Mirror of the Python while-loop: start advances by size - overlap while
// start < len(text); the final slice may be shorter than size (JS slice
// clamps exactly like Python slicing).
export function chunkParts(text, size, overlap) {
  const parts = [];
  for (let start = 0; start < text.length; start += size - overlap) {
    parts.push(text.slice(start, start + size));
  }
  return parts;
}

function buildSnippet({ text, size, overlap }) {
  return `def chunk(text, size, overlap):
    parts = []
    start = 0
    while start < len(text):
        parts.append(text[start:start + size])
        start += size - overlap
    return parts

text = "${text}"
print(len(chunk(text, ${size}, ${overlap})))
print(chunk(text, ${size}, ${overlap})[-1])`;
}

function drawChunk(r) {
  const size = randInt(r, 3, 6);
  const overlap = randInt(r, 1, size - 1);
  const length = randInt(r, 6, 12);
  const offset = randInt(r, 0, ALPHABET.length - length);
  return { text: ALPHABET.slice(offset, offset + length), size, overlap };
}

function buildSolution({ text, size, overlap }) {
  const parts = chunkParts(text, size, overlap);
  const starts = [];
  for (let start = 0; start < text.length; start += size - overlap) starts.push(start);
  const step = size - overlap;
  return `Starts: ${starts.join(', ')} (jeweils &lt; ${text.length}), also ${parts.length} Fenster: ${parts.join(', ')}. Ausgabe: <code>${parts.length}</code> und <code>${parts.at(-1)}</code>. Die Fensterzahl ist ⌈${text.length}/${step}⌉ = ${parts.length}.`;
}

// Capsule shape: parameters carry the drawn fields plus the snippet rebuilt
// verbatim from them — honest distinctness (the code text itself differs).
export function chunkCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    const { text, size, overlap } = parameters;
    if (typeof text !== 'string' || !/^[a-z]+$/.test(text)) return false;
    if (text.length < 6 || text.length > 12) return false;
    if (!Number.isInteger(size) || size < 3 || size > 6) return false;
    if (!Number.isInteger(overlap) || overlap < 1 || overlap > size - 1) return false;
    return parameters.snippet === buildSnippet({ text, size, overlap });
  } catch { return false; }
}

export function genChunkCase(seed, caseDef) {
  const drawn = drawChunk(rng(seed));
  const parts = chunkParts(drawn.text, drawn.size, drawn.overlap);
  return {
    parameters: {
      caseId: caseDef.caseId,
      difficulty: caseDef.difficulty,
      ...drawn,
      snippet: buildSnippet(drawn),
    },
    expected: { kind: 'output-lines', output: `${parts.length}\n${parts.at(-1)}` },
    prompt: caseDef.prompt,
    fullSolution: buildSolution(drawn),
    competencyIds: caseDef.competencyIds,
  };
}

export function solveChunkFamily(parameters) {
  const caseDef = CHUNK_CASES[parameters?.caseId];
  if (!caseDef || !chunkCaseOk(parameters, caseDef)) {
    throw new Error('trace-chunk-window-loop: Parameter verletzen die Kapselform');
  }
  const parts = chunkParts(parameters.text, parameters.size, parameters.overlap);
  return { output: `${parts.length}\n${parts.at(-1)}` };
}

export const CHUNK_CONTRACT = {
  familyId: 'trace-chunk-window-loop',
  familyGroup: 'trace-state',
  summary: 'Verfolgt eine Fenster-Chunking-Schleife mit Schrittweite size − overlap und sagt Fensterzahl und verkürztes Restfenster als Ausgabezeilen voraus.',
  taskArchetype: 'output-predict-lines',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'chunk-window-loop', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-genai-rag', 'c-python-reading'],
  graderId: 'deterministic',
  activityType: 'predict-output',
};

export function generateChunkFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = CHUNK_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genChunkCase(seed, { caseId, ...caseDef });
}

export const FAMILY_SPEC = { ...CHUNK_CONTRACT, generate: generateChunkFamily, solve: solveChunkFamily };
