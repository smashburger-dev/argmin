// S4D5 Linalg-Familie (formula-scalar-product): ein Adapter hinter dem
// Registry-Seam für Skalarprodukt und Matrixeintrag. Ein geseedeter Fall
// (f-linalg-matmul-entry-01 über genMatmulEntryFresh) plus vier statische
// Falltypen, byte-identisch aus content/exercises/w05.json (w05-e1, w05-e12,
// w05-e13, w05-e3). w05-e16 (Code-Ausgabe) und w05-e9 (Begründung) teilen
// Lösungsweg und Antwortform nicht und bleiben Definitionen.

import { det2, genDet2, genLinear2Fresh, genMatmulEntryFresh, genShapePredict, solveShape } from './linalg_numpy_fresh_generators.mjs';
import { drawFamilyInstance } from './generator_draw_kit.mjs';
import { rank, solveLinear2 } from './w05_generators.mjs';
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
// Statisch aus w05-e2 (Single-Choice, Shape eines Matrixprodukts).

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

export const LINALG_FAMILY_SPECS = [
  { ...SCALAR_PRODUCT_CONTRACT, generate: generateScalarProductFamily, solve: solveScalarProduct },
  { ...DET2_CONTRACT, generate: generateDet2Family, solve: solveDet2Family },
  { ...SYSTEM_2X2_CONTRACT, generate: generateSystem2x2Family, solve: solveSystem2x2 },
  { ...SHAPE_CONTRACT, generate: generateShapeContractFamily, solve: solveShapeContract },
];
