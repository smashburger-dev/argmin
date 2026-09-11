// Procedural family transform-tokenize-roundtrip: the task text, starter code
// and reference solver stay fixed; the seed draws fresh texts and token lists
// that get appended to the curated base test block as literal __check lines.
// Expected id sequences are computed in JS from the fixed VOCAB and baked in
// as literals (the seeded block keeps the base block's exact == style), so
// the grading contract cannot drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const CORE_STARTER = `# VOCAB is part of the starter code
VOCAB = {"<pad>": 0, "<unk>": 1, "<eos>": 2, "</w>": 3, "a": 4, "b": 5, "c": 6, "d": 7, "e": 8,
         "l": 9, "o": 10, "s": 11, "t": 12, "w": 13}


def encode(text):
    """Word-wise char encoding: chars + </w> per word, one <eos> at the end."""
    ...


def decode(ids):
    """Inverse of encode; everything after <eos> is ignored."""
    ...
`;

const STRETCH_STARTER = `VOCAB = {"<pad>": 0, "<unk>": 1, "hello": 2, "world": 3}


def encode(tokens, vocab):
    ...


def decode(ids, inverse_vocab):
    ...
`;

const CORE_BASE_TESTS = `__check('encode low lowest', encode("low lowest") == [9, 10, 13, 3, 9, 10, 13, 8, 11, 12, 3, 2])
__check('encode einzelwort', encode("cab") == [6, 4, 5, 3, 2])
__check('round trip einzelwort', decode(encode("low")) == "low")
__check('round trip zwei woerter', decode(encode("low lowest")) == "low lowest")
__check('round trip abc', decode(encode("abc")) == "abc")
__check('round trip todesliste', all(decode(encode(s)) == s for s in ["low", "abc", "low lowest", "cab", "tease"]))
__check('eos beendet decode', decode([4, 3, 5, 2, 99]) == "a b")
try:
    encode("nope")
    __check('unbekanntes Zeichen -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('unbekanntes Zeichen -> ValueError', True)
try:
    decode([99])
    __check('unbekannte ID -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('unbekannte ID -> ValueError', True)
try:
    decode([0])
    __check('pad im Datenstrom -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('pad im Datenstrom -> ValueError', True)`;

const STRETCH_BASE_TESTS = `vocab = VOCAB
inverse = {value: key for key, value in vocab.items()}
ids = encode(["hello", "new", "world"], vocab)
__check('unbekanntes Token', ids == [2, 1, 3])
__check('Round-Trip bekannt', decode(ids, inverse) == ["hello", "<unk>", "world"])
__check('Pad bleibt erhalten', decode(encode(["<pad>"], vocab), inverse) == ["<pad>"])
`;

const CORE_REFERENCE = `# VOCAB is part of the starter code
VOCAB = {"<pad>": 0, "<unk>": 1, "<eos>": 2, "</w>": 3, "a": 4, "b": 5, "c": 6, "d": 7, "e": 8,
         "l": 9, "o": 10, "s": 11, "t": 12, "w": 13}

def encode(text):
    """Word-wise char encoding: chars + </w> per word, one <eos> at the end."""
    ids = []
    for word in text.split(" "):
        if word == "":
            raise ValueError("leeres Wort")
        for ch in word:
            if ch not in VOCAB:
                raise ValueError("unbekanntes Zeichen: " + ch)
            ids.append(VOCAB[ch])
        ids.append(VOCAB["</w>"])
    ids.append(VOCAB["<eos>"])
    return ids

def decode(ids):
    """Inverse of encode; everything after <eos> is ignored."""
    inv = {v: k for k, v in VOCAB.items()}
    words = []
    current = ""
    for i in ids:
        if i == VOCAB["<eos>"]:
            break
        if i not in inv:
            raise ValueError("unbekannte Token-ID")
        tok = inv[i]
        if tok == "</w>":
            words.append(current)
            current = ""
        elif tok in ("<pad>", "<unk>"):
            raise ValueError("Sondertoken im Datenstrom")
        else:
            current += tok
    if current:
        words.append(current)
    return " ".join(words)
`;

const STRETCH_REFERENCE = `def encode(tokens, vocab):
    return [vocab.get(token, vocab["<unk>"]) for token in tokens]

def decode(ids, inverse_vocab):
    return [inverse_vocab[int(index)] for index in ids]
`;

const CORE_PROMPT = 'Zeichen-Tokenizer mit Marker: Implementiere <code>encode(text)</code> und <code>decode(ids)</code> auf Basis des festen <code>VOCAB</code> aus dem Startercode. Vertrag für <code>encode</code>: Wörter werden an einfachen Leerzeichen getrennt; jedes Wort wird zu seinen Zeichen-IDs plus <code>&lt;/w&gt;</code>-ID; am Ende der ganzen Folge steht genau ein <code>&lt;eos&gt;</code>. Leere Wörter und unbekannte Zeichen werfen <code>ValueError</code>. Vertrag für <code>decode</code>: die Umkehrung — <code>&lt;/w&gt;</code> schließt ein Wort ab (Wörter werden mit Leerzeichen verbunden), <code>&lt;eos&gt;</code> beendet die Decodierung (alles danach wird ignoriert), ein Wort ohne abschließenden Marker wird trotzdem ausgegeben; unbekannte IDs und die Sondertokens <code>&lt;pad&gt;</code>/<code>&lt;unk&gt;</code> im Datenstrom werfen <code>ValueError</code>. Der Testcode erzwingt den Round-Trip <code>decode(encode(s)) == s</code> für mehrere Strings.';

const STRETCH_PROMPT = 'Implementiere eine deterministische Token-zu-ID- und ID-zu-Token-Rundreise mit einem festen Vokabular. Unbekannte Tokens müssen auf <code>&lt;unk&gt;</code> fallen.';

const CORE_SOLUTION = `${CORE_REFERENCE}# encode("low lowest") -> [9, 10, 13, 3, 9, 10, 13, 8, 11, 12, 3, 2]
# decode davon -> "low lowest" (Round-Trip-Invariante aus dem Test).`;

const STRETCH_SOLUTION = 'encode verwendet die vorhandene <code>&lt;unk&gt;</code>-ID für nicht bekannte Tokens. decode liest die Integer-IDs über das inverse Vokabular zurück; dadurch bleibt auch ein unbekannter Token als <code>&lt;unk&gt;</code> sichtbar.';

// JS mirrors of the fixed VOCAB tables from the starter code: the expected id
// sequences for seeded checks are computed here, never hardcoded per case.
const CHAR_IDS = { a: 4, b: 5, c: 6, d: 7, e: 8, l: 9, o: 10, s: 11, t: 12, w: 13 };
const EOW_ID = 3; // </w>
const EOS_ID = 2; // <eos>
const CHAR_KEYS = Object.keys(CHAR_IDS);

const SUBWORD_IDS = { '<pad>': 0, '<unk>': 1, hello: 2, world: 3 };
const KNOWN_TOKENS = Object.keys(SUBWORD_IDS);
const UNKNOWN_TOKENS = ['new', 'token', 'zzz', 'q', 'test'];

// Word-wise char encoding: chars + </w> per word, one <eos> at the end.
const encodeIds = (words) => words.flatMap((word) => [...[...word].map((ch) => CHAR_IDS[ch]), EOW_ID]).concat(EOS_ID);

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn texts and token lists
// differ, not just a seed literal). All drawn chars/tokens stay inside the
// fixed vocabularies so the expected values are computable in JS.
export const TOKENIZE_CASES = {
  'char-encode-roundtrip': {
    difficulty: 'core',
    packages: ['numpy'],
    starterCode: CORE_STARTER,
    baseTests: CORE_BASE_TESTS,
    referenceSolver: CORE_REFERENCE,
    prompt: CORE_PROMPT,
    fullSolution: CORE_SOLUTION,
    draw(r) {
      const words = Array.from({ length: randInt(r, 1, 3) }, () =>
        Array.from({ length: randInt(r, 1, 5) }, () => CHAR_KEYS[randInt(r, 0, CHAR_KEYS.length - 1)]).join(''));
      return { words };
    },
    extraCount: 3,
  },
  'subword-unk-roundtrip': {
    difficulty: 'stretch',
    packages: [],
    starterCode: STRETCH_STARTER,
    baseTests: STRETCH_BASE_TESTS,
    referenceSolver: STRETCH_REFERENCE,
    prompt: STRETCH_PROMPT,
    fullSolution: STRETCH_SOLUTION,
    draw(r) {
      const tokens = Array.from({ length: randInt(r, 2, 4) }, () => (r() < 0.5
        ? KNOWN_TOKENS[randInt(r, 0, KNOWN_TOKENS.length - 1)]
        : UNKNOWN_TOKENS[randInt(r, 0, UNKNOWN_TOKENS.length - 1)]));
      return { tokens };
    },
    extraCount: 3,
  },
};

const pyList = (v) => `[${v.join(', ')}]`;
const pyStrList = (v) => `[${v.map((s) => `"${s}"`).join(', ')}]`;

// Appends the seeded literal checks: expected ids are computed from the fixed
// VOCAB mirrors above and baked in as JS-computed literals; the round-trip
// checks keep the base block's == style.
function seededChecks(caseId, entry, index) {
  if (caseId === 'char-encode-roundtrip') {
    const text = entry.words.join(' ');
    const ids = pyList(encodeIds(entry.words));
    return [
      `__check('seeded encode ${index}', encode("${text}") == ${ids})`,
      `__check('seeded roundtrip ${index}', decode(encode("${text}")) == "${text}")`,
      `__check('seeded decode ${index}', decode(${ids}) == "${text}")`,
    ].join('\n');
  }
  const tokens = pyStrList(entry.tokens);
  const ids = pyList(entry.tokens.map((t) => (t in SUBWORD_IDS ? SUBWORD_IDS[t] : 1)));
  const decoded = pyStrList(entry.tokens.map((t) => (t in SUBWORD_IDS ? t : '<unk>')));
  return [
    `__inv${index} = {value: key for key, value in VOCAB.items()}`,
    `__check('seeded ids ${index}', encode(${tokens}, VOCAB) == ${ids})`,
    `__check('seeded back ${index}', decode(${ids}, __inv${index}) == ${decoded})`,
  ].join('\n');
}

export const TOKENIZE_CONTRACT = {
  familyId: 'transform-tokenize-roundtrip',
  familyGroup: 'transform-terms',
  summary: 'Baut Zeichen-Tokenisierung mit Wort-Marker und Satz-Eos auf und stellt die decode-Umkehrung samt Fehlervertrag bereit.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'char-encode-roundtrip', propertyTest: false },
    { caseId: 'subword-unk-roundtrip', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-dl-tokenizer', 'c-python-collections'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: TOKENIZE_CONTRACT,
  cases: TOKENIZE_CASES,
  shapeError: 'Tokenize-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(caseId, entry, i + 1)).join('\n')}`,
});

export const tokenizeCaseOk = FAMILY.caseOk;
export const genTokenizeCase = FAMILY.genCase;
export const solveTokenizeFamily = FAMILY.solve;
export const generateTokenizeFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
