// S4D5 Linalg-Familie (formula-scalar-product): ein Adapter hinter dem
// Registry-Seam für Skalarprodukt und Matrixeintrag. Ein geseedeter Fall
// (f-linalg-matmul-entry-01 über genMatmulEntryFresh) plus vier statische
// Falltypen, byte-identisch aus content/exercises/w05.json (w05-e1, w05-e12,
// w05-e13, w05-e3). w05-e16 (Code-Ausgabe) und w05-e9 (Begründung) teilen
// Lösungsweg und Antwortform nicht und bleiben Definitionen.

import { det2, genDet2, genLinear2Fresh, genMatmulEntryFresh, genShapePredict, solveShape } from './linalg_numpy_fresh_generators.mjs';
import { drawFamilyInstance } from './generator_draw_kit.mjs';
import { rank, solveLinear2 } from './w05_generators.mjs';

export const LINALG_DIFFICULTY_PROFILES = ['intro', 'core', 'stretch', 'challenge'];

const maxAbsEntry = (parameters) => Math.max(
  ...parameters.A.flat().map((value) => Math.abs(value)),
  ...parameters.B.flat().map((value) => Math.abs(value)),
);

function matmulProfileAccepts(difficulty) {
  if (difficulty === 'core') return null;
  if (difficulty === 'intro') return (parameters) => maxAbsEntry(parameters) <= 2;
  if (difficulty === 'stretch') {
    return (parameters) => parameters.A.flat().some((value) => value < 0)
      && parameters.B.flat().some((value) => value < 0);
  }
  return (parameters) => maxAbsEntry(parameters) >= 4;
}

/** Unabhängiger Solver: Matrixeintrag oder Skalarprodukt aus den
 *  Fallparametern, liest nie `expected` ab. */
export function solveScalarProduct(parameters) {
  // Statische Sonderformen ohne Operanden: gepinnte Werte (static authority).
  if (parameters.caseId === SCALAR_LOOP_STATIC.caseId) return { output: SCALAR_LOOP_STATIC.output };
  if (parameters.caseId === PRODUCT_RATIONALE_STATIC.caseId) return { kind: 'rubric' };
  if (parameters.form === 'dot-vectors') {
    const { u, v } = parameters;
    return { value: u[0] * v[0] + u[1] * v[1] + u[2] * v[2] };
  }
  if (parameters.form === 'matmul-entry') {
    const { A, B, entry } = parameters;
    const [i, j] = entry;
    return { value: A[i - 1][0] * B[0][j - 1] + A[i - 1][1] * B[1][j - 1] };
  }
  throw new Error(`formula-scalar-product: unbekannte Form ${parameters.form}`);
}

export function generateScalarProductFamily({ seed, caseId, difficulty }) {
  if (caseId === SCALAR_LOOP_STATIC.caseId) {
    return {
      parameters: { caseId, difficulty, snippet: SCALAR_LOOP_STATIC.snippet },
      expected: { output: SCALAR_LOOP_STATIC.output },
      prompt: SCALAR_LOOP_STATIC.prompt,
      fullSolution: SCALAR_LOOP_STATIC.fullSolution,
      activityType: 'predict-output',
    };
  }
  if (caseId === PRODUCT_RATIONALE_STATIC.caseId) {
    return {
      parameters: { caseId, difficulty, minWords: PRODUCT_RATIONALE_STATIC.minWords },
      rubric: PRODUCT_RATIONALE_STATIC.rubric.map((item) => ({ ...item })),
      expected: { kind: 'rubric' },
      prompt: PRODUCT_RATIONALE_STATIC.prompt,
      fullSolution: PRODUCT_RATIONALE_STATIC.fullSolution,
      activityType: 'short-rationale',
      graderId: 'manual-rubric',
    };
  }
  const statisch = SCALAR_PRODUCT_STATIC[caseId];
  if (statisch) {
    return {
      parameters: { caseId, difficulty, form: statisch.form, ...statisch.data },
      expected: { kind: 'integer', value: statisch.value },
      prompt: statisch.prompt,
      fullSolution: statisch.fullSolution,
    };
  }
  if (caseId !== 'matmul-entry-seeded') throw new Error(`Unbekannter Fall ${caseId}`);
  const drawn = drawFamilyInstance(genMatmulEntryFresh, {
    seed,
    caseId,
    difficulty,
    wantShape: () => true,
    profileAccepts: matmulProfileAccepts(difficulty),
    profiles: LINALG_DIFFICULTY_PROFILES,
  });
  return {
    parameters: { caseId, difficulty, form: 'matmul-entry', ...drawn.parameters },
    expected: { kind: 'integer', value: drawn.expected },
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

// Gepinnte statische Quellen aus content/exercises/w05.json (unverändert).
const SCALAR_PRODUCT_STATIC = {
  'matmul-entry-w05-e1': {
    form: 'matmul-entry',
    data: { A: [[2, 1], [1, 3]], B: [[0, 1], [2, -1]], entry: [1, 2] },
    value: 1,
    prompt: 'Gegeben $A=\\begin{pmatrix}2&1\\\\1&3\\end{pmatrix}$ und $B=\\begin{pmatrix}0&1\\\\2&-1\\end{pmatrix}$. Berechne den Eintrag $c_{12}$ von $C=AB$ (obere Zeile, rechte Spalte).',
    fullSolution: '$AB = \\begin{pmatrix}2\\cdot0+1\\cdot2 & 2\\cdot1+1\\cdot(-1)\\\\1\\cdot0+3\\cdot2 & 1\\cdot1+3\\cdot(-1)\\end{pmatrix} = \\begin{pmatrix}2&1\\\\6&-2\\end{pmatrix}$, also $c_{12}=1$.',
  },
  'matmul-entry-w05-e12': {
    form: 'matmul-entry',
    data: { A: [[-2, -4], [-2, 4]], B: [[-2, 1], [2, -1]], entry: [1, 1] },
    value: -4,
    prompt: 'Gegeben $A=\\begin{pmatrix}-2&-4\\\\-2&4\\end{pmatrix}$ und $B=\\begin{pmatrix}-2&1\\\\2&-1\\end{pmatrix}$. Berechne den Eintrag $c_{11}$ von $C=AB$ (obere Zeile, linke Spalte).',
    fullSolution: '$c_{11} = (-2)\\cdot(-2) + (-4)\\cdot 2 = 4 - 8 = -4$.',
  },
  'dot-product-w05-e13': {
    form: 'dot-vectors',
    data: { u: [-3, -4, 2], v: [2, -5, 4] },
    value: 22,
    prompt: 'Gegeben $u=(-3,-4,2)$ und $v=(2,-5,4)$. Berechne das Skalarprodukt $u^\\top v$.',
    fullSolution: '$u^\\top v = (-3)\\cdot 2 + (-4)\\cdot(-5) + 2\\cdot 4 = -6 + 20 + 8 = 22$.',
  },
  'dot-product-w05-e3': {
    form: 'dot-vectors',
    data: { u: [2, -1, 3], v: [1, 4, -2] },
    value: -8,
    prompt: 'Gegeben $u=(2,-1,3)$ und $v=(1,4,-2)$. Berechne das Skalarprodukt $u^\\top v$.',
    fullSolution: '$u^\\top v = 2\\cdot1 + (-1)\\cdot4 + 3\\cdot(-2) = 2 - 4 - 6 = -8$.',
  },
};

export const SCALAR_PRODUCT_CONTRACT = {
  familyId: 'formula-scalar-product',
  familyGroup: 'formula-apply',
  summary: 'Berechnet Skalarprodukt bzw. Matrixeintrag als Summe der paarweisen komponentenweisen Produkte.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'matmul-entry-seeded' },
    { caseId: 'matmul-entry-w05-e1', propertyTest: false },
    { caseId: 'matmul-entry-w05-e12', propertyTest: false },
    { caseId: 'dot-product-w05-e13', propertyTest: false },
    { caseId: 'dot-product-w05-e3', propertyTest: false },
    { caseId: 'scalar-loop-output', propertyTest: false },
    { caseId: 'product-definition-rationale', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-matrices'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

// --- classify-matrix-shape ---------------------------------------------------
// Statisch aus w05-e2 (Single-Choice, Shape eines Matrixprodukts).

const MATRIX_SHAPE_STATIC = {
  caseId: 'shape-product-drawn',
  prompt: '$A$ ist eine $3\\times2$-Matrix und $B$ eine $2\\times4$-Matrix. Welche Aussage ist korrekt?',
  choices: [
    { id: 'a', text: '$AB$ ist definiert und hat die Form $3\\times4$; $BA$ ist nicht definiert.', correct: true },
    { id: 'b', text: '$AB$ und $BA$ sind beide definiert.', correct: false },
    { id: 'c', text: '$AB$ ist definiert und hat die Form $2\\times2$.', correct: false },
    { id: 'd', text: 'Keines der Produkte ist definiert.', correct: false },
  ],
  fullSolution: 'Spaltenzahl($A$)=2 = Zeilenzahl($B$)=2, also ist $AB$ definiert mit Form $3\\times4$. Für $BA$ müsste Spaltenzahl($B$)=4 gleich Zeilenzahl($A$)=3 sein — falsch, also undefiniert.',
};

export function solveMatrixShape() {
  return { correctText: MATRIX_SHAPE_STATIC.choices.find((choice) => choice.correct).text };
}

export function generateMatrixShapeFamily({ seed, caseId, difficulty }) {
  if (caseId !== MATRIX_SHAPE_STATIC.caseId) throw new Error(`Unbekannter Fall ${caseId}`);
  return {
    parameters: { caseId, difficulty, dimsA: [3, 2], dimsB: [2, 4] },
    expected: { correctChoice: 'a' },
    choices: MATRIX_SHAPE_STATIC.choices.map((choice) => ({ ...choice })),
    prompt: MATRIX_SHAPE_STATIC.prompt,
    fullSolution: MATRIX_SHAPE_STATIC.fullSolution,
  };
}

export const MATRIX_SHAPE_CONTRACT = {
  familyId: 'classify-matrix-shape',
  familyGroup: 'classify-concept',
  summary: 'Ordnet einer Matrix- oder Vektoroperation die resultierende Shape zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'static',
  masteryEligible: true,
  caseTypes: [{ caseId: 'shape-product-drawn', propertyTest: false }],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-matrices'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

// --- classify-independence-multiple -------------------------------------------
// Statisch aus w05-e4 (Single-Choice, Abhängigkeit am expliziten Vielfachen).

const INDEPENDENCE_STATIC = {
  caseId: 'dependent-pair-double',
  prompt: 'Sind $b_1=(1,2)$, $b_2=(2,4)$ linear unabhängig?',
  choices: [
    { id: 'a', text: 'Nein — $b_2 = 2\\,b_1$, also ist die Menge abhängig.', correct: true },
    { id: 'b', text: 'Ja — beide Vektoren sind vom Nullvektor verschieden.', correct: false },
    { id: 'c', text: 'Ja — zwei Vektoren im $\\mathbb{R}^2$ sind immer unabhängig.', correct: false },
    { id: 'd', text: 'Das lässt sich ohne Rechnung nicht entscheiden.', correct: false },
  ],
  // Ohne Lehrbuch-Zitat (Public-Build lässt keine privaten Marker in
  // Runtime-JS zu; tools/public_content.mjs redigiert Content identisch).
  fullSolution: 'Wegen $b_2 = 2b_1$ gilt $(-2)\\,b_1 + 1\\,b_2 = 0$ mit Koeffizienten $\\neq 0$ — die Menge ist linear abhängig.',
};

export function solveIndependenceMultiple() {
  return { correctText: INDEPENDENCE_STATIC.choices.find((choice) => choice.correct).text };
}

export function generateIndependenceMultipleFamily({ seed, caseId, difficulty }) {
  if (caseId !== INDEPENDENCE_STATIC.caseId) throw new Error(`Unbekannter Fall ${caseId}`);
  return {
    parameters: { caseId, difficulty, vectors: [[1, 2], [2, 4]] },
    expected: { correctChoice: 'a' },
    choices: INDEPENDENCE_STATIC.choices.map((choice) => ({ ...choice })),
    prompt: INDEPENDENCE_STATIC.prompt,
    fullSolution: INDEPENDENCE_STATIC.fullSolution,
  };
}

export const INDEPENDENCE_MULTIPLE_CONTRACT = {
  familyId: 'classify-independence-multiple',
  familyGroup: 'classify-concept',
  summary: 'Entscheidet lineare Abhängigkeit eines Vektorpaars durch Erkennen eines expliziten Vielfachen und Bilden der nichttrivialen Nullkombination.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'static',
  masteryEligible: true,
  caseTypes: [{ caseId: 'dependent-pair-double', propertyTest: false }],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-independence'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

// --- construct-matvec-shape-contract ------------------------------------------
// Statisch aus w05-e14 (Parsons, Dimensionsvertrag vor der Operation).
// w05-e8 (Python-Code) teilt den Lösungsweg, aber nicht Antwortform und
// Evidence, und bleibt Definition, bis Code-Fälle einen eigenen Vertrag
// bekommen.

const MATVEC_PARSONS = {
  caseId: 'matvec-contract-order',
  prompt: 'Bringe die Zeilen der Referenzimplementierung von `matvec(A, v)` (Begleiter zu w05-e8) in die richtige Reihenfolge. Zwei Zeilen sind Distraktoren, die nicht zur Lösung gehören — sortiere sie aus.',
  fragments: [
    { id: 'p1', text: 'def matvec(A, v):' },
    { id: 'p2', text: '    A = np.asarray(A)' },
    { id: 'p3', text: '    v = np.asarray(v)' },
    { id: 'p4', text: '    assert A.ndim == 2 and v.ndim == 1 and A.shape[1] == v.shape[0]' },
    { id: 'p5', text: '    return A @ v' },
    { id: 'd1', text: '    assert v.ndim == 2 and A.ndim == 1 and v.shape[1] == A.shape[0]' },
    { id: 'd2', text: '    return v @ A' },
  ],
  initialOrder: ['p1', 'd1', 'p3', 'p5', 'p2', 'd2', 'p4'],
  solutionOrder: ['p1', 'p2', 'p3', 'p4', 'p5'],
  distractors: ['d1', 'd2'],
  fullSolution: 'Richtige Folge: `def matvec(A, v):` → `A = np.asarray(A)` → `v = np.asarray(v)` → `assert A.ndim == 2 and v.ndim == 1 and A.shape[1] == v.shape[0]` → `return A @ v`. Die Distraktoren prüfen die Dimensionen vertauscht (würde gültige Aufrufe ablehnen) bzw. rechnen `v @ A` (für 1-d v nicht definiert).',
};

export function solveMatvecShapeFamily(parameters) {
  if (parameters.caseId === MATVEC_CODE_STATIC.caseId) return { reference: MATVEC_CODE_STATIC.referenceSolver };
  return { solutionOrder: [...MATVEC_PARSONS.solutionOrder] };
}

export function generateMatvecShapeFamily({ seed, caseId, difficulty }) {
  if (caseId === MATVEC_CODE_STATIC.caseId) {
    return {
      parameters: { caseId, difficulty, packages: [...MATVEC_CODE_STATIC.packages], starterCode: MATVEC_CODE_STATIC.starterCode },
      expected: { kind: 'reference-solver', referenceSolver: MATVEC_CODE_STATIC.referenceSolver },
      prompt: MATVEC_CODE_STATIC.prompt,
      fullSolution: MATVEC_CODE_STATIC.fullSolution,
      activityType: 'python-code',
      graderId: 'pyodide',
    };
  }
  if (caseId !== MATVEC_PARSONS.caseId) throw new Error(`Unbekannter Fall ${caseId}`);
  return {
    parameters: {
      caseId,
      difficulty,
      fragments: MATVEC_PARSONS.fragments.map((fragment) => ({ ...fragment })),
      initialOrder: [...MATVEC_PARSONS.initialOrder],
    },
    expected: { kind: 'ordered-lines', solutionOrder: [...MATVEC_PARSONS.solutionOrder], distractors: [...MATVEC_PARSONS.distractors] },
    prompt: MATVEC_PARSONS.prompt,
    fullSolution: MATVEC_PARSONS.fullSolution,
  };
}

export const MATVEC_SHAPE_CONTRACT = {
  familyId: 'construct-matvec-shape-contract',
  familyGroup: 'construct-program',
  summary: 'Sequenziert eine Matrix-Vektor-Operation mit vorangestelltem Dimensionsvertrag: Normalisierung, Assert-Prüfung, erst dann die Operation.',
  taskArchetype: 'program-ordering',
  authorityMode: 'static',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'matvec-contract-order', propertyTest: false },
    { caseId: 'matvec-code-reference', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-numpy-basics', 'c-python-reading'],
  graderId: 'deterministic',
  activityType: 'parsons',
};

// --- formula-det2-independence -------------------------------------------------
// Geseedet über genDet2 (Determinante als Unabhängigkeitsbeleg).

function det2ProfileAccepts(difficulty) {
  if (difficulty === 'core') return null;
  if (difficulty === 'intro') {
    return (parameters) => Math.max(...parameters.A.flat().map((value) => Math.abs(value))) <= 3;
  }
  if (difficulty === 'stretch') return (parameters) => det2(parameters.A) < 0;
  return (parameters) => Math.max(...parameters.A.flat().map((value) => Math.abs(value))) >= 5;
}

export function solveDet2Family(parameters) {
  return { value: det2(parameters.A) };
}

export function generateDet2Family({ seed, caseId, difficulty }) {
  if (caseId !== 'det2-seeded-columns') throw new Error(`Unbekannter Fall ${caseId}`);
  const drawn = drawFamilyInstance(genDet2, {
    seed,
    caseId,
    difficulty,
    wantShape: () => true,
    profileAccepts: det2ProfileAccepts(difficulty),
    profiles: LINALG_DIFFICULTY_PROFILES,
  });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { kind: 'integer', value: drawn.expected },
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

export const DET2_CONTRACT = {
  familyId: 'formula-det2-independence',
  familyGroup: 'formula-apply',
  summary: 'Prüft lineare Unabhängigkeit zweier Spalten über die 2×2-Determinante als geschlossene Formel mit Schluss von det ungleich 0 auf Unabhängigkeit.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [{ caseId: 'det2-seeded-columns' }],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-independence'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

// --- transform-rank-dependence-rowops ------------------------------------------
// Statisch aus w05-e10 (Rang über Zeilenstufenform, Solver: rank).

const RANK_STATIC = {
  caseId: 'rank-3x3-staircase',
  prompt: 'Bestimme den Rang der Matrix \\[A=\\begin{pmatrix}2&1&1\\\\1&2&0\\\\3&3&1\\end{pmatrix}\\] mit Gauß-Elimination (Zeilenstufenform) und gib ihn als ganze Zahl ein.',
  A: [[2, 1, 1], [1, 2, 0], [3, 3, 1]],
  value: 2,
  // Ohne Lehrbuch-Zitat, siehe oben.
  fullSolution: 'III − I − II: $(3,3,1)-(2,1,1)-(1,2,0)=(0,0,0)$, also eine Nullzeile. Zeile 1 und Zeile 2 sind unabhängig (keine Vielfachen), damit ist $\\operatorname{rang}(A)=2$.',
};

export function solveRankRowops(parameters) {
  return { value: rank(parameters.A) };
}

export function generateRankRowopsFamily({ seed, caseId, difficulty }) {
  if (caseId !== RANK_STATIC.caseId) throw new Error(`Unbekannter Fall ${caseId}`);
  return {
    parameters: { caseId, difficulty, A: RANK_STATIC.A.map((row) => [...row]) },
    expected: { kind: 'integer', value: RANK_STATIC.value },
    prompt: RANK_STATIC.prompt,
    fullSolution: RANK_STATIC.fullSolution,
  };
}

export const RANK_ROWOPS_CONTRACT = {
  familyId: 'transform-rank-dependence-rowops',
  familyGroup: 'transform-terms',
  summary: 'Prüft lineare Abhängigkeit bzw. Rang von Zeilen über Zeilenoperationen.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'static',
  masteryEligible: true,
  caseTypes: [{ caseId: 'rank-3x3-staircase', propertyTest: false }],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-independence', 'c-linalg-gauss'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

// --- transform-system-2x2-elimination ------------------------------------------
// Geseedet über genLinear2Fresh plus zwei statische w05-Fälle (Vektorpaar).

function linear2ProfileAccepts(difficulty) {
  if (difficulty === 'core') return null;
  if (difficulty === 'intro') {
    return (parameters) => Math.max(...parameters.A.flat().map((value) => Math.abs(value))) <= 2;
  }
  if (difficulty === 'stretch') return (parameters) => parameters.b.some((value) => value < 0);
  return (parameters) => Math.max(...parameters.A.flat().map((value) => Math.abs(value))) >= 4;
}

const SYSTEM_STATIC = {
  'system-w05-e11': {
    A: [[-1, -3], [2, 3]],
    b: [-20, 28],
    solution: [8, 4],
    prompt: 'Übung zur Gauß-Elimination mit anderen Zahlen als w05-e6: Löse \\[ -x - 3y = -20, \\qquad 2x + 3y = 28 \\] und gib die Lösung als Paar `(x, y)` ein.',
    fullSolution: 'I + II eliminiert $y$: $x=8$. Einsetzen in II: $16+3y=28 \\Rightarrow y=4$. Probe: $-8-12=-20$, $16+12=28$.',
  },
  'system-w05-e6': {
    A: [[2, 1], [1, -3]],
    b: [5, -8],
    solution: [1, 3],
    prompt: 'Löse das Gleichungssystem \\[ 2x + y = 5, \\qquad x - 3y = -8 \\] und gib die Lösung als Paar `(x, y)` ein.',
    fullSolution: 'Aus I: $y=5-2x$. Einsetzen in II: $x - 3(5-2x) = -8 \\Rightarrow 7x = 7 \\Rightarrow x=1$, $y=3$. Probe: $2+3=5$, $1-9=-8$.',
  },
};

export function solveSystem2x2(parameters) {
  return { solution: solveLinear2(parameters.A, parameters.b) };
}

export function generateSystem2x2Family({ seed, caseId, difficulty }) {
  const statisch = SYSTEM_STATIC[caseId];
  if (statisch) {
    return {
      parameters: { caseId, difficulty, A: statisch.A.map((row) => [...row]), b: [...statisch.b] },
      expected: { kind: 'integer-pair', solution: [...statisch.solution] },
      prompt: statisch.prompt,
      fullSolution: statisch.fullSolution,
    };
  }
  if (caseId !== 'system-seeded-2x2') throw new Error(`Unbekannter Fall ${caseId}`);
  const drawn = drawFamilyInstance(genLinear2Fresh, {
    seed,
    caseId,
    difficulty,
    wantShape: () => true,
    profileAccepts: linear2ProfileAccepts(difficulty),
    profiles: LINALG_DIFFICULTY_PROFILES,
  });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { kind: 'integer-pair', solution: [...drawn.expected] },
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

export const SYSTEM_2X2_CONTRACT = {
  familyId: 'transform-system-2x2-elimination',
  familyGroup: 'transform-terms',
  summary: 'Löst ein 2×2-Gleichungssystem über Eliminationsstrategie mit Rückeinsetzen zu einem Lösungspaar.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'system-seeded-2x2' },
    { caseId: 'system-w05-e11', propertyTest: false },
    { caseId: 'system-w05-e6', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-gauss'],
  graderId: 'deterministic',
  activityType: 'vector',
};

// --- validate-shape-contract ---------------------------------------------------
// Geseedet über genShapePredict plus statischen w18-e3 (drei Printzeilen).

const SHAPE_W18 = {
  caseId: 'shapes-w18-broadcast-axes',
  snippet: 'import numpy as np\nX = np.zeros((4, 3))\nW = np.zeros((3, 5))\nH = X @ W\nprint(H.shape)\nb = np.arange(5.0)\nprint((H + b).shape)\nprint(H.ndim, W.ndim, b.ndim)',
  output: '(4, 5)\n(4, 5)\n2 2 1',
  prompt: 'Formen lesen: Was gibt dieses NumPy-Programm aus? Sage die Ausgaben der drei <code>print</code>-Zeilen vorher, ohne den Code auszuführen. Hinweis: <code>b</code> hat die Form <code>(5,)</code> und broadcastet zeilenweise.',
  fullSolution: '$(4,3) @ (3,5)$ spannt die 3 auf: <code>H.shape</code> ist <code>(4, 5)</code>. <code>H + b</code> broadcastet <code>(5,)</code> als <code>(1, 5)</code> auf alle 4 Zeilen, Form bleibt <code>(4, 5)</code>. Die Achsenzahlen: <code>H.ndim = 2</code>, <code>W.ndim = 2</code>, <code>b.ndim = 1</code>. Ausgabe: <code>(4, 5)</code>, <code>(4, 5)</code>, <code>2 2 1</code>.',
};

function shapeProfileAccepts(difficulty) {
  if (difficulty === 'core') return null;
  if (difficulty === 'intro') return (parameters) => parameters.rows <= 3;
  if (difficulty === 'stretch') return (parameters) => parameters.shape === 'transpose' || parameters.shape === 'outer';
  return (parameters) => parameters.n >= 20;
}

export function solveShapeContract(parameters) {
  if (parameters.caseId === SHAPE_W18.caseId) return { output: SHAPE_W18.output };
  return { output: `(${solveShape(parameters.shape, parameters).join(', ')})` };
}

export function generateShapeContractFamily({ seed, caseId, difficulty }) {
  if (caseId === SHAPE_W18.caseId) {
    return {
      parameters: { caseId, difficulty, snippet: SHAPE_W18.snippet },
      expected: { output: SHAPE_W18.output },
      prompt: SHAPE_W18.prompt,
      fullSolution: SHAPE_W18.fullSolution,
    };
  }
  if (caseId !== 'shapes-seeded-predict') throw new Error(`Unbekannter Fall ${caseId}`);
  const drawn = drawFamilyInstance(genShapePredict, {
    seed,
    caseId,
    difficulty,
    wantShape: () => true,
    profileAccepts: shapeProfileAccepts(difficulty),
    profiles: LINALG_DIFFICULTY_PROFILES,
  });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { output: drawn.expected.output },
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

export const SHAPE_CONTRACT = {
  familyId: 'validate-shape-contract',
  familyGroup: 'validate-contract',
  summary: 'Prüft Shape- und Broadcast-Verträge von Tensoren und Matrizen.',
  taskArchetype: 'output-predict-lines',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'shapes-seeded-predict' },
    { caseId: 'shapes-w18-broadcast-axes', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-numpy-basics', 'c-dl-tensors'],
  graderId: 'deterministic',
  activityType: 'predict-output',
};

// --- W05-Restfälle in bestehenden Familien (S4D7) --------------------------------
// w05-e16 (numpy-Schleife) als statischer Predict-Fall: gleiche
// komponentenweise Produkte wie der Rest der Familie.
// w05-e9 (Begründung) als statischer Rubric-Fall: Rubrik und Mindestwörter
// aus der Definition, Grader manual-rubric.
// w05-e8 (Code) als Fall im Matvec-Vertrag: gleiche Tests wie die
// Definition (buildPythonTests-Verzweigung), Startercode übernommen.

const SCALAR_LOOP_STATIC = {
  caseId: 'scalar-loop-output',
  snippet: 'A = ((2, 1), (1, 3))\nx = (2, -1)\nzeilen = []\nfor i in range(2):\n    zeilen.append(A[i][0]*x[0] + A[i][1]*x[1])\nprint(zeilen)',
  output: '[3, -1]',
  prompt: 'Was gibt dieses Programm aus? Sage die Ausgabe von <code>print(zeilen)</code> vorher, ohne den Code auszuführen.',
  fullSolution: 'zeilen[0] = A[0][0]·x[0] + A[0][1]·x[1] = 2·2 + 1·(−1) = 3; zeilen[1] = 1·2 + 3·(−1) = −1. Ausgabe: <code>[3, -1]</code> — Zeile-mal-Spalte wie beim Matrixprodukt.',
};

const PRODUCT_RATIONALE_STATIC = {
  caseId: 'product-definition-rationale',
  minWords: 25,
  rubric: [
    { id: 'r1', must: 'Jeder Eintrag $c_{ij}$ ist ein Skalarprodukt: Zeile $i$ von $A$ mal Spalte $j$ von $B$; dafür müssen die Längen (Spaltenzahl von $A$ = Zeilenzahl von $B$) übereinstimmen.', weight: 2 },
    { id: 'r2', must: 'Spaltenbild: $Ab$ ist eine Kombination der Spalten von $A$ mit Koeffizienten aus $b$.', weight: 1 },
    { id: 'r3', must: 'Ergebnisform von $C$: (Zeilenzahl $A$) $\\times$ (Spaltenzahl $B$).', weight: 1 },
    { id: 'r4', must: 'Mindestens ein konkreter Zahlenbezug oder ein Grenzfall (z. B. nicht definiertes $BA$).', weight: 1 },
  ],
  prompt: 'Erkläre in 3-5 Sätzen ohne Unterlagen: Warum ist das Produkt $C=AB$ nur definiert, wenn Spaltenzahl($A$) = Zeilenzahl($B$), und wie entsteht der Eintrag $c_{ij}$? Begründe mit dem Spaltenbild ($Ab$ kombiniert Spalten). Schreibe zuerst deinen eigenen Versuch — die Musterantwort erscheint erst danach.',
  fullSolution: 'Musterantwort: Jeder Eintrag $c_{ij}=\\sum_k a_{ik}b_{kj}$ ist ein Skalarprodukt der $i$-ten Zeile von $A$ mit der $j$-ten Spalte von $B$; ein Skalarprodukt braucht gleich lange Vektoren, also Spaltenzahl($A$)=Zeilenzahl($B$). Im Spaltenbild ist $Ab$ eine gewichtete Summe der Spalten von $A$; $AB$ wendet dies auf alle Spalten von $B$ an. $C$ erbt die Zeilenzahl von $A$ und die Spaltenzahl von $B$. Beispiel: $A\\in\\mathbb{R}^{3\\times2}$, $B\\in\\mathbb{R}^{2\\times4}$ macht $AB\\in\\mathbb{R}^{3\\times4}$, während $BA$ undefiniert bleibt.',
};

const MATVEC_CODE_STATIC = {
  caseId: 'matvec-code-reference',
  packages: ['numpy'],
  starterCode: 'import numpy as np\n\ndef matvec(A, v):\n    """Return A @ v after checking shapes."""\n    # pruefe Shapes, dann berechne\n    ...\n',
  referenceSolver: 'def matvec(A, v):\n    A = np.asarray(A); v = np.asarray(v)\n    assert A.ndim == 2 and v.ndim == 1 and A.shape[1] == v.shape[0]\n    return A @ v',
  prompt: 'Implementiere `matvec(A, v)`, das $A\\,v$ mit NumPy berechnet und VOR der Berechnung prüft, dass `A` 2-dimensional, `v` 1-dimensional und `A.shape[1] == v.shape[0]` ist — sonst `AssertionError`. Der Testcode ist von deiner Eingabe getrennt und prüft Wert und Shape-Verhalten.',
  fullSolution: 'import numpy as np\n\ndef matvec(A, v):\n    A = np.asarray(A)\n    v = np.asarray(v)\n    assert A.ndim == 2 and v.ndim == 1 and A.shape[1] == v.shape[0]\n    return A @ v\n\n# matvec([[1,2],[3,4]], [1,1]) -> array([3, 7])',
};

// --- Autorierte Statiken (S4D7, Noa-freigegeben) --------------------------------
// Vier kanonische Familien ohne Quelle, nach solutionPath und
// Fehlerhypothesen des Katalogs autoriert. Je ein Falltyp, statisch.

const COLUMN_STATIC = {
  caseId: 'column-coefficients-double',
  prompt: 'Gegeben $s_1=(2,1)$, $s_2=(-1,3)$ und $w=(3,5)$. Schreibe $w$ als Kombination der Spalten: $w = a\\,s_1 + b\\,s_2$. Welches Paar $(a,b)$ stimmt?',
  choices: [
    { id: 'a', text: '$(a,b) = (2,1)$: $2(2,1) + (-1,3) = (3,5)$.', correct: true },
    { id: 'b', text: '$(a,b) = (1,2)$: Koeffizienten in Spaltenreihenfolge.', correct: false },
    { id: 'c', text: '$(a,b) = (3,5)$: Zielvektor als Koeffizienten.', correct: false },
    { id: 'd', text: '$(a,b) = (2,0)$: nur die erste Spalte trägt.', correct: false },
  ],
  fullSolution: 'Komponentenweise: $2(2,1) + 1(-1,3) = (4-1, 2+3) = (3,5) = w$. (1,2) vertauscht Koeffizienten mit Spalten, (3,5) verwechselt Ziel mit Koeffizienten, (2,0) ignoriert die zweite Spalte.',
};

const RANK_CASE_STATIC = {
  caseId: 'echelon-read-rank-case',
  prompt: 'Das System in $x,y,z$ steht in Zeilenstufenform: \\[\\begin{array}{rrr|r}1&0&2&3\\\\0&1&-1&2\\\\0&0&0&0\\end{array}\\] Was folgt für Rang, freie Variable und Lösungsfall?',
  choices: [
    { id: 'a', text: 'Rang 2, $z$ frei, unendlich viele Lösungen.', correct: true },
    { id: 'b', text: 'Rang 3, keine freie Variable, genau eine Lösung.', correct: false },
    { id: 'c', text: 'Keine Lösung, die Nullzeile ist ein Widerspruch.', correct: false },
    { id: 'd', text: 'Rang 2 und genau eine Lösung.', correct: false },
  ],
  fullSolution: 'Zwei Pivotzeilen, also Rang 2. Drei Variablen minus Rang 2: $z$ ist frei, unendlich viele Lösungen. Die Nullzeile liest sich als $0=0$, nicht als Widerspruch.',
};

const GAUSS_STATIC = {
  caseId: 'valid-operation-rhs',
  prompt: 'System: $2x+y=5$, $x-3y=-8$. Welche Zeilenoperation erhält garantiert die Lösungsmenge?',
  choices: [
    { id: 'a', text: 'II $\\leftarrow$ II $-$ 2·I, rechte Seite mitgeführt: $-3x-5y=-18$.', correct: true },
    { id: 'b', text: 'I $\\leftarrow$ 0·I, danach ist das System einfacher.', correct: false },
    { id: 'c', text: 'II $\\leftarrow$ II $-$ 2·(linke Seite von I), rechte Seite bleibt $-8$.', correct: false },
    { id: 'd', text: 'II streichen — I allein bestimmt die Lösung.', correct: false },
  ],
  fullSolution: 'Nur umkehrbare Operationen mit vollständiger Gleichung erhalten die Lösungsmenge: $(x-3y)-2(2x+y) = -8-10$ gibt $-3x-5y=-18$. Nullskalierung ist nicht umkehrbar, vergessene rechte Seite und gestrichene Zeilen ändern die Menge.',
};

const SYNTHESIS_STATIC = {
  caseId: 'synthesis-three-contracts',
  prompt: 'Drei Verträge in einer Synthese: Shape prüfen und `matvec` rechnen, Rang per Elimination mit Zeilentausch, System per `solve` mit Shape-Prüfung. Welche Implementierung erfüllt alle drei?',
  choices: [
    { id: 'a', text: '`assert` vor jeder Operation; Rang zählt Pivotzeilen nach Elimination mit Zeilentausch; `solve` erst nach Shape-Prüfung.', correct: true },
    { id: 'b', text: 'Erst rechnen, dann die Shapes prüfen — das Ergebnis verrät Fehler von selbst.', correct: false },
    { id: 'c', text: 'Rang ohne Zeilentausch: Pivotspalte mit Null oben wird übersprungen.', correct: false },
    { id: 'd', text: 'Ein hartkodierter Testfall je Funktion als Beleg.', correct: false },
  ],
  fullSolution: 'Verträge trennen: Shape-Validierung plus `matmul`, Pivot-Elimination mit Zeilentausch für den Rang, Shape-Validierung plus `solve` für das System. Prüfen vor Rechnen, keine hartkodierten Fälle.',
};

function staticChoiceSolver(staticEntry) {
  return { correctText: staticEntry.choices.find((choice) => choice.correct).text };
}

function generateStaticChoice(staticEntry) {
  return ({ seed, caseId, difficulty }) => {
    if (caseId !== staticEntry.caseId) throw new Error(`Unbekannter Fall ${caseId}`);
    return {
      parameters: { caseId, difficulty },
      expected: { correctChoice: staticEntry.choices.find((choice) => choice.correct).id },
      choices: staticEntry.choices.map((choice) => ({ ...choice })),
      prompt: staticEntry.prompt,
      fullSolution: staticEntry.fullSolution,
    };
  };
}

export const generateColumnFamily = generateStaticChoice(COLUMN_STATIC);
export const solveColumnFamily = () => staticChoiceSolver(COLUMN_STATIC);
export const COLUMN_CONTRACT = {
  familyId: 'classify-column-combination',
  familyGroup: 'classify-concept',
  summary: 'Erkennt die Koeffizienten einer Spaltenkombination durch komponentenweises Nachrechnen.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'static',
  masteryEligible: true,
  caseTypes: [{ caseId: 'column-coefficients-double', propertyTest: false }],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-matrices'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

export const generateRankCaseFamily = generateStaticChoice(RANK_CASE_STATIC);
export const solveRankCaseFamily = () => staticChoiceSolver(RANK_CASE_STATIC);
export const RANK_CASE_CONTRACT = {
  familyId: 'classify-rank-solution-case',
  familyGroup: 'classify-concept',
  summary: 'Liest aus einer Zeilenstufenform Rang, freie Variable und Lösungsfall gleichzeitig ab, indem Pivotzeilen gezählt und die Nullzeile korrekt gedeutet wird.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'static',
  masteryEligible: true,
  caseTypes: [{ caseId: 'echelon-read-rank-case', propertyTest: false }],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-gauss'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

export const generateGaussFamily = generateStaticChoice(GAUSS_STATIC);
export const solveGaussFamily = () => staticChoiceSolver(GAUSS_STATIC);
export const GAUSS_CONTRACT = {
  familyId: 'classify-row-operation-validity',
  familyGroup: 'classify-concept',
  summary: 'Beurteilt Zeilenoperationen nach Lösungsmengenerhalt über Umkehrbarkeit und Mitführung der rechten Seite.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'static',
  masteryEligible: true,
  caseTypes: [{ caseId: 'valid-operation-rhs', propertyTest: false }],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-gauss'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

export const generateSynthesisFamily = generateStaticChoice(SYNTHESIS_STATIC);
export const solveSynthesisFamily = () => staticChoiceSolver(SYNTHESIS_STATIC);
export const SYNTHESIS_CONTRACT = {
  familyId: 'construct-linalg-contract-synthesis',
  familyGroup: 'construct-program',
  summary: 'Implementiert Shape-Vertrag, Pivot-Rang und Systemlöser als drei getrennte Funktionverträge in einer Synthese mit rechteckigen und abhängigen Fällen.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'static',
  masteryEligible: true,
  caseTypes: [{ caseId: 'synthesis-three-contracts', propertyTest: false }],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-numpy-basics', 'c-linalg-gauss'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

export const LINALG_FAMILY_SPECS = [
  { ...SCALAR_PRODUCT_CONTRACT, generate: generateScalarProductFamily, solve: solveScalarProduct },
  { ...MATVEC_SHAPE_CONTRACT, generate: generateMatvecShapeFamily, solve: solveMatvecShapeFamily },
  { ...MATRIX_SHAPE_CONTRACT, generate: generateMatrixShapeFamily, solve: solveMatrixShape },
  { ...INDEPENDENCE_MULTIPLE_CONTRACT, generate: generateIndependenceMultipleFamily, solve: solveIndependenceMultiple },
  { ...DET2_CONTRACT, generate: generateDet2Family, solve: solveDet2Family },
  { ...RANK_ROWOPS_CONTRACT, generate: generateRankRowopsFamily, solve: solveRankRowops },
  { ...SYSTEM_2X2_CONTRACT, generate: generateSystem2x2Family, solve: solveSystem2x2 },
  { ...SHAPE_CONTRACT, generate: generateShapeContractFamily, solve: solveShapeContract },
  { ...COLUMN_CONTRACT, generate: generateColumnFamily, solve: solveColumnFamily },
  { ...RANK_CASE_CONTRACT, generate: generateRankCaseFamily, solve: solveRankCaseFamily },
  { ...GAUSS_CONTRACT, generate: generateGaussFamily, solve: solveGaussFamily },
  { ...SYNTHESIS_CONTRACT, generate: generateSynthesisFamily, solve: solveSynthesisFamily },
];

