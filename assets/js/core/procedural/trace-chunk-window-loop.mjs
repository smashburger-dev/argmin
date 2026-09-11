// Procedural family trace-chunk-window-loop: the snippet shape, prompt and
// base oracle stay fixed; the seed draws the window text (consecutive
// lowercase letters, length 6-12 at any alphabet offset), the chunk size
// (3-6) and the overlap (1..size-1, so the stride size - overlap is always
// >= 1 and the while-loop provably terminates). The solver mirrors the
// Python loop one-to-one — window count and the possibly truncated last
// window are recomputed from the drawn parameters, never hardcoded. The
// expected keeps the base form { kind: 'output-lines', output }.

import { randInt } from '../generator_draw_kit.mjs';
import { makePredictFamily } from './case_family_kit.mjs';

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
    baseParams: { text: 'abcdefgh', size: 4, overlap: 2 },
    prompt: PROMPT,
    baseSolution: BASE_SOLUTION,
    competencyIds: ['c-genai-rag', 'c-python-reading'],
    draw: drawChunk,
    buildSnippet: (p) => buildSnippet(p),
    buildOutput: (p) => {
      const parts = chunkParts(p.text, p.size, p.overlap);
      return `${parts.length}\n${parts.at(-1)}`;
    },
    buildSolution: (p) => buildSolution(p),
    checkParams(p) {
      const { text, size, overlap } = p;
      if (typeof text !== 'string' || !/^[a-z]+$/.test(text)) return false;
      if (text.length < 6 || text.length > 12) return false;
      if (!Number.isInteger(size) || size < 3 || size > 6) return false;
      if (!Number.isInteger(overlap) || overlap < 1 || overlap > size - 1) return false;
      return true;
    },
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
};

const FAMILY = makePredictFamily({
  contract: CHUNK_CONTRACT,
  cases: CHUNK_CASES,
  shapeError: 'trace-chunk-window-loop: Parameter verletzen die Kapselform',
});

export const chunkCaseOk = FAMILY.caseOk;
export const genChunkCase = FAMILY.genCase;
export const solveChunkFamily = FAMILY.solve;
export const generateChunkFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
