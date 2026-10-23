import { graphPrimitives, validateGraph } from '../kit/graph.mjs';
import { gitStates } from '../objects/graph-model.mjs';
import { figure, fixedParams, label, panel, clamp } from '../objects/s8b-diagram.mjs';

export const defaults = {};
export const captions = [
  'Die Arbeitsdatei ist verändert. Index und letzter Commit enthalten weiterhin den alten Stand.',
  'git add kopiert den gewählten Dateiinhalt in den Index.',
  'Eine weitere Bearbeitung ändert nur die Arbeitsdatei. Der vorgemerkte Inhalt bleibt erhalten.',
  'git commit speichert den Index. Die spätere unvorgemerkte Änderung bleibt in der Arbeitsdatei.',
  'Ein Merge-Commit verbindet zwei Eltern. Die Graphkante belegt Abstammung, keine Codekorrektheit.',
];
function compute() {
  const work = { nodes: [
    { id: 'working', at: [50, 25], label: 'Arbeitsordner', width: 60 },
    { id: 'index', at: [50, 51], label: 'Index', width: 60 },
    { id: 'head', at: [50, 77], label: 'Commit', width: 60 },
  ], edges: [{ id: 'add', from: 'working', to: 'index' }, { id: 'commit', from: 'index', to: 'head' }] };
  const history = { nodes: [
    { id: 'A', at: [50, 24], label: 'A' }, { id: 'B', at: [24, 51], label: 'B' },
    { id: 'C', at: [76, 51], label: 'C' }, { id: 'M', at: [50, 79], label: 'Merge' },
  ], edges: [{ id: 'AB', from: 'A', to: 'B' }, { id: 'AC', from: 'A', to: 'C' }, { id: 'BM', from: 'B', to: 'M' }, { id: 'CM', from: 'C', to: 'M' }] };
  validateGraph(work); validateGraph(history);
  return { states: gitStates(), work, history };
}
function items(m, phase) {
  const stage = Math.min(3, Math.floor(phase)), fade = phase > 3 ? 1 : 0;
  const marker = phase <= 1 ? { add: phase } : { commit: clamp(phase - 2) };
  const work = graphPrimitives(m.work, { values: m.states[stage], markers: marker }).map(p => ({ ...p, visible: fade === 0 }));
  const history = graphPrimitives(m.history, { values: { A: 'Basis', B: 'Ast 1', C: 'Ast 2', M: '2 Eltern' }, activeNodes: ['M'] }).map(p => ({ ...p, visible: fade === 1 }));
  const headings = ['vor dem Vormerken', 'git add', 'weiter bearbeiten', 'git commit', 'zwei Äste zusammenführen'];
  return [panel('git', [label('title', 8, 9, headings[Math.round(phase)]), ...work, ...history,
    label('foot', 8, 98, phase > 3 ? 'Tests prüfen das Ergebnis.' : `git diff: ${m.states[stage].index} → ${m.states[stage].working}`),
  ])];
}
const scene = figure({ id: 'git-snapshots', captions, validate: p => fixedParams(p, defaults), compute, items,
  detail: (m, phase) => phase > 3 ? 'A ist Vorfahr von B und C. M hat B und C als Eltern. Textzusammenführung ersetzt keine Verhaltenstests.'
    : `Arbeitsdatei ${m.states[Math.floor(phase)].working}, Index ${m.states[Math.floor(phase)].index}, letzter Commit ${m.states[Math.floor(phase)].head}.`,
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';
