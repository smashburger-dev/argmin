// Linalg-Familie (formula-scalar-product) für Skalarprodukt und Matrixeintrag.
// Ein geseedeter Fall und statische Falltypen teilen den kanonischen
// Lösungsweg; Code-Ausgabe und Begründung bleiben getrennte Familienfälle.
//
// Alle elf Familien laufen über die Kit-Factories in linalg_family_kit.mjs:
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

const SCALAR_STATIC_CASES = [
  'scalar-loop-output',
  'product-definition-rationale',
  'matmul-entry-w05-e1',
  'matmul-entry-w05-e12',
  'dot-product-w05-e13',
  'dot-product-w05-e3',
  'column-vector-authored',
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
  throw new Error(`formula-scalar-product: unbekannte Form ${parameters.form}`);
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
    { caseId: 'column-vector-authored', propertyTest: false },
    { caseId: 'scalar-loop-output', propertyTest: false },
    { caseId: 'product-definition-rationale', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-matrices'],
  graderId: 'deterministic',
  activityType: 'numeric',
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
export const generateScalarProductFamily = scalarProductKit.generate;
export const solveScalarProduct = scalarProductKit.solve;

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
  graderId: 'deterministic',
  activityType: 'single-choice',
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
  graderId: 'deterministic',
  activityType: 'numeric',
};

const det2Kit = makeNumericFamily({
  contract: DET2_CONTRACT,
  seededCaseId: 'det2-seeded-columns',
  draw: genDet2,
  profileAccepts: det2ProfileAccepts,
  toExpected: (drawn) => ({ kind: 'integer', value: drawn.expected }),
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
  graderId: 'deterministic',
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
});
export const generateSystem2x2Family = system2x2Kit.generate;
export const solveSystem2x2 = system2x2Kit.solve;

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
  graderId: 'deterministic',
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
// Pilot: geseedet über genRankCapsule, eine Kapsel je Profil mit
// caseId-Rangbindung (core/stretch/challenge → staircase/full/line).
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
  ],
  difficultyProfiles: ['core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-independence', 'c-linalg-gauss'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

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
  graderId: 'deterministic',
  activityType: 'single-choice',
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
  graderId: 'deterministic',
  activityType: 'single-choice',
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
  graderId: 'deterministic',
  activityType: 'single-choice',
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
  graderId: 'deterministic',
  activityType: 'single-choice',
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
  graderId: 'deterministic',
  activityType: 'single-choice',
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
  scalarProductKit.spec,
  det2Kit.spec,
  system2x2Kit.spec,
  shapeContractKit.spec,
  rankKit.spec,
  independenceKit.spec,
  matrixShapeKit.spec,
  columnCombinationKit.spec,
  rowOperationKit.spec,
  classifyShapeKit.spec,
  rankSolutionKit.spec,
];
