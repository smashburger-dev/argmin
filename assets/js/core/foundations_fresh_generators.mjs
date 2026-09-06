// Session-B fresh-variation generators for the foundations competencies
// (W1-W4, ADR-0015). Same contract as w01_generators.mjs: every generator
// returns { parameters, expected, prompt, fullSolution, choices? } where
// `expected` comes from an independent reference solver, never hardcoded,
// and `prompt` is complete German exercise text (plain text + unicode).
//
// Two families (ADR-0015):
//  - procedural generators (A): value/state variation with unbounded
//    instance space and an exact solver (predict-output, code-trace,
//    numeric);
//  - semantic variant banks (B): a finite set of professionally distinct
//    cases (git states, exception boundaries, debugging error classes).
//    The seed selects the case deterministically; choice positions rotate
//    with the case so no fixed answer position can be learned.
//
// Non-numeric answer shapes follow the extended contract: `choices` is
// validated fail-closed by the family runtime; code-trace
// variables may carry `type: 'repr'` (canonical Python literals).

import { rng, randInt, nonzeroInt } from './w01_generators.mjs';


/** Python repr for the values our generators produce. Sets are rendered
 *  in sorted order — the grader compares set literals order-insensitively
 *  because Python's set iteration order is not observable knowledge. */
const pyRepr = (v) => {
  if (typeof v === 'string') return `'${v}'`;
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(', ')}]`;
  if (v instanceof Set) return `{${[...v].map(pyRepr).sort().join(', ')}}`;
  if (v instanceof Map) return `{${[...v.entries()].map(([k, val]) => `${pyRepr(k)}: ${pyRepr(val)}`).join(', ')}}`;
  return String(v);
};

// --- c-python-basics / c-python-reading: program state traces ---------------

/** Reference solver family for linear state programs: applies the same
 *  arithmetic the snippet shows, driven only by parameters. */
const solveStateProgram = (shape, p) => {
  if (shape === 'reassign') {
    const b = p.a0 + p.k1;
    const a = b - p.k2;
    return { a, b };
  }
  if (shape === 'chain3') {
    const y = p.x0 * p.k1;
    const z = y - p.x0;
    const x = z + p.k2;
    return { x, y, z };
  }
  const n1 = p.n0 + p.k1;
  const m = n1 * p.f1;
  const n = m - p.g1;
  return { n, m };
};

/** predict-output: variable state over 3-4 assignments with reassignment
 *  (the core c-python-basics misconception: right side reads old state).
 *  Invariants: all shown and printed values in [-99, 99]; the printed pair
 *  never equals the initial literals; two of three shapes per seed sweep. */
export function genPythonStateTrace(seed) {
  const r = rng(seed);
  const shape = ['reassign', 'chain3', 'accumulate'][randInt(r, 0, 2)];
  let parameters, snippet, names;
  if (shape === 'reassign') {
    const a0 = nonzeroInt(r, -19, 19);
    const k1 = nonzeroInt(r, -12, 12);
    let k2 = nonzeroInt(r, -12, 12);
    if (k2 === k1) k2 = k1 > 0 ? k1 - 1 : k1 + 1;
    parameters = { shape, a0, k1, k2 };
    snippet = `a = ${a0}\nb = a + (${k1})\na = b - (${k2})\nprint(a, b)`;
    names = ['a', 'b'];
  } else if (shape === 'chain3') {
    const x0 = nonzeroInt(r, -9, 9);
    const k1 = randInt(r, -6, 6) === 0 ? 2 : nonzeroInt(r, -6, 6);
    const k2 = nonzeroInt(r, -15, 15);
    parameters = { shape, x0, k1, k2 };
    snippet = `x = ${x0}\ny = x * (${k1})\nz = y - x\nx = z + (${k2})\nprint(x, y, z)`;
    names = ['x', 'y', 'z'];
  } else {
    const n0 = nonzeroInt(r, -12, 12);
    const k1 = nonzeroInt(r, -8, 8);
    const f1 = randInt(r, 2, 4);
    const g1 = nonzeroInt(r, -15, 15);
    parameters = { shape, n0, k1, f1, g1 };
    snippet = `n = ${n0}\nn = n + (${k1})\nm = n * ${f1}\nn = m - (${g1})\nprint(n, m)`;
    names = ['n', 'm'];
  }
  const solved = solveStateProgram(shape, parameters);
  const expected = names.map((name) => solved[name]).join(' ');
  return {
    parameters: { ...parameters, snippet },
    expected: { output: expected },
    prompt: `Was gibt dieses Programm aus? Erst alle Zuweisungen Zeile für Zeile nachvollziehen — insbesondere, wann eine Variable überschrieben wird —, dann die Ausgabezeile angeben (Zahlen durch Leerzeichen getrennt).`,
    fullSolution: `Zeile für Zeile: ${snippet.split('\n').join(' · ')}. Die print-Zeile gibt ${names.join(' ')} in dieser Reihenfolge aus: ${expected}. Entscheidend: Zuweisungen rechts lesen den aktuellen Zustand, bevor die linke Seite überschrieben wird.`,
  };
}

// --- c-python-reading: expression reading -------------------------------------

/** predict-output: reading slices, splits/joins and simple comprehensions.
 *  Invariants: slice bounds valid and non-trivial (result is a proper
 *  substring, never the whole word); comprehension output differs from the
 *  input list; all outputs are deterministic Python reprs. */
export function genCodeReadingOutput(seed) {
  const r = rng(seed);
  const shape = ['slice', 'join', 'comprehension', 'transform'][randInt(r, 0, 3)];
  if (shape === 'slice') {
    const word = ['lernplattform', 'wiederholung', 'aufgabenbank', 'kompetenzen', 'grundlagen', 'datenfluss', 'struktur', 'abrufuebung'][randInt(r, 0, 7)];
    const a = randInt(r, 1, Math.max(1, word.length - 5));
    const b = randInt(r, a + 2, word.length);
    const out = word.slice(a, b);
    return {
      parameters: { shape, word, a, b, snippet: `s = "${word}"\nprint(s[${a}:${b}])` },
      expected: { output: out },
      prompt: `Was gibt dieses Programm aus? Slices sind start-inklusiv und stop-exklusiv.`,
      fullSolution: `s[${a}:${b}] schneidet ab Position ${a} (inklusive) bis Position ${b} (exklusive) aus. Ergebnis: ${out}.`,
    };
  }
  if (shape === 'join') {
    const parts = [['ki', 'lern', 'plattform'], ['daten', 'analyse', 'kurs'], ['abruf', 'statt', 'wiederlesen'], ['code', 'lesen', 'und', 'schreiben']][randInt(r, 0, 3)];
    // at least two parts must survive the slice: a single-element join would
    // just echo a substring of the prompt verbatim
    const i = randInt(r, 0, parts.length - 2);
    const j = randInt(r, Math.min(i + 2, parts.length), parts.length);
    const out = parts.slice(i, j).join('-');
    return {
      parameters: { shape, parts, i, j, snippet: `teile = "${parts.join(',')}".split(",")\nprint("-".join(teile[${i}:${j}]))` },
      expected: { output: out },
      prompt: `Was gibt dieses Programm aus? split und join wirken zusammen; die Ausgabe ist der fertige String.`,
      fullSolution: `split(",") erzeugt die Liste ${pyRepr(parts)}. teile[${i}:${j}] ist ${pyRepr(parts.slice(i, j))}, und "-".join verbindet diese Teile zu ${out}.`,
    };
  }
  if (shape === 'comprehension') {
    const nums = Array.from({ length: 5 }, () => randInt(r, -9, 9));
    const threshold = randInt(r, -3, 3);
    const factor = randInt(r, 2, 4);
    const out = nums.filter((n) => n > threshold).map((n) => n * factor);
    if (!out.length) return genCodeReadingOutput((seed + 1) >>> 0);
    return {
      parameters: { shape, nums, threshold, factor, snippet: `zahlen = ${pyRepr(nums)}\nprint([z * ${factor} for z in zahlen if z > ${threshold}])` },
      expected: { output: pyRepr(out) },
      prompt: `Was gibt dieses Programm aus? Listen in Python-Schreibweise angeben, z. B. [1, 2].`,
      fullSolution: `Die Bedingung behält ${pyRepr(nums.filter((n) => n > threshold))}; danach multipliziert jedes erhaltene z mit ${factor}. Ergebnis: ${pyRepr(out)}.`,
    };
  }
  const word = ['  lernplan  ', ' abrufuebung ', '  datenbank '][randInt(r, 0, 2)];
  const mode = randInt(r, 0, 1);
  const out = mode === 0 ? word.trim().toUpperCase() : word.trim().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  return {
    parameters: { shape, word, mode, snippet: `t = "${word}"\nprint(t.strip()${mode === 0 ? '.upper()' : '.title()'})` },
    expected: { output: out },
    prompt: `Was gibt dieses Programm aus? String-Methoden wandeln schrittweise um.`,
    fullSolution: `strip() entfernt die Rand-Leerzeichen, ${mode === 0 ? 'upper() schreibt alle Buchstaben groß' : 'title() schreibt jeden Wortanfang groß'}. Ergebnis: ${out}.`,
  };
}

// --- c-python-functions: composition of pure functions -----------------------

/** predict-output: two linear one-argument functions; the task asks for
 *  f(g(v)) AND g(f(v)) in that order. Invariants: functions do not commute
 *  (f(g(v)) !== g(f(v)) enforced), all values integers in [-99, 99]. */
export function genFunctionCompose(seed) {
  const r = rng(seed);
  const fa = randInt(r, 2, 3);
  const fb = nonzeroInt(r, -5, 5);
  const ga = randInt(r, -2, 2) === 0 ? -1 : (randInt(r, -2, 2) || 1);
  const gb = nonzeroInt(r, -6, 6);
  const v = nonzeroInt(r, -5, 5);
  const f = (x) => fa * x + fb;
  const g = (x) => ga * x + gb;
  if (f(g(v)) === g(f(v))) return genFunctionCompose((seed + 1) >>> 0);
  const parameters = { fa, fb, ga, gb, v };
  const expected = { output: `${f(g(v))} ${g(f(v))}` };
  return {
    parameters: { ...parameters, snippet: `def f(x):\n    return ${fa} * x + (${fb})\n\ndef g(x):\n    return ${ga} * x + (${gb})\n\nprint(f(g(${v})), g(f(${v})))` },
    expected,
    prompt: `Was gibt dieses Programm aus? Beide Aufrufe genau in der gedruckten Reihenfolge berechnen — die Reihenfolge der Anwendung ist Teil der Aufgabe. Zwei Zahlen in einer Zeile, durch Leerzeichen getrennt.`,
    fullSolution: `g(${v}) = ${ga} · ${v} + ${gb} = ${g(v)}; f(${g(v)}) = ${fa} · ${g(v)} + ${fb} = ${f(g(v))}. Andersherum: f(${v}) = ${f(v)}; g(${f(v)}) = ${ga} · ${f(v)} + ${gb} = ${g(f(v))}. Ausgabe: ${f(g(v))} ${g(f(v))}. Die beiden Bahnen unterscheiden sich, weil die Funktionen nicht vertauschbar sind.`,
  };
}

// --- c-python-control-flow: branch and loop traces ----------------------------

/** predict-output: if/elif chains, while countdowns and for-with-filter.
 *  Invariants: branch value depends on the comparison (no dead branches),
 *  loop terminates after 2-5 iterations, all values in [-99, 99]. */
export function genControlFlowOutput(seed) {
  const r = rng(seed);
  const shape = ['elif', 'while', 'forfilter'][randInt(r, 0, 2)];
  if (shape === 'elif') {
    const x = nonzeroInt(r, -12, 12);
    const t1 = randInt(r, -8, 8);
    const t2 = t1 - randInt(r, 2, 6);
    const k = randInt(r, 2, 5);
    let branch, value;
    if (x > t1) { branch = 'A'; value = x * k; }
    else if (x < t2) { branch = 'B'; value = x + k; }
    else { branch = 'C'; value = x - k; }
    return {
      parameters: { shape, x, t1, t2, k, branch, snippet: `x = ${x}\nif x > ${t1}:\n    print("A", x * ${k})\nelif x < ${t2}:\n    print("B", x + ${k})\nelse:\n    print("C", x - ${k})` },
      expected: { output: `${branch} ${value}` },
      prompt: `Was gibt dieses Programm aus? Erst den aktiven Zweig bestimmen (genau einer läuft), dann den Wert — beides zusammen in einer Zeile.`,
      fullSolution: `x = ${x}. Erste Bedingung x > ${t1} ist ${x > t1 ? 'wahr' : 'falsch'}; falls sie falsch ist: zweite Bedingung x < ${t2} ist ${x <= t1 && x < t2 ? 'wahr' : 'falsch'}. Aktiver Zweig: ${branch} mit Wert ${value}. Ausgabe: ${branch} ${value}.`,
    };
  }
  if (shape === 'while') {
    const step = randInt(r, 2, 4);
    const stop = randInt(r, 1, 4);
    const iterations = randInt(r, 2, 5);
    const n0 = stop + (iterations - 1) * step + randInt(r, 1, step);
    let n = n0;
    let total = 0;
    const steps = [];
    while (n > stop) {
      total += n;
      steps.push(`n=${n}, summe=${total}`);
      n -= step;
    }
    return {
      parameters: { shape, n0, step, stop, iterations: steps.length, snippet: `n = ${n0}\nsumme = 0\nwhile n > ${stop}:\n    summe = summe + n\n    n = n - ${step}\nprint(summe, n)` },
      expected: { output: `${total} ${n}` },
      prompt: `Was gibt dieses Programm aus? Die Schleife vollständig durchlaufen (auch den Abbruch) — zwei Zahlen in einer Zeile.`,
      fullSolution: `Durchläufe: ${steps.join(' · ')}. Die Schleife endet bei n = ${n} (n > ${stop} ist dann falsch). Ausgabe: ${total} ${n}.`,
    };
  }
  const nums = Array.from({ length: 6 }, () => randInt(r, -9, 9));
  const factor = randInt(r, 2, 3);
  const out = nums.filter((n) => n % 2 === 0).map((n) => n * factor);
  if (!out.length) return genControlFlowOutput((seed + 1) >>> 0);
  return {
    parameters: { shape, nums, factor, snippet: `werte = ${pyRepr(nums)}\nergebnis = []\nfor w in werte:\n    if w % 2 == 0:\n        ergebnis.append(w * ${factor})\nprint(ergebnis)` },
    expected: { output: pyRepr(out) },
    prompt: `Was gibt dieses Programm aus? Listen in Python-Schreibweise angeben, z. B. [1, 2].`,
    fullSolution: `Gerade Werte aus ${pyRepr(nums)}: ${pyRepr(nums.filter((n) => n % 2 === 0))}. Jeder wird mit ${factor} multipliziert: ${pyRepr(out)}.`,
  };
}

// --- c-python-collections: state machine for list/dict/set steps -------------

const renderState = (shape, value) => {
  if (shape === 'set') return pyRepr(new Set(value));
  if (shape === 'dict') return pyRepr(new Map(value));
  return pyRepr(value);
};

/** code-trace with repr-typed variables (ADR-0015 step-trace): the learner
 *  tracks a collection across several statements including mutation vs.
 *  rebinding and aliasing vs. copy. The solver is a small state machine
 *  that only consumes `parameters` — never the precomputed answer.
 *  Variables are the collection state after each numbered step. */
export function genCollectionStepTrace(seed) {
  const r = rng(seed);
  const family = ['list-mutate', 'list-alias', 'list-copy', 'dict-steps', 'set-steps', 'list-rebind'][randInt(r, 0, 5)];
  const a = nonzeroInt(r, -9, 9);
  const b = nonzeroInt(r, -9, 9);
  const c = nonzeroInt(r, -9, 9);
  const d = nonzeroInt(r, -9, 9);
  if (family === 'list-mutate') {
    const lines = [`liste = [${a}, ${b}]`, `liste.append(${c})`, `liste.extend([${d}])`, `liste[0] = ${a + 1}`];
    let state = [a, b];
    const states = [[...state]];
    state.push(c); states.push([...state]);
    state.push(d); states.push([...state]);
    state[0] = a + 1; states.push([...state]);
    return buildStepTrace('liste', family, lines, states, `append hängt ein Element an, extend hängt jedes Element der Liste an, liste[0] = … überschreibt vorhandene Position 0.`);
  }
  if (family === 'list-alias') {
    const lines = [`x = [${a}, ${b}]`, 'y = x', `y.append(${c})`, `x[0] = ${d}`];
    let xs = [a, b];
    // y = x binds a second name to the SAME object: the append through y is
    // immediately visible in x (aliasing), and the x[0] write closes the loop.
    const xStates = [[...xs], [...xs]];
    xs.push(c);
    xStates.push([...xs]);
    xs[0] = d;
    xStates.push([...xs]);
    return buildStepTrace('x', family, lines, xStates, `y = x erzeugt keine Kopie, sondern einen zweiten Namen für dieselbe Liste. Jede Mutation über y ist sofort in x sichtbar — und umgekehrt.`);
  }
  if (family === 'list-copy') {
    // The final x[0] write must actually change x — the worked solution says
    // so ("Erst x[0] = … verändert x"), so d === a would contradict it.
    let dDistinct = d;
    for (let i = 0; i < 50 && dDistinct === a; i++) dDistinct = nonzeroInt(r, -9, 9);
    if (dDistinct === a) dDistinct = a + 1;
    const lines = [`x = [${a}, ${b}]`, 'y = x.copy()', `y.append(${c})`, `x[0] = ${dDistinct}`];
    let xs = [a, b];
    // x is unchanged by lines 2-3 (the copy mutates independently)
    const xStates = [[...xs], [...xs], [...xs]];
    const yAfterAppend = [a, b, c];
    xs[0] = dDistinct;
    xStates.push([...xs]);
    const variables = [
      ...xStates.map((state, index) => stepVar('x', index + 1, renderState('list', state))),
      { name: 'y_ende', type: 'repr', value: renderState('list', yAfterAppend) },
    ];
    return {
      parameters: { family, snippet: numbered(lines), variables: variables.map((v) => ({ name: v.name, type: 'repr', value: v.value })) },
      expected: { kind: 'variable-values' },
      prompt: `Zustände verfolgen: Welche Werte hat x nach jeder Zeile — und welche Liste steht am Ende in y? Jede Zeile einzeln anwenden; Python-Schreibweise verwenden (z. B. [1, 2]).`,
      fullSolution: `x.copy() legt eine eigenständige Liste an: append über y ändert x nicht. Erst x[0] = ${dDistinct} verändert x. x-Verlauf: ${xStates.map((s) => renderState('list', s)).join(' → ')}; y am Ende: ${renderState('list', yAfterAppend)}.`,
    };
  }
  if (family === 'dict-steps') {
    const k1 = ['start', 'ziel', 'pfad'][randInt(r, 0, 2)];
    const k2 = k1 === 'start' ? 'ende' : 'start';
    const lines = [`lage = {'${k1}': ${a}}`, `lage['${k2}'] = ${b}`, `lage['${k1}'] = ${c}`, `del lage['${k2}']`];
    let m = new Map([[k1, a]]);
    const states = [new Map(m)];
    m.set(k2, b); states.push(new Map(m));
    m.set(k1, c); states.push(new Map(m));
    m.delete(k2); states.push(new Map(m));
    return buildStepTrace('lage', family, lines, states.map((s) => [...s.entries()]), `Zuweisung an einen vorhandenen Schlüssel überschreibt den Wert; del entfernt den Schlüssel komplett.`, 'dict');
  }
  if (family === 'set-steps') {
    const e1 = ['ki', 'lern', 'code'][randInt(r, 0, 2)];
    const pool = ['ki', 'lern', 'code', 'daten'].filter((w) => w !== e1);
    const e2 = pool[randInt(r, 0, 2)];
    const e3 = pool[randInt(r, 0, 2)];
    const lines = [`menge = {'${e1}', '${e2}'}`, `menge.add('${e3}')`, `menge.discard('${e1}')`, `menge.add('${e2}')`];
    let s = new Set([e1, e2]);
    const states = [new Set(s)];
    s.add(e3); states.push(new Set(s));
    s.delete(e1); states.push(new Set(s));
    s.add(e2); states.push(new Set(s));
    return buildStepTrace('menge', family, lines, states.map((set) => [...set]), `Ein Set speichert jedes Element nur einmal: add eines vorhandenen Elements ändert den Zustand nicht, discard entfernt zuverlässig.`, 'set');
  }
  const lines = [`x = [${a}, ${b}]`, `x = x + [${c}]`, `x += [${d}]`, `y = x`];
  let xs = [a, b];
  const states = [[...xs]];
  xs = xs.concat([c]); states.push([...xs]);
  xs.push(d); states.push([...xs]);
  states.push([...xs]);
  return buildStepTrace('x', family, lines, states, `x = x + [ … ] baut eine NEUE Liste und bindet sie an x; x += [ … ] erweitert dagegen die vorhandene Liste direkt (in-place). Am Ende zeigt y auf dieselbe Liste.`);
}

const stepVar = (name, step, value) => ({ name: `${name}_nach_${step}`, type: 'repr', value });

function buildStepTrace(varName, family, lines, states, insight, kind = 'list') {
  const variables = states.map((state, index) => stepVar(varName, index + 1, renderState(kind, state)));
  return {
    parameters: { family, snippet: numbered(lines), variables: variables.map((v) => ({ name: v.name, type: 'repr', value: v.value })) },
    expected: { kind: 'variable-values' },
    prompt: `Zustände verfolgen: Welchen Wert hat ${varName} nach jeder Zeile? Jede Zeile einzeln anwenden und den vollständigen Zustand in Python-Schreibweise angeben (z. B. [1, 2] oder {'a': 1}). Bei Mengen ist die Reihenfolge der Elemente nicht beobachtbar — sie spielt für die Bewertung keine Rolle.`,
    fullSolution: `Verlauf von ${varName}: ${states.map((state) => renderState(kind, state)).join(' → ')}. Kern: ${insight}`,
  };
}

const numbered = (lines) => lines.map((line, i) => `${i + 1}  ${line}`).join('\n');

// --- c-meta-learning: error-class variant bank (B) -----------------------------

const META_CASES = [
  {
    caseId: 'sign',
    symptom: 'Dein Programm rechnet für positive Beispiele richtig, für negative Beispiele kommt das falsche Vorzeichen heraus.',
    correct: 'Hypothese notieren, dass die Rechnung das Vorzeichen verliert, und gezielt einen negativen Testfall durchrechnen.',
    distractors: [
      'Den Code komplett neu schreiben, ohne zuerst die Stelle einzugrenzen.',
      'Nur die positiven Fälle weiter testen — die negativen sind vermutlich Randfälle.',
      'Die Fehlermeldung in das Lernjournal schreiben und den Code unverändert lassen.',
    ],
  },
  {
    caseId: 'off-by-one',
    symptom: 'Bei genau fünf Durchläufen fehlt dir am Ende immer das letzte Element; bei vier Durchläufen passt alles.',
    correct: 'Die Schleifengrenze an der Grenze zwischen vier und fünf Durchläufen prüfen (Typ: Off-by-one) und die Grenze gezielt testen.',
    distractors: [
      'Die Datenstruktur komplett austauschen, weil sie sich inkonsistent verhält.',
      'Ein größenordnungsgrößerer Testfall laufen lassen — wenn der passt, ist es kein echtes Problem.',
      'Das Journal umschreiben, damit der Fehler nicht mehr als offen erscheint.',
    ],
  },
  {
    caseId: 'copy-paste',
    symptom: 'Der zweite Rechenblock liefert dasselbe Ergebnis wie der erste, obwohl er andere Eingabewerte bekommt.',
    correct: 'Beide Blöcke Zeile für Zeile vergleichen (Typ: Copy-Paste-Variable) und prüfen, ob der zweite Block noch eine Variable des ersten benutzt.',
    distractors: [
      'Nur den zweiten Block neu berechnen und den ersten ignorieren.',
      'Sofort alle Variablen umbenennen, ohne die tatsächlich genutzten Stellen zu vergleichen.',
      'Auf ein Framework umsteigen, das solche Fehler prinzipiell verhindert.',
    ],
  },
  {
    caseId: 'order',
    symptom: 'Der Fehler tritt nur auf, wenn du die Eingaben in umgekehrter Reihenfolge verarbeitest; in der üblichen Reihenfolge läuft alles.',
    correct: 'Als Hypothese festhalten, dass die Verarbeitung reihenfolgeabhängig ist, und beide Reihenfolgen als Testfälle gegenüberstellen.',
    distractors: [
      'Die ungewöhnliche Reihenfolge als ungültige Eingabe verbieten, statt die Abhängigkeit zu prüfen.',
      'Den Fehler als zufällig einstufen, weil er nicht immer auftritt.',
      'Nur die übliche Reihenfolge weiter testen, da sie dem Normalfall entspricht.',
    ],
  },
  {
    caseId: 'formula',
    symptom: 'Dein Ergebnis besteht alle Beispielrechnungen aus der Vorlage, aber der eigene Prüftest mit anderen Zahlen schlägt fehl.',
    correct: 'Vermuten, dass die verwendete Formel nur auf die Beispiele passt (Typ: falsche Formel), und sie an einem selbst gerechneten Fall kontrollieren.',
    distractors: [
      'Die Beispiele aus der Vorlage als einzigen Maßstab behalten — sie stammen aus dem Lehrmaterial.',
      'Den Prüftest als zu streng verwerfen und seine Erwartung an das Programmergebnis anpassen.',
      'Mehr Beispielrechnungen aus der Vorlage wiederholen, bis es klappt.',
    ],
  },
];

/** Rotate `options` so that index `rotation` becomes the correct position.
 *  rotation 0 keeps the input order (slice(-0) would be a no-rotation trap). */
const rotateOptions = (options, rotation) => {
  if (rotation <= 0) return [...options];
  return [...options.slice(-rotation), ...options.slice(0, options.length - rotation)];
};

/** Shared variant-bank scaffolding (ADR-0015 mechanism B): the seed picks
 *  the case (`seed % cases.length`), the correct position rotates with the
 *  case AND the seed epoch, and every option text passes through `localize`
 *  (the git family rewrites its file name per epoch). `finish` receives the
 *  resolved bank state and builds the generator return value. */
const caseBank = (cases, seed, { localize = (text) => text, finish }) => {
  const caseIndex = seed % cases.length;
  const metaCase = cases[caseIndex];
  const options = [metaCase.correct, ...metaCase.distractors].map(localize);
  const rotation = (caseIndex + Math.floor(seed / cases.length)) % options.length;
  const rotated = rotateOptions(options, rotation);
  const ids = ['a', 'b', 'c', 'd'];
  const choices = rotated.map((text, i) => ({ id: ids[i], text, correct: i === rotation }));
  return finish({
    metaCase,
    caseIndex,
    epoch: Math.floor(seed / cases.length),
    correctText: options[0],
    options,
    choices,
    correctChoiceId: ids[rotation],
  });
};

/** Semantic variant bank (B): which debugging step fits the observed error
 *  class. The seed picks one of five professionally distinct cases; the
 *  correct choice rotates position with the case. Delayed reviews can avoid
 *  the immediately previous case because `caseIdOf` is exported. */
export function genMetaErrorClassify(seed) {
  return caseBank(META_CASES, seed, {
    finish: ({ metaCase, caseIndex, choices, correctChoiceId, correctText }) => ({
      parameters: { caseId: metaCase.caseId, caseIndex },
      expected: { correctChoice: correctChoiceId },
      choices,
      prompt: `Beobachtung: ${metaCase.symptom}\n\nWelcher n\u00e4chste Schritt des Debug-Prozesses (Beobachtung \u2192 Reproduktion \u2192 Hypothese \u2192 frischer Test) passt am besten zu dieser Beobachtung?`,
      fullSolution: `Richtig ist: ${correctText}\nDie Beobachtung passt zum Fehlerbild \u201e${metaCase.caseId}\u201c. Ein guter Debug-Schritt benennt die Hypothese explizit und pr\u00fcft sie an einem frischen, gezielten Testfall \u2014 statt umzubauen, umzudeklarieren oder nur die Vorlage zu wiederholen.`,
    }),
  });
}

export function metaErrorCaseCount() {
  return META_CASES.length;
}

// --- c-python-files-errors: exception boundary bank (B) ------------------------

const EXCEPTION_CASES = [
  { caseId: 'valueerror', expr: (r) => `int("3,${randInt(r, 1, 9)}")`, answer: 'ValueError', why: 'Der String enthält ein Komma und ist daher keine gültige Ganzzahl — int() mit ungültigem Literal wirft ValueError.' },
  { caseId: 'typeerror-concat', expr: () => '"ki" + 5', answer: 'TypeError', why: 'Die +-Operation zwischen str und int ist nicht definiert; Python verketten keine Typen automatisch.' },
  { caseId: 'keyerror', expr: (r) => `alter = {"anna": ${randInt(r, 18, 30)}}\nalter["${['berta', 'caro', 'dilan'][randInt(r, 0, 2)]}"]`, answer: 'KeyError', why: 'Der Schlüssel existiert im Dictionary nicht; der Zugriff über eckige Klammern wirft KeyError.' },
  { caseId: 'filenotfound', expr: () => 'open("notizen_nicht_da.txt")', answer: 'FileNotFoundError', why: 'Die Datei existiert nicht; open() im Lesemodus scheitert daher mit FileNotFoundError.' },
  { caseId: 'indexerror', expr: (r) => `werte = [${randInt(r, 1, 9)}, ${randInt(r, 1, 9)}]\nwerte[${randInt(r, 5, 9)}]`, answer: 'IndexError', why: 'Der Index liegt hinter dem Listenende; der Zugriff wirft IndexError.' },
  { caseId: 'typeerror-len', expr: () => 'len(5)', answer: 'TypeError', why: 'len() braucht ein Objekt mit Länge; eine ganze Zahl hat keine.' },
  { caseId: 'no-error-int', expr: (r) => `int("${randInt(r, 10, 99)}")`, answer: 'KEIN_FEHLER_INT' },
  { caseId: 'no-error-mul', expr: (r) => `"${randInt(r, 2, 4)}" * ${randInt(r, 2, 3)}`, answer: 'KEIN_FEHLER_STR' },
];

/** Semantic variant bank (B): which exception (if any) does the expression
 *  raise? Includes two no-error cases so "kein Fehler" stays a live option.
 *  Correct position rotates with the case. */
export function genExceptionBoundary(seed) {
  const r = rng(seed);
  const caseIndex = seed % EXCEPTION_CASES.length;
  const metaCase = EXCEPTION_CASES[caseIndex];
  const code = metaCase.expr(r);
  const noError = metaCase.answer.startsWith('KEIN_FEHLER');
  let correctText;
  if (!noError) {
    correctText = `${metaCase.answer} — ${metaCase.why}`;
  } else if (metaCase.answer === 'KEIN_FEHLER_INT') {
    const value = code.match(/"(\d+)"/)[1];
    correctText = `Kein Fehler — der Ausdruck liefert problemlos die ganze Zahl ${value}.`;
  } else {
    const digits = code.match(/"(\d+)"/)[1];
    const times = Number(code.split('*')[1].trim());
    correctText = `Kein Fehler — der Ausdruck liefert problemlos den String "${digits.repeat(times)}".`;
  }
  const answerName = noError ? 'KEIN_FEHLER' : metaCase.answer;
  const wrongPool = [
    'ValueError — das Literal passt nicht zum erwarteten Typ.',
    'TypeError — die Operation ist für diese Typen nicht definiert.',
    'KeyError — der Schlüssel fehlt im Mapping.',
    'FileNotFoundError — die Datei existiert nicht.',
    'IndexError — der Index liegt außerhalb der Sequenz.',
    'Kein Fehler — der Ausdruck läuft fehlerfrei durch und liefert ein Ergebnis.',
  ].filter((text) => (noError ? !text.startsWith('Kein Fehler') : !text.startsWith(`${answerName} —`)));
  const distractors = [];
  const er = rng(seed ^ 0x5f2c);
  while (distractors.length < 3) {
    const candidate = wrongPool[Math.floor(er() * wrongPool.length)];
    if (!distractors.includes(candidate)) distractors.push(candidate);
  }
  const options = [correctText, ...distractors];
  const rotation = (caseIndex + Math.floor(seed / EXCEPTION_CASES.length)) % options.length;
  const rotated = rotateOptions(options, rotation);
  const ids = ['a', 'b', 'c', 'd'];
  const choices = rotated.map((text, i) => ({ id: ids[i], text, correct: i === rotation }));
  return {
    parameters: { caseId: metaCase.caseId, caseIndex },
    expected: { correctChoice: ids[rotation] },
    choices,
    prompt: `Was passiert bei der Ausführung dieses Ausdrucks — welche Ausnahme wird ausgelöst, oder läuft er fehlerfrei durch?\n\n${code}`,
    fullSolution: `Richtig: ${correctText}${noError ? '' : ` Typische Grenzverwechslung: die andere „häufige“ Ausnahme würde bei leicht anderen Typen/Argumenten entstehen — hier entscheidet die konkrete Operation.`}`,
  };
}

export function exceptionBoundaryCaseCount() {
  return EXCEPTION_CASES.length;
}

// --- c-testing-debugging: branch coverage counting (A) -------------------------

/** Reference solver: counts the leaves of the nested decision tree, which
 *  is exactly the minimum number of test cases for branch coverage. */
export function countBranchCoverageLeaves(shape) {
  // shapes encode nested if structures; leaves are observable outcomes
  const leaves = { 'if-else': 2, 'if-if-else': 3, 'if-if': 3, 'if-if-elif': 4, 'if-else-if': 3, 'if-elif-elif-else': 4, 'if-elif-elif-elif-else': 5, 'if-nested-else': 4 };
  return leaves[shape];
}

const BRANCH_SHAPES = {
  'if-else': ['if a > 0:', '    print("pos")', 'else:', '    print("sonst")'],
  'if-if-else': ['if a > 0:', '    if b > 0:', '        print("beide")', '    else:', '        print("nur a")', 'else:', '    print("a klein")'],
  'if-if': ['if a > 0:', '    if b > 0:', '        print("beide")', 'print("ende")'],
  'if-if-elif': ['if a > 0:', '    if b > 0:', '        print("beide")', '    elif b == 0:', '        print("a ja, b null")', 'else:', '    print("a nein")'],
  'if-else-if': ['if a > 0:', '    print("pos")', 'else:', '    if b > 0:', '        print("a nein, b ja")', '    else:', '        print("beide nein")'],
  'if-elif-elif-else': ['if a > 2:', '    print("gross")', 'elif a > 1:', '    print("mittel")', 'elif a > 0:', '    print("klein")', 'else:', '    print("rest")'],
  'if-elif-elif-elif-else': ['if a > 3:', '    print("sehr gross")', 'elif a > 2:', '    print("gross")', 'elif a > 1:', '    print("mittel")', 'elif a > 0:', '    print("klein")', 'else:', '    print("rest")'],
  'if-nested-else': ['if a > 0:', '    if b > 0:', '        if a > b:', '            print("a groesser")', '        else:', '            print("b groesser oder gleich")', '    else:', '        print("a ja, b nein")', 'else:', '    print("a nein")'],
};

/** numeric: minimum number of test cases for full branch coverage of a
 *  generated nested decision structure. The answer is the leaf count of
 *  the decision tree — it must be derived by walking the branches, not
 *  read off a single number in the snippet. Answer space 2-5 across
 *  eight structurally distinct shapes. */
export function genBranchCoverageCount(seed) {
  const r = rng(seed);
  const shapes = Object.keys(BRANCH_SHAPES);
  const shape = shapes[randInt(r, 0, shapes.length - 1)];
  const answer = countBranchCoverageLeaves(shape);
  return {
    parameters: { shape },
    expected: answer,
    prompt: `Wie viele Testfälle sind mindestens nötig, um jede Verzweigung dieses Codegerüsts in jede Richtung mindestens einmal wirklich zu durchlaufen (vollständige Zweigabdeckung)? Erst die erreichbaren Wege durch den Entscheidungsbaum zählen — dann als ganze Zahl angeben.\n\n${numbered(BRANCH_SHAPES[shape])}`,
    fullSolution: `Der Entscheidungsbaum dieses Gerüsts hat ${answer} erreichbare Blätter (jede Kombination von Bedingungsausgängen, die zu einem unterscheidbaren Programmweg führt). Zweigabdeckung verlangt für jedes Blatt mindestens einen Testfall mit Werten, die genau auf diesem Weg landen — also mindestens ${answer} Testfälle.`,
  };
}

// --- c-git-basics: git state variant bank (B) -----------------------------------

const GIT_CASES = [
  {
    caseId: 'diff-unstaged',
    state: 'Du hast an mehreren Dateien gearbeitet. Nichts ist gestaged. Bevor du entscheidest, was in den Commit soll, willst du sehen, welche Textänderungen die Arbeitskopie gegenüber dem letzten Commit enthält.',
    correct: 'git diff',
    distractors: ['git diff --staged', 'git status', 'git push'],
    insight: 'git diff zeigt unstagede Textänderungen der Arbeitskopie; --staged würde nichts zeigen, weil noch nichts gestaged ist.',
  },
  {
    caseId: 'diff-staged',
    state: 'Du hast Dateien mit git add vorgemerkt. Nun willst du genau die vorgemerkten Änderungen prüfen, bevor du committest.',
    correct: 'git diff --staged',
    distractors: ['git diff', 'git log', 'git clone'],
    insight: 'git diff --staged vergleicht den Staging-Bereich mit dem letzten Commit; git diff (ohne Flag) zeigt dagegen nur unstagede Änderungen.',
  },
  {
    caseId: 'push',
    state: 'Du hast einen Commit erstellt. Dein lokaler Branch liegt damit vor dem Branch im Remote-Repository (origin).',
    correct: 'git push',
    distractors: ['git pull', 'git fetch', 'git commit --amend'],
    insight: 'push überträgt lokale Commits ins Remote; pull/fetch holen stattdessen Remote-Stand ab.',
  },
  {
    caseId: 'merge-main',
    state: 'Du arbeitest auf dem Branch feature. main hat seit deinem Abzweig neue Commits bekommen. Du willst deinen Branch auf den aktuellen main-Stand bringen — ohne deinen Branch zu wechseln.',
    correct: 'git merge main',
    distractors: ['git checkout main', 'git push origin feature', 'git branch main'],
    insight: 'merge main integriert main in den aktuellen Branch (feature). checkout main würde den Branch wechseln, statt zu integrieren.',
  },
  {
    caseId: 'conflict-resolved',
    state: 'Während eines Merges gab es einen Konflikt in einer Datei. Du hast die Konfliktmarkierungen bereinigt und die Datei gespeichert. Der Merge läuft noch.',
    correct: 'git add der Datei, dann git commit abschließen',
    distractors: ['git push sofort ausführen', 'git restore --staged . und neu beginnen', 'git commit --amend auf den letzten Commit'],
    insight: 'Nach dem Bereinigen markiert git add die Datei als gelöst; der ausstehende Merge-Commit wird danach abgeschlossen.',
  },
  {
    caseId: 'restore-file',
    state: 'Du hast lokale Änderungen in einer Datei, die noch nicht gestaged sind. Du entscheidest: diese Änderungen willst du verwerfen und die Datei auf den Stand des letzten Commits zurücksetzen.',
    correct: 'git restore datei.py',
    distractors: ['git rm datei.py', 'git commit -m "verwerfen"', 'git stash apply'],
    insight: 'restore setzt unstaged Änderungen der Arbeitskopie zurück; rm würde die Datei aus dem Projekt entfernen.',
  },
];

/** Semantic variant bank (B): a described repository state, asked for the
 *  fitting next action. Six professionally distinct states; correct
 *  position rotates with the case. */
export function genGitNextAction(seed) {
  return caseBank(GIT_CASES, seed, {
    // File-name localization happens inside finish (it needs the epoch and
    // the case's usesFile check); caseBank itself only resolves case and
    // rotation. The epoch varies the file name (seed % N picks the case, so
    // the same modulo on fileNames would freeze every case to one file).
    finish: ({ metaCase, caseIndex, epoch, choices, correctChoiceId, options }) => {
      const usesFile = metaCase.state.includes('datei.py') || metaCase.correct.includes('datei.py') || metaCase.distractors.some((text) => text.includes('datei.py'));
      const fileNames = ['notizen.py', 'auswertung.py', 'trainingsplan.md'];
      const fileName = usesFile ? fileNames[epoch % fileNames.length] : null;
      const localize = (text) => fileName ? text.replaceAll('datei.py', fileName) : text;
      const localizedChoices = fileName ? choices.map((choice) => ({ ...choice, text: localize(choice.text) })) : choices;
      return {
        parameters: { caseId: metaCase.caseId, caseIndex, ...(fileName ? { fileName } : {}) },
        expected: { correctChoice: correctChoiceId },
        choices: localizedChoices,
        prompt: `Situation: ${localize(metaCase.state)}\n\nWelcher Schritt passt jetzt am besten?`,
        fullSolution: `Richtig: ${localize(options[0])}. ${localize(metaCase.insight)}`,
      };
    },
  });
}

export function gitNextActionCaseCount() {
  return GIT_CASES.length;
}

const GIT_OPERATION_CHOICE_COUNT = { intro: 2, core: 4, stretch: 4, challenge: 4 };
const GIT_OPERATION_CHALLENGE_DISTRACTORS = {
  'diff-unstaged': ['git diff --staged', 'git status', 'git add -p'],
  'diff-staged': ['git diff', 'git status', 'git add -p'],
};

function gitOperationCase(caseId) {
  const meta = GIT_CASES.find((item) => item.caseId === caseId)
    || GIT_OPERATION_STATIC[caseId];
  if (!meta) throw new Error(`Unbekannter Git-Fall ${caseId}`);
  return meta;
}

function gitOperationOptions(meta, difficulty, choiceCount) {
  const distractors = difficulty === 'challenge'
    ? (GIT_OPERATION_CHALLENGE_DISTRACTORS[meta.caseId] || meta.distractors)
    : meta.distractors;
  return [meta.correct, ...distractors.slice(0, choiceCount - 1)];
}

/** Independent solver: the correct Git operation is a function of caseId,
 *  not of seed, rotation or difficulty. */
export function solveGitOperation(parameters) {
  return { correctText: gitOperationCase(parameters.caseId).correct };
}

// Gepinnte statische Quelle für den Merge-Fall
// (content/exercise-definitions/foundations/git-merge-debug.json, w03,
// unverändert übernommen). Eigener Lookup neben GIT_CASES, damit die
// 51er-Seed-Generator-Baseline (genGitNextAction) unangetastet bleibt.
const GIT_OPERATION_STATIC = {
  'merge-conflict-test-flow': {
    caseId: 'merge-conflict-test-flow',
    state: 'Beim Merge eines Feature-Branches entsteht ein Konflikt in `checker.py`. Beide Branches hatten vor dem Merge grüne Tests.',
    correct: 'Konfliktmarker und beide Absichten lesen, fachlich auflösen, Tests ausführen, `git diff` prüfen, dann den Merge committen',
    distractors: [
      'Immer `--ours` wählen, weil der aktuelle Branch Vorrang hat',
      'Konfliktmarker unverändert committen; die frühere grüne Suite reicht als Beleg',
      'Die Historie neu schreiben, damit kein Konflikt mehr sichtbar ist',
    ],
    insight: 'Lies zuerst beide Varianten und löse die fachliche Absicht. Danach prüfst du die neu entstandene Kombination mit Tests und Diff. Erst dieser Zustand wird als Merge-Commit gespeichert.',
  },
};

/** S4C family generator for classify-git-operation. Case type is pinned;
 *  seed rotates the correct position and, on stretch/challenge, localizes a
 *  working-tree file name. intro/core leave that file step empty (vacuous-axis). */
export function generateGitOperationFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const choiceCount = GIT_OPERATION_CHOICE_COUNT[difficulty];
  if (!choiceCount) throw new Error(`Unbekanntes Profil ${difficulty}`);
  const meta = gitOperationCase(caseId);
  const varyFile = (difficulty === 'stretch' || difficulty === 'challenge') && !GIT_OPERATION_STATIC[caseId];
  const fileNames = ['notizen.py', 'auswertung.py', 'trainingsplan.md'];
  const fileName = varyFile ? fileNames[randInt(rng(seed), 0, fileNames.length - 1)] : null;
  const options = gitOperationOptions(meta, difficulty, choiceCount);
  const rotation = Math.abs(seed) % options.length;
  const rotated = rotateOptions(options, rotation);
  const ids = ['a', 'b', 'c', 'd'].slice(0, options.length);
  const choices = rotated.map((text, index) => ({
    id: ids[index],
    text,
    correct: index === rotation,
  }));
  const fileNote = fileName ? ` Die Arbeitsdatei heißt ${fileName}.` : '';
  const question = GIT_OPERATION_STATIC[caseId]
    ? 'Welcher Ablauf liefert den belastbarsten Abschluss?'
    : 'Welche Git-Operation passt jetzt?';
  return {
    parameters: { caseId, difficulty, ...(fileName ? { fileName } : {}) },
    expected: { correctChoice: ids[rotation] },
    choices,
    prompt: `Situation: ${meta.state}${fileNote}\n\n${question}`,
    fullSolution: `Richtig: ${meta.correct}. ${meta.insight}`,
  };
}

export const GIT_OPERATION_CONTRACT = {
  familyId: 'classify-git-operation',
  familyGroup: 'classify-concept',
  summary: 'Ordnet eine Repository-Situation der passenden Git-Operation zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: true,
  vacuousSteps: [
    {
      stepId: 'file-localize',
      emptyWhen: ['intro', 'core'],
      rationale: 'Der Dateiname ist nur bei stretch und challenge ein echter Parameter. intro und core lassen den Schritt leer.',
    },
  ],
  caseTypes: [
    { caseId: 'diff-unstaged' },
    { caseId: 'diff-staged' },
    { caseId: 'merge-conflict-test-flow', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-git-basics'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

export const FOUNDATIONS_FRESH_GENERATORS = {
  genPythonStateTrace,
  genCodeReadingOutput,
  genFunctionCompose,
  genControlFlowOutput,
  genCollectionStepTrace,
  genMetaErrorClassify,
  genExceptionBoundary,
  genBranchCoverageCount,
  genGitNextAction,
};
