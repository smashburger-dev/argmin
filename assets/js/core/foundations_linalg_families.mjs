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
  INDEPENDENCE_CAPSULES, independenceShapeOk, INDEPENDENCE_FACTORS,
  independenceOptions, independencePrompt, independenceSolution, drawIndependenceParameters,
  pairIndependent, maxAbsVectors,
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
import { registerStaticCases, staticCaseBody, staticVariantInstance, variantOf } from '../domain/family_registry.mjs';
import scalarProductDoc from '../../../content/families/formula-scalar-product.json' with { type: 'json' };
import det2Doc from '../../../content/families/formula-det2-independence.json' with { type: 'json' };
import system2x2Doc from '../../../content/families/transform-system-2x2-elimination.json' with { type: 'json' };
import shapeContractDoc from '../../../content/families/validate-shape-contract.json' with { type: 'json' };
import mcIndependenceDoc from '../../../content/families/multiple-choice-linalg-independence.json' with { type: 'json' };

// Authored case bodies for the static members and solver reads — lazily
// registered like ensureShardDocs, because standalone module graphs (e2e,
// worker) see an otherwise empty registry.
let linalgDocsReady = false;
function ensureLinalgDocs() {
  if (linalgDocsReady) return;
  for (const doc of [scalarProductDoc, det2Doc, system2x2Doc, shapeContractDoc, mcIndependenceDoc]) {
    registerStaticCases(doc.familyId, doc.cases);
  }
  linalgDocsReady = true;
}

const linalgCaseBody = (familyId, caseId) => { ensureLinalgDocs(); return staticCaseBody(familyId, caseId); };
import { makeLinalgChoiceCapsuleFamily, makeNumericFamily } from './solved_family_kit.mjs';
import { rng, randInt, nonzeroInt, until, shuffle, drawFamilyInstance } from './generator_draw_kit.mjs';

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

// Die vier w05-Rechenfälle sind geseedet (SCALAR_GENERATORS); nur die
// Begründungsaufgabe bleibt ein statischer Fallkörper.
const SCALAR_STATIC_CASES = [
  'product-definition-rationale',
];

/** Statischer Schlüssel: erwartete Ausgabe aus dem registrierten Fallkörper
 *  (Variante über parameters.variant wie im Bestand), liest nie `expected`
 *  der generierten Instanz. */
const solveScalarStatic = (parameters) => {
  const { body } = variantOf(linalgCaseBody('formula-scalar-product', parameters.caseId), parameters.variant ?? 0);
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

// Gezogene Fehlwert-Feedbackregeln: die authored `value ===`-Regeln binden
// Ankerzahlen; hier wird dasselbe Misskonzept aus dem gezogenen Zahlenmaterial
// berechnet. Kandidaten, die zufällig dem Erwartungswert entsprechen oder
// schon vergebene Fehlwerte wiederholen, entfallen (Reihenfolge = Priorität).
const feedbackFromCandidates = (expected, candidates) => {
  const seen = new Set([expected]);
  return candidates
    .filter((item) => !seen.has(item.value) && seen.add(item.value))
    .map((item) => ({ if: `value === ${item.value}`, then: item.then }));
};

const pmatrixText = (m) => `\\begin{pmatrix}${m[0][0]}&${m[0][1]}\\\\${m[1][0]}&${m[1][1]}\\end{pmatrix}`;

const emitMatmulEntry = ({ A, B, entry }) => {
  const [i, j] = entry;
  const other = 3 - j;
  const row = A[i - 1];
  const col = [B[0][j - 1], B[1][j - 1]];
  const p1 = row[0] * col[0];
  const p2 = row[1] * col[1];
  const value = p1 + p2;
  const feedbackRules = feedbackFromCandidates(value, [
    { value: A[j - 1][0] * B[0][i - 1] + A[j - 1][1] * B[1][i - 1],
      then: `Das ist $c_{${j}${i}}$ (Zeile ${j} mal Spalte ${i}). Der Index $_{${i}${j}}$ liest sich: Zeile ${i} von $A$, Spalte ${j} von $B$.` },
    { value: p1,
      then: `Das ist nur das erste Teilprodukt $${numFactor(row[0])}\\cdot${numFactor(col[0])}$; der zweite Summand fehlt noch.` },
    { value: p1 - p2,
      then: `Vorzeichen beachten: das zweite Teilprodukt ist $${numFactor(row[1])}\\cdot${numFactor(col[1])} = ${p2}$, nicht ${-p2}.` },
    { value: row[0] * B[0][other - 1] + row[1] * B[1][other - 1],
      then: `Zeile ${i} von $A$ stimmt, aber gefragt ist die ${j}. Spalte von $B$, nicht die ${other}.` },
  ]);
  return {
    form: 'matmul-entry',
    parameters: { form: 'matmul-entry', A, B, entry },
    expected: { kind: 'integer', value },
    prompt: `Gegeben $A=${pmatrixText(A)}$ und $B=${pmatrixText(B)}$. Berechne den Eintrag $c_{${i}${j}}$ von $C=AB$.`,
    fullSolution: `$c_{${i}${j}} = ${numFactor(row[0])}\\cdot${numFactor(col[0])} + ${numFactor(row[1])}\\cdot${numFactor(col[1])} = ${p1} + (${p2}) = ${value}$.`,
    hints: [
      `Der Eintrag $c_{${i}${j}}$ ist das Skalarprodukt der ${i}. Zeile von $A$ mit der ${j}. Spalte von $B$.`,
      `Rechne die beiden Teilprodukte einzeln: $${numFactor(row[0])}\\cdot${numFactor(col[0])}$ und $${numFactor(row[1])}\\cdot${numFactor(col[1])}$ — erst danach addieren.`,
    ],
    feedbackRules,
    typicalErrors: [
      'Zeilen- und Spaltenindex vertauscht',
      'nur das erste Teilprodukt gebildet und den zweiten Summanden vergessen',
      'Vorzeichen eines Teilprodukts übersehen',
    ],
    activityType: 'numeric',
    graderId: 'deterministic',
  };
};

const emitDotProduct = ({ u, v }) => {
  const products = u.map((x, index) => x * v[index]);
  const value = products[0] + products[1] + products[2];
  const term = (x, y) => `${numFactor(x)}\\cdot${numFactor(y)}`;
  const expanded = `${term(u[0], v[0])} + ${term(u[1], v[1])} + ${term(u[2], v[2])}`;
  const shifted = u[0] * v[1] + u[1] * v[2] + u[2] * v[0];
  const feedbackRules = feedbackFromCandidates(value, [
    { value: value - 2 * products[1],
      then: `$${term(u[1], v[1])} = ${products[1]}$: das zweite Teilprodukt hat ein Vorzeichenproblem.` },
    { value: value - products[2],
      then: `Der dritte Summand $${term(u[2], v[2])} = ${products[2]}$ fehlt — das Skalarprodukt summiert alle drei Komponentenprodukte.` },
    { value: value - 2 * products[0],
      then: `$${term(u[0], v[0])} = ${products[0]}$: das erste Teilprodukt hat ein Vorzeichenproblem.` },
    { value: value - 2 * products[2],
      then: `$${term(u[2], v[2])} = ${products[2]}$: das dritte Teilprodukt hat ein Vorzeichenproblem.` },
    { value: shifted,
      then: `Die Komponenten werden paarweise multipliziert ($u_1v_1 + u_2v_2 + u_3v_3$), nicht versetzt.` },
    { value: -value,
      then: `Der Betrag stimmt möglicherweise, aber das Gesamtvorzeichen ist falsch: die Summe ist ${value}, nicht ${-value}.` },
  ]);
  return {
    form: 'dot-vectors',
    parameters: { form: 'dot-vectors', u, v },
    expected: { kind: 'integer', value },
    prompt: `Gegeben $u=(${u.join(',')})$ und $v=(${v.join(',')})$. Berechne das Skalarprodukt $u^\\top v$.`,
    fullSolution: `$u^\\top v = ${expanded} = ${products.join(' + ')} = ${value}$.`,
    hints: [
      `Multipliziere die Komponenten paarweise: $${term(u[0], v[0])}$, $${term(u[1], v[1])}$ und $${term(u[2], v[2])}$.`,
      'Erst alle drei Teilprodukte mit ihren Vorzeichen notieren, dann summieren.',
    ],
    feedbackRules,
    typicalErrors: [
      'Vorzeichen eines Komponentenprodukts falsch gesetzt',
      'ein Komponentenprodukt beim Summieren ausgelassen',
      'Komponenten versetzt statt paarweise multipliziert',
    ],
    activityType: 'numeric',
    graderId: 'deterministic',
  };
};

// Draw-Raum der w05-Restfälle: matmul-entry folgt genMatmulEntry (A
// nonzeroInt(-4,4), B nonzeroInt(-3,3), entry {1,2}²); w05-e1 zieht B aus den
// vollen ganzen Zahlen [-3,3], weil die authored Instanz B[0][0]=0 trägt —
// der Anker liegt damit im Draw-Raum (Guard: B nicht die Nullmatrix). Die
// anderen Fälle haben eigene draw-Funktionen und bleiben beim nonzeroInt-Raum.
const drawMatmulEntry = (r, bRange) => ({
  A: [[nonzeroInt(r, -4, 4), nonzeroInt(r, -4, 4)], [nonzeroInt(r, -4, 4), nonzeroInt(r, -4, 4)]],
  B: [[bRange(r), bRange(r)], [bRange(r), bRange(r)]],
  entry: [randInt(r, 1, 2), randInt(r, 1, 2)],
});

const drawDotVectors = (r) => ({
  u: [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5)],
  v: [nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5), nonzeroInt(r, -5, 5)],
});

const SCALAR_GENERATORS = {
  'matmul-entry-w05-e1': {
    draw: (r) => drawMatmulEntry(r, (draw) => randInt(draw, -3, 3)),
    wantShape: ({ B }) => !B.flat().every((value) => value === 0),
    emit: emitMatmulEntry,
  },
  'matmul-entry-w05-e12': {
    draw: (r) => drawMatmulEntry(r, (draw) => nonzeroInt(draw, -3, 3)),
    wantShape: () => true,
    emit: emitMatmulEntry,
  },
  'dot-product-w05-e13': {
    draw: drawDotVectors,
    wantShape: () => true,
    emit: emitDotProduct,
  },
  'dot-product-w05-e3': {
    draw: drawDotVectors,
    wantShape: () => true,
    emit: emitDotProduct,
  },
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
  ensureLinalgDocs();
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
    const body = linalgCaseBody('formula-det2-independence', 'det2-seeded-columns');
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
    ...linalgCaseBody('formula-det2-independence', 'det2-seeded-columns').expected,
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

export const generateSystem2x2Family = (args) => { ensureLinalgDocs(); return system2x2Kit.generate(args); };
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
  solveStatic: (parameters) => ({ output: linalgCaseBody('validate-shape-contract', parameters.caseId).expected.output }),
  solveSeeded: (parameters) => ({ output: `(${solveShape(parameters.shape, parameters).join(', ')})` }),
});
export const generateShapeContractFamily = (args) => { ensureLinalgDocs(); return shapeContractKit.generate(args); };
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

// --- multiple-choice-linalg-independence -------------------------------------
// Geseedete Vektormengen: der Seed zieht pro Optionsslot eine Trap-Klasse
// (kollinear, Kombination a·v1+b·v2, >n-Regel, Nullvektor-Set) und mindestens
// zwei unabhängige Sets (per-correct). Feedback-Regeln werden aus dem gezogenen
// Material emittiert (selected.includes-Grammatik, konkreter Witness), weil die
// authored Regeln Anker-IDs binden. independence-statements und
// rank-nullity-combined bleiben authored und werden über staticVariantInstance
// mit dem authored difficultyProfile-Gate serviert (Variantenauflösung wie im
// Bestand). Der Content-Contract ist null, der Vertrag lebt hier.

export const MC_INDEPENDENCE_CONTRACT = {
  familyId: 'multiple-choice-linalg-independence',
  familyGroup: 'classify-concept',
  summary: 'Prüft Vektormengen und Aussagen zur linearen Unabhängigkeit über mehrere Optionen hinweg.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'independent-sets-r2', propertyTest: false },
    { caseId: 'independence-statements', propertyTest: true },
    { caseId: 'independent-sets-r3', propertyTest: false },
    { caseId: 'rank-nullity-combined', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-linalg-independence'],
  graderId: 'deterministic',
  activityType: 'multiple-choice',
};

const MC_SET_IDS = ['a', 'b', 'c', 'd', 'e'];
// Die beiden geseedeten Fälle pinnen ihr authored Profil (r2 intro, r3
// stretch) — wie im authored Bestand, in dem generate bei anderen Profilen
// fehlschlug.
const MC_SET_DIMS = { 'independent-sets-r2': 2, 'independent-sets-r3': 3 };
const MC_SET_DIFFICULTY = { 'independent-sets-r2': 'intro', 'independent-sets-r3': 'stretch' };
const MC_STATIC_CASES = ['independence-statements', 'rank-nullity-combined'];
const MC_BOUND = 8;

const mcVecText = (v) => `(${v.join(',')})`;
const mcSetText = (vectors) => `$\\{${vectors.map(mcVecText).join(',\\ ')}\\}$`;

// Sarrus für den Unabhängigkeits-Witness der gezogenen Basis (Rang bleibt
// die Autorität; der det-Text ist didaktisches Beiwerk wie im authored Fall).
const mcDet3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
  - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
  + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

const mcVec = (r, dim, bound) => Array.from({ length: dim }, () => randInt(r, -bound, bound));
const mcNonzeroVec = (r, dim, bound) => until(
  r, () => mcVec(r, dim, bound), (v) => v.some((x) => x !== 0), { scope: 'mcIndependentSets' },
);

const drawMcSlot = (r, dim, kind) => {
  if (kind === 'independent') {
    const bound = dim === 2 ? 4 : 3;
    const vectors = until(r, () => Array.from({ length: dim }, () => mcVec(r, dim, bound)),
      (vs) => rank(vs) === dim, { scope: 'mcIndependentSets' });
    return { kind, vectors, correct: true };
  }
  if (kind === 'independent-short') {
    const vectors = until(r, () => [mcVec(r, dim, 3), mcVec(r, dim, 3)],
      pairIndependent, { scope: 'mcIndependentSets' });
    return { kind, vectors, correct: true };
  }
  if (kind === 'collinear') {
    return until(r, () => {
      const v = mcNonzeroVec(r, dim, 2);
      const k = INDEPENDENCE_FACTORS[randInt(r, 0, INDEPENDENCE_FACTORS.length - 1)];
      const vectors = [v, v.map((x) => x * k)];
      if (dim === 3 && r() < 0.5) vectors.push(mcNonzeroVec(r, dim, 3));
      return { kind, vectors, correct: false, factor: k };
    }, (slot) => maxAbsVectors(slot.vectors) <= MC_BOUND
      && (slot.vectors.length === 2 || pairIndependent([slot.vectors[0], slot.vectors[2]])),
    { scope: 'mcIndependentSets' });
  }
  if (kind === 'combo') {
    return until(r, () => {
      const v1 = mcNonzeroVec(r, dim, 3);
      const v2 = mcNonzeroVec(r, dim, 3);
      const pool = dim === 2 ? [-1, 1] : [-2, -1, 1, 2];
      const a = pool[randInt(r, 0, pool.length - 1)];
      const b = pool[randInt(r, 0, pool.length - 1)];
      const v3 = v1.map((x, index) => a * x + b * v2[index]);
      return { kind, vectors: [v1, v2, v3], correct: false, coeffs: [a, b] };
    }, (slot) => pairIndependent([slot.vectors[0], slot.vectors[1]])
      && maxAbsVectors(slot.vectors) <= MC_BOUND, { scope: 'mcIndependentSets' });
  }
  if (kind === 'overn') {
    const vectors = until(r, () => Array.from({ length: dim + 1 }, () => mcNonzeroVec(r, dim, 3)),
      (vs) => new Set(vs.map((v) => v.join(','))).size >= 2, { scope: 'mcIndependentSets' });
    return { kind, vectors, correct: false };
  }
  // zero: Nullvektor-Set an gezogener Position (2 oder 3 Vektoren).
  const count = r() < 0.5 ? 2 : 3;
  const vectors = Array.from({ length: count - 1 }, () => mcNonzeroVec(r, dim, 3));
  vectors.splice(randInt(r, 0, count - 1), 0, Array(dim).fill(0));
  return { kind: 'zero', vectors, correct: false };
};

const drawMcSetSlots = (r, dim) => {
  const nCorrect = r() < 0.6 ? 2 : 3;
  const correctAt = new Set(shuffle(r, [0, 1, 2, 3, 4]).slice(0, nCorrect));
  const traps = shuffle(r, ['collinear', 'combo', 'overn', 'zero']);
  let next = 0;
  return MC_SET_IDS.map((id, index) => {
    const kind = correctAt.has(index)
      ? (dim === 3 && r() < 0.35 ? 'independent-short' : 'independent')
      : traps[next];
    if (!correctAt.has(index)) next += 1;
    return { ...drawMcSlot(r, dim, kind), id };
  });
};

// Koeffizienten-Schreibweise für den Kombinations-Witness (±1 ohne Ziffer).
const mcComboText = ({ vectors, coeffs }) => {
  const [a, b] = coeffs;
  const lead = a === 1 ? mcVecText(vectors[0]) : a === -1 ? `-${mcVecText(vectors[0])}` : `${a}\\,${mcVecText(vectors[0])}`;
  const tail = Math.abs(b) === 1 ? mcVecText(vectors[1]) : `${Math.abs(b)}\\,${mcVecText(vectors[1])}`;
  return `${lead} ${b < 0 ? '-' : '+'} ${tail}`;
};

// Verdict + Witness je Slot: `reason` kürzt die fullSolution ab, `trap`/`missed`
// sind die emittierten Feedbacktexte (Misskonzept = die gezogene Trap-Klasse).
const mcSlotVerdict = (slot, dim) => {
  const vs = slot.vectors;
  if (slot.kind === 'independent') {
    const det = vs.length === 2 ? det2(vs) : mcDet3(vs);
    return {
      verdict: 'unabhängig',
      reason: `die Determinante ist $${det} \\neq 0$`,
      missed: `Die Determinante der Vektoren ist $${det} \\neq 0$ — keine nichttriviale Nullkombination existiert, die Menge ist unabhängig.`,
    };
  }
  if (slot.kind === 'independent-short') {
    return {
      verdict: 'unabhängig',
      reason: 'kein Skalar macht einen Vektor zum Vielfachen des anderen',
      missed: `Kein Skalar $\\lambda$ erfüllt $${mcVecText(vs[1])} = \\lambda\\,${mcVecText(vs[0])}$ in allen Komponenten — zwei nichtkollineare Vektoren sind unabhängig.`,
    };
  }
  if (slot.kind === 'collinear') {
    const [v, kv] = vs;
    return {
      verdict: 'abhängig',
      reason: `$${mcVecText(kv)} = ${slot.factor}\\,${mcVecText(v)}$ — die Vektoren sind kollinear`,
      trap: `$${mcVecText(kv)} = ${slot.factor}\\cdot ${mcVecText(v)}$ — die Vektoren sind kollinear und daher abhängig; vom Nullvektor verschieden zu sein reicht nicht.`,
    };
  }
  if (slot.kind === 'combo') {
    const relation = mcComboText(slot);
    return {
      verdict: 'abhängig',
      reason: `$${mcVecText(vs[2])} = ${relation}$`,
      trap: `Es gilt $${mcVecText(vs[2])} = ${relation}$ — ein Vektor der Menge ist eine Kombination der anderen, also ist die Menge abhängig.`,
    };
  }
  if (slot.kind === 'overn') {
    return {
      verdict: 'abhängig',
      reason: `${vs.length} Vektoren überschreiten die Dimension $${dim}$`,
      trap: `${vs.length} Vektoren im $\\mathbb{R}^{${dim}}$ sind immer abhängig (mehr Vektoren als die Dimension).`,
    };
  }
  return {
    verdict: 'abhängig',
    reason: 'die Menge enthält den Nullvektor',
    trap: 'Die Menge enthält den Nullvektor — mit Koeffizient $1$ vor ihm und $0$ vor den übrigen liegt eine nichttriviale Nullkombination vor.',
  };
};

const MC_SET_HINTS = {
  2: [
    'Prüfe jedes Paar auf einen gemeinsamen Skalarfaktor — und zähle bei jeder Menge, ob mehr Vektoren als die Dimension vorliegen.',
    'Der Nullvektor macht jede Menge automatisch abhängig: der Koeffizient vor ihm darf frei gewählt werden.',
  ],
  3: [
    'Prüfe bei Dreiermengen im $\\mathbb{R}^3$, ob ein Vektor als Summe oder Kombination der anderen schreibbar ist — Parallelität ist dafür nicht nötig.',
    'Zähle zuerst die Vektoren gegen die Dimension und suche dann nach Nullkombinationen wie $v_1 + v_2 + v_3 = 0$.',
  ],
};

const MC_SET_TYPICAL_ERRORS = {
  2: [
    'Nichtnullvektoren pauschal als unabhängig gelesen und Kollinearität übersehen.',
    'Mehr Vektoren als die Dimension ($3 > 2$ im $\\mathbb{R}^2$) als unabhängig bewertet.',
    'Den Nullvektor als neutralen Bestandteil statt als Abhängigkeitsbeweis erkannt.',
  ],
  3: [
    'Summen-Abhängigkeit ($v_3 = a\\,v_1 + b\\,v_2$) bei nicht parallelen Vektoren übersehen.',
    'Paarweise Nichtparallelität fälschlich als Unabhängigkeitsbeweis der Dreiermenge gelesen.',
    'Vier Vektoren im $\\mathbb{R}^3$ wegen individuell unterschiedlicher Richtungen als unabhängig bewertet.',
  ],
};

const emitMcSetInstance = ({ dim, slots }) => {
  const verdicts = slots.map((slot) => mcSlotVerdict(slot, dim));
  const correctIds = slots.filter((slot) => slot.correct).map((slot) => slot.id);
  return {
    parameters: {
      dim,
      sets: slots.map(({ id, kind, vectors }) => ({ id, kind, vectors })),
    },
    expected: { kind: 'choice-indices', correctIds, scoring: 'per-correct' },
    choices: slots.map((slot) => ({ id: slot.id, text: mcSetText(slot.vectors) })),
    prompt: dim === 2
      ? 'Welche der folgenden Vektormengen im $\\mathbb{R}^2$ sind linear unabhängig? Wähle alle zutreffenden Optionen aus.'
      : 'Welche der folgenden Vektormengen sind im $\\mathbb{R}^3$ linear unabhängig? Wähle alle zutreffenden Optionen aus.',
    fullSolution: slots.map((slot, index) => `(${slot.id}) ${verdicts[index].verdict}: ${verdicts[index].reason}.`).join(' '),
    hints: MC_SET_HINTS[dim],
    feedbackRules: slots.flatMap((slot, index) => (slot.correct
      ? [{ if: `!selected.includes('${slot.id}')`, then: verdicts[index].missed }]
      : [{ if: `selected.includes('${slot.id}')`, then: verdicts[index].trap }])),
    typicalErrors: MC_SET_TYPICAL_ERRORS[dim],
    activityType: 'multiple-choice',
    graderId: 'deterministic',
    masteryEligible: true,
  };
};

// Emittierte Instanz: fünf Optionen mit eindeutigen Texten, mindestens zwei
// korrekte Sets mit ids aus den Choices (assertMultipleChoiceContract).
const mcSetInstanceOk = (instance) => {
  const texts = instance.choices.map((choice) => choice.text);
  if (new Set(texts).size !== texts.length) return false;
  const ids = new Set(instance.choices.map((choice) => choice.id));
  return instance.expected.correctIds.length >= 2
    && instance.expected.correctIds.every((id) => ids.has(id));
};

export function generateMcIndependenceFamily({ seed, caseId, difficulty }) {
  const dim = MC_SET_DIMS[caseId];
  if (dim) {
    if (MC_SET_DIFFICULTY[caseId] !== difficulty) {
      throw new Error(`Unbekanntes Profil ${difficulty} für Fall ${caseId}`);
    }
    const drawn = drawFamilyInstance(
      (subseed) => emitMcSetInstance({ dim, slots: drawMcSetSlots(rng(subseed), dim) }),
      {
        seed, caseId, difficulty,
        wantShape: mcSetInstanceOk,
        profiles: MC_INDEPENDENCE_CONTRACT.difficultyProfiles,
      },
    );
    return { ...drawn, parameters: { caseId, difficulty, ...drawn.parameters } };
  }
  if (MC_STATIC_CASES.includes(caseId)) {
    ensureLinalgDocs();
    const body = staticCaseBody('multiple-choice-linalg-independence', caseId);
    if (body.difficultyProfile !== difficulty) {
      throw new Error(`Unbekanntes Profil ${difficulty} für Fall ${caseId}`);
    }
    return staticVariantInstance('multiple-choice-linalg-independence', caseId, seed, difficulty);
  }
  throw new Error(`Unbekannter Fall ${caseId}`);
}

// Unabhängiger Solver: Unabhängigkeit jeder gezogenen Menge wird über den
// Bareiss-Rang neu bewertet (set.kind ist Draw-Metadatum, kein Schlüssel).
export function solveMcIndependence(parameters) {
  if (MC_SET_DIMS[parameters?.caseId]) {
    return {
      correctIds: parameters.sets
        .filter((set) => rank(set.vectors) === set.vectors.length)
        .map((set) => set.id),
    };
  }
  if (MC_STATIC_CASES.includes(parameters?.caseId)) {
    const { body } = variantOf(
      linalgCaseBody('multiple-choice-linalg-independence', parameters.caseId),
      parameters.variant ?? 0,
    );
    return { correctIds: [...body.expected.correctIds] };
  }
  throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
}

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
  {
    ...MC_INDEPENDENCE_CONTRACT,
    generate: generateMcIndependenceFamily,
    solve: solveMcIndependence,
  },
];
