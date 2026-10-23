import { clamp, format } from '../objects/optimization-model.mjs';
import { figure, panel, label, line, dot } from '../objects/optimization-plot.mjs';

export const captions = [
  'Der Verlauf zeigt den Verlust nach jedem Update.',
  'Ein kleinerer Verlust bedeutet einen besseren Fit für diesen Lauf.',
];
export const hintBeatIds = ['step-0', 'step-1'];
export const hintParams = (_familyId, parameters) => parameters;

function validate(params) {
  if (!params || Object.keys(params).join(',') !== 'losses' || !Array.isArray(params.losses)
    || params.losses.length < 2 || params.losses.length > 129
    || !params.losses.every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error('Verlustverlauf ist ungültig');
  }
}

function compute(params) {
  return { losses: [...params.losses] };
}

function items(model, phase, qualitative = false) {
  const values = model.losses.map(Math.log1p);
  const max = Math.max(...values, 1e-9);
  const points = values.map((value, index) => [12 + 76 * index / (values.length - 1), 78 - 48 * value / max]);
  const active = Math.round(clamp(phase, 0, 1) * (points.length - 1));
  const labels = qualitative
    ? [label('title', 8, 8, 'Verlust im Verlauf'), label('vertical', 8, 20, 'Verlust')]
    : [label('title', 8, 8, 'Verlust nach Updates'), label('vertical', 8, 20, 'log(1 + Verlust)'),
      label('end-label', 88, 86, `Update ${model.losses.length - 1}`, 'hi', 'middle'),
      label('loss-label', 8, 98, `Verlust: ${format(model.losses[active])}`), label('start-label', 12, 86, 'Start', 'hi', 'middle')];
  return [panel([
    ...labels,
    line('x-axis', [12, 78], [88, 78], 'mid'),
    line('y-axis', [12, 78], [12, 28], 'mid'),
    ...points.slice(1).map((point, index) => line(`segment-${index}`, points[index], point, index < active ? 'lit' : 'mid')),
    ...points.map((point, index) => dot(`update-${index}`, point, index === active ? 'lit' : 'mid', { r: index === active ? 1.7 : 0.8 })),
  ])];
}

const scene = figure({
  id: 'learning-rate-run', captions, validate, compute, items,
  detail: (model, phase) => `Update ${Math.round(clamp(phase, 0, 1) * (model.losses.length - 1))}: Verlust ${format(model.losses[Math.round(clamp(phase, 0, 1) * (model.losses.length - 1))])}.`,
});

const baseBuild = scene.build;
export const { id, beatIds, validateParams, model, pose, beatDuration, cameraFor, ground, predictValue, answerValues, displayNumbers } = scene;
export const readout = (m, p, mode = 'lesson') => mode === 'hint' ? 'Der Verlustverlauf zeigt den Trainingsfortschritt.' : scene.readout(m, p);
export const describe = (m, beat, mode = 'lesson') => mode === 'hint' ? captions[beat] : scene.describe(m, beat);
export const build = (m, p, mode = 'lesson') => mode === 'hint' ? items(m, p.phase, true) : baseBuild(m, p, mode);
export const viewMode = 'flat';
