// Linalg-Familie (formula-scalar-product) für Skalarprodukt und Matrixeintrag.
// Ein geseedeter Fall und statische Falltypen teilen den kanonischen
// Lösungsweg; Code-Ausgabe und Begründung bleiben getrennte Familienfälle.
//
// Alle elf Familien laufen über die Kit-Factories in solved_family_kit.mjs:
// makeNumericFamily liefert generate/solve/spec für die fünf numerischen
// Wrapper (statische Fälle + Seed-Ziehung), makeLinalgChoiceCapsuleFamily
// liefert capsuleOk/correctText/genCapsule/generate/solve/spec für die sechs
// Choice-Kapsel-Familien. Die fachliche Domäne (Kapseln, Banken, Templates,
// Validatoren, Reference-Solver) bleibt in linalg_generators.mjs.

import { det2, genDet2, genLinear2Fresh, genMatmulEntryFresh, genShapePredict, solveShape } from './linalg_numpy_fresh_generators.mjs';
import {
  rank, solveLinear2, genRankCapsule, RANK_CAPSULES,
  INDEPENDENCE_CAPSULES, independenceShapeOk,
  independenceOptions, independencePrompt, independenceSolution, drawIndependenceParameters,
  MATRIX_SHAPE_CAPSULES, matrixShapeOk,
  matrixShapeOptions, matrixShapePrompt, matrixShapeSolution, drawMatrixShapeParameters,
  COLUMN_COMBINATION_CAPSULES, COLUMN_IDS, columnInstanceOk, columnSystemOf,
  columnOptions, columnPrompt, columnSolution, drawColumnCombinationParameters,
  ROW_OPERATION_CAPSULES, ROW_OPERATION_IDS, rowOperationInstanceOk, rowOperationSystemOf,
  rowOperationOptions, rowOperationPrompt, rowOperationSolution, drawRowOperationParameters,
  CLASSIFY_SHAPE_CAPSULES, SHAPE_CONTRACT_IDS, classifyShapeOk, classifyShapeSystem,
  classifyShapeOptions, classifyShapePrompt, classifyShapeSolution, drawClassifyShapeParameters,
  RANK_SOLUTION_CAPSULES, RANK_SOLUTION_IDS, rankSolutionInstanceOk,
  rankSolutionOptions, rankSolutionPrompt, rankSolutionSolution, drawRankSolutionParameters,
} from './linalg_generators.mjs';
import { staticCaseBody, variantOf } from '../domain/family_registry.mjs';
import { makeLinalgChoiceCapsuleFamily, makeNumericFamily } from './solved_family_kit.mjs';
import { rng, randInt, drawFamilyInstance } from './generator_draw_kit.mjs';

export const LINALG_DIFFICULTY_PROFILES = ['intro', 'core', 'stretch', 'challenge'];

// Public-first-Fallkörper: prompt/fullSolution liegen als {name}-Templates in
// content/families/*.json; generate() rendert sie mit den geseedeten Werten.
// Fehlende Platzhalter schlagen fehl statt unersetzt in den Lerntext zu laufen.
const renderCaseTemplate = (template, scope, familyId) => {
  if (typeof template !== 'string') throw new Error(`${familyId}: Fallkörper ohne Text`);
  return template.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name) => {
    if (!Object.hasOwn(scope, name)) throw new Error(`${familyId}: Platzhalter ${name} ohne Wert`);
    return String(scope[name]);
  });
};

// Matrix-Layout des Generators (drei Zeichen pro Eintrag) — gleiche
// Formatierung wie matrixText in linalg_numpy_fresh_generators.mjs.
const det2MatrixText = (m) => m.map((row) => `[${row.map((v) => String(v).padStart(3)).join('  ')}]`).join('\n');

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

const SCALAR_STATIC_CASES = [
  'product-definition-rationale',
  'matmul-entry-w05-e1',
  'matmul-entry-w05-e12',
  'dot-product-w05-e13',
  'dot-product-w05-e3',
];

/** Statischer Schlüssel: erwartete Ausgabe aus dem registrierten Fallkörper
 *  (Variante über parameters.variant wie im Bestand), liest nie `expected`
 *  der generierten Instanz. */
const solveScalarStatic = (parameters) => {
  const { body } = variantOf(staticCaseBody('formula-scalar-product', parameters.caseId), parameters.variant ?? 0);
  if (body.expected?.output) return { output: body.expected.output };
  if (body.expected?.kind === 'rubric') return { kind: 'rubric' };
  if (body.expected?.kind === 'integer-pair') return { solution: body.expected.solution };
  return { value: body.expected?.value };
};

/** Unabhängiger Solver: Matrixeintrag oder Skalarprodukt aus den
 *  Fallparametern, liest nie `expected` ab. */
const solveScalarSeeded = (parameters) => {
  if (parameters.form === 'dot-vectors') {
    const { u, v } = parameters;
    return { value: u[0] * v[0] + u[1] * v[1] + u[2] * v[2] };
  }
  if (parameters.form === 'matmul-entry') {
    const { A, B, entry } = parameters;
    const [i, j] = entry;
    return { value: A[i - 1][0] * B[0][j - 1] + A[i - 1][1] * B[1][j - 1] };
  }
  if (parameters.form === 'scalar-loop-rows') {
    const { A, x } = parameters;
    return { output: `[${A[0][0] * x[0] + A[0][1] * x[1]}, ${A[1][0] * x[0] + A[1][1] * x[1]}]` };
  }
  if (parameters.form === 'column-system') {
    return { solution: solveLinear2(parameters.A, parameters.b).map(intNorm) };
  }
  throw new Error(`formula-scalar-product: unbekannte Form ${parameters.form}`);
};

// --- scalar-loop-output / column-vector-authored (früher statische Shards) --
// scalar-loop-output: festes Snippet-Template, Seed zieht A (2x2, Einträge
// -5..5 inkl. Nullen — authored umfasst Identität/Permutation/Diagonale) und
// x; die Ausgabe ist die Zeile-mal-Spalte-Produktliste. column-vector-
// authored: Spalten a1,a2 ∈ [-5,5]² (Spalte ≠ 0, det ≠ 0) plus Lösung
// x ∈ [-9,9]²; b = x1·a1 + x2·a2, |b_i| ≤ 20 (authored-Maximalbetrag 17).

const numFactor = (value) => (value < 0 ? `(${value})` : String(value));

// -0 aus Produkttermen/Cramer normalisieren (deepStrictEqual und Anzeige
// unterscheiden -0 von 0, der Zahlenvergleich des Graders nicht).
const intNorm = (value) => (value === 0 ? 0 : value);

const scalarLoopSnippet = ({ A, x }) => `A = ((${A[0][0]}, ${A[0][1]}), (${A[1][0]}, ${A[1][1]}))
x = (${x[0]}, ${x[1]})
zeilen = []
for i in range(2):
    zeilen.append(A[i][0]*x[0] + A[i][1]*x[1])
print(zeilen)
`;

const scalarLoopOutput = ({ A, x }) => `[${A[0][0] * x[0] + A[0][1] * x[1]}, ${A[1][0] * x[0] + A[1][1] * x[1]}]`;

const SCALAR_GENERATORS = {
  'scalar-loop-output': {
    draw(r) {
      const A = [[randInt(r, -5, 5), randInt(r, -5, 5)], [randInt(r, -5, 5), randInt(r, -5, 5)]];
      const x = [randInt(r, -5, 5), randInt(r, -5, 5)];
      return { A, x };
    },
    wantShape: ({ A, x }) => !A.flat().every((v) => v === 0) && !(x[0] === 0 && x[1] === 0),
    emit({ A, x }) {
      const output = scalarLoopOutput({ A, x });
      return {
        form: 'scalar-loop-rows',
        parameters: { form: 'scalar-loop-rows', A, x, snippet: scalarLoopSnippet({ A, x }) },
        expected: { kind: 'output-lines', output },
        prompt: `Skalarprodukt-Schleife: A = ((${A[0][0]}, ${A[0][1]}), (${A[1][0]}, ${A[1][1]})), x = (${x[0]}, ${x[1]}). Sage print(zeilen) vorher.`,
        fullSolution: `zeilen[0] = ${numFactor(A[0][0])}·${numFactor(x[0])} + ${numFactor(A[0][1])}·${numFactor(x[1])} = ${A[0][0] * x[0] + A[0][1] * x[1]}; zeilen[1] = ${numFactor(A[1][0])}·${numFactor(x[0])} + ${numFactor(A[1][1])}·${numFactor(x[1])} = ${A[1][0] * x[0] + A[1][1] * x[1]}. Ausgabe: <code>${output}</code> — Zeile-mal-Spalte wie beim Matrixprodukt.`,
        activityType: 'predict-output',
        graderId: 'deterministic',
      };
    },
  },
  'column-vector-authored': {
    draw(r) {
      const a1 = [randInt(r, -5, 5), randInt(r, -5, 5)];
      const a2 = [randInt(r, -5, 5), randInt(r, -5, 5)];
      const x = [randInt(r, -9, 9), randInt(r, -9, 9)];
      return { a1, a2, x };
    },
    // Prädikat auf parameters-Sicht (row-major A + b); x = (0,0) zeigt sich
    // als b = (0,0), da die Spalten hier linear unabhängig gezogen werden.
    wantShape({ A, b }) {
      const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      if (det === 0 || (b[0] === 0 && b[1] === 0)) return false;
      return Math.abs(b[0]) <= 20 && Math.abs(b[1]) <= 20;
    },
    emit({ a1, a2, x }) {
      // Zeilenform für parameters/grader; die Prompt-Semantik bleibt
      // spaltenorientiert wie authored.
      const A = [[a1[0], a2[0]], [a1[1], a2[1]]];
      const b = [a1[0] * x[0] + a2[0] * x[1], a1[1] * x[0] + a2[1] * x[1]].map(intNorm);
      return {
        form: 'column-system',
        parameters: { form: 'column-system', A, b },
        expected: { kind: 'integer-pair', solution: x.map(intNorm) },
        prompt: `Spalten (${a1[0]}, ${a1[1]}) und (${a2[0]}, ${a2[1]}), Ziel (${b[0]}, ${b[1]}). Finde (x1, x2).`,
        fullSolution: `Die Koeffizienten sind $(x_1,x_2)=(${x[0]},${x[1]})$. Die Probe liefert $${x[0]}\\cdot(${a1[0]},${a1[1]})^T+${x[1]}\\cdot(${a2[0]},${a2[1]})^T=(${b[0]},${b[1]})^T$.`,
        activityType: 'vector',
        graderId: 'deterministic',
        competencyIds: ['c-linalg-systems'],
      };
    },
  },
};

function genScalarSeededCase({ seed, caseId, difficulty }, def) {
  const drawn = drawFamilyInstance(
    (subseed) => def.emit(def.draw(rng(subseed))),
    { seed, caseId, difficulty, wantShape: (d) => def.wantShape(d.parameters) },
  );
  return {
    ...drawn,
    parameters: { caseId, difficulty, ...drawn.parameters },
  };
}

export function generateScalarProductFamily({ seed, caseId, difficulty }) {
  const def = SCALAR_GENERATORS[caseId];
  if (def) return genScalarSeededCase({ seed, caseId, difficulty }, def);
  return scalarProductKit.generate({ seed, caseId, difficulty });
}

export function solveScalarProduct(parameters) {
  if (parameters?.caseId && SCALAR_GENERATORS[parameters.caseId]) {
    return solveScalarSeeded(parameters);
  }
  return scalarProductKit.solve(parameters);
}

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
    { caseId: 'column-vector-authored' },
    { caseId: 'scalar-loop-output' },
    { caseId: 'product-definition-rationale', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-matrices'],
};

const scalarProductKit = makeNumericFamily({
  contract: SCALAR_PRODUCT_CONTRACT,
  staticCaseIds: SCALAR_STATIC_CASES,
  staticVariants: true,
  seededCaseId: 'matmul-entry-seeded',
  draw: genMatmulEntryFresh,
  profileAccepts: matmulProfileAccepts,
  extraParameters: { form: 'matmul-entry' },
  toExpected: (drawn) => ({ kind: 'integer', value: drawn.expected }),
  solveStatic: solveScalarStatic,
  solveSeeded: solveScalarSeeded,
});


// --- classify-matrix-shape ---------------------------------------------------
// Geseedet über genMatrixShapeCapsule: dims-Bank plus Rotation, ein Template
// je Shape-Art, drei Kapseln 1:1 auf den Bestandsfällen (intro/core/stretch
// → Produkt/Addition/Vektor-Kette). Constraint ist das valide Shape-Tupel
// (Bound-Gate sinngemäß). Der Content-Contract ist null, der Vertrag lebt
// hier. masteryEligible bleibt false wie im Bestand (alle Base-Fälle false).

export const MATRIX_SHAPE_CONTRACT = {
  familyId: 'classify-matrix-shape',
  familyGroup: 'classify-concept',
  summary: 'Ordnet einer Matrix- oder Vektoroperation die resultierende Shape zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'shape-product-drawn' },
    { caseId: 'shape-add-broadcast-trap' },
    { caseId: 'shape-vector-matmul-chain' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch'],
  competencyIds: ['c-linalg-matrices'],
};

const matrixShapeKit = makeLinalgChoiceCapsuleFamily({
  contract: MATRIX_SHAPE_CONTRACT,
  capsules: MATRIX_SHAPE_CAPSULES,
  shapeError: 'Dims verletzen die Kapselform',
  drawParameters: drawMatrixShapeParameters,
  buildOptions: (parameters, capsule) => matrixShapeOptions(parameters.dimsA, parameters.dimsB, capsule),
  validate: (parameters, capsule) => matrixShapeOk(parameters.dimsA, parameters.dimsB, capsule),
  buildPrompt: (parameters, capsule) => matrixShapePrompt(parameters.dimsA, parameters.dimsB, capsule),
  buildSolution: (parameters, capsule) => matrixShapeSolution(parameters.dimsA, parameters.dimsB, capsule),
});
export const matrixShapeCapsuleOk = matrixShapeKit.capsuleOk;
export const matrixShapeCorrectText = matrixShapeKit.correctText;
export const genMatrixShapeCapsule = matrixShapeKit.genCapsule;
export const generateMatrixShapeFamily = matrixShapeKit.generate;
export const solveMatrixShapeFamily = matrixShapeKit.solve;

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
};

const det2Kit = makeNumericFamily({
  contract: DET2_CONTRACT,
  seededCaseId: 'det2-seeded-columns',
  // Die Spaltenziehung (nonzeroInt ×4 plus det≠0-Rejection) bleibt im
  // Generator; der autorisierte Text kommt aus dem Fallkörper in
  // content/families/formula-det2-independence.json.
  draw: (subseed) => {
    const drawn = genDet2(subseed);
    const body = staticCaseBody('formula-det2-independence', 'det2-seeded-columns');
    const [a, b] = [drawn.parameters.A[0], drawn.parameters.A[1]];
    const scope = {
      matrix: det2MatrixText(drawn.parameters.A),
      m00: a[0], m01: a[1], m10: b[0], m11: b[1],
      ad: a[0] * b[1], bc: a[1] * b[0], det: drawn.expected,
    };
    return {
      ...drawn,
      prompt: renderCaseTemplate(body.prompt, scope, 'formula-det2-independence'),
      fullSolution: renderCaseTemplate(body.fullSolution, scope, 'formula-det2-independence'),
    };
  },
  profileAccepts: det2ProfileAccepts,
  toExpected: (drawn) => ({
    ...staticCaseBody('formula-det2-independence', 'det2-seeded-columns').expected,
    value: drawn.expected,
  }),
  solveSeeded: (parameters) => ({ value: det2(parameters.A) }),
});
export const generateDet2Family = det2Kit.generate;
export const solveDet2Family = det2Kit.solve;

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
  activityType: 'vector',
};

const system2x2Kit = makeNumericFamily({
  contract: SYSTEM_2X2_CONTRACT,
  staticCaseIds: ['system-w05-e11', 'system-w05-e6'],
  seededCaseId: 'system-seeded-2x2',
  draw: genLinear2Fresh,
  profileAccepts: linear2ProfileAccepts,
  toExpected: (drawn) => ({ kind: 'integer-pair', solution: [...drawn.expected] }),
  solveSeeded: (parameters) => ({ solution: solveLinear2(parameters.A, parameters.b) }),
  // The challenge-flagged seeded case carries two competencies — the
  // contract advertises only c-linalg-gauss.
  caseMeta: {
    'system-seeded-2x2': { competencyIds: ['c-linalg-gauss', 'c-linalg-systems'] },
  },
});

export const generateSystem2x2Family = system2x2Kit.generate;
export const solveSystem2x2 = system2x2Kit.solve;
const system2x2Spec = system2x2Kit.spec;

// --- validate-shape-contract ---------------------------------------------------
// Geseedet über genShapePredict plus statischen w18-e3 (drei Printzeilen).

function shapeProfileAccepts(difficulty) {
  if (difficulty === 'core') return null;
  if (difficulty === 'intro') return (parameters) => parameters.rows <= 3;
  if (difficulty === 'stretch') return (parameters) => parameters.shape === 'transpose' || parameters.shape === 'outer';
  return (parameters) => parameters.n >= 20;
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
  activityType: 'predict-output',
};

const shapeContractKit = makeNumericFamily({
  contract: SHAPE_CONTRACT,
  staticCaseIds: ['shapes-w18-broadcast-axes'],
  seededCaseId: 'shapes-seeded-predict',
  draw: genShapePredict,
  profileAccepts: shapeProfileAccepts,
  toExpected: (drawn) => ({ output: drawn.expected.output }),
  solveStatic: (parameters) => ({ output: staticCaseBody('validate-shape-contract', parameters.caseId).expected.output }),
  solveSeeded: (parameters) => ({ output: `(${solveShape(parameters.shape, parameters).join(', ')})` }),
});
export const generateShapeContractFamily = shapeContractKit.generate;
export const solveShapeContract = shapeContractKit.solve;

// --- W05-Restfälle in bestehenden Familien (S4D7) --------------------------------
// w05-e16 (numpy-Schleife) als statischer Predict-Fall: gleiche
// komponentenweise Produkte wie der Rest der Familie.
// w05-e9 (Begründung) als statischer Rubric-Fall: Rubrik und Mindestwörter
// aus der Definition, Grader manual-rubric.
// w05-e8 (Code) als Fall im Matvec-Vertrag: gleiche Tests wie die
// Definition (buildPythonTests-Verzweigung), Startercode übernommen.

// --- transform-rank-dependence-rowops ------------------------------------------
// Pilot: geseedet über genRankCapsule, caseId-Rangbindung je Profil
// (core/stretch → staircase/full; challenge → line und two-combo).
// Der Content-Contract ist null, der Vertrag lebt hier.

export const RANK_CONTRACT = {
  familyId: 'transform-rank-dependence-rowops',
  familyGroup: 'transform-terms',
  summary: 'Prüft lineare Abhängigkeit bzw. Rang von Zeilen über Zeilenoperationen.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'rank-3x3-staircase' },
    { caseId: 'rank-3x3-full' },
    { caseId: 'rank-3x4-line' },
    { caseId: 'rank-4x4-two-combo' },
  ],
  difficultyProfiles: ['core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-independence', 'c-linalg-gauss'],
};

// The challenge profile hosts two cases: the extra bank capsule carries the
// profile as a '<profile>-<suffix>' key prefix ('challenge-4x4' →
// 'challenge'); the kit resolves it through its caseId fallback.
const rankKit = makeNumericFamily({
  contract: RANK_CONTRACT,
  capsules: RANK_CAPSULES,
  draw: (subseed, capsule) => genRankCapsule(subseed, capsule),
  wantShape: (instance, capsule) => rank(instance.parameters.A) === capsule.targetRank,
  profileAccepts: (difficulty, capsule) => (parameters) => Math.max(
    ...parameters.A.flat().map((value) => Math.abs(value)),
  ) <= capsule.bound,
  toExpected: (drawn) => ({ kind: 'integer', value: drawn.expected }),
  solveSeeded: (parameters) => ({ value: rank(parameters.A) }),
});

export const generateRankFamily = rankKit.generate;
export const solveRankFamily = rankKit.solve;
const rankSpec = rankKit.spec;

// --- classify-independence-multiple ----------------------------------------------
// Geseedet über genIndependenceCapsule: Vektor-Zahlenbank plus Rotation, ein
// Template, drei Kapseln 1:1 auf den Bestandsfällen (intro/core/stretch).
// Der Content-Contract ist null, der Vertrag lebt hier. masteryEligible
// bleibt false wie im Bestand (alle drei Base-Fälle false).

export const INDEPENDENCE_CONTRACT = {
  familyId: 'classify-independence-multiple',
  familyGroup: 'classify-concept',
  summary: 'Entscheidet lineare Abhängigkeit eines Vektorpaars durch Erkennen eines expliziten Vielfachen und Bilden der nichttrivialen Nullkombination.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'dependent-pair-double' },
    { caseId: 'independent-pair-negative' },
    { caseId: 'dependent-triple-span' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch'],
  competencyIds: ['c-linalg-independence'],
};

const independenceKit = makeLinalgChoiceCapsuleFamily({
  contract: INDEPENDENCE_CONTRACT,
  capsules: INDEPENDENCE_CAPSULES,
  shapeError: 'Vektoren verletzen die Kapselform',
  drawParameters: drawIndependenceParameters,
  buildOptions: (parameters, capsule) => independenceOptions(parameters.vectors, capsule),
  validate: (parameters, capsule) => independenceShapeOk(parameters.vectors, capsule),
  buildPrompt: (parameters, capsule) => independencePrompt(parameters.vectors, capsule),
  buildSolution: (parameters, capsule) => independenceSolution(parameters.vectors, capsule),
});
export const independenceCapsuleOk = independenceKit.capsuleOk;
export const independenceCorrectText = independenceKit.correctText;
export const genIndependenceCapsule = independenceKit.genCapsule;
export const generateIndependenceFamily = independenceKit.generate;
export const solveIndependenceFamily = independenceKit.solve;

// --- classify-column-combination ------------------------------------------------
// Geseedet über genColumnCombinationCapsule: 2×2-Zahlenbank plus 2×2-Solver
// als Antwort-Key (coefficients/choice), (m,n)-Bank mit Text-Key
// (shape-debug); drei Kapseln 1:1 auf den Bestandsfällen (core/intro/
// stretch). Der Content-Contract ist null, der Vertrag lebt hier.
// masteryEligible und competencyIds gelten pro Fall wie im Bestand
// (core/intro/stretch → true/false/true), damit Coverage und
// Mastery-Aussagen unverändert bleiben.

const COLUMN_COMBINATION_META = {
  'column-coefficients-double': { masteryEligible: true, competencyIds: ['c-linalg-matrices'] },
  'column-choice-authored': { masteryEligible: false, competencyIds: ['c-linalg-systems'] },
  'shape-debug-authored': { masteryEligible: true, competencyIds: ['c-linalg-matrices', 'c-numpy-basics'] },
};

export const COLUMN_COMBINATION_CONTRACT = {
  familyId: 'classify-column-combination',
  familyGroup: 'classify-concept',
  summary: 'Erkennt die Koeffizienten einer Spaltenkombination durch komponentenweises Nachrechnen.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'column-coefficients-double' },
    { caseId: 'column-choice-authored' },
    { caseId: 'shape-debug-authored' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch'],
  competencyIds: ['c-linalg-matrices', 'c-linalg-systems', 'c-numpy-basics'],
};

const columnCombinationKit = makeLinalgChoiceCapsuleFamily({
  contract: COLUMN_COMBINATION_CONTRACT,
  capsules: COLUMN_COMBINATION_CAPSULES,
  shapeError: (capsule) => (capsule.kind === 'shape-debug'
    ? 'Shape-Debug verletzt die Kapselform'
    : 'Spaltenkombination verletzt die Kapselform'),
  drawParameters: drawColumnCombinationParameters,
  buildOptions: (parameters, capsule) => columnOptions(columnSystemOf(parameters, capsule), capsule),
  validate: columnInstanceOk,
  buildPrompt: (parameters, capsule) => columnPrompt(columnSystemOf(parameters, capsule), capsule),
  buildSolution: (parameters, capsule) => columnSolution(columnSystemOf(parameters, capsule), capsule),
  choiceIds: (capsule) => COLUMN_IDS[capsule.kind],
  caseMeta: COLUMN_COMBINATION_META,
});
export const columnCombinationCapsuleOk = columnCombinationKit.capsuleOk;
export const columnCombinationCorrectText = columnCombinationKit.correctText;
export const genColumnCombinationCapsule = columnCombinationKit.genCapsule;
export const generateColumnCombinationFamily = columnCombinationKit.generate;
export const solveColumnCombinationFamily = columnCombinationKit.solve;

// --- classify-shape-contract --------------------------------------------------
// Geseedet über genClassifyShapeCapsule: Shape-Zahlenbank plus Rotation, ein
// Template je Shape-Art, drei Kapseln 1:1 auf den Bestandsfällen
// (intro/core/stretch → Bias-Broadcast/Transformer-QKV/Token-Embedding).
// Der Content-Contract ist null, der Vertrag lebt hier. masteryEligible
// bleibt false wie im Bestand (alle drei Base-Fälle false).

export const CLASSIFY_SHAPE_CONTRACT = {
  familyId: 'classify-shape-contract',
  familyGroup: 'classify-concept',
  summary: 'Ordnet einer Layer-, Projektions- oder Embedding-Rechnung die resultierende Shape zu.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: false,
  caseTypes: [
    { caseId: 'shape-bias-broadcast-mc' },
    { caseId: 'shape-transformer-qkv' },
    { caseId: 'shape-token-batch-flatten' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch'],
  competencyIds: ['c-dl-tensors'],
};

const classifyShapeKit = makeLinalgChoiceCapsuleFamily({
  contract: CLASSIFY_SHAPE_CONTRACT,
  capsules: CLASSIFY_SHAPE_CAPSULES,
  shapeError: 'Shape-Parametern verletzen die Kapselform',
  drawParameters: drawClassifyShapeParameters,
  buildOptions: (parameters, capsule) => classifyShapeOptions(classifyShapeSystem(parameters, capsule), capsule),
  validate: classifyShapeOk,
  buildPrompt: (parameters, capsule) => classifyShapePrompt(classifyShapeSystem(parameters, capsule), capsule),
  buildSolution: (parameters, capsule) => classifyShapeSolution(classifyShapeSystem(parameters, capsule), capsule),
  choiceIds: () => SHAPE_CONTRACT_IDS,
});
export const classifyShapeCapsuleOk = classifyShapeKit.capsuleOk;
export const classifyShapeCorrectText = classifyShapeKit.correctText;
export const genClassifyShapeCapsule = classifyShapeKit.genCapsule;
export const generateClassifyShapeFamily = classifyShapeKit.generate;
export const solveClassifyShapeFamily = classifyShapeKit.solve;

// --- classify-row-operation-validity ------------------------------------------------
// Geseedet über genRowOperationCapsule: 2×2-Zahlenbank mit getragener
// rechter Seite als Antwort-Key (equations), Multiplikator-Bank mit
// Text-Key (multiplier); zwei Kapseln 1:1 auf den Bestandsfällen
// (core/intro). Der Content-Contract ist null, der Vertrag lebt hier.
// masteryEligible und competencyIds gelten pro Fall wie im Bestand
// (core/intro → true/false, je c-linalg-gauss), damit Coverage und
// Mastery-Aussagen unverändert bleiben.

const ROW_OPERATION_META = {
  'valid-operation-rhs': { masteryEligible: true, competencyIds: ['c-linalg-gauss'] },
  'row-operation-choice-contract': { masteryEligible: false, competencyIds: ['c-linalg-gauss'] },
};

export const ROW_OPERATION_CONTRACT = {
  familyId: 'classify-row-operation-validity',
  familyGroup: 'classify-concept',
  summary: 'Beurteilt Zeilenoperationen nach Lösungsmengenerhalt über Umkehrbarkeit und Mitführung der rechten Seite.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'valid-operation-rhs' },
    { caseId: 'row-operation-choice-contract' },
  ],
  difficultyProfiles: ['intro', 'core'],
  competencyIds: ['c-linalg-gauss'],
};

const rowOperationKit = makeLinalgChoiceCapsuleFamily({
  contract: ROW_OPERATION_CONTRACT,
  capsules: ROW_OPERATION_CAPSULES,
  shapeError: 'Zeilenoperation verletzt die Kapselform',
  drawParameters: drawRowOperationParameters,
  buildOptions: (parameters, capsule) => rowOperationOptions(rowOperationSystemOf(parameters, capsule), capsule),
  validate: rowOperationInstanceOk,
  buildPrompt: (parameters, capsule) => rowOperationPrompt(rowOperationSystemOf(parameters, capsule), capsule),
  buildSolution: (parameters, capsule) => rowOperationSolution(rowOperationSystemOf(parameters, capsule), capsule),
  choiceIds: (capsule) => ROW_OPERATION_IDS[capsule.kind],
  caseMeta: ROW_OPERATION_META,
});
export const rowOperationCapsuleOk = rowOperationKit.capsuleOk;
export const rowOperationCorrectText = rowOperationKit.correctText;
export const genRowOperationCapsule = rowOperationKit.genCapsule;
export const generateRowOperationFamily = rowOperationKit.generate;
export const solveRowOperationFamily = rowOperationKit.solve;

// --- classify-rank-solution-case --------------------------------------------------
// Geseedet über genRankSolutionCapsule: Echelon-Zahlenbank mit Rotation,
// ein Template je Art (Zahlen-Fall trivial mit $z$-Texten, Symbol-Fall mit
// eigenem Template ohne $z$); zwei Kapseln 1:1 auf den Bestandsfällen
// (core/stretch). Der Content-Contract ist null, der Vertrag lebt hier.
// masteryEligible gilt pro Fall wie im Bestand (beide true),
// competencyIds ebenfalls (core → c-linalg-gauss, stretch → zusätzlich
// c-linalg-systems und c-linalg-independence), damit Coverage und
// Mastery-Aussagen unverändert bleiben.

const RANK_SOLUTION_META = {
  'echelon-read-rank-case': { masteryEligible: true, competencyIds: ['c-linalg-gauss'] },
  'rank-system-authored': { masteryEligible: true, competencyIds: ['c-linalg-systems', 'c-linalg-gauss', 'c-linalg-independence'] },
};

export const RANK_SOLUTION_CONTRACT = {
  familyId: 'classify-rank-solution-case',
  familyGroup: 'classify-concept',
  summary: 'Liest aus einer Zeilenstufenform Rang, freie Variable und Lösungsfall gleichzeitig ab, indem Pivotzeilen gezählt und die Nullzeile korrekt gedeutet wird.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'echelon-read-rank-case' },
    { caseId: 'rank-system-authored' },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-linalg-gauss', 'c-linalg-systems', 'c-linalg-independence'],
};

const rankSolutionKit = makeLinalgChoiceCapsuleFamily({
  contract: RANK_SOLUTION_CONTRACT,
  capsules: RANK_SOLUTION_CAPSULES,
  shapeError: 'Rangfall verletzt die Kapselform',
  drawParameters: drawRankSolutionParameters,
  buildOptions: (parameters, capsule) => rankSolutionOptions(capsule),
  validate: rankSolutionInstanceOk,
  buildPrompt: (parameters, capsule) => rankSolutionPrompt(parameters.systemCoefficients, capsule),
  buildSolution: (parameters, capsule) => rankSolutionSolution(capsule),
  choiceIds: (capsule) => RANK_SOLUTION_IDS[capsule.kind],
  caseMeta: RANK_SOLUTION_META,
});
export const rankSolutionCapsuleOk = rankSolutionKit.capsuleOk;
export const rankSolutionCorrectText = rankSolutionKit.correctText;
export const genRankSolutionCapsule = rankSolutionKit.genCapsule;
export const generateRankSolutionFamily = rankSolutionKit.generate;
export const solveRankSolutionFamily = rankSolutionKit.solve;

export const LINALG_FAMILY_SPECS = [
  // scalar-loop-output und column-vector-authored werden per Dispatch
  // generiert — das Spec trägt die gewrappten Funktionen, nicht die
  // Kit-Closures (die für die beiden caseIds 'Unbekannter Fall' wuerfen).
  { ...scalarProductKit.spec, generate: generateScalarProductFamily, solve: solveScalarProduct },
  det2Kit.spec,
  system2x2Spec,
  shapeContractKit.spec,
  rankSpec,
  independenceKit.spec,
  matrixShapeKit.spec,
  columnCombinationKit.spec,
  rowOperationKit.spec,
  classifyShapeKit.spec,
  rankSolutionKit.spec,
];
