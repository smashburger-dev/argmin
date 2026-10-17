import { createScene, solid, stroke } from '../objects/linalg-stage.mjs';
import { sheetFaces, meshFromFaces } from '../kit/space-sheet.mjs';
import { cubeSection } from '../kit/cube-plane.mjs';
import { box, cylinder } from '../kit/solids.mjs';
import { elimination, solutionCase } from '../kit/rational-rows.mjs';

export const defaults = { a: 1, c: 2 };
export const captions = [
  'Eine Ebene lässt viele Punkte zu. Ihr innerer Umriss zeigt eine einzige Bedingung.',
  'Die zweite Ebene schneidet die erste. Nur die Punkte auf der gemeinsamen Geraden erfüllen beide Bedingungen.',
  'Ein Punkt erfüllt alle drei Ebenen. Übertrage: Wann fallen x + y = 2 und a·x + y = c zusammen?',
  'Die dritte Ebene dreht sich um den Ursprung. Am Ende enthält sie die gemeinsame Gerade.',
  'Die dritte Ebene rückt ab. Nun erfüllt kein Punkt mehr alle drei Bedingungen.',
  'Wo der Vergleich hinkt: Die Glaswände begrenzen nur den Ausschnitt, die mathematischen Ebenen reichen weiter.',
];
function computeModel({ a, c }) {
  const systems = [
    [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]],
    [[1, 0, 0, 0], [0, 1, 0, 0], [1, 1, 0, 0]],
    [[1, 0, 0, 0], [0, 1, 0, 0], [1, 0, 0, 3]],
  ];
  const traces = systems.map(elimination);
  const m = { a, c, systems, traces, cases: traces.map((t) => solutionCase(t.rows)),
    checkpoint: elimination([[1, 1, 2], [a, 1, c]]), radius: 6.5, center: [0, 0, 7.4] };
  m.cube = cubeFaces(m);
  m.glass = solid('glass-cube', meshFromFaces(m.cube), 'glass');
  return m;
}
function cubeFaces(m) {
  const c = m.center, r = m.radius;
  return [
    ...sheetFaces([c[0] - r, c[1], c[2]], [0, r, 0], [0, 0, r], [-1, 1]),
    ...sheetFaces([c[0] + r, c[1], c[2]], [0, r, 0], [0, 0, r], [-1, 1]),
    ...sheetFaces([c[0], c[1] - r, c[2]], [r, 0, 0], [0, 0, r], [-1, 1]),
    ...sheetFaces([c[0], c[1] + r, c[2]], [r, 0, 0], [0, 0, r], [-1, 1]),
    ...sheetFaces([c[0], c[1], c[2] + r], [r, 0, 0], [0, r, 0], [-1, 1]),
  ];
}
const ramp = (phase, start) => Math.min(1, Math.max(0, phase - start));
export function planeState(phase) {
  const turn = ramp(phase, 2), slide = ramp(phase, 3);
  return { normal: [turn, turn * (1 - slide), 1 - turn], distance: slide * 3,
    second: ramp(phase, 0), third: ramp(phase, 1) };
}
function items(m, phase) {
  const state = planeState(phase);
  const r = m.radius, c = m.center;
  const secondSize = Math.max(0.001, state.second);
  const thirdSize = Math.max(0.001, state.third);
  const first = cubeSection([1, 0, 0], 0, r).map((p) => p.map((x, i) => x + c[i]));
  const second = cubeSection([0, 1, 0], 0, r * secondSize).map((p) => p.map((x, i) => x + c[i]));
  const activeNormal = phase <= 1 ? [0, 1, 0] : state.normal;
  const activeDistance = phase <= 1 ? 0 : state.distance;
  const activeSize = phase <= 1 ? r * secondSize : r * thirdSize;
  const outline = cubeSection(activeNormal, activeDistance, activeSize).map((p) => p.map((x, i) => x + c[i]));
  const safe = outline.length ? outline : [c];
  const out = [
    m.glass,
    stroke('active-condition', [...safe, safe[0]], 'lit', 2),
    stroke('common-line', [[0, 0, c[2] - r], [0, 0, c[2] + r]], 'mid', 2),
    stroke('common-point', [[-0.45, 0, c[2]], [0.45, 0, c[2]], [0, 0, c[2]], [0, -0.45, c[2]], [0, 0.45, c[2]]], 'mid', 3),
  ];
  out[1].visible = phase > 0;
  out[2].visible = (phase >= 1 && phase < 2) || phase === 3;
  out[3].visible = phase >= 2 && phase < 3;
  out.push(stroke('first-condition', [...first, first[0]], 'mid', 1.3));
  out.push(stroke('second-condition', [...second, second[0]], 'mid', 1.3));
  out.at(-1).visible = state.second > 0;
  return out;
}
const scene = createScene({ id: 'solution-cases-3d', title: 'Bedingungen im Raum', world: 'map', defaults, captions, predictBeat: 2, azimuth: 20, elevation: 28,
  worldItems: () => [solid('map-table', box([-11, -11, -0.7], [22, 22, 0.7]), 'mid'), solid('turntable', cylinder([0, 0, 0], 9.4, 0.8, { segments: 20 }), 'lo')],
  bounds: [[-11, -11, 0], [11, -11, 0], [-11, 11, 14], [11, 11, 14]], ground: { center: [0, 0, 0], size: [22, 22] },
  validate: ({ a, c }) => { if (a !== 1 || c !== 2) throw new Error('Authored neighboring cases only'); },
  model: computeModel, items, predict: (m) => m.c / 2,
  numbers: (m) => [...m.systems.flat(2), m.a, m.c],
  lines: (m, phase) => [
    phase < 1 ? 'Eine Bedingung: eine Ebene' : phase < 2 ? 'Zwei Bedingungen: eine Gerade' : phase < 3 ? 'Drei unabhängige Bedingungen: ein Punkt' : phase < 4 ? 'Abhängige Bedingungen: eine Gerade' : 'Widerspruch: kein gemeinsamer Punkt',
    'Drehen verändert den Blick, nicht die Lösungsmenge.',
  ],
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;

export const viewMode = 'spatial';
