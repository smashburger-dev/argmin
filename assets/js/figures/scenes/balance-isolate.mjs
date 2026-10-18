import { applyBalanceStep, balanceModel, solveBalance } from '../../core/balance_model.mjs';
import { balanceDiagram, diagramScene, equationText, label, rectangle } from '../objects/f12-diagram.mjs';

export const viewMode = 'flat';
export const defaults = { example: 1 };
export const captions = [
  'Zwei gleiche x-Pakete und drei Einheiten halten sieben Einheiten im Gleichgewicht.',
  'Nimm auf beiden Seiten drei Einheiten weg. Die beiden x-Pakete bleiben geschlossen.',
  'Teile beide Seiten durch zwei. Jedes x-Paket entspricht jetzt zwei Einheiten.',
  'Die Grenze der Waage: Ein negativer Bruch ist ein Rechenwert, kein gewöhnliches Gewicht.',
];
function compute() {
  const initial = balanceModel({ left: { x: 2, constant: 3 }, right: { x: 0, constant: 7 } });
  const subtracted = applyBalanceStep(initial, { operation: 'subtract', side: 'both', term: { x: 0, constant: 3 } });
  const divided = applyBalanceStep(subtracted, { operation: 'divide', side: 'both', term: { x: 0, constant: 2 } });
  const negative = applyBalanceStep(balanceModel({ left: { x: -2, constant: 0 }, right: { x: 0, constant: 1 } }),
    { operation: 'divide', side: 'both', term: { x: 0, constant: -2 } });
  const states = [initial, subtracted, divided, negative];
  return { states, solution: Number(solveBalance(initial).value), descriptions: states.map(equationText),
    numbers: [0, 1, 2, 3, 4, 7, -2, -0.5] };
}
const scene = diagramScene({ id: 'balance-isolate', defaults, captions, compute,
  frames: (m) => m.states.map(lessonBalance), prediction: (m) => m.solution });

function lessonBalance(state, index) {
  const diagram = balanceDiagram(state, {
    operation: ['', '− 3', '÷ 2', '÷ (−2)'][index], note: ['', 'Gleiche Änderung links und rechts', 'x ist freigestellt', 'Anderes Beispiel: −2x = 1'][index],
  });
  if (index === 3) return diagram;
  const expressions = new Set(['left-value', 'right-value']);
  return [...diagram.map((prim) => ({ ...prim, visible: !expressions.has(prim.key) })),
    ...packageTokens(state.left), ...unitTokens(Number(state.right.constant), 60, 50, 'right')];
}

function packageTokens(side) {
  const packages = Array.from({ length: Number(side.x) }, (_, i) => {
    const x = 9 + i * 16;
    return [rectangle(`closed-${i}`, [x, 44], [x + 12, 59]), label(`unknown-${i}`, x + 4, 55, 'x', 5.3, 'lit')];
  }).flat();
  return [...packages, ...unitTokens(Number(side.constant), 8, 62, 'left')];
}

function unitTokens(count, x, y, prefix) {
  return Array.from({ length: count }, (_, i) => {
    const column = i % 4, row = Math.floor(i / 4), left = x + column * 9, top = y + row * 12;
    return [rectangle(`${prefix}-weight-${i}`, [left, top], [left + 7, top + 10]),
      label(`${prefix}-unit-${i}`, left + 2, top + 7, '1')];
  }).flat();
}
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
