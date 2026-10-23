import { validateGraph, graphPrimitives } from '../kit/graph.mjs';
import { autogradExample } from '../objects/graph-model.mjs';
import { figure, fixedParams, label, panel, clamp } from '../objects/s8b-diagram.mjs';

export const defaults = { x: 2 };
export const captions = [
  'Ein Eingang speist zwei Zweige. Die Operationen gehören zu einem gemeinsamen gerichteten Graphen.',
  'Vorwärts: Beide Zweige berechnen ihren Wert aus demselben Eingang.',
  'Die Zweigwerte werden zur Ausgabe addiert. Das ist der Vorwärtswert, noch kein Gradient.',
  'Rückwärts: lokal mal upstream auf jeder Kante; am gemeinsamen Eingang werden beide Beiträge addiert.',
];
function compute({ x }) {
  const calculation = autogradExample(x);
  const graph = { nodes: [
    { id: 'x', at: [50, 24], label: 'x' },
    { id: 'a', at: [24, 49], label: '3x' },
    { id: 'b', at: [76, 49], label: 'x²' },
    { id: 'L', at: [50, 79], label: 'L' },
  ], edges: calculation.edges };
  validateGraph(graph);
  return { ...calculation, graph };
}
function arrivedGradient(m, u) {
  if (u >= 1) return m.gradients.x;
  if (u >= 0.7) return m.edges.find(e => e.from === 'x' && e.to === 'a').contribution;
  return 0;
}
function nodeValues(m, phase) {
  if (phase <= 2) return { x: String(m.values.x), a: phase >= 1 ? String(m.values.a) : '', b: phase >= 1 ? String(m.values.b) : '', L: phase >= 2 ? String(m.values.L) : '' };
  const u = clamp(phase - 2), upstream = u >= 0.4 ? m.gradients.a : 0;
  return { x: `∂=${arrivedGradient(m, u)}`, a: `∂=${upstream}`, b: `∂=${upstream}`, L: '∂=1' };
}
function backwardProgress(edge, u) {
  if (edge.from !== 'x') return 1 - clamp(u / 0.4);
  return 1 - clamp((u - (edge.to === 'a' ? 0.4 : 0.7)) / 0.3);
}
function graphState(m, phase) {
  const backward = phase > 2;
  const markers = phase === 0 ? {} : Object.fromEntries(m.edges.map(e => [e.id,
    backward ? backwardProgress(e, clamp(phase - 2)) : clamp(e.from === 'x' ? phase : phase - 1)]));
  return { values: nodeValues(m, phase), markers, activeEdges: backward ? m.edges.map(e => e.id) : [], activeNodes: [backward ? 'x' : 'L'] };
}
function items(m, phase) {
  const sum = m.edges.filter(e => e.from === 'x').map(e => e.contribution);
  return [panel('backprop', [
    label('direction', 8, 9, phase > 2 ? 'Gradienten rückwärts' : 'Werte vorwärts'),
    ...graphPrimitives(m.graph, graphState(m, phase)),
    label('rule', 8, 98, phase > 2 ? `Bei x: ${arrivedGradient(m, clamp(phase - 2))}${phase === 3 ? ` = ${sum.join(' + ')}` : ''}` : 'L = 3x + x²'),
  ])];
}
const scene = figure({ id: 'backprop-network', captions, validate: p => fixedParams(p, defaults), compute, items,
  detail: (m, phase) => phase > 2
    ? `Lokale Ableitungen 3 und ${2 * m.values.x}; upstream jeweils 1. Am Eingang angekommen: ${arrivedGradient(m, clamp(phase - 2))}. Endsumme: 3 + ${2 * m.values.x} = ${m.gradients.x}.`
    : `x = ${m.values.x}, a = ${m.values.a}, b = ${m.values.b}, L = ${m.values.L}. Die lokalen Ableitungen werden aus denselben Operationen berechnet.`,
  answers: [m => m.gradients.x],
});
export const { id, beatIds, validateParams, model, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const pose = (m, beat, time) => scene.pose(m, beat, beat === 3 ? time / 2 : time);
export const beatDuration = beat => beat === 'step-3' ? 3.2 : scene.beatDuration(beat);
export const viewMode = 'flat';
