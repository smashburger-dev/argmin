// Procedural family optimize-bpe-merge-learn: the task text, starter code
// and reference learner stay fixed; the seed draws fresh corpora (repeated
// word stems over a small letter pool, so every adjacent pair occurs at
// least twice and the learning loop actually merges) plus merge budgets
// that get appended to the curated base test block as literal __check
// lines. Expected merge tables are asserted with == against a __ref_-copy
// of the reference learner (pure Python — no np.* equivalent exists for
// string merges), so the grading contract cannot drift. Mirrors
// transform-bpe-merge-apply.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt, shuffle } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const CORE_STARTER = `def learn_merges(corpus, num_merges):
    """BPE learning with pinned rules: most frequent pair, ties -> lexicographically
    smallest pair, stop early when no pair occurs more than once."""
    # words = [list(word) + ["</w>"] for word in corpus]
    # per round: count adjacent pairs, pick max count, tie -> min(pair), merge everywhere
    ...
`;

const CORE_BASE_TESTS = `__check('null Merges', learn_merges(["low"], 0) == [])
__check('zu seltene Paare stoppen', learn_merges(["ab"], 5) == [])
CORPUS = ["low", "low", "lower", "lowest"]
__check('Lernfolge Korpus', learn_merges(CORPUS, 3) == [("l", "o"), ("lo", "w"), ("low", "</w>")])
__check('erster Tie-Break lexikographisch', learn_merges(CORPUS, 1) == [("l", "o")])
__check('weiter mit vier Merges', learn_merges(CORPUS, 4) == [("l", "o"), ("lo", "w"), ("low", "</w>"), ("low", "e")])
CORPUS2 = ["aa", "aa", "aa"]
__check('Tie-Break mit Marker', learn_merges(CORPUS2, 2) == [("a", "</w>"), ("a", "a</w>")])
__check('Rundreise anwendbar', learn_merges(["lowest", "lowest", "low"], 2) == [("l", "o"), ("lo", "w")])
__check('Einzelschritt-Abbruch bei Erschoepfung', learn_merges(["low", "low"], 10) == [("l", "o"), ("lo", "w"), ("low", "</w>")])`;

const CORE_REFERENCE = `def learn_merges(corpus, num_merges):
    """BPE learning with pinned rules: most frequent pair, ties -> lexicographically
    smallest pair, stop early when no pair occurs more than once."""
    words = [list(word) + ["</w>"] for word in corpus]
    merges = []
    for _ in range(int(num_merges)):
        counts = {}
        for syms in words:
            for i in range(len(syms) - 1):
                pair = (syms[i], syms[i + 1])
                counts[pair] = counts.get(pair, 0) + 1
        if not counts:
            break
        max_count = max(counts.values())
        if max_count < 2:
            break
        best = min(pair for pair, count in counts.items() if count == max_count)
        merges.append(best)
        a, b = best
        merged_words = []
        for syms in words:
            out = []
            i = 0
            while i < len(syms):
                if i + 1 < len(syms) and syms[i] == a and syms[i + 1] == b:
                    out.append(a + b)
                    i += 2
                else:
                    out.append(syms[i])
                    i += 1
            merged_words.append(out)
        words = merged_words
    return merges
`;

const CORE_PROMPT = 'Final Boss BPE-Lernen: Implementiere <code>learn_merges(corpus, num_merges)</code> mit vollständig gepinnten Regeln. Vertrag: Jedes Korpuswort wird zur Zeichenliste plus <code>"&lt;/w&gt;"</code>; pro Runde werden alle benachbarten Symbolpaare gezählt (jedes Wortvorkommen zählt); gewählt wird das häufigste Paar — <strong>Tie-Break: bei gleicher Häufigkeit gewinnt das lexikographisch kleinste Paar</strong> (Tupel-Vergleich, der Marker beginnt mit „&lt;“ und ist damit klein); das Paar wird in jedem Wort auf alle Vorkommen angewandt (links nach rechts, nicht überlappend) und an die Merge-Liste angehängt. Vorzeitig abgebrochen wird, wenn kein Paar mehr mit Häufigkeit ≥ 2 existiert. Rückgabe: Liste von Paaren. Der Testcode enthält den Lerntable-Lauf aus der Lektion („low low lower lowest“) mit zwei echten Tie-Break-Situationen.';

const CORE_SOLUTION = `${CORE_REFERENCE}# learn_merges(["low","low","lower","lowest"], 3)
# -> [("l","o"), ("lo","w"), ("low","</w>")]
# Runde 1: ("l","o") und ("o","w") stehen 4:4 — lexikographisch gewinnt ("l","o").`;

// __ref_-copy of the reference learner for the seeded blocks: the drawn
// corpora are asserted with == against this copy, never hardcoded.
const SEEDED_PREAMBLE = `def __ref_learn(corpus, num_merges):
    words = [list(word) + ["</w>"] for word in corpus]
    merges = []
    for _ in range(int(num_merges)):
        counts = {}
        for syms in words:
            for i in range(len(syms) - 1):
                pair = (syms[i], syms[i + 1])
                counts[pair] = counts.get(pair, 0) + 1
        if not counts:
            break
        max_count = max(counts.values())
        if max_count < 2:
            break
        best = min(pair for pair, count in counts.items() if count == max_count)
        merges.append(best)
        a, b = best
        merged_words = []
        for syms in words:
            out = []
            i = 0
            while i < len(syms):
                if i + 1 < len(syms) and syms[i] == a and syms[i + 1] == b:
                    out.append(a + b)
                    i += 2
                else:
                    out.append(syms[i])
                    i += 1
            merged_words.append(out)
        words = merged_words
    return merges`;

const LEARN_ALPHABET = ['a', 'b', 'e', 'l', 'n', 'o', 'r', 's', 't', 'w'];

// Case definition: the draw domain produces concrete literals that get baked
// into the test block (honest distinctness — the drawn corpora and budgets
// differ, not just a seed literal).
export const LEARN_CASES = {
  'bpe-merge-learn': {
    caseId: 'bpe-merge-learn',
    difficulty: 'challenge',
    packages: PACKAGES,
    starterCode: CORE_STARTER,
    baseTests: CORE_BASE_TESTS,
    referenceSolver: CORE_REFERENCE,
    prompt: CORE_PROMPT,
    fullSolution: CORE_SOLUTION,
    preamble: SEEDED_PREAMBLE,
    draw(r) {
      const stemCount = randInt(r, 2, 4);
      const stems = new Set();
      while (stems.size < stemCount) {
        stems.add(Array.from(
          { length: randInt(r, 3, 5) },
          () => LEARN_ALPHABET[randInt(r, 0, LEARN_ALPHABET.length - 1)],
        ).join(''));
      }
      const corpus = [];
      for (const stem of stems) {
        for (let i = 0, rep = randInt(r, 2, 3); i < rep; i += 1) corpus.push(stem);
      }
      return { corpus: shuffle(r, corpus), numMerges: randInt(r, 2, 6) };
    },
    extraCount: 3,
  },
};

const pyStrList = (values) => `[${values.map((s) => `"${s}"`).join(', ')}]`;

// Appends the seeded literal checks: every drawn corpus and merge budget is
// concrete in the test string and asserted with == against the __ref_-copy
// from the preamble. The first merge (k = 1) exercises the tie-break; the
// 99-budget run exercises the early stop once pairs drop below count 2.
function seededChecks(entry, index) {
  const corpus = pyStrList(entry.corpus);
  return [
    `__corpus${index} = ${corpus}`,
    `__check('seeded merges ${index}', learn_merges(__corpus${index}, ${entry.numMerges}) == __ref_learn(__corpus${index}, ${entry.numMerges}))`,
    `__check('seeded erster merge ${index}', learn_merges(__corpus${index}, 1) == __ref_learn(__corpus${index}, 1))`,
    `__check('seeded erschoepft ${index}', learn_merges(__corpus${index}, 99) == __ref_learn(__corpus${index}, 99))`,
  ].join('\n');
}

function seededSection(caseDef, seedCases) {
  const extras = seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n');
  return `${caseDef.preamble}\n${extras}`;
}

export const LEARN_CONTRACT = {
  familyId: 'optimize-bpe-merge-learn',
  familyGroup: 'optimize-update',
  summary: 'Lernt eine BPE-Mergetabelle als greedy Schleife: Paarhäufigkeiten zählen, häufigstes Paar mit lexikographischem Tie-Break wählen, überall anwenden, abbrechen.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'bpe-merge-learn', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-dl-tokenizer', 'c-python-collections'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: LEARN_CONTRACT,
  cases: LEARN_CASES,
  shapeError: 'BPE-Learn-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => `# seeded extra cases\n${seededSection(caseDef, seedCases)}`,
});

export const learnCaseOk = FAMILY.caseOk;
export const genLearnCase = FAMILY.genCase;
export const solveLearnFamily = FAMILY.solve;
export const generateLearnFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
