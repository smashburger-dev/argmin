// Linalg-Familie (formula-scalar-product) für Skalarprodukt und Matrixeintrag.
// Ein geseedeter Fall und statische Falltypen teilen den kanonischen
// Lösungsweg; Code-Ausgabe und Begründung bleiben getrennte Familienfälle.

import { det2, genDet2, genLinear2Fresh, genMatmulEntryFresh, genShapePredict, solveShape } from './linalg_numpy_fresh_generators.mjs';
import { drawFamilyInstance } from './generator_draw_kit.mjs';
import { rank, solveLinear2, genRankCapsule, RANK_CAPSULES, genIndependenceCapsule, INDEPENDENCE_CAPSULES, independenceShapeOk, independenceCorrectText, maxAbsVectors, genMatrixShapeCapsule, MATRIX_SHAPE_CAPSULES, matrixShapeOk, matrixShapeCorrectText, genColumnCombinationCapsule, COLUMN_COMBINATION_CAPSULES, columnInstanceOk, columnCorrectText, genRowOperationCapsule, ROW_OPERATION_CAPSULES, rowOperationInstanceOk, rowOperationCorrectText, genClassifyShapeCapsule, CLASSIFY_SHAPE_CAPSULES, classifyShapeOk, classifyShapeCorrectText, genRankSolutionCapsule, RANK_SOLUTION_CAPSULES, rankSolutionInstanceOk, rankSolutionCorrectText } from './linalg_generators.mjs';
import { staticCaseBody } from '../domain/family_registry.mjs';

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
  if (['scalar-loop-output', 'product-definition-rationale', 'matmul-entry-w05-e1', 'matmul-entry-w05-e12', 'dot-product-w05-e13', 'dot-product-w05-e3', 'column-vector-authored'].includes(parameters.caseId)) {
    const body = staticCaseBody('formula-scalar-product', parameters.caseId);
    if (body.expected?.output) return { output: body.expected.output };
    if (body.expected?.kind === 'rubric') return { kind: 'rubric' };
    return { value: body.expected?.value };
  }
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
  if (['scalar-loop-output', 'product-definition-rationale', 'matmul-entry-w05-e1', 'matmul-entry-w05-e12', 'dot-product-w05-e13', 'dot-product-w05-e3', 'column-vector-authored'].includes(caseId)) {
    const body = staticCaseBody('formula-scalar-product', caseId);
    const { caseId: _caseId, difficultyProfile: _difficultyProfile, sourceLineage: _sourceLineage, ...generated } = body;
    return { ...generated, parameters: { caseId, difficulty, ...(body.parameters || {}) } };
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

// --- classify-matrix-shape ---------------------------------------------------
// Geseedet über genMatrixShapeCapsule: dims-Bank plus Rotation, ein Template
// je Shape-Art, drei Kapseln 1:1 auf den Bestandsfällen (intro/core/stretch
// → Produkt/Addition/Vektor-Kette). Constraint ist das valide Shape-Tupel
// (Bound-Gate sinngemäß). Der Content-Contract ist null, der Vertrag lebt
// hier. masteryEligible bleibt false wie im Bestand (alle Base-Fälle false).

const MATRIX_SHAPE_DIFFICULTIES = ['intro', 'core', 'stretch'];

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest nie `expected`. */
export function solveMatrixShapeFamily(parameters) {
  const capsule = Object.values(MATRIX_SHAPE_CAPSULES).find((item) => item.caseId === parameters?.caseId);
  if (!capsule) throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
  return { correctText: matrixShapeCorrectText(parameters.dimsA, parameters.dimsB, capsule) };
}

export function generateMatrixShapeFamily({ seed, caseId, difficulty }) {
  const capsule = MATRIX_SHAPE_CAPSULES[difficulty];
  if (!capsule || capsule.caseId !== caseId) throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  const drawn = drawFamilyInstance((subseed) => genMatrixShapeCapsule(subseed, capsule), {
    seed,
    caseId,
    difficulty,
    wantShape: (instance) => matrixShapeOk(instance.parameters.dimsA, instance.parameters.dimsB, capsule),
    profileAccepts: (parameters) => matrixShapeOk(parameters.dimsA, parameters.dimsB, capsule),
    profiles: MATRIX_SHAPE_DIFFICULTIES,
  });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { ...drawn.expected },
    choices: drawn.choices,
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

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

export function solveSystem2x2(parameters) {
  return { solution: solveLinear2(parameters.A, parameters.b) };
}

export function generateSystem2x2Family({ seed, caseId, difficulty }) {
  if (['system-w05-e11', 'system-w05-e6'].includes(caseId)) {
    const body = staticCaseBody('transform-system-2x2-elimination', caseId);
    const { caseId: _caseId, difficultyProfile: _difficultyProfile, sourceLineage: _sourceLineage, ...generated } = body;
    return { ...generated, parameters: { caseId, difficulty, ...(body.parameters || {}) } };
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

function shapeProfileAccepts(difficulty) {
  if (difficulty === 'core') return null;
  if (difficulty === 'intro') return (parameters) => parameters.rows <= 3;
  if (difficulty === 'stretch') return (parameters) => parameters.shape === 'transpose' || parameters.shape === 'outer';
  return (parameters) => parameters.n >= 20;
}

export function solveShapeContract(parameters) {
  if (parameters.caseId === 'shapes-w18-broadcast-axes') {
    return { output: staticCaseBody('validate-shape-contract', parameters.caseId).expected.output };
  }
  return { output: `(${solveShape(parameters.shape, parameters).join(', ')})` };
}

export function generateShapeContractFamily({ seed, caseId, difficulty }) {
  if (caseId === 'shapes-w18-broadcast-axes') {
    const body = staticCaseBody('validate-shape-contract', caseId);
    const { caseId: _caseId, difficultyProfile: _difficultyProfile, sourceLineage: _sourceLineage, ...generated } = body;
    return { ...generated, parameters: { caseId, difficulty, ...(body.parameters || {}) } };
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

// --- transform-rank-dependence-rowops ------------------------------------------
// Pilot: geseedet über genRankCapsule, eine Kapsel je Profil mit
// caseId-Rangbindung (core/stretch/challenge → staircase/full/line).
// Der Content-Contract ist null, der Vertrag lebt hier.

const RANK_DIFFICULTIES = ['core', 'stretch', 'challenge'];

/** Unabhängiger Solver: Rang aus den Fallparametern, liest nie `expected`. */
export function solveRankFamily(parameters) {
  return { value: rank(parameters.A) };
}

export function generateRankFamily({ seed, caseId, difficulty }) {
  const capsule = RANK_CAPSULES[difficulty];
  if (!capsule || capsule.caseId !== caseId) throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  const drawn = drawFamilyInstance((subseed) => genRankCapsule(subseed, capsule), {
    seed,
    caseId,
    difficulty,
    wantShape: (instance) => rank(instance.parameters.A) === capsule.targetRank,
    profileAccepts: (parameters) => Math.max(
      ...parameters.A.flat().map((value) => Math.abs(value)),
    ) <= capsule.bound,
    profiles: RANK_DIFFICULTIES,
  });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { kind: 'integer', value: drawn.expected },
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

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

// --- classify-independence-multiple ----------------------------------------------
// Geseedet über genIndependenceCapsule: Vektor-Zahlenbank plus Rotation, ein
// Template, drei Kapseln 1:1 auf den Bestandsfällen (intro/core/stretch).
// Der Content-Contract ist null, der Vertrag lebt hier. masteryEligible
// bleibt false wie im Bestand (alle drei Base-Fälle false).

const INDEPENDENCE_DIFFICULTIES = ['intro', 'core', 'stretch'];

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest nie `expected`. */
export function solveIndependenceFamily(parameters) {
  const capsule = Object.values(INDEPENDENCE_CAPSULES).find((item) => item.caseId === parameters?.caseId);
  if (!capsule) throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
  return { correctText: independenceCorrectText(parameters.vectors, capsule) };
}

export function generateIndependenceFamily({ seed, caseId, difficulty }) {
  const capsule = INDEPENDENCE_CAPSULES[difficulty];
  if (!capsule || capsule.caseId !== caseId) throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  const drawn = drawFamilyInstance((subseed) => genIndependenceCapsule(subseed, capsule), {
    seed,
    caseId,
    difficulty,
    wantShape: (instance) => independenceShapeOk(instance.parameters.vectors, capsule),
    profileAccepts: (parameters) => maxAbsVectors(parameters.vectors) <= capsule.bound,
    profiles: INDEPENDENCE_DIFFICULTIES,
  });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { ...drawn.expected },
    choices: drawn.choices,
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

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

// --- classify-column-combination ------------------------------------------------
// Geseedet über genColumnCombinationCapsule: 2×2-Zahlenbank plus 2×2-Solver
// als Antwort-Key (coefficients/choice), (m,n)-Bank mit Text-Key
// (shape-debug); drei Kapseln 1:1 auf den Bestandsfällen (core/intro/
// stretch). Der Content-Contract ist null, der Vertrag lebt hier.
// masteryEligible und competencyIds gelten pro Fall wie im Bestand
// (core/intro/stretch → true/false/true), damit Coverage und
// Mastery-Aussagen unverändert bleiben.

const COLUMN_COMBINATION_DIFFICULTIES = ['intro', 'core', 'stretch'];

const COLUMN_COMBINATION_META = {
  'column-coefficients-double': { masteryEligible: true, competencyIds: ['c-linalg-matrices'] },
  'column-choice-authored': { masteryEligible: false, competencyIds: ['c-linalg-systems'] },
  'shape-debug-authored': { masteryEligible: true, competencyIds: ['c-linalg-matrices', 'c-numpy-basics'] },
};

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest nie `expected`. */
export function solveColumnCombinationFamily(parameters) {
  const capsule = Object.values(COLUMN_COMBINATION_CAPSULES).find((item) => item.caseId === parameters?.caseId);
  if (!capsule) throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
  return { correctText: columnCorrectText(parameters, capsule) };
}

export function generateColumnCombinationFamily({ seed, caseId, difficulty }) {
  const capsule = COLUMN_COMBINATION_CAPSULES[difficulty];
  if (!capsule || capsule.caseId !== caseId) throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  const drawn = drawFamilyInstance((subseed) => genColumnCombinationCapsule(subseed, capsule), {
    seed,
    caseId,
    difficulty,
    wantShape: (instance) => columnInstanceOk(instance.parameters, capsule),
    profileAccepts: (parameters) => columnInstanceOk(parameters, capsule),
    profiles: COLUMN_COMBINATION_DIFFICULTIES,
  });
  const meta = COLUMN_COMBINATION_META[caseId];
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { ...drawn.expected },
    choices: drawn.choices,
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
    masteryEligible: meta.masteryEligible,
    competencyIds: [...meta.competencyIds],
  };
}

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

// --- classify-shape-contract --------------------------------------------------
// Geseedet über genClassifyShapeCapsule: Shape-Zahlenbank plus Rotation, ein
// Template je Shape-Art, drei Kapseln 1:1 auf den Bestandsfällen
// (intro/core/stretch → Bias-Broadcast/Transformer-QKV/Token-Embedding).
// Der Content-Contract ist null, der Vertrag lebt hier. masteryEligible
// bleibt false wie im Bestand (alle drei Base-Fälle false).
const CLASSIFY_SHAPE_DIFFICULTIES = ['intro', 'core', 'stretch'];

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest nie `expected`. */
export function solveClassifyShapeFamily(parameters) {
  const capsule = Object.values(CLASSIFY_SHAPE_CAPSULES).find((item) => item.caseId === parameters?.caseId);
  if (!capsule) throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
  return { correctText: classifyShapeCorrectText(parameters, capsule) };
}

export function generateClassifyShapeFamily({ seed, caseId, difficulty }) {
  const capsule = CLASSIFY_SHAPE_CAPSULES[difficulty];
  if (!capsule || capsule.caseId !== caseId) throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  const drawn = drawFamilyInstance((subseed) => genClassifyShapeCapsule(subseed, capsule), {
    seed,
    caseId,
    difficulty,
    wantShape: (instance) => classifyShapeOk(instance.parameters, capsule),
    profileAccepts: (parameters) => classifyShapeOk(parameters, capsule),
    profiles: CLASSIFY_SHAPE_DIFFICULTIES,
  });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { ...drawn.expected },
    choices: drawn.choices,
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

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

// --- classify-row-operation-validity ------------------------------------------------
// Geseedet über genRowOperationCapsule: 2×2-Zahlenbank mit getragener
// rechter Seite als Antwort-Key (equations), Multiplikator-Bank mit
// Text-Key (multiplier); zwei Kapseln 1:1 auf den Bestandsfällen
// (core/intro). Der Content-Contract ist null, der Vertrag lebt hier.
// masteryEligible und competencyIds gelten pro Fall wie im Bestand
// (core/intro → true/false, je c-linalg-gauss), damit Coverage und
// Mastery-Aussagen unverändert bleiben.

const ROW_OPERATION_DIFFICULTIES = ['intro', 'core'];

const ROW_OPERATION_META = {
  'valid-operation-rhs': { masteryEligible: true, competencyIds: ['c-linalg-gauss'] },
  'row-operation-choice-contract': { masteryEligible: false, competencyIds: ['c-linalg-gauss'] },
};

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest nie `expected`. */
export function solveRowOperationFamily(parameters) {
  const capsule = Object.values(ROW_OPERATION_CAPSULES).find((item) => item.caseId === parameters?.caseId);
  if (!capsule) throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
  return { correctText: rowOperationCorrectText(parameters, capsule) };
}

export function generateRowOperationFamily({ seed, caseId, difficulty }) {
  const capsule = ROW_OPERATION_CAPSULES[difficulty];
  if (!capsule || capsule.caseId !== caseId) throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  const drawn = drawFamilyInstance((subseed) => genRowOperationCapsule(subseed, capsule), {
    seed,
    caseId,
    difficulty,
    wantShape: (instance) => rowOperationInstanceOk(instance.parameters, capsule),
    profileAccepts: (parameters) => rowOperationInstanceOk(parameters, capsule),
    profiles: ROW_OPERATION_DIFFICULTIES,
  });
  const meta = ROW_OPERATION_META[caseId];
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { ...drawn.expected },
    choices: drawn.choices,
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
    masteryEligible: meta.masteryEligible,
    competencyIds: [...meta.competencyIds],
  };
}

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

// --- classify-rank-solution-case --------------------------------------------------
// Geseedet über genRankSolutionCapsule: Echelon-Zahlenbank mit Rotation,
// ein Template je Art (Zahlen-Fall trivial mit $z$-Texten, Symbol-Fall mit
// eigenem Template ohne $z$); zwei Kapseln 1:1 auf den Bestandsfällen
// (core/stretch). Der Content-Contract ist null, der Vertrag lebt hier.
// masteryEligible gilt pro Fall wie im Bestand (beide true),
// competencyIds ebenfalls (core → c-linalg-gauss, stretch → zusätzlich
// c-linalg-systems und c-linalg-independence), damit Coverage und
// Mastery-Aussagen unverändert bleiben.

const RANK_SOLUTION_DIFFICULTIES = ['core', 'stretch'];

const RANK_SOLUTION_META = {
  'echelon-read-rank-case': { masteryEligible: true, competencyIds: ['c-linalg-gauss'] },
  'rank-system-authored': { masteryEligible: true, competencyIds: ['c-linalg-systems', 'c-linalg-gauss', 'c-linalg-independence'] },
};

/** Unabhängiger Schlüssel: korrekter Wahltext aus der Kapselart, liest nie `expected`. */
export function solveRankSolutionFamily(parameters) {
  const capsule = Object.values(RANK_SOLUTION_CAPSULES).find((item) => item.caseId === parameters?.caseId);
  if (!capsule) throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
  return { correctText: rankSolutionCorrectText(parameters, capsule) };
}

export function generateRankSolutionFamily({ seed, caseId, difficulty }) {
  const capsule = RANK_SOLUTION_CAPSULES[difficulty];
  if (!capsule || capsule.caseId !== caseId) throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  const drawn = drawFamilyInstance((subseed) => genRankSolutionCapsule(subseed, capsule), {
    seed,
    caseId,
    difficulty,
    wantShape: (instance) => rankSolutionInstanceOk(instance.parameters, capsule),
    profileAccepts: (parameters) => rankSolutionInstanceOk(parameters, capsule),
    profiles: RANK_SOLUTION_DIFFICULTIES,
  });
  const meta = RANK_SOLUTION_META[caseId];
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { ...drawn.expected },
    choices: drawn.choices,
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
    masteryEligible: meta.masteryEligible,
    competencyIds: [...meta.competencyIds],
  };
}

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

export const LINALG_FAMILY_SPECS = [
  { ...SCALAR_PRODUCT_CONTRACT, generate: generateScalarProductFamily, solve: solveScalarProduct },
  { ...DET2_CONTRACT, generate: generateDet2Family, solve: solveDet2Family },
  { ...SYSTEM_2X2_CONTRACT, generate: generateSystem2x2Family, solve: solveSystem2x2 },
  { ...SHAPE_CONTRACT, generate: generateShapeContractFamily, solve: solveShapeContract },
  { ...RANK_CONTRACT, generate: generateRankFamily, solve: solveRankFamily },
  { ...INDEPENDENCE_CONTRACT, generate: generateIndependenceFamily, solve: solveIndependenceFamily },
  { ...MATRIX_SHAPE_CONTRACT, generate: generateMatrixShapeFamily, solve: solveMatrixShapeFamily },
  { ...COLUMN_COMBINATION_CONTRACT, generate: generateColumnCombinationFamily, solve: solveColumnCombinationFamily },
  { ...ROW_OPERATION_CONTRACT, generate: generateRowOperationFamily, solve: solveRowOperationFamily },
  { ...CLASSIFY_SHAPE_CONTRACT, generate: generateClassifyShapeFamily, solve: solveClassifyShapeFamily },
  { ...RANK_SOLUTION_CONTRACT, generate: generateRankSolutionFamily, solve: solveRankSolutionFamily },
];
