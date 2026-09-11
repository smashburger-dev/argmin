// Procedural family optimize-gradient-update-rule: mixed capsule family.
//   - sign-and-scale-of-update (intro, single-choice): the seed draws the
//     gradient sign/magnitude and the learning rate; the four option texts
//     are rebuilt from the draw (correct step, wrong direction, missing lr,
//     wrong form) and the correct letter rotates.
//   - fit-linear-gradient-loop / head-only-finetune / lora-fit-toy
//     (stretch/challenge, pyodide): base tests verbatim plus a seeded block
//     of extra probes compared against a renamed reference copy.
// Blueprints: classify-eval-hazard.mjs (choice arm), reproduce-seeded-split.mjs
// (code arm).

import { refCopy } from './py_test_kit.mjs';

import {
  buildRotatedChoices,
  drawFamilyInstance,
  pick,
  randInt,
  rng,
  variantCaseIndex,
} from '../generator_draw_kit.mjs';

const CHOICE_IDS = ['a', 'b', 'c', 'd'];
const DRAW_SCOPE = 'optimize-gradient-update-rule';


const pyList = (rows) => `[${rows.map((row) => (Array.isArray(row) ? pyList(row) : String(row))).join(', ')}]`;

// German decimal: 0.4 -> "0,4", -1.2 -> "-1,2" (drawn products stay <= 2
// decimals by construction; the rounding guard keeps binary noise out).
const de = (v) => String(Math.round(v * 1000) / 1000).replace('.', '{,}');
const signed = (v) => (v >= 0 ? `+${de(v)}` : de(v));

// --- case 1: sign-and-scale-of-update (single-choice) --------------------------

const GRAD_BANK = [-8, -6, -4, -2, -1, 1, 2, 3, 4, 6, 8];
const LR_BANK = [0.05, 0.1, 0.2, 0.5, 1];

function drawSignCase(r) {
  return { gradW: pick(r, GRAD_BANK), lr: pick(r, LR_BANK) };
}

// Option texts rebuilt from the draw: correct step (w - lr*grad), wrong
// direction (w + lr*grad), missing lr (w - grad), wrong form (lr * w).
function signOptions({ gradW, lr }) {
  const step = lr * gradW;
  return [
    { text: `$w \\leftarrow w ${signed(-step).startsWith('-') ? '-' : '+'} ${de(Math.abs(step))}$ — der Schritt geht um $\\mathrm{lr} \\cdot \\mathrm{grad}$ entgegen dem Gradienten.`, correct: true },
    { text: `$w \\leftarrow w ${signed(step).startsWith('-') ? '-' : '+'} ${de(Math.abs(step))}$ — der Schritt geht in Gradientenrichtung.`, correct: false },
    { text: `$w \\leftarrow w ${signed(-gradW).startsWith('-') ? '-' : '+'} ${de(Math.abs(gradW))}$ — die Lernrate wird nicht mit dem Gradienten multipliziert.`, correct: false },
    { text: `$w \\leftarrow ${de(lr)} \\cdot w$ — der alte Wert von $w$ geht vollständig verloren.`, correct: false },
  ];
}

const signPrompt = ({ gradW, lr }) => `Beim Gradientenabstieg auf den MSE ist der Gradient bzgl. $w$ aktuell $${signed(gradW)}$ und die Lernrate ist $\\mathrm{lr} = ${de(lr)}$. Wie lautet das korrekte Update für $w$?`;

const signSolution = ({ gradW, lr }) => `Update-Regel: $w \\leftarrow w - \\mathrm{lr} \\cdot \\frac{\\partial \\mathrm{MSE}}{\\partial w} = w - ${de(lr)} \\cdot (${de(gradW)}) = w ${-lr * gradW >= 0 ? '+' : '-'} ${de(Math.abs(lr * gradW))}$. Konzeptfrage: zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis.`;

export function signCapsuleOk(parameters) {
  try {
    return GRAD_BANK.includes(parameters?.gradW) && LR_BANK.includes(parameters?.lr);
  } catch { return false; }
}

export function signCorrectText(parameters) {
  if (!signCapsuleOk(parameters)) throw new Error('Sign-Update-Parameter verletzen die Kapselform');
  return signOptions(parameters).find((o) => o.correct).text;
}

export function genSignCapsule(seed) {
  const r = rng(seed);
  const drawn = drawSignCase(r);
  const options = signOptions(drawn);
  const rotation = variantCaseIndex(seed, options.length);
  const texts = options.map((o) => o.text);
  const correctText = options.find((o) => o.correct).text;
  const choices = buildRotatedChoices(texts, rotation, CHOICE_IDS)
    .map((choice) => ({ ...choice, correct: choice.text === correctText }));
  return {
    parameters: drawn,
    expected: { correctChoice: choices.find((c) => c.correct).id },
    choices,
    prompt: signPrompt(drawn),
    fullSolution: signSolution(drawn),
  };
}

// --- code cases -----------------------------------------------------------------
// starterCode/baseTests/referenceSolver/prompt/fullSolution are injected
// verbatim from content/families/optimize-gradient-update-rule.json below.

export const UPDATE_CASES = {
  'sign-and-scale-of-update': {
    caseId: 'sign-and-scale-of-update',
    kind: 'choice',
    difficulty: 'intro',
    activityType: 'single-choice',
    graderId: 'deterministic',
    masteryEligible: false,
  },
  'fit-linear-gradient-loop': {
    caseId: 'fit-linear-gradient-loop',
    kind: 'code',
    difficulty: 'stretch',
    activityType: 'python-code',
    graderId: 'pyodide',
    competencyIds: ['c-grad-regression', 'c-numpy-basics'],
    packages: ['numpy'],
    starterCode: "import numpy as np\n\n\ndef fit_linear(x, y, lr, epochs):\n    \"\"\"Gradient descent on MSE of y_hat = w * x + b; return {'w', 'b', 'rmse'}.\"\"\"\n    # validate lengths, start at w = 0.0, b = 0.0\n    # per epoch: residuals, then gradient updates for w and b\n    # rmse of the final model\n    ...\n",
    baseTests: "x = np.array([0.0, 1.0, 2.0, 3.0, 4.0])\ny = 2.0 * x + 1.0\nres = fit_linear(x, y, 0.1, 3000)\nA = np.vstack([x, np.ones_like(x)]).T\ncoef, _, _, _ = np.linalg.lstsq(A, y, rcond=None)\n__check('w wie lstsq', abs(res[\"w\"] - coef[0]) < 1e-6)\n__check('b wie lstsq', abs(res[\"b\"] - coef[1]) < 1e-6)\n__check('rmse nahe null', res[\"rmse\"] < 1e-6)\n__check('rmse konsistent', abs(res[\"rmse\"] - float(np.sqrt(np.mean((res[\"w\"] * x + res[\"b\"] - y) ** 2)))) < 1e-12)\nx2 = np.array([-2.0, -1.0, 0.0, 1.0, 2.0])\ny2 = -0.5 * x2 + 2.0\nres2 = fit_linear(x2, y2, 0.1, 3000)\n__check('negativer slope w', abs(res2[\"w\"] - (-0.5)) < 1e-6)\n__check('negativer slope b', abs(res2[\"b\"] - 2.0) < 1e-6)\ntry:\n    fit_linear([1.0, 2.0], [1.0], 0.1, 10)\n    __check('Laengenfehler -> ValueError', False, 'kein ValueError')\nexcept ValueError:\n    __check('Laengenfehler -> ValueError', True)",
    referenceSolver: "import numpy as np\n\ndef fit_linear(x, y, lr, epochs):\n    x = np.asarray(x, dtype=float)\n    y = np.asarray(y, dtype=float)\n    if x.shape != y.shape:\n        raise ValueError(\"x und y brauchen die gleiche Laenge\")\n    w = 0.0\n    b = 0.0\n    n = x.size\n    for _ in range(int(epochs)):\n        r = w * x + b - y\n        w = w - lr * (2.0 / n) * float(np.sum(x * r))\n        b = b - lr * (2.0 / n) * float(np.sum(r))\n    rmse = float(np.sqrt(np.mean((w * x + b - y) ** 2)))\n    return {\"w\": float(w), \"b\": float(b), \"rmse\": rmse}",
    refNames: ['fit_linear'],
    prompt: "Final Boss Regression aus Grundoperationen: Implementiere <code>fit_linear(x, y, lr, epochs)</code>. Das Modell ist $\\hat{y} = w x + b$, Start bei $w = 0$ und $b = 0$. Pro Epoche ein Gradientenabstieg-Schritt auf den MSE mit den geschlossenen Gradienten $\\frac{2}{n}\\sum_i x_i r_i$ und $\\frac{2}{n}\\sum_i r_i$ (mit $r_i = w x_i + b - y_i$) und dem Update $w \\leftarrow w - \\mathrm{lr} \\cdot \\mathrm{grad}_w$, $b \\leftarrow b - \\mathrm{lr} \\cdot \\mathrm{grad}_b$. Rückgabe: ein Dictionary mit <code>\"w\"</code>, <code>\"b\"</code> (floats) und <code>\"rmse\"</code> — die Wurzel aus dem MSE des finalen Modells. Wirf <code>ValueError</code>, wenn <code>x</code> und <code>y</code> unterschiedliche Längen haben. Der Testcode gleicht dein Ergebnis innerhalb von $10^{-6}$ mit der Kleinst-Quadrate-Referenz <code>np.linalg.lstsq</code> ab.",
    fullSolution: "def fit_linear(x, y, lr, epochs):\n    x = np.asarray(x, dtype=float)\n    y = np.asarray(y, dtype=float)\n    if x.shape != y.shape:\n        raise ValueError(\"x und y brauchen die gleiche Laenge\")\n    w = 0.0\n    b = 0.0\n    n = x.size\n    for _ in range(int(epochs)):\n        r = w * x + b - y\n        w = w - lr * (2.0 / n) * float(np.sum(x * r))\n        b = b - lr * (2.0 / n) * float(np.sum(r))\n    rmse = float(np.sqrt(np.mean((w * x + b - y) ** 2)))\n    return {\"w\": float(w), \"b\": float(b), \"rmse\": rmse}\n\n# fit_linear([0..4], 2*x+1, 0.1, 3000) -> {'w': 2.0, 'b': 1.0, 'rmse': ~1e-15}\n# stimmt mit np.linalg.lstsq bis unter 1e-6 ueberein",
    extraCount: 3,
    draw(r) {
      const n = randInt(r, 5, 8);
      const x = Array.from({ length: n }, () => randInt(r, 1, 9));
      const y = x.map((v) => 2 * v + 1 + randInt(r, -2, 2));
      return { x, y, lr: pick(r, [0.01, 0.02, 0.05]), epochs: pick(r, [20, 40, 60]) };
    },
  },
  'head-only-finetune': {
    caseId: 'head-only-finetune',
    kind: 'code',
    difficulty: 'stretch',
    activityType: 'python-code',
    graderId: 'pyodide',
    competencyIds: ['c-dl-finetuning', 'c-dl-training'],
    packages: ['numpy'],
    starterCode: "import numpy as np\n\n\ndef head_only_ft(X, Y, W1, W2_init, lr, epochs):\n    \"\"\"Train only the head W2 on frozen ReLU features; return W2, initial and final MSE.\"\"\"\n    X = np.array(X, dtype=float)\n    Y = np.array(Y, dtype=float)\n    W1 = np.array(W1, dtype=float)\n    W2 = np.array(W2_init, dtype=float)\n    # h = relu(X @ W1.T) from the frozen trunk; only W2 receives updates\n    # per epoch: residuum r = h @ W2.T - Y, grad = (2/n) * r.T @ h, W2 -= lr * grad\n    ...\n",
    baseTests: "X = [[1.0, 0.5, 0.0], [0.5, 1.0, 1.0], [1.0, 1.0, 0.5], [0.0, 0.5, 1.0]]\nW1 = [[1.0, 0.5, 0.0], [0.5, 1.0, 1.0]]\nW2_true = [[2.0, -1.0]]\nh = np.maximum(np.asarray(X) @ np.asarray(W1).T, 0.0)\nY = (h @ np.asarray(W2_true).T).tolist()\nW2_init = [[0.0, 0.0]]\nW1_copy = np.array(W1)\nX_copy = np.array(X, dtype=float)\nres = head_only_ft(X, Y, W1, W2_init, 0.1, 500)\n__check('Rueckgabe-Struktur', set(res.keys()) == {\"W2\", \"initial_mse\", \"final_mse\"})\n__check('W1 eingefroren (Checksumme)', np.array_equal(np.asarray(W1), W1_copy))\n__check('X nicht mutiert', np.array_equal(np.asarray(X, dtype=float), X_copy))\n__check('initial groesser final', res[\"initial_mse\"] > res[\"final_mse\"])\n__check('Val-Schwellwert: final < initial/2', res[\"final_mse\"] < res[\"initial_mse\"] / 2.0)\n__check('konvergiert gegen wahres W2', np.allclose(res[\"W2\"], [[2.0, -1.0]], atol=1e-4))\n\ndef __ref_head_ft(X, Y, W1, W2_init, lr, epochs):\n    X = [list(map(float, r)) for r in X]\n    Y = [list(map(float, r)) for r in Y]\n    W2 = [list(map(float, r)) for r in W2_init]\n    n = len(X)\n    d1 = len(W1[0])\n    d2 = len(W2)\n    h = [[max(0.0, sum(X[i][a] * W1[k][a] for a in range(d1))) for k in range(len(W1))] for i in range(n)]\n\n    def predict(W2):\n        return [[sum(h[i][k] * W2[c][k] for k in range(len(W1))) for c in range(d2)] for i in range(n)]\n\n    def mse(W2):\n        p = predict(W2)\n        return sum((p[i][c] - Y[i][c]) ** 2 for i in range(n) for c in range(d2)) / (n * d2)\n\n    initial = mse(W2)\n    for _ in range(int(epochs)):\n        p = predict(W2)\n        for c in range(d2):\n            for k in range(len(W1)):\n                g = (2.0 / (n * d2)) * sum((p[i][c] - Y[i][c]) * h[i][k] for i in range(n))\n                W2[c][k] -= lr * g\n    return W2, initial, mse(W2)\n\n# NOTE: the reference above uses mean over outputs implicitly via 2/(n*d2) only if\n# numpy mean divides by n*d2 as well -- aligning: np.mean(r*r) divides by n*d2. OK.\nrefW2, refInit, refFinal = __ref_head_ft(X, Y, W1, W2_init, 0.1, 500)\n__check('initial mse gegen Referenz', abs(res[\"initial_mse\"] - refInit) < 1e-9)\n__check('final mse gegen Referenz', abs(res[\"final_mse\"] - refFinal) < 1e-6)\nres_again = head_only_ft(X, Y, W1, W2_init, 0.1, 500)\n__check('Doppelaufruf deterministisch', np.array_equal(res[\"W2\"], res_again[\"W2\"]))",
    referenceSolver: "import numpy as np\n\ndef head_only_ft(X, Y, W1, W2_init, lr, epochs):\n    \"\"\"Train only the head W2 on frozen ReLU features; return W2, initial and final MSE.\"\"\"\n    X = np.array(X, dtype=float)\n    Y = np.array(Y, dtype=float)\n    W1 = np.array(W1, dtype=float)\n    W2 = np.array(W2_init, dtype=float)\n    h_pre = X @ W1.T\n    h = np.where(h_pre > 0, h_pre, 0.0)\n    n = X.shape[0]\n\n    def mse():\n        r = h @ W2.T - Y\n        return float(np.mean(r * r))\n\n    initial = mse()\n    for _ in range(int(epochs)):\n        r = h @ W2.T - Y\n        grad = (2.0 / n) * r.T @ h\n        W2 = W2 - lr * grad\n    return {\"W2\": W2, \"initial_mse\": initial, \"final_mse\": mse()}\n",
    refNames: ['head_only_ft'],
    prompt: "Toy-Head-Only-Feinabstimmung: Implementiere <code>head_only_ft(X, Y, W1, W2_init, lr, epochs)</code> am Toy-MLP. Vertrag: Der Rumpf ist eingefroren — die Features $h = \\mathrm{relu}(XW_1^\\top)$ werden einmal aus den <em>unveränderten</em> Eingaben berechnet; trainiert wird nur der Kopf $W_2$ mit Gradientenabstieg auf den MSE $\\frac{1}{n}\\sum (hW_2^\\top - Y)^2$ (Faktor $2/n$ im Gradienten, gleichzeitige Updates). Rückgabe: <code>{\"W2\": ..., \"initial_mse\": float, \"final_mse\": float}</code>. Die Eingabearrays dürfen nicht mutiert werden. Dies ist ein Toy-MLP-Experiment — kein echtes Fine-Tuning. Der Testcode prüft die Freeze-Checksumme von $W_1$, den vorab festgelegten Erfolgs-Schwellwert (final < initial/2, hier auf dem Trainings-MSE des Toy-Experiments gemessen — ein echter Val-Split bleibt dem lokalen Projekt vorbehalten) (final &lt; initial/2), Konvergenz gegen ein bekanntes $W_2^\\ast$, eine unabhängige Schleifen-Referenz und Determinismus.",
    fullSolution: "import numpy as np\n\ndef head_only_ft(X, Y, W1, W2_init, lr, epochs):\n    \"\"\"Train only the head W2 on frozen ReLU features; return W2, initial and final MSE.\"\"\"\n    X = np.array(X, dtype=float)\n    Y = np.array(Y, dtype=float)\n    W1 = np.array(W1, dtype=float)\n    W2 = np.array(W2_init, dtype=float)\n    h_pre = X @ W1.T\n    h = np.where(h_pre > 0, h_pre, 0.0)\n    n = X.shape[0]\n\n    def mse():\n        r = h @ W2.T - Y\n        return float(np.mean(r * r))\n\n    initial = mse()\n    for _ in range(int(epochs)):\n        r = h @ W2.T - Y\n        grad = (2.0 / n) * r.T @ h\n        W2 = W2 - lr * grad\n    return {\"W2\": W2, \"initial_mse\": initial, \"final_mse\": mse()}\n# Am Toy-MLP des Tests: initial_mse vor dem ersten Schritt, final_mse danach;\n# final < initial/2 (vorab festgelegter Schwellwert) und W2 konvergiert gegen [[2, -1]].",
    extraCount: 2,
    draw(r) {
      const n = randInt(r, 4, 6);
      const dIn = randInt(r, 2, 3);
      const dH = randInt(r, 2, 3);
      const dOut = randInt(r, 1, 2);
      const X = Array.from({ length: n }, () => Array.from({ length: dIn }, () => randInt(r, -3, 3)));
      const Y = Array.from({ length: n }, () => Array.from({ length: dOut }, () => randInt(r, -3, 3)));
      const W1 = Array.from({ length: dH }, () => Array.from({ length: dIn }, () => randInt(r, -2, 2) * 0.5));
      const W2 = Array.from({ length: dOut }, () => Array.from({ length: dH }, () => randInt(r, -2, 2) * 0.5));
      return { X, Y, W1, W2, lr: pick(r, [0.01, 0.05]), epochs: pick(r, [10, 25]) };
    },
  },
  'lora-fit-toy': {
    caseId: 'lora-fit-toy',
    kind: 'code',
    difficulty: 'challenge',
    activityType: 'python-code',
    graderId: 'pyodide',
    competencyIds: ['c-dl-finetuning', 'c-dl-autograd'],
    packages: ['numpy'],
    starterCode: "import numpy as np\n\n\ndef lora_fit(h, Y, W, A_init, B_init, alpha, r, lr, epochs):\n    \"\"\"Adapt a frozen map W through LoRA (alpha/r) * B @ A; train only A and B by GD on MSE.\"\"\"\n    h = np.array(h, dtype=float)\n    Y = np.array(Y, dtype=float)\n    W = np.array(W, dtype=float)\n    A = np.array(A_init, dtype=float)\n    B = np.array(B_init, dtype=float)\n    # predict: h @ (W + scale * (B @ A)).T with scale = alpha / r\n    # per epoch: residuum -> G = (2 / (n * k)) * (residuum.T @ h)\n    #            dA = scale * (B.T @ G), dB = scale * (G @ A.T); update A and B only\n    ...\n",
    baseTests: "h = [[1.0, 0.5, 0.0], [0.5, 1.0, 1.0], [1.0, 1.0, 0.5], [0.0, 0.5, 1.0]]\nW = [[0.1, 0.2, -0.1], [0.0, -0.2, 0.3]]\nW_target = [[1.0, 0.5, -0.5], [0.5, 0.5, 1.0]]\nY = (np.asarray(h) @ np.asarray(W_target).T).tolist()\nA_init = [[0.1, 0.0, 0.0], [0.0, 0.1, 0.0]]\nB_init = [[0.0, 0.1], [0.1, 0.0]]\nW_copy = np.array(W)\nres = lora_fit(h, Y, W, A_init, B_init, 4, 2, 0.05, 800)\n__check('Struktur', set(res.keys()) == {\"A\", \"B\", \"initial_mse\", \"final_mse\"})\n__check('W eingefroren (Checksumme)', np.array_equal(np.asarray(W), W_copy))\n__check('Verlust sinkt unter Haelfte', res[\"final_mse\"] < res[\"initial_mse\"] / 2.0)\n__check('A Form r x d', np.asarray(res[\"A\"]).shape == (2, 3))\n__check('B Form d x r', np.asarray(res[\"B\"]).shape == (2, 2))\n__check('Delta hat Rang hoechstens r', np.linalg.matrix_rank(res[\"B\"] @ res[\"A\"]) <= 2)\n\ndef __ref_lora_fit(h, Y, W, A_init, B_init, alpha, r, lr, epochs):\n    h = [list(map(float, row)) for row in h]\n    Y = [list(map(float, row)) for row in Y]\n    W = [list(map(float, row)) for row in W]\n    A = [list(map(float, row)) for row in A_init]\n    B = [list(map(float, row)) for row in B_init]\n    n, k = len(h), len(Y[0])\n    d_in, d_out = len(W[0]), len(W)\n    scale = float(alpha) / float(r)\n\n    def predict():\n        out = [[0.0] * k for _ in range(n)]\n        for i in range(n):\n            for c in range(k):\n                s = 0.0\n                for a in range(d_in):\n                    delta = sum(B[c][j] * A[j][a] for j in range(r))\n                    s += h[i][a] * (W[c][a] + scale * delta)\n                out[i][c] = s\n        return out\n\n    def mse():\n        p = predict()\n        return sum((p[i][c] - Y[i][c]) ** 2 for i in range(n) for c in range(k)) / (n * k)\n\n    initial = mse()\n    for _ in range(int(epochs)):\n        p = predict()\n        G = [[(2.0 / (n * k)) * sum((p[i][c] - Y[i][c]) * h[i][a] for i in range(n)) for a in range(d_in)] for c in range(k)]\n        dA = [[sum(B[c][j] * G[c][a] for c in range(k)) for a in range(d_in)] for j in range(r)]\n        dB = [[sum(G[c][a] * A[j][a] for a in range(d_in)) for j in range(r)] for c in range(k)]\n        A = [[A[j][a] - lr * scale * dA[j][a] for a in range(d_in)] for j in range(r)]\n        B = [[B[c][j] - lr * scale * dB[c][j] for j in range(r)] for c in range(k)]\n    return A, B, initial, mse()\n\nrA, rB, rInit, rFinal = __ref_lora_fit(h, Y, W, A_init, B_init, 4, 2, 0.05, 800)\n__check('initial gegen Referenz', abs(res[\"initial_mse\"] - rInit) < 1e-9)\n__check('final gegen Referenz', abs(res[\"final_mse\"] - rFinal) < 1e-6)\n__check('A gegen Referenz', np.allclose(res[\"A\"], rA, atol=1e-6))\n__check('B gegen Referenz', np.allclose(res[\"B\"], rB, atol=1e-6))\nagain = lora_fit(h, Y, W, A_init, B_init, 4, 2, 0.05, 800)\n__check('Doppelaufruf deterministisch', np.array_equal(res[\"A\"], again[\"A\"]) and np.array_equal(res[\"B\"], again[\"B\"]))\n__check('freie Parameter = r*(d_in+d_out)', np.asarray(res[\"A\"]).size + np.asarray(res[\"B\"]).size == 10)",
    referenceSolver: "import numpy as np\n\ndef lora_fit(h, Y, W, A_init, B_init, alpha, r, lr, epochs):\n    \"\"\"Adapt a frozen map W through LoRA (alpha/r) * B @ A; train only A and B by GD on MSE.\"\"\"\n    h = np.array(h, dtype=float)\n    Y = np.array(Y, dtype=float)\n    W = np.array(W, dtype=float)\n    A = np.array(A_init, dtype=float)\n    B = np.array(B_init, dtype=float)\n    n = h.shape[0]\n    scale = float(alpha) / float(r)\n\n    def predict():\n        return h @ (W + scale * (B @ A)).T\n\n    def mse():\n        resid = predict() - Y\n        return float(np.mean(resid * resid))\n\n    initial = mse()\n    for _ in range(int(epochs)):\n        resid = predict() - Y\n        G = (2.0 / (n * Y.shape[1])) * (resid.T @ h)\n        dA = scale * (B.T @ G)\n        dB = scale * (G @ A.T)\n        A = A - lr * dA\n        B = B - lr * dB\n    return {\"A\": A, \"B\": B, \"initial_mse\": initial, \"final_mse\": mse()}\n",
    refNames: ['lora_fit'],
    prompt: "Final Boss LoRA-Training am Toy-Modell: Implementiere <code>lora_fit(h, Y, W, A_init, B_init, alpha, r, lr, epochs)</code>. Vertrag: Die Abbildung $W$ ist eingefroren; Vorhersage ist $h\\,(W + \\frac{\\alpha}{r}BA)^\\top$; trainiert werden nur $A$ und $B$ per Gradientenabstieg auf den MSE (Gradient $G = \\frac{2}{n k}(h(W + \\Delta)^\\top - Y)^\\top h$, dann $\\nabla_A = \\frac{\\alpha}{r}B^\\top G$, $\\nabla_B = \\frac{\\alpha}{r}GA^\\top$; gleichzeitige Updates). Rückgabe: <code>{\"A\": ..., \"B\": ..., \"initial_mse\": float, \"final_mse\": float}</code>; $W$ darf nicht mutiert werden. Toy-MLP mit gestellten Daten — kein echtes Fine-Tuning. Der Testcode prüft die Freeze-Checksumme von $W$, den Schwellwert (final &lt; initial/2), Rang- und Formverträge, die freie Parameterzahl $r(d_{in}+d_{out})$, eine unabhängige Schleifen-Referenz und Determinismus.",
    fullSolution: "import numpy as np\n\ndef lora_fit(h, Y, W, A_init, B_init, alpha, r, lr, epochs):\n    \"\"\"Adapt a frozen map W through LoRA (alpha/r) * B @ A; train only A and B by GD on MSE.\"\"\"\n    h = np.array(h, dtype=float)\n    Y = np.array(Y, dtype=float)\n    W = np.array(W, dtype=float)\n    A = np.array(A_init, dtype=float)\n    B = np.array(B_init, dtype=float)\n    n = h.shape[0]\n    scale = float(alpha) / float(r)\n\n    def predict():\n        return h @ (W + scale * (B @ A)).T\n\n    def mse():\n        resid = predict() - Y\n        return float(np.mean(resid * resid))\n\n    initial = mse()\n    for _ in range(int(epochs)):\n        resid = predict() - Y\n        G = (2.0 / (n * Y.shape[1])) * (resid.T @ h)\n        dA = scale * (B.T @ G)\n        dB = scale * (G @ A.T)\n        A = A - lr * dA\n        B = B - lr * dB\n    return {\"A\": A, \"B\": B, \"initial_mse\": initial, \"final_mse\": mse()}\n# Am Test: h ist 4x3, W 2x3, r=2 -> 10 freie Parameter statt 6 vollen (klein genug zum\n# Nachrechnen); der Verlust sinkt unter die Haelfte des Anfangswerts, W bleibt unberuehrt.",
    extraCount: 2,
    draw(r) {
      const n = randInt(r, 4, 6);
      const dH = randInt(r, 3, 4);
      const dOut = randInt(r, 2, 3);
      const rk = randInt(r, 1, 2);
      const h = Array.from({ length: n }, () => Array.from({ length: dH }, () => randInt(r, -3, 3)));
      const Y = Array.from({ length: n }, () => Array.from({ length: dOut }, () => randInt(r, -3, 3)));
      const W = Array.from({ length: dOut }, () => Array.from({ length: dH }, () => randInt(r, -2, 2) * 0.5));
      const A = Array.from({ length: rk }, () => Array.from({ length: dH }, () => randInt(r, -2, 2) * 0.25));
      const B = Array.from({ length: dOut }, () => Array.from({ length: rk }, () => randInt(r, -2, 2) * 0.25));
      return { h, Y, W, A, B, alpha: pick(r, [1, 2]), r: rk, lr: pick(r, [0.01, 0.05]), epochs: pick(r, [10, 25]) };
    },
  },
};

// Seeded probes per code case: the student function is compared against a
// renamed reference copy on drawn inputs (allclose for float outputs).
function seededChecksFor(caseId, entry, index) {
  if (caseId === 'fit-linear-gradient-loop') {
    return [
      `__fl${index} = fit_linear(${pyList(entry.x)}, ${pyList(entry.y)}, ${entry.lr}, ${entry.epochs})`,
      `__flr${index} = __ref_fit_linear(${pyList(entry.x)}, ${pyList(entry.y)}, ${entry.lr}, ${entry.epochs})`,
      `__check('seeded fit w ${index}', np.isclose(__fl${index}['w'], __flr${index}['w']))`,
      `__check('seeded fit b ${index}', np.isclose(__fl${index}['b'], __flr${index}['b']))`,
      `__check('seeded fit rmse ${index}', np.isclose(__fl${index}['rmse'], __flr${index}['rmse']))`,
    ].join('\n');
  }
  if (caseId === 'head-only-finetune') {
    return [
      `__ho${index} = head_only_ft(${pyList(entry.X)}, ${pyList(entry.Y)}, ${pyList(entry.W1)}, ${pyList(entry.W2)}, ${entry.lr}, ${entry.epochs})`,
      `__hor${index} = __ref_head_only_ft(${pyList(entry.X)}, ${pyList(entry.Y)}, ${pyList(entry.W1)}, ${pyList(entry.W2)}, ${entry.lr}, ${entry.epochs})`,
      `__check('seeded head W2 ${index}', np.allclose(__ho${index}['W2'], __hor${index}['W2']))`,
      `__check('seeded head mse ${index}', np.isclose(__ho${index}['final_mse'], __hor${index}['final_mse']))`,
    ].join('\n');
  }
  return [
    `__lo${index} = lora_fit(${pyList(entry.h)}, ${pyList(entry.Y)}, ${pyList(entry.W)}, ${pyList(entry.A)}, ${pyList(entry.B)}, ${entry.alpha}, ${entry.r}, ${entry.lr}, ${entry.epochs})`,
    `__lor${index} = __ref_lora_fit(${pyList(entry.h)}, ${pyList(entry.Y)}, ${pyList(entry.W)}, ${pyList(entry.A)}, ${pyList(entry.B)}, ${entry.alpha}, ${entry.r}, ${entry.lr}, ${entry.epochs})`,
    `__check('seeded lora A ${index}', np.allclose(__lo${index}['A'], __lor${index}['A']))`,
    `__check('seeded lora B ${index}', np.allclose(__lo${index}['B'], __lor${index}['B']))`,
    `__check('seeded lora mse ${index}', np.isclose(__lo${index}['final_mse'], __lor${index}['final_mse']))`,
  ].join('\n');
}

function seededBlock(caseDef, seedCases) {
  const checks = seedCases.map((entry, i) => seededChecksFor(caseDef.caseId, entry, i + 1)).join('\n');
  return `# seeded extra cases\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n${checks}`;
}

// --- capsule predicates / dispatch ------------------------------------------------

export function updateCaseOk(parameters, caseDef) {
  try {
    if (caseDef.kind === 'choice') return signCapsuleOk(parameters);
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === `${caseDef.baseTests}\n\n${seededBlock(caseDef, parameters.seedCases)}`;
  } catch { return false; }
}

export function genUpdateCase(seed, caseDef) {
  if (caseDef.kind === 'choice') {
    const drawn = genSignCapsule(seed);
    return {
      parameters: { caseId: caseDef.caseId, difficulty: caseDef.difficulty, ...drawn.parameters },
      expected: drawn.expected,
      choices: drawn.choices,
      prompt: drawn.prompt,
      fullSolution: drawn.fullSolution,
      activityType: caseDef.activityType,
      graderId: caseDef.graderId,
    };
  }
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, () => caseDef.draw(r));
  return {
    parameters: {
      caseId: caseDef.caseId,
      difficulty: caseDef.difficulty,
      packages: caseDef.packages,
      starterCode: caseDef.starterCode,
      tests: `${caseDef.baseTests}\n\n${seededBlock(caseDef, seedCases)}`,
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
    competencyIds: caseDef.competencyIds,
    activityType: caseDef.activityType,
    graderId: caseDef.graderId,
  };
}

export function solveUpdateFamily(parameters) {
  const caseDef = UPDATE_CASES[parameters?.caseId];
  if (!caseDef) throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
  if (caseDef.kind === 'choice') {
    return { correctText: signCorrectText(parameters) };
  }
  if (!updateCaseOk(parameters, caseDef)) {
    throw new Error('optimize-gradient-update-rule: Parameter verletzen die Kapselform');
  }
  return { referenceCode: caseDef.referenceSolver };
}

export const UPDATE_CONTRACT = {
  familyId: 'optimize-gradient-update-rule',
  familyGroup: 'optimize-update',
  summary: 'Wendet Gradientenabstieg-Updates korrekt an und implementiert den Regressionsgradienten als Lernschleife.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'sign-and-scale-of-update', propertyTest: false },
    { caseId: 'fit-linear-gradient-loop', propertyTest: false },
    { caseId: 'head-only-finetune', propertyTest: false },
    { caseId: 'lora-fit-toy', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'stretch', 'challenge'],
  competencyIds: ['c-grad-regression'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateUpdateFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = UPDATE_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  if (caseDef.kind === 'choice') {
    const drawn = drawFamilyInstance((subseed) => genUpdateCase(subseed, caseDef), {
      seed,
      caseId,
      difficulty,
      wantShape: (instance) => updateCaseOk(instance.parameters, caseDef),
      profileAccepts: (parameters) => updateCaseOk(parameters, caseDef),
      profiles: UPDATE_CONTRACT.difficultyProfiles,
    });
    return { ...drawn, masteryEligible: caseDef.masteryEligible };
  }
  return { ...genUpdateCase(seed, caseDef), masteryEligible: caseDef.masteryEligible ?? true };
}

export const FAMILY_SPEC = { ...UPDATE_CONTRACT, generate: generateUpdateFamily, solve: solveUpdateFamily };
