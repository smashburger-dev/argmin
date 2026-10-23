import { figure, panel, label, line, curve } from '../objects/optimization-plot.mjs';

const forms = {
  gradient: { caption: 'Der Gradient zeigt bergauf. Gehe in die Gegenrichtung und bestimme das neue Gewicht.', showRule: false },
  sgd: { caption: 'Die Ableitung wird mit η skaliert. Bestimme den Schritt ausgehend vom alten Gewicht.', showRule: true },
};
const loss = (w) => (w - 0.45) ** 2;
const project = (w, value) => [12 + 76 * w, 68 - 44 * value];
function arrow(key, from, to, tone) {
  const dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy) || 1;
  const back = [to[0] - dx / length * 2.5, to[1] - dy / length * 2.5];
  const side = [-dy / length * 1.2, dx / length * 1.2];
  return [
    line(key, from, to, tone),
    line(`${key}-head-a`, to, [back[0] + side[0], back[1] + side[1]], tone),
    line(`${key}-head-b`, to, [back[0] - side[0], back[1] - side[1]], tone),
  ];
}

export const hintBeatIds = ['step-0'];
export const hintParams = (_familyId, params) => params;

function validate(params) {
  if (!params || Object.keys(params).join(',') !== 'kind' || !Object.hasOwn(forms, params.kind)) {
    throw new Error('Update-Nachbarbeispiel braucht einen bekannten Regeltyp');
  }
}

function compute(params) { return { kind: params.kind }; }

function items(model) {
  const config = forms[model.kind];
  const curvePoints = Array.from({ length: 41 }, (_, i) => {
    const w = i / 40;
    return project(w, loss(w));
  });
  const oldWeight = project(0.76, loss(0.76));
  const newWeight = project(0.56, loss(0.56));
  return [panel([
    label('title', 8, 8, 'Qualitativer MSE-Nachbarverlauf'),
    line('w-axis', [12, 72], [88, 72], 'mid'),
    line('loss-axis', [12, 72], [12, 23], 'mid'),
    label('loss-label', 8, 19, 'MSE', 'hi'),
    label('weight-label', 88, 80, 'w', 'hi', 'middle'),
    label('old-weight', oldWeight[0], 84, 'w alt', 'hi', 'middle'),
    label('new-weight', newWeight[0], 88, 'w neu = ?', 'lit', 'middle'),
    ...arrow('gradient-direction', [oldWeight[0], oldWeight[1] - 8], [oldWeight[0] + 9, oldWeight[1] - 8], 'hi'),
    label('gradient-label', oldWeight[0] + 5, oldWeight[1] - 13, '∇L', 'hi', 'middle'),
    ...arrow('descent-step', [oldWeight[0] - 2, oldWeight[1] + 4], [newWeight[0] + 2, newWeight[1] + 4], 'lit'),
    ...(config.showRule ? [label('symbolic-rule', 8, 98, 'w ← w − η ∇L(w)', 'lit')] : []),
  ]), curve('mse-curve', curvePoints, 'hi')];
}

const base = figure({
  id: 'update-rule-neighbor',
  captions: ['Vergleiche Gradientenrichtung und Update-Richtung.'],
  validate,
  compute,
  items,
  detail: (model) => forms[model.kind].caption,
});

export const { id, beatIds, validateParams, model, pose, beatDuration, cameraFor, ground, predictValue, answerValues, displayNumbers } = base;
export const describe = (m) => forms[m.kind].caption;
export const readout = (m) => forms[m.kind].caption;
export const build = (m) => items(m);
export const viewMode = 'flat';
