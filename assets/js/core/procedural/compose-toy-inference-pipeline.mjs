// Procedural family compose-toy-inference-pipeline: the task text, starter
// code and reference solver stay fixed; the seed draws fresh start texts
// (over the fixed VOCAB alphabet) and max_len bounds that get appended to the
// curated base test block as literal __check lines. Expected token sequences
// are asserted inline against the __ref_run copy that the base block already
// defines; the decoded text is asserted against an inline decode of the
// reference ids, so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const PIPELINE_STARTER = `import numpy as np

# VOCAB is part of the starter code
VOCAB = {"<eos>": 0, "</w>": 1, "a": 2, "b": 3, "e": 4, "l": 5, "o": 6, "s": 7, "t": 8}


def pipeline(text, weights, max_len, eos_id):
    """Encode -> autoregressive toy forward -> greedy argmax until eos or max_len."""
    # 1) word-wise char ids + </w> per word (no leading <eos>)
    # 2) while len(ids) < max_len: logits over the WHOLE sequence
    #    (embed -> causal attention with 1/sqrt(d) -> mean over positions -> Wout),
    #    append int(np.argmax(logits)), stop on eos_id
    # 3) decode ids to text (</w> -> " ", <eos> -> "<eos>") and strip
    ...
`;

const PIPELINE_BASE_TESTS = `E = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [1, 1, 0, 0], [0, 0, 1, 1], [0, 1, 1, 0], [1, 0, 1, 0], [1, 1, 1, 0]]
Wq = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
Wk = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
Wv = [[1, 2, 0, 0], [2, 1, 0, 0], [0, 0, 1, 2], [0, 0, 2, 1]]
Wout = [[0, 1, 0, 0, 0, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0, 0, 0, 0], [0, 0, 0, 1, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0, 0]]
WEIGHTS = {"E": E, "Wq": Wq, "Wk": Wk, "Wv": Wv, "Wout": Wout}

def __ref_run(text, weights, max_len, eos_id):
    import math
    E, Wq, Wk, Wv, Wout = weights["E"], weights["Wq"], weights["Wk"], weights["Wv"], weights["Wout"]
    V = {"<eos>": 0, "</w>": 1, "a": 2, "b": 3, "e": 4, "l": 5, "o": 6, "s": 7, "t": 8}
    ids = []
    for word in text.split(" "):
        for ch in word:
            ids.append(V[ch])
        ids.append(V["</w>"])
    d = len(E[0])
    while len(ids) < max_len:
        X = [E[i] for i in ids]
        n = len(X)
        Q = [[sum(X[i][a] * Wq[a][b] for a in range(d)) for b in range(d)] for i in range(n)]
        K = [[sum(X[i][a] * Wk[a][b] for a in range(d)) for b in range(d)] for i in range(n)]
        Vp = [[sum(X[i][a] * Wv[a][b] for a in range(d)) for b in range(d)] for i in range(n)]
        ctx = []
        for i in range(n):
            s = [sum(Q[i][a] * K[j][a] for a in range(d)) / math.sqrt(d) if j <= i else float('-inf') for j in range(n)]
            m = max(s)
            ex = [math.exp(v - m) for v in s]
            tot = sum(ex)
            w = [e / tot for e in ex]
            ctx.append([sum(w[j] * Vp[j][c] for j in range(n)) for c in range(d)])
        mean = [sum(ctx[i][c] for i in range(n)) / n for c in range(d)]
        logits = [sum(mean[a] * Wout[a][b] for a in range(d)) for b in range(len(Wout[0]))]
        best = 0
        for j in range(1, len(logits)):
            if logits[j] > logits[best]:
                best = j
        ids.append(best)
        if best == eos_id:
            break
    return ids

out = pipeline("a", WEIGHTS, 8, 0)
__check('tokens gegen Referenz', out["tokens"] == __ref_run("a", WEIGHTS, 8, 0))
__check('tokenfolge Ended mit eos oder max_len', len(out["tokens"]) <= 8 and out["tokens"][-1] == 0)
out2 = pipeline("las", WEIGHTS, 12, 0)
__check('laengerer start gegen Referenz', out2["tokens"] == __ref_run("las", WEIGHTS, 12, 0))
__check('Doppelaufruf identisch tokens', pipeline("a", WEIGHTS, 8, 0)["tokens"] == pipeline("a", WEIGHTS, 8, 0)["tokens"])
__check('Doppelaufruf identisch text', pipeline("a", WEIGHTS, 8, 0)["text"] == pipeline("a", WEIGHTS, 8, 0)["text"])
__check('max_len wird respektiert', len(pipeline("a", WEIGHTS, 3, 0)["tokens"]) <= 3)
__check('rueckgabe strukturiert', set(out.keys()) == {"tokens", "text"} and isinstance(out["text"], str))`;

const PIPELINE_REFERENCE = `import numpy as np

# VOCAB is part of the starter code
VOCAB = {"<eos>": 0, "</w>": 1, "a": 2, "b": 3, "e": 4, "l": 5, "o": 6, "s": 7, "t": 8}

def pipeline(text, weights, max_len, eos_id):
    """Encode -> autoregressive toy forward -> greedy argmax until eos or max_len."""
    ids = []
    for word in text.split(" "):
        for ch in word:
            ids.append(VOCAB[ch])
        ids.append(VOCAB["</w>"])
    E = np.asarray(weights["E"], dtype=float)
    Wq = np.asarray(weights["Wq"], dtype=float)
    Wk = np.asarray(weights["Wk"], dtype=float)
    Wv = np.asarray(weights["Wv"], dtype=float)
    Wout = np.asarray(weights["Wout"], dtype=float)

    def forward(cur):
        X = E[cur]
        n, d = X.shape
        scores = (X @ Wq) @ (X @ Wk).T / np.sqrt(d)
        keep = np.tril(np.ones((n, n), dtype=bool))
        scores = np.where(keep, scores, -np.inf)
        scores = scores - scores.max(axis=1, keepdims=True)
        w = np.exp(scores)
        w = w / w.sum(axis=1, keepdims=True)
        ctx = w @ (X @ Wv)
        return ctx.mean(axis=0) @ Wout

    while len(ids) < max_len:
        nxt = int(np.argmax(forward(list(ids))))
        ids.append(nxt)
        if nxt == eos_id:
            break
    inv = {v: k for k, v in VOCAB.items()}
    tokens = []
    for i in ids:
        if i == eos_id:
            tokens.append("<eos>")
            continue
        tok = inv[i]
        if tok == "</w>":
            tokens.append(" ")
        else:
            tokens.append(tok)
    return {"tokens": ids, "text": "".join(tokens).strip()}
`;

const PIPELINE_PROMPT = 'Final Boss Toy-Pipeline: Implementiere <code>pipeline(text, weights, max_len, eos_id)</code>. <strong>Dies ist eine Toy-Pipeline mit gestellten Gewichten — sie demonstriert Mechanik, keine Sprachfähigkeit; echte LLM-Inferenz bleibt lokales Projekt.</strong> Vertrag: (1) Tokenisieren mit dem festen <code>VOCAB</code> aus dem Startercode — wortweise Zeichen-IDs plus <code>&lt;/w&gt;</code> je Wort (kein zusätzliches <code>&lt;eos&gt;</code> am Anfangszustand). (2) Autoregressive Schleife: solange die Folge kürzer als <code>max_len</code> ist, berechne die Logits über die <em>gesamte aktuelle Folge</em> (Embedding → ein kausaler Attention-Kopf mit Divisor $\\sqrt{d}$ → Zeilenmittel → $W_{\\text{out}}$), hänge <code>int(np.argmax(logits))</code> an (Gleichstand: kleinste ID) und stoppe bei <code>eos_id</code>. (3) Rückgabe: <code>{"tokens": [...], "text": "..."}</code>, wobei <code>text</code> die dekodierten Symbole sind (<code>&lt;/w&gt;</code> → Leerzeichen, <code>&lt;eos&gt;</code> → „&lt;eos&gt;“, führende/folgende Leerzeichen entfernen). Der Testcode vergleicht gegen eine unabhängige Referenz-Pipeline mit denselben Gewichtsliteralen und erzwingt zwei identische Doppelaufrufe.';

const PIPELINE_SOLUTION = `${PIPELINE_REFERENCE}# pipeline("a", WEIGHTS, 8, 0) -> {"tokens": [2, 1, 0], "text": "a <eos>"}
# zwei Aufrufe mit denselben Gewichten liefern identische Ergebnisse.`;

// Letters that exist in the fixed VOCAB — drawn words stay encodable.
const TOY_LETTERS = ['a', 'b', 'e', 'l', 'o', 's', 't'];

// Encoded length of a start text: chars per word plus one </w> each (no <eos>).
const encodedLength = (text) => text.split(' ').reduce((total, word) => total + word.length + 1, 0);

// Case definitions: the draw domain produces concrete literals that get baked
// into the test block (honest distinctness — the drawn start texts and bounds
// differ, not just a seed literal). max_len may sit below the encoded length,
// which exercises the "loop never runs" path of the contract.
export const TOY_PIPELINE_CASES = {
  'toy-inference-pipeline': {
    difficulty: 'challenge',
    starterCode: PIPELINE_STARTER,
    baseTests: PIPELINE_BASE_TESTS,
    referenceSolver: PIPELINE_REFERENCE,
    prompt: PIPELINE_PROMPT,
    fullSolution: PIPELINE_SOLUTION,
    draw(r) {
      const wordCount = randInt(r, 1, 3);
      const words = [];
      for (let w = 0; w < wordCount; w += 1) {
        const len = randInt(r, 1, 4);
        words.push(Array.from({ length: len }, () => TOY_LETTERS[randInt(r, 0, TOY_LETTERS.length - 1)]).join(''));
      }
      return { text: words.join(' '), maxLen: randInt(r, 3, 16) };
    },
    extraCount: 3,
  },
};

// Appends the seeded literal checks: every draw is concrete in the test
// string; expected ids come from the __ref_run copy in the base block, the
// decoded text from an inline inverse-vocab decode of those same ids. The
// length bound is max(max_len, encoded length) because a start sequence at or
// above the cap never enters the decode loop.
function seededChecks(entry, index) {
  const t = JSON.stringify(entry.text);
  const enc = encodedLength(entry.text);
  return [
    `__t${index} = ${t}`,
    `__o${index} = pipeline(__t${index}, WEIGHTS, ${entry.maxLen}, 0)`,
    `__check('seeded tokens ${index}', __o${index}["tokens"] == __ref_run(__t${index}, WEIGHTS, ${entry.maxLen}, 0))`,
    `__inv${index} = {0: "<eos>", 1: "</w>", 2: "a", 3: "b", 4: "e", 5: "l", 6: "o", 7: "s", 8: "t"}`,
    `__check('seeded text ${index}', __o${index}["text"] == "".join("<eos>" if i == 0 else (" " if __inv${index}[i] == "</w>" else __inv${index}[i]) for i in __ref_run(__t${index}, WEIGHTS, ${entry.maxLen}, 0)).strip())`,
    `__check('seeded laenge ${index}', len(__o${index}["tokens"]) <= ${Math.max(entry.maxLen, enc)})`,
  ].join('\n');
}

export const TOY_PIPELINE_CONTRACT = {
  familyId: 'compose-toy-inference-pipeline',
  familyGroup: 'construct-program',
  summary: 'Komponiert Tokenizer, Toy-Forward-Pass und Greedy-Dekodierung zu einer deterministischen Inferenz-Pipeline mit Rückdekodierung.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'toy-inference-pipeline', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-dl-inference', 'c-dl-attention', 'c-dl-tokenizer'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: TOY_PIPELINE_CONTRACT,
  cases: TOY_PIPELINE_CASES,
  shapeError: 'Toy-Pipeline-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

export const toyPipelineCaseOk = FAMILY.caseOk;
export const genToyPipelineCase = FAMILY.genCase;
export const solveToyPipelineFamily = FAMILY.solve;
export const generateToyPipelineFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
