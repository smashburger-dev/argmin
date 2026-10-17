import { rational, numberOf } from '../kit/rational-rows.mjs';
import { text, solid, readingPlane } from '../objects/linalg-stage.mjs';
import { box } from '../kit/solids.mjs';

export const id = 'smoothie-row-and-column';
export const defaults = { c1: 3, c2: -1 };
export const beatIds = ['conditions', 'point', 'predict', 'intersection', 'reading', 'limits'];
export const captions = [
  'Zwei abstrakte Spaltenvektoren und ein Ziel. Die Achsen zeigen die beiden Komponenten, keine Nährwerte.',
  'Eine Portion von jeder Zutat verfehlt das Ziel. Der Mischversuch trifft zu hoch.',
  'Bestimme die erste Portionszahl für den Treffer. Nutze die Bedingungen aus der Frage.',
  'Die korrigierte Pfeilkette trifft das Ziel. Beachte den deutlich kleineren zweiten Beitrag.',
  'Wechsle ins Zeilenbild: Derselbe Lösungsvektor ist hier der Schnittpunkt der beiden Bedingungen.',
  'Wo der Vergleich hinkt: Für ein anderes Ziel wird eine Portion negativ. Der Spaltenpfeil kehrt seine Richtung um.',
];
export function validateParams(p) {
  if (!p || p.c1 !== 3 || p.c2 !== -1 || Object.keys(p).length !== 2) throw new Error('Authored checkpoint only');
}
export function model(params) {
  validateParams(params);
  const { c1, c2 } = params;
  const x = [rational(2 * c1 - c2, 5), rational(c1 + 2 * c2, 5)];
  return { c1, c2, x, a1: [2, -1], a2: [1, 2], negative: [-1, 1],
    support: solid('workbench-top', box([-20, -1, -3], [40, 6, 1.5]), 'mid'),
    frame: solid('diagram-frame', box([-18.5, 0.1, -0.5], [37, 0.7, 37]), 'board'),
    board: { origin: [-18, 0, 36], size: [36, 36], center: [0, 0, 18] } };
}
export const beatDuration = (beat) => {
  if (!beatIds.includes(beat)) throw new Error('Unknown beat');
  return 1.6;
};
const ramp = (x) => Math.min(1, Math.max(0, x));
export function pose(m, beat, t) {
  const k = Math.min(5, Math.max(0, beat));
  const u = ramp(t / 1.6);
  const phase = Math.max(0, k - 1) + (k === 0 ? 0 : u * u * (3 - 2 * u));
  return { phase, camera: 'diagram' };
}
function portions(m, phase) {
  if (phase < 2) return [1, 1];
  if (phase < 3) return m.x.map((q) => 1 + (numberOf(q) - 1) * (phase - 2));
  const negative = ramp(phase - 4);
  return m.x.map((q, i) => numberOf(q) * (1 - negative) + m.negative[i] * negative);
}
const point = (x, y) => [15 + x * 4, 22 - y * 4];
function grid(prefix, title, axes) {
  const out = [
    text(prefix + '-title', 3, 3, title, 2.1, 'mid'),
    { t: 'grid', key: prefix + '-grid', from: [3, 6], to: [31, 34], step: 4, tone: 'lo', width: 0.1 },
    { t: 'line', key: prefix + '-axis-x', from: [3, 22], to: [31, 22], tone: 'mid', width: 0.18 },
    { t: 'line', key: prefix + '-axis-y', from: [15, 6], to: [15, 34], tone: 'mid', width: 0.18 },
    { ...text(prefix + '-x', 31, 32, axes[0], 1.8, 'mid'), anchor: 'end' },
    text(prefix + '-y', 16.2, 5.2, axes[1], 1.8, 'mid'),
  ];
  for (const x of [-2, -1, 0, 1, 2, 3, 4]) out.push(text(prefix + '-tick-' + x, point(x, 0)[0] - 0.4, 35.5, x, 1.8, 'mid'));
  return out;
}
function columnPrims(m, phase) {
  const [x, y] = portions(m, phase), join = ramp(phase);
  const first = [2 * x, -x], mix = [2 * x + y, -x + 2 * y];
  const from = first.map((v) => v * join);
  const to = mix.map((v, i) => v * join + m.a2[i] * (1 - join));
  const negative = ramp(phase - 4);
  const target = [m.c1 * (1 - negative) - negative, m.c2 * (1 - negative) + 3 * negative];
  const a2Label = phase < 1 ? [21, 14] : phase > 4 ? [13, 8] : [29, 23];
  return [
    ...grid('col', 'Spaltenbild', ['b₁', 'b₂']),
    { t: 'arrow', key: 'first-contribution', from: point(0, 0), to: point(...first), tone: 'mid', width: 0.3 },
    { t: 'arrow', key: 'second-contribution', from: point(...from), to: point(...to), tone: 'lit', width: 0.3 },
    { t: 'dot', key: 'target', at: point(...target), r: 0.45, ring: true, tone: 'hi' },
    text('a1-name', phase > 4 ? 4 : 18, phase > 4 ? 16 : 28, 'a₁', 2.1),
    text('a2-name', ...a2Label, 'a₂', 2.1, 'lit'),
    text('target-name', point(...target)[0] + 1.2, point(...target)[1] + 2, phase > 4 ? 'b′' : 'b', 2.1),
  ];
}
function rowPrims(m) {
  const [x, y] = m.x.map(numberOf);
  return [
    ...grid('row', 'Zeilenbild', ['x₁', 'x₂']),
    { t: 'line', key: 'condition-one', from: point(-0.5, 4), to: point(3, -3), tone: 'mid', width: 0.3 },
    { t: 'line', key: 'condition-two', from: point(-3, -2), to: point(4, 1.5), tone: 'lit', width: 0.3 },
    { t: 'dot', key: 'solution', at: point(x, y), r: 0.45, tone: 'lit' },
    text('solution-name', point(x, y)[0] + 1.5, point(x, y)[1] - 1.2, 'S', 2.1),
  ];
}
export function build(m, p, mode = 'lesson') {
  if (mode !== 'lesson') throw new Error('S3 has no hint mode');
  const rowAlpha = ramp(p.phase - 3) * (1 - ramp(p.phase - 4));
  const alpha = (prims, a) => prims.map((prim) => ({ ...prim, alpha: a, visible: a > 0 }));
  const prims = [...alpha(columnPrims(m, p.phase), 1 - rowAlpha), ...alpha(rowPrims(m), rowAlpha)];
  return [m.support, m.frame, readingPlane('board-face', m.board.origin, m.board.size, prims, { on: 'diagram-frame', bias: 0.1 })];
}
export const cameraFor = (m, p, vp) => ({ azimuth: 0, elevation: 0, target: m.board.center, zoom: Math.min(0.94 * vp.width / 36, 0.94 * vp.height / 36) });
export const ground = () => ({ center: [0, 0, -3], size: [40, 6] });
export const readout = (m, p = { phase: 0 }) => p.phase < 3 ? `Ziel b = (${m.c1}; ${m.c2})` : 'Portionen: ' + portions(m, p.phase).map((x) => x.toFixed(1).replace('.', ',')).join('; ');
export const describe = (m, k) => captions[k] + ' ' + readout(m, { phase: k });
export function predictValue(m, beat) {
  if (beat !== 'predict') throw new Error('No prediction on this beat');
  return numberOf(m.x[0]);
}
export const answerValues = (m) => m.x.map(numberOf);
export const displayNumbers = (m) => [-3, -2, -1, 0, 1, 2, 3, 4, 5, ...m.x.map(numberOf), m.c1, m.c2];

// Flat diagrams keep their authored projection for every input method.
export const viewMode = 'flat';
