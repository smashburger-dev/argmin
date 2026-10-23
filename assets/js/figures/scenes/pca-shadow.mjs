import { format } from '../objects/optimization-model.mjs';
import { figure, panel, label, line, dot } from '../objects/optimization-plot.mjs';

export const defaults = { theta: 0.46 };
export const captions = [
  'Die Punkte werden auf eine drehbare Achse projiziert.',
  'Die Schatten streuen entlang der Achse unterschiedlich stark.',
  'Die erste Hauptkomponente zeigt in die Richtung der größten Varianz.',
];

const points = [[-4, -2], [-2, -1], [-1, -0.5], [1, 0.5], [2, 1], [4, 2]];
const scaleX = (value) => 50 + value * 8;
const scaleY = (value) => 50 - value * 8;

function validate(params) {
  if (!params || Object.keys(params).join(',') !== 'theta' || !Number.isFinite(params.theta)
    || params.theta < 0 || params.theta > Math.PI) throw new Error('Winkel θ ist ungültig');
}

function compute({ theta }) {
  const direction = [Math.cos(theta), Math.sin(theta)];
  const shadows = points.map(([x, y]) => {
    const projection = x * direction[0] + y * direction[1];
    return { source: [x, y], projection, foot: [projection * direction[0], projection * direction[1]] };
  });
  const mean = shadows.reduce((sum, item) => sum + item.projection, 0) / shadows.length;
  const variance = shadows.reduce((sum, item) => sum + (item.projection - mean) ** 2, 0) / (shadows.length - 1);
  const meanX = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  const xx = points.reduce((sum, point) => sum + (point[0] - meanX) ** 2, 0);
  const xy = points.reduce((sum, point) => sum + (point[0] - meanX) * (point[1] - meanY), 0);
  const yy = points.reduce((sum, point) => sum + (point[1] - meanY) ** 2, 0);
  const bestTheta = 0.5 * Math.atan2(2 * xy, xx - yy);
  return { theta, direction, shadows, variance, bestTheta };
}

function items(model, phase) {
  const extent = 7;
  const axis = [
    [scaleX(-extent * model.direction[0]), scaleY(-extent * model.direction[1])],
    [scaleX(extent * model.direction[0]), scaleY(extent * model.direction[1])],
  ];
  const showShadows = phase >= 0.7;
  return [panel([
    label('title', 8, 8, 'Punktwolke und Achsenschatten'),
    line('axis', axis[0], axis[1], 'hi', { width: 0.55 }),
    ...model.shadows.map((item, index) => {
      const source = [scaleX(item.source[0]), scaleY(item.source[1])];
      const foot = [scaleX(item.foot[0]), scaleY(item.foot[1])];
      return line(`shadow-${index}`, source, foot, showShadows ? 'mid' : 'ghost', { dash: [0.7, 0.5] });
    }),
    ...model.shadows.map((item, index) => dot(`point-${index}`, [scaleX(item.source[0]), scaleY(item.source[1])], 'lit', { r: 1.5 })),
    ...model.shadows.map((item, index) => dot(`foot-${index}`, [scaleX(item.foot[0]), scaleY(item.foot[1])], showShadows ? 'hi' : 'ghost', { r: 0.8 })),
    line('x-axis', [12, 50], [88, 50], 'lo'),
    line('y-axis', [50, 12], [50, 88], 'lo'),
    label('theta', 8, 88, `θ = ${format(model.theta)}`),
    label('variance', 8, 98, `Stichprobenvarianz des Schattens: ${format(model.variance)}`),
  ])];
}

const scene = figure({
  id: 'pca-shadow', captions, validate, compute, items,
  detail: (model) => `θ = ${format(model.theta)} rad; Varianz entlang der Achse: ${format(model.variance)}.`,
  answers: [(model) => model.theta],
  predictions: { 'step-1': (model) => model.bestTheta },
});

export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';
