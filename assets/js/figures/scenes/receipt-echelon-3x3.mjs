import { createScene } from '../objects/linalg-stage.mjs';
import { rowLine, cafeCounter, cafeBounds, cafeGround } from '../objects/receipt-stage.mjs';
import { echelonBoard } from '../objects/echelon-board.mjs';
import { elimination, solutionCase, numberOf } from '../kit/rational-rows.mjs';

export const defaults = { contradiction: 5 };
export const captions = [
  'Drei Bedingungen stehen als Zeilen einer erweiterten Matrix. Die Spalten gehören zu x, y, z und der rechten Seite b.',
  'Ein Pivot in jeder Variablenspalte bindet alle drei Variablen. Es bleibt genau eine Lösung.',
  'Eine letzte Zeile ohne Bedingung lässt eine Variable frei. Zähle die Pivots.',
  'Eine Nullzeile links mit einem Betrag rechts verlangt Unmögliches.',
];
function computeModel({ contradiction }) {
  const systems = [
    [[1, 1, 0, 3], [2, 3, 1, 9], [1, 2, 2, 8]],
    [[1, 1, 0, 3], [2, 3, 1, 9], [3, 4, 1, 12]],
    [[1, 1, 0, 3], [2, 3, 1, 9], [3, 4, 1, 12 + contradiction]],
  ];
  const traces = systems.map(elimination);
  return { contradiction, systems, traces, cases: traces.map((trace) => solutionCase(trace.rows)), receipts: 3 };
}
const caseAt = (phase) => Math.min(2, Math.max(0, Math.floor(phase) - 1));
function rowsAt(m, phase) {
  const trace = m.traces[caseAt(phase)];
  return phase < 1 ? trace.states[0] : trace.rows;
}
const scene = createScene({ id: 'receipt-echelon-3x3', title: 'Die letzte Zeile', world: 'cafe', defaults, captions, predictBeat: 2, target: [0, 0, 18], azimuth: 0, elevation: 0,
  worldItems: cafeCounter, bounds: cafeBounds, ground: cafeGround,
  validate: ({ contradiction }) => { if (contradiction !== 5) throw new Error('Authored neighboring cases only'); },
  model: computeModel, items: (m, phase) => echelonBoard(rowsAt(m, phase)),
  predict: (m) => m.traces[1].rows.filter((row) => row.slice(0, -1).some((q) => q.n !== 0)).length,
  numbers: (m) => [m.contradiction, ...m.systems.flat(2), ...m.traces.flatMap((trace) => trace.states.flat(2).map(numberOf))],
  lines: (m, phase) => [['Genau eine Lösung', 'Unendlich viele Lösungen', 'Keine Lösung'][caseAt(phase)], ...rowsAt(m, phase).map(rowLine), 'Links und rechts gemeinsam lesen'],
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
