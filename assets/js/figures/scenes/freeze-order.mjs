import { graphPrimitives, validateGraph } from '../kit/graph.mjs';
import { topologicalOrder } from '../objects/graph-model.mjs';
import { figure, fixedParams, label, panel, clamp } from '../objects/s8b-diagram.mjs';
export const defaults = {};
export const captions = [
  'Die Pfeile sind Abhängigkeiten. Nur gold ist anfangs ohne unerledigten Vorgänger bereit.',
  'Nach gold sind punkte und regel bereit. Der gepinnte Ablauf wählt alphabetisch punkte.',
  'regel kann unabhängig von punkte laufen. Beide brauchen gold.',
  'Erst nach punkte und regel darf bericht starten. Jede Kante bestimmt eine notwendige Reihenfolge.',
  'Alle Abhängigkeiten sind erfüllt. Andere gültige Ordnungen müssen ebenfalls jede Kante respektieren.',
];
function compute() {
  const stages = { gold: [], punkte: ['gold'], regel: ['gold'], bericht: ['punkte', 'regel'] };
  const order = topologicalOrder(stages);
  const graph = { nodes: [
    { id: 'gold', label: 'gold', at: [50, 24], width: 28 },
    { id: 'punkte', label: 'punkte', at: [24, 49], width: 28 },
    { id: 'regel', label: 'regel', at: [76, 49], width: 28 },
    { id: 'bericht', label: 'bericht', at: [50, 78], width: 30 },
  ], edges: Object.entries(stages).flatMap(([to, deps]) => deps.map(from => ({ id: `${from}-${to}`, from, to }))) };
  validateGraph(graph);
  return { stages, order, graph };
}
function state(m, phase) {
  const count = Math.floor(phase), done = m.order.slice(0, count);
  const ready = m.order.filter(n => !done.includes(n) && m.stages[n].every(d => done.includes(d)));
  const values = Object.fromEntries(m.order.map((n, i) => [n, done.includes(n) ? `${i + 1}. fertig` : 'offen']));
  const markers = Object.fromEntries(m.graph.edges.filter(e => e.to === m.order[Math.max(0, Math.ceil(phase) - 1)]).map(e => [e.id, clamp(phase - Math.floor(phase))]));
  return { values, activeNodes: ready, markers };
}
const scene = figure({ id: 'freeze-order', captions, validate: p => fixedParams(p, defaults), compute,
  items: (m, phase) => [panel('freeze', [
    label('rule', 8, 9, 'Vorgänger vor Nachfolger'), ...graphPrimitives(m.graph, state(m, phase)),
    label('order', 8, 98, m.order.slice(0, Math.floor(phase)).join(' → ') || 'noch keine Stage fertig', 'hi', 'start', 5.3),
  ])],
  detail: (m, phase) => `Abgeschlossen: ${m.order.slice(0, Math.floor(phase)).join(', ') || 'keine'}. Gepinnte Ordnung: ${m.order.join(', ')}. Ein Kreis wäre ein Fehler, kein Fallback.`,
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';
