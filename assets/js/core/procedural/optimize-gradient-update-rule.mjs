// Procedural family optimize-gradient-update-rule: mixed capsule family.
//   - sign-and-scale-of-update (intro, single-choice): the seed draws the
//     gradient sign/magnitude and the learning rate; the four option texts
//     are rebuilt from the draw (correct step, wrong direction, missing lr,
//     wrong form) and the correct letter rotates.
//   - fit-linear-gradient-loop / head-only-finetune / lora-fit-toy
//     (stretch/challenge, pyodide): base tests verbatim plus a seeded block
//     of extra probes compared against a renamed reference copy.
// Blueprints: choice_bank_families.mjs (choice arm), reproduce-seeded-split.mjs
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
import doc from '../../../../content/families/optimize-gradient-update-rule.json' with { type: 'json' };

const anchor = (caseId) => doc.cases.find((entry) => entry.caseId === caseId);
const CHOICE_IDS = ['a', 'b', 'c', 'd'];

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
    expected: {},
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
    starterCode: anchor('fit-linear-gradient-loop').parameters.starterCode,
    baseTests: anchor('fit-linear-gradient-loop').parameters.tests,
    referenceSolver: anchor('fit-linear-gradient-loop').expected.referenceSolver,
    refNames: ['fit_linear'],
    prompt: "Final Boss Regression aus Grundoperationen: Implementiere <code>fit_linear(x, y, lr, epochs)</code>. Das Modell ist $\\hat{y} = w x + b$, Start bei $w = 0$ und $b = 0$. Pro Epoche ein Gradientenabstieg-Schritt auf den MSE mit den geschlossenen Gradienten $\\frac{2}{n}\\sum_i x_i r_i$ und $\\frac{2}{n}\\sum_i r_i$ (mit $r_i = w x_i + b - y_i$) und dem Update $w \\leftarrow w - \\mathrm{lr} \\cdot \\mathrm{grad}_w$, $b \\leftarrow b - \\mathrm{lr} \\cdot \\mathrm{grad}_b$. Rückgabe: ein Dictionary mit <code>\"w\"</code>, <code>\"b\"</code> (floats) und <code>\"rmse\"</code> — die Wurzel aus dem MSE des finalen Modells. Wirf <code>ValueError</code>, wenn <code>x</code> und <code>y</code> unterschiedliche Längen haben. Der Testcode gleicht dein Ergebnis innerhalb von $10^{-6}$ mit der Kleinst-Quadrate-Referenz <code>np.linalg.lstsq</code> ab.",
    fullSolution: anchor('fit-linear-gradient-loop').fullSolution,
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
    starterCode: anchor('head-only-finetune').parameters.starterCode,
    baseTests: anchor('head-only-finetune').parameters.tests,
    referenceSolver: anchor('head-only-finetune').expected.referenceSolver,
    refNames: ['head_only_ft'],
    prompt: "Toy-Head-Only-Feinabstimmung: Implementiere <code>head_only_ft(X, Y, W1, W2_init, lr, epochs)</code> am Toy-MLP. Vertrag: Der Rumpf ist eingefroren — die Features $h = \\mathrm{relu}(XW_1^\\top)$ werden einmal aus den <em>unveränderten</em> Eingaben berechnet; trainiert wird nur der Kopf $W_2$ mit Gradientenabstieg auf den MSE $\\frac{1}{n d_{\\text{out}}}\\sum (hW_2^\\top - Y)^2$ (Faktor $2/(n d_{\\text{out}})$ im Gradienten, gleichzeitige Updates). Rückgabe: <code>{\"W2\": ..., \"initial_mse\": float, \"final_mse\": float}</code>. Die Eingabearrays dürfen nicht mutiert werden. Dies ist ein Toy-MLP-Experiment — kein echtes Fine-Tuning. Der Testcode prüft die Freeze-Checksumme von $W_1$, den vorab festgelegten Erfolgs-Schwellwert (final < initial/2, hier auf dem Trainings-MSE des Toy-Experiments gemessen — ein echter Val-Split bleibt dem lokalen Projekt vorbehalten) (final &lt; initial/2), Konvergenz gegen ein bekanntes $W_2^\\ast$, eine unabhängige Schleifen-Referenz und Determinismus.",
    fullSolution: anchor('head-only-finetune').fullSolution,
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
    starterCode: anchor('lora-fit-toy').parameters.starterCode,
    baseTests: anchor('lora-fit-toy').parameters.tests,
    referenceSolver: anchor('lora-fit-toy').expected.referenceSolver,
    refNames: ['lora_fit'],
    prompt: "Final Boss LoRA-Training am Toy-Modell: Implementiere <code>lora_fit(h, Y, W, A_init, B_init, alpha, r, lr, epochs)</code>. Vertrag: Die Abbildung $W$ ist eingefroren; Vorhersage ist $h\\,(W + \\frac{\\alpha}{r}BA)^\\top$; trainiert werden nur $A$ und $B$ per Gradientenabstieg auf den MSE (Gradient $G = \\frac{2}{n k}(h(W + \\Delta)^\\top - Y)^\\top h$, dann $\\nabla_A = \\frac{\\alpha}{r}B^\\top G$, $\\nabla_B = \\frac{\\alpha}{r}GA^\\top$; gleichzeitige Updates). Rückgabe: <code>{\"A\": ..., \"B\": ..., \"initial_mse\": float, \"final_mse\": float}</code>; $W$ darf nicht mutiert werden. Toy-MLP mit gestellten Daten — kein echtes Fine-Tuning. Der Testcode prüft die Freeze-Checksumme von $W$, den Schwellwert (final &lt; initial/2), Rang- und Formverträge, die freie Parameterzahl $r(d_{in}+d_{out})$, eine unabhängige Schleifen-Referenz und Determinismus.",
    fullSolution: anchor('lora-fit-toy').fullSolution,
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
