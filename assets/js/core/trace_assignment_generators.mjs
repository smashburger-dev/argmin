// trace_assignment_generators.mjs — seeded instance generators for the
// literal-shard cases of the `trace-assignment-state` family.
//
// Each spec owns a compact literal space (pools distilled from the previously
// authored variant shards) and derives snippet + expected from the same draw:
//   draw(r)      -> literal parameters (everything the solver needs)
//   build(p)     -> { snippet, expected, prompt, fullSolution, variables? }
//   expected(p)  -> the grading payload, recomputed by the solver
//
// Python fidelity: pyF renders float literals ("2.0"), pyStr single-quoted
// strings, pyList/pyDict the repr forms, pyRound implements CPython's
// round-half-even on the exact decimal expansion (toFixed never truncates
// for our magnitudes), pyNum renders the printed float form.

import { pick, rng } from './generator_draw_kit.mjs';

// --- Python repr helpers -------------------------------------------------

const pyF = (x) => (Number.isInteger(x) ? `${x}.0` : String(x));
const pyLit = (x) => String(x); // int-typed literal: 6, not 6.0
const pyNum = pyF;
const pyStr = (s) => `'${s}'`;
const pyList = (items) => `[${items.join(', ')}]`;
const pyDict = (pairs) => `{${pairs.map(([k, v]) => `${pyStr(k)}: ${v}`).join(', ')}}`;

/** Exact decimal expansion of a finite float: toFixed(50) covers every
 *  double in our value ranges to 50 fractional digits, which is more than
 *  enough to decide any half-even tie at ndigits <= 6. */
const pyRound = (x, ndigits = 0) => {
  const neg = x < 0;
  const s = Math.abs(x).toFixed(50);
  const dot = s.indexOf('.');
  const digits = (s.slice(0, dot) + s.slice(dot + 1)).split('').map(Number);
  const cut = dot + ndigits;
  const kept = digits.slice(0, cut);
  if (digits.slice(cut).every((d) => d === 0)) {
    return x;
  }
  const first = digits[cut];
  const tail = digits.slice(cut + 1).some((d) => d !== 0);
  const up = first > 5 || (first === 5 && tail) || (first === 5 && !tail && (kept[kept.length - 1] ?? 0) % 2 === 1);
  if (up) {
    for (let i = kept.length - 1; i >= -1; i--) {
      if (i < 0) { kept.unshift(1); break; }
      if (kept[i] < 9) { kept[i] += 1; break; }
      kept[i] = 0;
    }
  }
  const head = kept.slice(0, kept.length - ndigits).join('') || '0';
  const frac = ndigits > 0 ? kept.slice(kept.length - ndigits).join('').padEnd(ndigits, '0') : '';
  return Number(`${neg ? '-' : ''}${head}${frac ? `.${frac}` : ''}`);
};

/** Normalize fp noise for JSON variable values (emit ints when integral). */
const jsVal = (v) => {
  const r = Math.round(v * 1e9) / 1e9;
  return Object.is(r, -0) ? 0 : r;
};

// --- Case specs -----------------------------------------------------------

const GRADIENT_W0 = [2.0, 1.0, 0.0, 5.0, 3.0, -1.0, 10.0, 1.5, 0.5];
const GRADIENT_B0 = [4.0, 2.0, 0.0, 5.0, 1.0, 1.5, 9.0];
const GRADIENT_LR = [0.1, 0.5, 0.2, 1.0, 0.25];
const GRADIENT_PAIRS = [
  [3.0, -6.0], [2.0, 2.0], [1.0, -1.0], [10.0, 0.0], [1.0, 1.0],
  [4.0, 8.0], [0.0, 0.0], [20.0, 10.0], [2.5, 2.5], [-1.0, 2.0],
  [1.5, -3.0], [0.0, 4.0], [0.0, 10.0], [-4.0, 0.0], [10.0, 10.0], [1.0, 2.0],
];

const gradientLoop = {
  draw: (r) => ({
    w0: pick(r, GRADIENT_W0), b0: pick(r, GRADIENT_B0), lr: pick(r, GRADIENT_LR),
    g1: pick(r, GRADIENT_PAIRS), g2: pick(r, GRADIENT_PAIRS),
  }),
  build(p) {
    const w = p.w0 - p.lr * (p.g1[0] + p.g2[0]);
    const b = p.b0 - p.lr * (p.g1[1] + p.g2[1]);
    const output = `${pyNum(pyRound(w, 3))} ${pyNum(pyRound(b, 3))}`;
    const snippet =
      `w, b, lr = ${pyF(p.w0)}, ${pyF(p.b0)}, ${pyF(p.lr)}\n` +
      `for grad_w, grad_b in [(${pyF(p.g1[0])}, ${pyF(p.g1[1])}), (${pyF(p.g2[0])}, ${pyF(p.g2[1])})]:\n` +
      `    w = w - lr * grad_w\n    b = b - lr * grad_b\nprint(round(w, 3), round(b, 3))`;
    return {
      snippet,
      expected: { kind: 'output-lines', output },
      prompt: `Gradientenloop lr=${pyF(p.lr)}, Start w=${pyF(p.w0)} b=${pyF(p.b0)}. Sage die Ausgabe von <code>print</code> vorher.`,
      fullSolution: `w = ${pyF(p.w0)} − ${pyF(p.lr)}·(${pyF(p.g1[0])}+${pyF(p.g2[0])}) = ${pyNum(pyRound(w, 3))}; b = ${pyF(p.b0)} − ${pyF(p.lr)}·(${pyF(p.g1[1])}+${pyF(p.g2[1])}) = ${pyNum(pyRound(b, 3))}. Ausgabe: <code>${output}</code>.`,
    };
  },
  expected: (p) => ({ kind: 'output-lines', output: gradientLoop.build(p).expected.output }),
};

const TREE_T0 = [5, 0, 10, 2];
const TREE_TL = [2, 0, 10];
const TREE_TR = [4, 0, 2];
const TREE_POINTS = [
  [4, 3], [6, 3], [6, 5], [1, 1], [9, 9], [-1, -1], [1, -1], [5, 2],
  [5, 3], [7, 4], [0, 0], [11, 1], [11, -1], [8, 8], [0, 9], [3, 3],
  [3, 0], [9, 1], [4, 0], [2, 2], [6, 5], [1, 1],
];

const treeMajority = {
  draw: (r) => ({
    t0: pick(r, TREE_T0), tl: pick(r, TREE_TL), tr: pick(r, TREE_TR),
    qs: [pick(r, TREE_POINTS), pick(r, TREE_POINTS), pick(r, TREE_POINTS)],
  }),
  build(p) {
    const predict = (x) => (x[0] <= p.t0 ? (x[1] <= p.tl ? 1 : 0) : (x[1] <= p.tr ? 0 : 1));
    const preds = p.qs.map(predict);
    const votes = preds[0] + preds[1] + preds[2];
    const pred = votes >= 2 ? 1 : 0;
    const q = (v) => `(${v[0]}, ${v[1]})`;
    const snippet =
      `def predict(x):\n    if x[0] <= ${p.t0}:\n        if x[1] <= ${p.tl}:\n            return 1\n        return 0\n    if x[1] <= ${p.tr}:\n        return 0\n    return 1\n\n` +
      `pred_a = predict(${q(p.qs[0])})\npred_b = predict(${q(p.qs[1])})\npred_c = predict(${q(p.qs[2])})\n` +
      `votes = pred_a + pred_b + pred_c\npred = 1 if votes >= 2 else 0`;
    return {
      snippet,
      variables: [
        { name: 'votes', value: votes },
        { name: 'pred', value: pred },
      ],
      expected: { kind: 'variable-values' },
      prompt: `Entscheidungsbaum mit Schwellen ${p.t0}/${p.tl}/${p.tr} und drei Query-Punkten. Werte von <code>votes</code> und <code>pred</code> am Ende?`,
      fullSolution: `predict liefert ${preds.join(', ')}; votes = ${votes}, also pred = ${pred}.`,
    };
  },
  expected: () => ({ kind: 'variable-values' }),
};

const BACKWARD_GRAD_OUT = [6, 2, 1, 4, 10, 3, -2, 8, 5];
const BACKWARD_LOCAL = [-2, 3, 1, -1, 0, 4, 0.5, -3, 2];
const BACKWARD_LR = [0.5, 1.0, 0.25, 0.1, 2.0, 0.2];
const BACKWARD_W0 = [4.0, 1.0, 0.0, 2.0, 5.0, 9.0, 3.0, 10.0];
const BACKWARD_B0 = [1.0, 0.0, 2.0, 5.0, 9.0, 3.0];

const manualBackward = {
  draw: (r) => {
    // The code-trace grader accepts integers only; keep drawing until the
    // update steps land on whole values (authored banks were curated this way).
    for (let i = 0; i < 60; i++) {
      const p = {
        grad_out: pick(r, BACKWARD_GRAD_OUT), local: pick(r, BACKWARD_LOCAL),
        lr: pick(r, BACKWARD_LR), w0: pick(r, BACKWARD_W0), b0: pick(r, BACKWARD_B0),
      };
      const grad_w = p.grad_out * p.local;
      const w = p.w0 - p.lr * grad_w;
      const b = p.b0 - p.lr * p.grad_out;
      // grad_w is itself a traced variable — the grader accepts integers only,
      // so every reported value must be whole.
      if ([grad_w, w, p.grad_out, b].every(Number.isInteger)) return p;
    }
    return { grad_out: 2, local: 1, lr: 0.5, w0: 1.0, b0: 2.0 };
  },
  build(p) {
    const grad_w = p.grad_out * p.local;
    const w = p.w0 - p.lr * grad_w;
    const grad_b = p.grad_out;
    const b = p.b0 - p.lr * grad_b;
    const num = (v) => String(jsVal(v));
    const snippet =
      `grad_out = ${pyLit(p.grad_out)}   # dL/dz (Upstream)\n` +
      `local = ${pyLit(p.local)}   # dz/dw (lokal)\n` +
      `grad_w = grad_out * local\n` +
      `w = ${pyF(p.w0)} - ${pyF(p.lr)} * grad_w\n` +
      `grad_b = grad_out * 1\n` +
      `b = ${pyF(p.b0)} - ${pyF(p.lr)} * grad_b`;
    return {
      snippet,
      variables: [
        { name: 'grad_w', value: jsVal(grad_w) },
        { name: 'w', value: jsVal(w) },
        { name: 'grad_b', value: jsVal(grad_b) },
        { name: 'b', value: jsVal(b) },
      ],
      expected: { kind: 'variable-values' },
      prompt: `Manueller Backward-Step: grad_out=${pyF(p.grad_out)}, local=${pyF(p.local)}, lr=${pyF(p.lr)}. Welche Werte tragen <code>grad_w</code>, <code>w</code>, <code>grad_b</code> und <code>b</code> am Ende?`,
      fullSolution: `grad_w = ${num(p.grad_out)}·${num(p.local)} = ${num(grad_w)}, w = ${num(p.w0)} − ${num(p.lr)}·${num(grad_w)} = ${num(w)}; grad_b = ${num(grad_b)}, b = ${num(b)}.`,
    };
  },
  expected: () => ({ kind: 'variable-values' }),
};

const GAINS_PAIRS_0 = [[72, 78], [100, 110], [10, 20], [80, 80], [25, 50], [90, 99], [5, 6], [150, 180], [1, 2], [60, 66]];
const GAINS_PAIRS_1 = [[250, 262], [50, 60], [200, 220], [40, 50], [25, 20], [12, 15], [8, 10], [70, 77], [2, 4], [33, 33]];

const gains = (p) => p.pairs.map(([base, new_]) => {
  const a = new_ - base;
  return [a, pyRound((new_ - base) / base * 100, 0)];
});

const absoluteGain = {
  draw: (r) => ({ pairs: [pick(r, GAINS_PAIRS_0), pick(r, GAINS_PAIRS_1)] }),
  build(p) {
    const [[a1, r1], [a2, r2]] = gains(p);
    const snippet =
      `def gains(base, new):\n    absolut = new - base\n    relativ = round((new - base) / base * 100)\n    return absolut, relativ\n\n` +
      `a1, r1 = gains(${p.pairs[0][0]}, ${p.pairs[0][1]})\na2, r2 = gains(${p.pairs[1][0]}, ${p.pairs[1][1]})`;
    return {
      snippet,
      variables: [
        { name: 'a1', value: a1 }, { name: 'r1', value: r1 },
        { name: 'a2', value: a2 }, { name: 'r2', value: r2 },
      ],
      expected: { kind: 'variable-values' },
      prompt: `Gewinne (${p.pairs[0][0]} → ${p.pairs[0][1]}) und (${p.pairs[1][0]} → ${p.pairs[1][1]}): absolut vs. relativ. Werte von <code>a1</code>, <code>r1</code>, <code>a2</code> und <code>r2</code>?`,
      fullSolution: `a1 = ${p.pairs[0][1]} − ${p.pairs[0][0]} = ${a1}, r1 = round(${a1} · 100 / ${p.pairs[0][0]}) = ${r1}; a2 = ${a2}, r2 = ${r2}.`,
    };
  },
  expected: () => ({ kind: 'variable-values' }),
};

const CARD_POOL = [
  { name: 'faq-korpus', zweck: 'support', split_train: 0.8, split_dev: 0.1, split_test: 0.1 },
  { name: 'x', split_train: 0.5, split_dev: 0.5 },
  { name: 'k', zweck: 't', herkunft: 'h', lizenz: 'mit', n_beispiele: 3, split_train: 1.0 },
  { name: 'm', herkunft: 'web', lizenz: 'mit', n_beispiele: 9 },
  { name: 'n', zweck: 'z', split_train: 0.7, split_dev: 0.2, split_test: 0.1 },
  { name: 'p', zweck: 'train', herkunft: 'lab', lizenz: 'intern', n_beispiele: 1, split_train: 0.6, split_dev: 0.2, split_test: 0.2 },
  { split_train: 0.2, split_dev: 0.3, split_test: 0.5 },
  { zweck: 'eval', split_train: 0.0, split_dev: 0.0, split_test: 1.0 },
  { a: 1, split_x: 0.4, split_y: 0.6 },
  { name: 'faq', lizenz: 'cc', split_train: 0.9, split_test: 0.1 },
];
const CARD_PFLICHT = [
  ['name', 'zweck', 'herkunft', 'lizenz', 'n_beispiele'],
  ['name', 'zweck', 'lizenz'], ['name'], ['name', 'zweck', 'herkunft'],
  ['a', 'b', 'c'], ['name', 'zweck'],
];

const cardCheck = {
  draw: (r) => ({ card: pick(r, CARD_POOL), pflicht: pick(r, CARD_PFLICHT) }),
  build(p) {
    const cardPairs = Object.entries(p.card).map(([k, v]) => [k, typeof v === 'string' ? pyStr(v) : (k.startsWith('split_') ? pyF(v) : pyLit(v))]);
    const n_fehlt = p.pflicht.filter((f) => !Object.hasOwn(p.card, f)).length;
    const summe = pyRound(Object.keys(p.card).filter((k) => k.startsWith('split_')).map((k) => p.card[k]).reduce((a, b) => a + b, 0), 3);
    const promille = Math.trunc(pyRound(summe * 1000, 0));
    const felder = Object.keys(p.card).length + n_fehlt;
    const snippet =
      `card = ${pyDict(cardPairs)}\n` +
      `pflicht = ${pyList(p.pflicht.map(pyStr))}\n` +
      `n_fehlt = len([f for f in pflicht if f not in card])\n` +
      `summe = round(sum(v for k, v in card.items() if k.startswith("split_")), 3)\n` +
      `promille = int(round(summe * 1000))\n` +
      `felder = len(card) + n_fehlt`;
    return {
      snippet,
      variables: [
        { name: 'n_fehlt', value: n_fehlt },
        { name: 'promille', value: promille },
        { name: 'felder', value: felder },
      ],
      expected: { kind: 'variable-values' },
      prompt: `Datensatzkarte mit ${Object.keys(p.card).length} Feldern und ${p.pflicht.length} Pflichtfeldern. Werte von <code>n_fehlt</code>, <code>promille</code> und <code>felder</code>?`,
      fullSolution: `${n_fehlt} Pflichtfeld(er) fehlen; Split-Summe ${pyNum(summe)} → promille = ${promille}; ${Object.keys(p.card).length} Felder + ${n_fehlt} → felder = ${felder}.`,
    };
  },
  expected: () => ({ kind: 'variable-values' }),
};

const STAGE_OK = [7, 3, 1, 9, 4, 5, 2, 0, 11];
const STAGE_LANGSAM = [1, 2, 4, 6, 8, 0, 7];
const STAGE_MSG = ['daten weg', 'x'];
const STAGE_NAMES = ['laden', 'rechnen', 'speichern'];
const STAGE_FNS = ['ok_fn', 'kaputt_fn', 'langsam_fn'];
const STAGE_BUDGETS = [10, 50];
const STAGE_TICKS = [0, 1, 7, 9, 10, 40, 51, 80, 100, 200];

const stageRunner = {
  draw: (r) => {
    const stages = STAGE_NAMES.map((name) => [name, pick(r, STAGE_FNS), pick(r, STAGE_BUDGETS)]);
    // Clock entries are consumed per stage: one tick for `start`, plus a second
    // tick for `dauer` unless the stage raised immediately.
    const clock = [];
    for (const [, fn] of stages) {
      const start = pick(r, STAGE_TICKS);
      clock.push(start);
      if (fn !== 'kaputt_fn') {
        let end = pick(r, STAGE_TICKS);
        if (end < start) [end] = [start];
        clock.push(Math.max(start, end));
      }
    }
    return {
      ok: pick(r, STAGE_OK), langsam: pick(r, STAGE_LANGSAM), msg: pick(r, STAGE_MSG),
      stages, clock,
    };
  },
  build(p) {
    let i = 0;
    const results = p.stages.map(([name, fn, budget]) => {
      const start = p.clock[i++];
      if (fn === 'kaputt_fn') return 'fehler';
      const dauer = p.clock[i++] - start;
      return dauer > budget ? 'timeout' : 'ok';
    });
    const wert = (fn) => (fn === 'ok_fn' ? p.ok : fn === 'langsam_fn' ? p.langsam : 0);
    const summe = results.reduce((acc, status, j) => acc + (status === 'ok' ? wert(p.stages[j][1]) : 0), 0);
    const status_zeile = results.join(' ');
    const snippet =
      `def stage(name, fn, budget, uhr):\n    start = uhr()\n    try:\n        wert = fn()\n    except ValueError:\n        return {"status": "fehler", "grund": name}\n    dauer = uhr() - start\n    if dauer > budget:\n        return {"status": "timeout", "grund": name}\n    return {"status": "ok", "wert": wert}\n\n` +
      `def ok_fn():\n    return ${p.ok}\n\ndef kaputt_fn():\n    raise ValueError("${p.msg}")\n\ndef langsam_fn():\n    return ${p.langsam}\n\n` +
      `uhr = iter(${pyList(p.clock)})\n` +
      p.stages.map(([name, fn, budget], j) => `${'abc'[j]} = stage("${name}", ${fn}, ${budget}, uhr.__next__)`).join('\n') +
      `\nstatus_zeile = a["status"] + " " + b["status"] + " " + c["status"]\nsumme = a.get("wert", 0) + b.get("wert", 0) + c.get("wert", 0)`;
    return {
      snippet,
      variables: [
        { name: 'status_zeile', value: status_zeile },
        { name: 'summe', value: summe },
      ],
      expected: { kind: 'variable-values' },
      prompt: `Stage-Runner: ${p.stages.map(([, f]) => f).join(', ')} mit Uhr ${pyList(p.clock)}. Werte von <code>status_zeile</code> und <code>summe</code>?`,
      fullSolution: `Status: ${status_zeile}; nur ok-Stufen zählen → summe = ${summe}.`,
    };
  },
  expected: () => ({ kind: 'variable-values' }),
};

const OVERCLAIM_PHRASEN = [
  ['produktionsreif', 'sicher gegen', 'halluziniert nie'],
  ['bereit', 'perfekt'], ['produktionsreif'], ['sicher gegen', 'nie'],
  ['gold', 'perfekt'], ['demo', 'stub'], ['sota', 'unfehlbar'],
  ['halluziniert nie'], ['produktionsreif', 'bereit'],
];
const OVERCLAIM_TEXTS = [
  'Unser Prototyp ist produktionsreif und halluziniert nie bei Versandanfragen.',
  'Das System ist bereit und perfekt.', 'noch experimentell',
  'sicher gegen injection, halluziniert nie', 'kein gold standard',
  'nichts davon', 'Der Demo-Stub reicht.', 'Halluziniert nie bei FAQ.',
];
const OVERCLAIM_PROBES = [
  'Der Stub kopiert nur Saetze.', 'Nur ein Stub.', 'produktionsreif morgen',
  'ok', 'perfekt nicht', 'auch nicht', 'Produktion', 'sota', 'manchmal', '',
];

const overclaim = {
  draw: (r) => ({
    phrasen: pick(r, OVERCLAIM_PHRASEN), text: pick(r, OVERCLAIM_TEXTS), probe: pick(r, OVERCLAIM_PROBES),
  }),
  build(p) {
    const scan = (text) => p.phrasen.filter((ph) => text.toLowerCase().includes(ph)).sort();
    const found = scan(p.text);
    const count = scan(p.probe).length;
    const output = `${pyList(found.map(pyStr))}\n${count}`;
    const snippet =
      `PHRASEN = ${pyList(p.phrasen.map(pyStr))}\n\n` +
      `def scan(text, phrasen):\n    t = text.lower()\n    return sorted(p for p in phrasen if p in t)\n\n` +
      `text = ${pyStr(p.text)}\nprint(scan(text, PHRASEN))\nprint(len(scan(${pyStr(p.probe)}, PHRASEN)))`;
    return {
      snippet,
      expected: { kind: 'output-lines', output },
      prompt: `Overclaim-Scanner mit den Phrasen ${pyList(p.phrasen.map(pyStr))}. Sage die Trefferliste und die Anzahl der zweiten <code>print</code>-Zeile vorher.`,
      fullSolution: `Treffer im Text: ${pyList(found.map(pyStr))}; die Probe trifft ${count} Phrase(n).`,
    };
  },
  expected: (p) => ({ kind: 'output-lines', output: overclaim.build(p).expected.output }),
};

const FREEZE_PREFIXES = ['backbone', 'encoder', 'stem'];
const FREEZE_NAMES = [
  ['backbone.w1', 'backbone.w2', 'head.w3'], ['head.a', 'head.b', 'head.c'],
  ['backbone.a', 'backbone.b'], ['encoder.w', 'head.w', 'encoder.b'],
  ['z.head', 'backbone.z', 'y.head'], ['backbone.w3', 'head.w1', 'head.w2', 'head.w3'],
  ['stem.0', 'stem.1', 'cls.w'], ['backbone.a', 'backbone.b', 'backbone.c', 'top.x'],
  ['head.only'], ['backbone.w1', 'neck.w', 'head.w3'],
];

const freezeParam = {
  draw: (r) => {
    const prefix = pick(r, FREEZE_PREFIXES);
    const names = pick(r, FREEZE_NAMES);
    const frozen = names.filter((n) => n.startsWith(prefix)).sort();
    // The unguarded print tail crashes on empty frozen lists — pick `safe` then.
    const tail = frozen.length ? pick(r, ['plain', 'safe']) : 'safe';
    return { prefix, names, tail };
  },
  build(p) {
    const frozen = p.names.filter((n) => n.startsWith(p.prefix)).sort();
    const trainable = p.names.length - frozen.length;
    const second = frozen.length ? frozen[0] : '-';
    const tailLine = p.tail === 'safe'
      ? `print(sorted(n for n, t in params.items() if not t)[0] if any(not t for t in params.values()) else "-")`
      : `print(sorted(n for n, t in params.items() if not t)[0])`;
    const output = `${trainable}\n${second}`;
    const snippet =
      `def freeze(names):\n    return {n: (False if n.startswith("${p.prefix}") else True) for n in names}\n\n` +
      `params = freeze(${pyList(p.names.map(pyStr))})\nprint(sum(1 for trainable in params.values() if trainable))\n${tailLine}`;
    return {
      snippet,
      expected: { kind: 'output-lines', output },
      prompt: `Parameter einfrieren über das Präfix "${p.prefix}" — Liste ${pyList(p.names.map(pyStr))}. Sage beide <code>print</code>-Zeilen vorher.`,
      fullSolution: `${trainable} Parameter bleiben trainierbar; eingefroren ist ${frozen.length ? `als Erstes (alphabetisch) ${frozen[0]}` : 'keiner → "-"'} . Ausgabe: <code>${output}</code>.`,
    };
  },
  expected: (p) => ({ kind: 'output-lines', output: freezeParam.build(p).expected.output }),
};

const HYP_BANK = [
  'Je größer die Chunkgröße, desto höher der Anteil korrekter Antworten',
  'Je kleiner die Überlappung, desto geringer die recall@5-Quote',
  'Je groesser der Batch, desto kleiner der Verlust',
  'Je groesser der Kontext, desto teurer der Call',
  'Je groesser der Seed-Spread, desto unsicherer die Zahl',
  'Je groesser dropout, desto robuster das Modell',
  'Je hoeher alpha, desto staerker LoRA',
  'Je kleiner k, desto hoeher precision',
  'Je laenger der Prompt, desto hoeher die Kosten',
  'Je mehr Daten, desto besser der Recall',
  'Je tiefer das Netz, desto groesser der Datensatzbedarf',
  'Je groesser n, desto kleiner der Fehler',
  'Je hoeher die Temperatur, desto groesser die Entropie',
  'Je kleiner die Luecke, desto fairer das System',
  'Je kleiner lr, desto langsamer das Training',
  'Je kleiner r, desto weniger Parameter',
  'Je knapper das Budget, desto frueher der Abbruch',
  'Je kuerzer die Antwort, desto geringer die Latenz',
  'Je schmaler der Hidden, desto kleiner die Parameterzahl',
  'Je weniger Rauschen, desto hoeher die Praezision',
];

const metricName = {
  draw: (r) => {
    const h1 = pick(r, HYP_BANK);
    let h2 = pick(r, HYP_BANK);
    if (h2 === h1) h2 = HYP_BANK[(HYP_BANK.indexOf(h1) + 1) % HYP_BANK.length];
    return { h1, h2 };
  },
  build(p) {
    const extract = (h) => {
      const kern = h.trim().replace(/\.+$/, '');
      const [vord, hin] = kern.split(', desto ');
      return {
        uv: vord.trim().split(/\s+/).slice(2).join(' ').toLowerCase(),
        dv: hin.trim().split(/\s+/).slice(1).join(' ').toLowerCase(),
      };
    };
    const e = extract(p.h1);
    const z = extract(p.h2);
    const output = `${e.uv}\n${e.dv}\n${z.uv}\n${z.dv}`;
    const snippet =
      `def extract_variables(hypothese):\n    kern = hypothese.strip().rstrip(".")\n    vorderer, hinterer = kern.split(", desto ")\n    uv = " ".join(vorderer.split()[2:]).lower()\n    dv = " ".join(hinterer.split()[1:]).lower()\n    return {"uv": uv, "dv": dv}\n\n` +
      `e = extract_variables("${p.h1}")\nprint(e["uv"])\nprint(e["dv"])\n` +
      `z = extract_variables("${p.h2}")\nprint(z["uv"])\nprint(z["dv"])`;
    return {
      snippet,
      expected: { kind: 'output-lines', output },
      prompt: `extract_variables auf zwei Hypothesen anwenden (${p.h1.slice(0, 24)}… / ${p.h2.slice(0, 24)}…). Sage die vier <code>print</code>-Zeilen vorher.`,
      fullSolution: `e: uv "${e.uv}", dv "${e.dv}"; z: uv "${z.uv}", dv "${z.dv}".`,
    };
  },
  expected: (p) => ({ kind: 'output-lines', output: metricName.build(p).expected.output }),
};

const RPN_TRIPLES = [
  [4, 2, 2], [5, 3, 1], [3, 1, 2], [1, 1, 1], [2, 2, 2], [3, 3, 1],
  [5, 1, 1], [1, 5, 1], [1, 1, 5], [2, 2, 1], [2, 1, 2], [4, 1, 1],
  [9, 1, 1], [1, 2, 2], [3, 3, 3], [4, 4, 1], [8, 1, 1], [2, 3, 4],
  [7, 1, 1], [6, 1, 2], [2, 3, 3],
];

const rpnPriority = {
  draw: (r) => ({ triples: [pick(r, RPN_TRIPLES), pick(r, RPN_TRIPLES), pick(r, RPN_TRIPLES)] }),
  build(p) {
    const vals = p.triples.map(([a, b, c]) => a * b * c);
    const hoechste = Math.max(...vals);
    const snippet =
      `def rpn(risiko, praevalenz, kontrolle):\n    return risiko * praevalenz * kontrolle\n\n` +
      `r1 = rpn(${p.triples[0].join(', ')})\nr2 = rpn(${p.triples[1].join(', ')})\nr3 = rpn(${p.triples[2].join(', ')})\n` +
      `hoechste = max(r1, r2, r3)`;
    return {
      snippet,
      variables: [
        { name: 'r1', value: vals[0] }, { name: 'r2', value: vals[1] },
        { name: 'r3', value: vals[2] }, { name: 'hoechste', value: hoechste },
      ],
      expected: { kind: 'variable-values' },
      prompt: `RPN ${p.triples.map((t) => `(${t.join(',')})`).join(', ')}. Werte von <code>r1</code>, <code>r2</code>, <code>r3</code> und <code>hoechste</code>?`,
      fullSolution: `r1 = ${p.triples[0].join(' · ')} = ${vals[0]}, r2 = ${p.triples[1].join(' · ')} = ${vals[1]}, r3 = ${vals[2]}, hoechste = ${hoechste}.`,
    };
  },
  expected: () => ({ kind: 'variable-values' }),
};

const COLUMN_VECTORS = [
  [2, 1], [1, 0], [2, 2], [0, 1], [3, 1], [-1, 2], [4, 0], [1, 1],
  [0, 2], [1, 3], [0, 5], [2, -1], [-1, 1], [3, 0], [1, 2], [3, 4],
  [5, 7], [2, 0], [2, 3], [4, 1],
];

const columnPicture = {
  draw: (r) => ({ s1: pick(r, COLUMN_VECTORS), s2: pick(r, COLUMN_VECTORS), x: pick(r, COLUMN_VECTORS) }),
  build(p) {
    // Column picture: b = x[0]*spalte1 + x[1]*spalte2 componentwise.
    const b0 = p.x[0] * p.s1[0] + p.x[1] * p.s2[0];
    const b1 = p.x[0] * p.s1[1] + p.x[1] * p.s2[1];
    const t = (v) => `(${v[0]}, ${v[1]})`;
    const snippet =
      `spalte1 = ${t(p.s1)}\nspalte2 = ${t(p.s2)}\nx = ${t(p.x)}\n` +
      `b0 = x[0]*spalte1[0] + x[1]*spalte2[0]\nb1 = x[0]*spalte1[1] + x[1]*spalte2[1]`;
    return {
      snippet,
      variables: [
        { name: 'b0', value: b0 }, { name: 'b1', value: b1 },
      ],
      expected: { kind: 'variable-values' },
      prompt: `Spaltenbild: x = ${t(p.x)} über den Spalten ${t(p.s1)} und ${t(p.s2)}. Werte von <code>b0</code> und <code>b1</code>?`,
      fullSolution: `b0 = ${p.x[0]}·${p.s1[0]} + ${p.x[1]}·${p.s2[0]} = ${b0}; b1 = ${p.x[0]}·${p.s1[1]} + ${p.x[1]}·${p.s2[1]} = ${b1}.`,
    };
  },
  expected: () => ({ kind: 'variable-values' }),
};

const VOCABS = [
  { '<pad>': 0, '</w>': 1, a: 2, b: 3, c: 4 },
  { '<pad>': 0, '</w>': 1, x: 2, y: 3 },
  { '<pad>': 9, '</w>': 8, a: 1, b: 2, c: 3 },
  { '<pad>': 0, '</w>': 1, m: 2, n: 3 },
];

const charEncode = {
  draw: (r) => {
    const vocab = pick(r, VOCABS);
    const letters = Object.keys(vocab).filter((k) => !k.startsWith('<'));
    const len = pick(r, [1, 2, 3]);
    const word = Array.from({ length: len }, () => pick(r, letters)).join('');
    return { vocab, word };
  },
  build(p) {
    const ids = [p.vocab['<pad>'], ...[...p.word].map((ch) => p.vocab[ch]), p.vocab['</w>']];
    const unique = new Set(ids).size === ids.length;
    const output = `${pyList(ids)}\n${unique ? 'True' : 'False'}`;
    const vocabPairs = Object.entries(p.vocab).map(([k, v]) => [k, String(v)]);
    const snippet =
      `vocab = ${pyDict(vocabPairs)}\n\n` +
      `def encode(s):\n    return [vocab["<pad>"]] + [vocab[ch] for ch in s] + [vocab["</w>"]]\n\n` +
      `ids = encode("${p.word}")\nprint(ids)\nprint(len(set(ids)) == len(ids))`;
    return {
      snippet,
      expected: { kind: 'output-lines', output },
      prompt: `Char-Encode "${p.word}" mit pad/eos. Sage IDs und Unique-Check vorher.`,
      fullSolution: `IDs: ${pyList(ids)}; ${unique ? 'alle eindeutig → True' : 'doppelte ID → False'}.`,
    };
  },
  expected: (p) => ({ kind: 'output-lines', output: charEncode.build(p).expected.output }),
};

const softmaxRow = (xs) => {
  const m = Math.max(...xs);
  const exps = xs.map((x) => Math.exp(x - m));
  const s = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => pyRound(e / s, 3));
};

const SOFTMAX_R1 = [[2, 0], [0, 0], [3, 0], [1, -1], [0, 5], [4, 4], [10, 0], [1, 2], [-2, 0], [0, 1]];
const SOFTMAX_R2 = [[0, 1, 1], [1, 1, 1], [0, 0, 2], [2, 2, 0], [0, 1, 2], [-1, -1, -1], [0, 0, 0], [3, 1, 1], [5, 5, 1], [2, 0, 0]];

const stableSoftmax = {
  draw: (r) => ({ r1: pick(r, SOFTMAX_R1), r2: pick(r, SOFTMAX_R2) }),
  build(p) {
    const row1 = softmaxRow(p.r1);
    const row2 = softmaxRow(p.r2);
    const output = `${pyList(row1.map(pyNum))}\n${pyList(row2.map(pyNum))}`;
    const snippet =
      `import math\n\n` +
      `def row_softmax(xs):\n    m = max(xs)\n    exps = [math.exp(x - m) for x in xs]\n    s = sum(exps)\n    return [round(e / s, 3) for e in exps]\n\n` +
      `print(row_softmax(${pyList(p.r1)}))\nprint(row_softmax(${pyList(p.r2)}))`;
    return {
      snippet,
      expected: { kind: 'output-lines', output },
      prompt: `Softmax ${pyList(p.r1)} und ${pyList(p.r2)}. Sage beide <code>print</code>-Zeilen vorher.`,
      fullSolution: `Zeile 1: ${pyList(row1.map(pyNum))}; Zeile 2: ${pyList(row2.map(pyNum))}.`,
    };
  },
  expected: (p) => ({ kind: 'output-lines', output: stableSoftmax.build(p).expected.output }),
};

const fixedDropout = {
  draw: (r) => {
    const n = pick(r, [4, 5, 6, 7, 8]);
    const mask = [];
    for (let i = 0; i < n; i++) mask.push(r() < 0.5 ? 1 : 0);
    if (!mask.includes(1)) mask[Math.floor(r() * n)] = 1;
    return { mask };
  },
  build(p) {
    const kept = p.mask.map((m, i) => (m ? i + 1 : 0)).filter(Boolean);
    const sum = kept.reduce((a, b) => a + b, 0);
    const count = kept.length;
    const output = `${sum}\n${count}`;
    const bools = p.mask.map((m) => (m ? 'True' : 'False'));
    const snippet =
      `import numpy as np\n` +
      `mask = np.array(${pyList(bools)})\nx = np.arange(1, ${p.mask.length + 1})\nkept = x[mask]\n` +
      `print(kept.sum())\nprint(int(mask.sum()))`;
    return {
      snippet,
      expected: { kind: 'output-lines', output },
      prompt: `Dropout-Maske der Länge ${p.mask.length} mit ${count} True. Sage Summe und Anzahl der behaltenen Werte vorher.`,
      fullSolution: `True an Positionen ${p.mask.map((m, i) => (m ? i : -1)).filter((i) => i >= 0).join(', ')} → Werte ${kept.join(', ')}, Summe ${sum}, Anzahl ${count}.`,
    };
  },
  expected: (p) => ({ kind: 'output-lines', output: fixedDropout.build(p).expected.output }),
};

/** Registry: caseId -> { draw, build, expected }. `expected` recomputes the
 *  grading payload from parameters for the solver; `build` additionally emits
 *  snippet/variables/prompt for generate(). */
export const TRACE_GENERATORS = {
  'gradient-loop-two-updates': gradientLoop,
  'tree-majority-vote-trace': treeMajority,
  'manual-backward-step-trace': manualBackward,
  'fixed-dropout-mask-trace': fixedDropout,
  'stable-softmax-rows-trace': stableSoftmax,
  'char-encode-roundtrip-trace': charEncode,
  'freeze-param-filter-trace': freezeParam,
  'absolute-vs-relative-gain-trace': absoluteGain,
  'card-check-variable-trace': cardCheck,
  'rpn-priority-trace': rpnPriority,
  'metric-name-normalize-trace': metricName,
  'stage-runner-error-states': stageRunner,
  'overclaim-scanner-trace': overclaim,
  'column-picture-trace': columnPicture,
};

export const drawTraceParams = (caseId, seed) => {
  if (!Number.isSafeInteger(seed)) throw new Error(`Ungültiger Seed ${seed}`);
  const spec = TRACE_GENERATORS[caseId];
  if (!spec) throw new Error(`Kein Generator für ${caseId}`);
  return spec.draw(rng(seed));
};
