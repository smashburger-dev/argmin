import { figure, panel, label, line, curve } from '../objects/optimization-plot.mjs';

const SERIES = [
  { training: [0.82, 0.72, 0.66, 0.63, 0.62], validation: [0.86, 0.75, 0.69, 0.66, 0.65] },
  { training: [0.9, 0.68, 0.48, 0.34, 0.27], validation: [0.92, 0.71, 0.52, 0.39, 0.32] },
  { training: [0.9, 0.63, 0.39, 0.24, 0.17], validation: [0.92, 0.67, 0.44, 0.53, 0.69] },
];
const project = (slot, epoch, loss) => [6 + slot * 31 + epoch * 6, 78 - loss * 52];
const names = ['Underfitting', 'Stabil', 'Overfitting'];
export const hintBeatIds = ['step-0'];
export const hintParams = (_familyId, params) => params;

function validate(params) {
  if (!params || Object.keys(params).join(',') !== 'shape' || params.shape !== 'all') {
    throw new Error('Kurvenbeispiel benötigt den unabhängigen Dreiervergleich');
  }
}

function compute() { return { curves: SERIES }; }

function items(model, qualitative = false) {
  const labels = qualitative
    ? [label('title', 8, 9, 'Trainings- und Validierungsverlauf'), label('training-label', 8, 20, 'Training · gestrichelt'), label('validation-label', 8, 31, 'Validierung', 'lit')]
    : [label('title', 8, 9, 'Trainings- und Validierungsverlauf'), label('training-label', 8, 20, 'Training · gestrichelt'), label('validation-label', 8, 31, 'Validierung', 'lit'), label('epochs-label', 80, 95, 'Epochen', 'hi', 'middle')];
  return [panel([
    ...labels,
    ...model.curves.flatMap((series, slot) => {
      const left = 6 + slot * 31;
      return [
        label(`example-${slot}`, left + 12, 91, names[slot], 'hi', 'middle'),
        line(`x-axis-${slot}`, [left, 78], [left + 24, 78], 'mid'),
        line(`y-axis-${slot}`, [left, 78], [left, 25], 'mid'),
      ];
    }),
  ]),
  ...model.curves.flatMap((series, slot) => [
    curve(`training-${slot}`, series.training.map((loss, i) => project(slot, i, loss)), 'hi', { dash: [1, 1] }),
    curve(`validation-${slot}`, series.validation.map((loss, i) => project(slot, i, loss)), 'lit'),
  ])];
}

const base = figure({
  id: 'training-curve-neighbor',
  captions: ['Vergleiche Höhe, Abstand und Verlauf beider Kurven.'],
  validate,
  compute,
  items: (model) => items(model),
  detail: () => 'Vergleiche Trainings- und Validierungsverlauf über die Epochen.',
});
const baseBuild = base.build;
export const { id, beatIds, validateParams, model, pose, beatDuration, cameraFor, ground, predictValue, answerValues, displayNumbers } = base;
export const describe = () => 'Vergleiche die beiden Kurven über den gesamten Verlauf.';
export const readout = (_model, _pose, mode) => mode === 'hint' ? 'Trainings- und Validierungsverlauf im Nachbarbeispiel.' : base.readout(_model, _pose);
export const build = (m, p, mode = 'lesson') => mode === 'hint' ? items(m, true) : baseBuild(m, p, mode);
export const viewMode = 'flat';
