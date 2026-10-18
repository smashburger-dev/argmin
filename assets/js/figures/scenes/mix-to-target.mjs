import { isSceneBuildAnswer } from '../../domain/scene_answer.mjs';
import { arrow, flatCamera, label, line } from '../objects/f12-diagram.mjs';
import { readingPlane } from '../objects/linalg-stage.mjs';

export const id = 'mix-to-target';
export const viewMode = 'flat';
export const beatIds = ['state'];
const pairText = (pair) => '(' + pair.map((n) => Number(n.toFixed(2)).toLocaleString('de')).join('; ') + ')';
export function validateParams(p) {
  if (!isSceneBuildAnswer(p.answer)) throw new Error('Antwortformat v1 fehlt');
}
export function model(p) {
  validateParams(p);
  const simulation = p.simulation;
  const target = p.parameters.target;
  const portions = p.answer.form.portions;
  const first = simulation ? p.parameters.a1.map((n) => n * portions[0]) : [0, 0];
  const mix = simulation?.mix ?? [0, 0];
  const points = [[0, 0], first, mix, target];
  const xs = points.map((v) => v[0]), ys = points.map((v) => v[1]);
  const xmin = Math.min(...xs) - 1, xmax = Math.max(...xs) + 1;
  const ymin = Math.min(...ys) - 1, ymax = Math.max(...ys) + 1;
  const scale = Math.min(80 / (xmax - xmin), 60 / (ymax - ymin));
  const dx = (80 - (xmax - xmin) * scale) / 2;
  const point = ([x, y]) => [10 + dx + (x - xmin) * scale, 75 - (y - ymin) * scale];
  return { point, xmin, xmax, ymin, ymax, first, mix, target, simulation,
    text: simulation ? `Ist: ${pairText(mix)}` : 'Portionen prüfen',
    targetText: `Ziel: ${pairText(target)}` };
}
export const pose = () => ({});
export const beatDuration = () => 0;
export const cameraFor = flatCamera;
export const ground = () => null;
export const readout = () => '';
export const describe = (m) => `${m.text}. ${m.targetText}. ${m.simulation?.hit ? 'Ziel getroffen.' : 'Der Differenzpfeil zeigt vom Versuch zum Ziel.'}`;
export const answerValues = () => [];
export const predictValue = () => null;
export const displayNumbers = (m) => [...m.mix, ...m.target];
export function build(m) {
  const point = m.point;
  return [readingPlane('mix-state', [-50, 0, 50], [100, 100], [
    line('axis-x', point([m.xmin, 0]), point([m.xmax, 0]), 'lo'),
    line('axis-y', point([0, m.ymin]), point([0, m.ymax]), 'lo'),
    arrow('first', point([0, 0]), point(m.first), 'hi'),
    arrow('second', point(m.first), point(m.mix), 'hi'),
    { ...arrow('difference', point(m.mix), point(m.target)), visible: Boolean(m.simulation) && !m.simulation.hit },
    { t: 'dot', key: 'target', at: point(m.target), r: 2, ring: true, tone: 'hi' },
    { ...label('first-name', point(m.first.map((v) => v / 2))[0] + 4, point(m.first.map((v) => v / 2))[1] - 2, 'a₁', 6), visible: m.first.some((v) => v !== 0) },
    { ...label('second-name', point(m.first.map((v, i) => (v + m.mix[i]) / 2))[0] + 4,
      point(m.first.map((v, i) => (v + m.mix[i]) / 2))[1] - 2, 'a₂', 6), visible: m.first.some((v, i) => v !== m.mix[i]) },
    label('meaning', 41, 10, 'Summe → Ziel', 6, 'lit'),
    label('mix-value', 7, 88, m.text, 6), label('target-value', 7, 99, m.targetText, 6),
  ])];
}
