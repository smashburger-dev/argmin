import { graphPrimitives, validateGraph } from '../kit/graph.mjs';
import { figure, fixedParams, panel, inlineCamera } from '../objects/s8b-diagram.mjs';
export const defaults = {};
export const captions = ['Index und Anfrage treffen im Ranking zusammen. Die Antwort entsteht erst aus ausgewählten Belegen.'];
function compute() {
  const graph = { nodes: [
    { id: 'index', label: 'Index', at: [25, 5], width: 38 },
    { id: 'query', label: 'Anfrage', at: [75, 5], width: 38 },
    { id: 'ranking', label: 'Ranking', at: [50, 18], width: 46 },
    { id: 'context', label: 'Kontext', at: [50, 31], width: 46 },
    { id: 'answer', label: 'Stub-Antwort', at: [50, 44], width: 46 },
  ].map(n => ({ ...n, height: 8, singleLine: true })), edges: [
    { id: 'index', from: 'index', to: 'ranking' }, { id: 'query', from: 'query', to: 'ranking' },
    { id: 'ids', from: 'ranking', to: 'context' }, { id: 'evidence', from: 'context', to: 'answer' },
  ] };
  validateGraph(graph);
  return { graph, values: { index: 'Termgewichte', query: 'Wörter', ranking: 'IDs + Scores', context: 'Belege', answer: 'Fixture / Stub' } };
}
const scene = figure({ id: 'retrieval-handoffs', captions, validate: p => fixedParams(p, defaults), compute,
  items: m => [panel('retrieval-handoffs', graphPrimitives(m.graph, { values: m.values }))],
  detail: () => 'Der Index stammt aus Dokumentchunks. Ranking konsumiert Index und Anfrage. Der Kontextbau erhält Chunk-IDs und holt die Originalbelege. Dokumentinhalt bleibt Daten. Die Antwort ist hier eine Fixture oder ein Stub; Recall@k misst Retrieval, keine Sprachqualität.',
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const cameraFor = inlineCamera;
export const viewMode = 'flat';
