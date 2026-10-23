import { figure, panel, label, line, dot } from '../objects/optimization-plot.mjs';

const captions = ['Vergleiche die Richtungen der Spalten und des Zielvektors.'];
export const hintBeatIds = ['step-0'];
export const hintParams = (_familyId, parameters) => parameters;

function validate(params) {
  if (params && Object.keys(params).sort().join(',') === 'mode,rows' && params.mode === 'rowops'
    && Array.isArray(params.rows) && params.rows.length === 3
    && params.rows.every((row) => Array.isArray(row) && row.length === 3 && row.every(Number.isFinite))) return;
  if (!params || Object.keys(params).sort().join(',') !== 'a1,a2,b'
    || ![params.a1, params.a2, params.b].every((vector) => Array.isArray(vector) && vector.length === 2 && vector.every(Number.isFinite))) {
    throw new Error('Nachbarbeispiel benötigt drei Zweiervektoren oder eine 3×3-Zeilenmatrix');
  }
}

function compute(params) {
  if (params.mode === 'rowops') return { ...params, resultRow: params.rows[2].map((value, index) => value - params.rows[0][index] - params.rows[1][index]) };
  const determinant = params.a1[0] * params.a2[1] - params.a1[1] * params.a2[0];
  const rankA = determinant !== 0 ? 2 : params.a1.some(Boolean) || params.a2.some(Boolean) ? 1 : 0;
  const inconsistent = rankA === 1 && params.a1[0] * params.b[1] - params.a1[1] * params.b[0] !== 0;
  return { ...params, determinant, rankA, rankAugmented: inconsistent ? 2 : rankA };
}

const coord = ([x, y]) => [50 + 8 * x, 50 - 8 * y];
function primitives(model) {
  if (model.mode === 'rowops') {
    const rows = model.rows.map((row, i) => [
      label(`row-${i}-label`, 8, 25 + i * 16, ['obere Zeile', 'mittlere Zeile', 'untere Zeile'][i], 'hi'),
      ...row.map((value, j) => label(`row-${i}-${j}`, 31 + j * 16, 25 + i * 16, value, j === 0 ? 'lit' : 'hi', 'middle')),
    ]).flat();
    return [panel([
      label('title', 8, 8, 'Unabhängiges Nachbarbeispiel'),
      ...rows,
      label('operation', 8, 82, 'untere ← untere − obere − mittlere', 'lit'),
      label('result', 8, 94, model.resultRow.every((value) => value === 0) ? 'Die dritte Zeile wird zur Nullzeile.' : 'Vergleiche die Zeilen nach der Elimination.'),
    ])];
  }
  return [panel([
    label('title', 8, 8, 'Unabhängiges Nachbarbeispiel'),
    line('x-axis', [12, 50], [88, 50], 'lo'), line('y-axis', [50, 12], [50, 88], 'lo'),
    line('column-1', coord([0, 0]), coord(model.a1), 'lit', { width: 0.7 }),
    line('column-2', coord([0, 0]), coord(model.a2), 'hi', { width: 0.7 }),
    line('target', coord([0, 0]), coord(model.b), 'mid', { width: 0.6, dash: [1, 0.5] }),
    dot('origin', coord([0, 0]), 'hi'),
    label('a1', ...coord(model.a1), 'a₁', 'lit'), label('a2', ...coord(model.a2), 'a₂', 'hi'),
    label('b', ...coord(model.b), 'b', 'mid'),
    label('determinant', 8, 91, model.determinant === 0 ? 'Spaltenrichtung: abhängig' : 'Spaltenrichtung: unabhängig'),
    label('ranks', 8, 99, model.rankA === model.rankAugmented ? 'Ziel: im Spaltenraum' : 'Ziel: außerhalb des Spaltenraums'),
  ])];
}

const base = figure({ id: 'linalg-case-neighbor', captions, validate, compute, items: primitives,
  detail: (model) => model.mode === 'rowops' ? 'Führe die angezeigte Zeilenoperation aus und prüfe die entstehende Zeile.' : `det(A) = ${model.determinant}; Rang(A) = ${model.rankA}; Rang(A | b) = ${model.rankAugmented}.` });
const baseBuild = base.build;
export const { id, beatIds, validateParams, model, pose, beatDuration, cameraFor, ground, predictValue, answerValues, displayNumbers } = base;
export const describe = () => captions[0];
export const readout = (m, p, mode) => mode === 'hint' ? captions[0] : base.readout(m, p, mode);
export const build = (m, p, mode = 'lesson') => mode === 'hint' ? primitives(m) : baseBuild(m, p, mode);
export const viewMode = 'flat';

