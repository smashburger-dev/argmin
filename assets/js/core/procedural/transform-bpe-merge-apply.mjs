// Procedural family transform-bpe-merge-apply: the task text, starter code and
// reference solver stay fixed; the seed draws fresh words, symbol sequences
// and merge tables that get appended to the curated base test block as literal
// __check lines. Expected values are asserted against a __ref_-copy of the
// reference merge loop (no np.* equivalent exists for string merges), so the
// grading contract cannot drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const CORE_STARTER = `def bpe_encode(word, merges):
    """Apply the merge table in order: each merge hits all occurrences (left-to-right, non-overlapping)."""
    # start from list(word) + ["</w>"]
    # for each pair in table order: single left-to-right pass merging all occurrences
    ...
`;

const TIE_STARTER = `def apply_merges(symbols, merges):
    ...
`;

const CORE_BASE_TESTS = `MERGES = [("l", "o"), ("lo", "w"), ("e", "s"), ("es", "t")]
__check('lowest mit Lerntabelle', bpe_encode("lowest", MERGES) == ["low", "est", "</w>"])
__check('low mit Lerntabelle', bpe_encode("low", MERGES) == ["low", "</w>"])
__check('lower mit Lerntabelle', bpe_encode("lower", MERGES) == ["low", "e", "r", "</w>"])
__check('leere Tabelle reine Zeichen', bpe_encode("ab", []) == ["a", "b", "</w>"])
__check('unbekanntes Wort zerfaellt', bpe_encode("cab", MERGES) == ["c", "a", "b", "</w>"])
__check('Overlapping von links', bpe_encode("aaa", [("a", "a")]) == ["aa", "a", "</w>"])
__check('Tabellenreihenfolge wirkt', bpe_encode("lowest", [("e", "s"), ("l", "o")]) == ["lo", "w", "es", "t", "</w>"])
__check('Tokenzahl gesunken', len(bpe_encode("lowest", MERGES)) == 3)
__check('Marker immer letztes Symbol', bpe_encode("lowest", MERGES)[-1] == "</w>")`;

const TIE_BASE_TESTS = `__check('Tie folgt Tabellenreihenfolge', apply_merges(["a", "b", "c"], [("a", "b"), ("b", "c")]) == ["ab", "c"])
__check('zweiter Merge sieht erstes Ergebnis', apply_merges(["a", "b", "c"], [("a", "b"), ("ab", "c")]) == ["abc"])
__check('nicht ueberlappend', apply_merges(["a", "a", "a"], [("a", "a")]) == ["aa", "a"])
__check('kein Merge unveraendert', apply_merges(["x", "y"], [("a", "b")]) == ["x", "y"])
`;

const CORE_REFERENCE = `def bpe_encode(word, merges):
    """Apply the merge table in order: each merge hits all occurrences (left-to-right, non-overlapping)."""
    symbols = list(word) + ["</w>"]
    for pair in merges:
        a, b = pair
        out = []
        i = 0
        while i < len(symbols):
            if i + 1 < len(symbols) and symbols[i] == a and symbols[i + 1] == b:
                out.append(a + b)
                i += 2
            else:
                out.append(symbols[i])
                i += 1
        symbols = out
    return symbols
`;

const TIE_REFERENCE = `def apply_merges(symbols, merges):
    symbols = list(symbols)
    for left, right in merges:
        out = []
        i = 0
        while i < len(symbols):
            if i + 1 < len(symbols) and symbols[i] == left and symbols[i + 1] == right:
                out.append(left + right)
                i += 2
            else:
                out.append(symbols[i])
                i += 1
        symbols = out
    return symbols
`;

const CORE_PROMPT = 'BPE anwenden: Implementiere <code>bpe_encode(word, merges)</code>. Vertrag: Das Wort startet als Zeichenliste plus End-of-Word-Marker <code>"&lt;/w&gt;"</code>; danach gehst du die Mergetabelle <strong>in Tabellenreihenfolge</strong> durch und wendest jeden Merge <strong>einmal</strong> auf alle Vorkommen in der aktuellen Symbolfolge an — von links nach rechts, überlappende Paare zählen nicht doppelt (aus <code>a a a</code> wird <code>aa a</code>). Rückgabe: die finale Symbolfolge als Liste von Strings. Der Testcode nutzt eine vorgegebene Beispiel-Mergetabelle (l o, lo w, e s, es t) und prüft Known-Wörter, unbekannte Wörter, Tabellenreihenfolge und Überlappungen.';

const TIE_PROMPT = 'Wende eine geordnete BPE-Mergetabelle auf eine Symbolfolge an. Bei einem Tie entscheidet die Tabellenreihenfolge; Treffer werden links-nach-rechts und nicht überlappend zusammengeführt.';

const CORE_SOLUTION = `${CORE_REFERENCE}# bpe_encode("lowest", [("l","o"),("lo","w"),("e","s"),("es","t")])
# -> ["low", "est", "</w>"]  (aus 7 Zeichen-Tokens werden 3 Symbole).`;

const TIE_SOLUTION = 'Jeder Merge läuft über die aktuelle Symbolfolge. Ein Treffer erzeugt ein kombiniertes Symbol und springt um zwei Positionen weiter; danach wird der nächste Merge auf die neue Folge angewendet.';

// __ref_-copies of the reference merge loop for the seeded blocks: the drawn
// fixtures are asserted with == against these copies, never hardcoded.
const CORE_SEEDED_PREAMBLE = `def __ref_bpe(word, merges):
    symbols = list(word) + ["</w>"]
    for left, right in merges:
        out = []
        i = 0
        while i < len(symbols):
            if i + 1 < len(symbols) and symbols[i] == left and symbols[i + 1] == right:
                out.append(left + right)
                i += 2
            else:
                out.append(symbols[i])
                i += 1
        symbols = out
    return symbols`;

const TIE_SEEDED_PREAMBLE = `def __ref_apply(symbols, merges):
    symbols = list(symbols)
    for left, right in merges:
        out = []
        i = 0
        while i < len(symbols):
            if i + 1 < len(symbols) and symbols[i] == left and symbols[i + 1] == right:
                out.append(left + right)
                i += 2
            else:
                out.append(symbols[i])
                i += 1
        symbols = out
    return symbols`;

const WORD_ALPHABET = ['a', 'b', 'e', 'l', 'o', 's', 't', 'w'];
const TIE_ALPHABET = ['a', 'b', 'c'];

// Draws a merge table whose later pairs may reference earlier merge results —
// the pool starts with the alphabet and every drawn pair pushes its merged
// symbol, so chained tables like [("l","o"),("lo","w")] occur naturally.
function drawMerges(r, alphabet, count) {
  const pool = [...alphabet];
  const merges = [];
  for (let i = 0; i < count; i += 1) {
    const left = pool[randInt(r, 0, pool.length - 1)];
    const right = pool[randInt(r, 0, pool.length - 1)];
    merges.push([left, right]);
    pool.push(left + right);
  }
  return merges;
}

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn words, symbol
// sequences and merge tables differ, not just a seed literal).
export const BPE_CASES = {
  'bpe-merge-apply': {
    difficulty: 'stretch',
    packages: ['numpy'],
    starterCode: CORE_STARTER,
    baseTests: CORE_BASE_TESTS,
    referenceSolver: CORE_REFERENCE,
    prompt: CORE_PROMPT,
    fullSolution: CORE_SOLUTION,
    preamble: CORE_SEEDED_PREAMBLE,
    draw(r) {
      const word = Array.from({ length: randInt(r, 3, 6) }, () => WORD_ALPHABET[randInt(r, 0, WORD_ALPHABET.length - 1)]).join('');
      return { word, merges: drawMerges(r, WORD_ALPHABET, randInt(r, 2, 4)) };
    },
    extraCount: 3,
  },
  'bpe-merge-tie-order': {
    difficulty: 'stretch',
    packages: [],
    starterCode: TIE_STARTER,
    baseTests: TIE_BASE_TESTS,
    referenceSolver: TIE_REFERENCE,
    prompt: TIE_PROMPT,
    fullSolution: TIE_SOLUTION,
    preamble: TIE_SEEDED_PREAMBLE,
    draw(r) {
      const symbols = Array.from({ length: randInt(r, 3, 6) }, () => TIE_ALPHABET[randInt(r, 0, TIE_ALPHABET.length - 1)]);
      return { symbols, merges: drawMerges(r, TIE_ALPHABET, randInt(r, 1, 3)) };
    },
    extraCount: 3,
  },
};

const pyStrList = (v) => `[${v.map((s) => `"${s}"`).join(', ')}]`;
const pyMerges = (m) => `[${m.map(([a, b]) => `("${a}", "${b}")`).join(', ')}]`;

// Appends the seeded literal checks: every drawn word/symbol sequence and
// merge table is concrete in the test string and asserted with == against the
// __ref_-copy from the preamble.
function seededChecks(caseId, entry, index) {
  if (caseId === 'bpe-merge-apply') {
    const merges = pyMerges(entry.merges);
    return [
      `__check('seeded bpe ${index}', bpe_encode("${entry.word}", ${merges}) == __ref_bpe("${entry.word}", ${merges}))`,
      `__check('seeded marker ${index}', bpe_encode("${entry.word}", ${merges})[-1] == "</w>")`,
    ].join('\n');
  }
  const symbols = pyStrList(entry.symbols);
  const merges = pyMerges(entry.merges);
  return `__check('seeded apply ${index}', apply_merges(${symbols}, ${merges}) == __ref_apply(${symbols}, ${merges}))`;
}

function seededSection(caseDef, caseId, seedCases) {
  const extras = seedCases.map((entry, i) => seededChecks(caseId, entry, i + 1)).join('\n');
  return caseDef.preamble ? `${caseDef.preamble}\n${extras}` : extras;
}

export const BPE_CONTRACT = {
  familyId: 'transform-bpe-merge-apply',
  familyGroup: 'transform-terms',
  summary: 'Wendet eine BPE-Mergetabelle in Tabellenreihenfolge mit links-nach-rechts nicht überlappenden Merges auf eine Symbolfolge an.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'bpe-merge-apply', propertyTest: false },
    { caseId: 'bpe-merge-tie-order', propertyTest: false },
  ],
  difficultyProfiles: ['stretch', 'core'],
  competencyIds: ['c-dl-tokenizer', 'c-python-collections'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: BPE_CONTRACT,
  cases: BPE_CASES,
  shapeError: 'BPE-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, caseId, seedCases) => `# seeded extra cases\n${seededSection(caseDef, caseId, seedCases)}`,
});

export const bpeCaseOk = FAMILY.caseOk;
export const genBpeCase = FAMILY.genCase;
export const solveBpeFamily = FAMILY.solve;
export const generateBpeFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
