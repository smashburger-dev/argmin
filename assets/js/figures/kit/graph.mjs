// K7: pure, planar directed graph primitives. No input, grading or layout state.
import { text } from '../objects/linalg-stage.mjs';

function nodeById(graph, id) {
  const node = graph.nodes.find(n => n.id === id);
  if (!node) throw new Error(`Unknown graph node: ${id}`);
  return node;
}

function validateNode(n) {
  if (typeof n.id !== 'string' || !n.id || !Array.isArray(n.at) || n.at.length !== 2) throw new Error('Invalid graph node');
  if (!n.at.every(Number.isFinite)) throw new Error('Invalid graph position');
  const dimensions = [n.width ?? 23, n.height ?? 20];
  if (!dimensions.every(x => Number.isFinite(x) && x > 0)) throw new Error('Invalid node size');
}

function validateEdge(graph, e) {
  if (typeof e.id !== 'string' || !e.id || e.from === e.to) throw new Error('Invalid graph edge');
  nodeById(graph, e.from); nodeById(graph, e.to);
}

export function validateGraph(graph) {
  if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.edges)) throw new Error('Invalid graph');
  const ids = graph.nodes.map(n => n.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate graph node');
  graph.nodes.forEach(validateNode);
  const edgeIds = graph.edges.map(e => e.id);
  if (new Set(edgeIds).size !== edgeIds.length) throw new Error('Duplicate graph edge');
  graph.edges.forEach(e => validateEdge(graph, e));
}

// Intersect the node rectangles, so arrow tips stop at their boundary.
function endpoints(graph, edge) {
  const a = nodeById(graph, edge.from), b = nodeById(graph, edge.to);
  const dx = b.at[0] - a.at[0], dy = b.at[1] - a.at[1];
  if (!dx && !dy) throw new Error('Coincident graph nodes');
  const trim = n => Math.min((n.width ?? 23) / 2 / Math.abs(dx), (n.height ?? 20) / 2 / Math.abs(dy));
  const ta = trim(a), tb = trim(b);
  if (ta + tb >= 1) throw new Error('Overlapping graph nodes');
  return [a.at.map((v, i) => v + [dx, dy][i] * ta), b.at.map((v, i) => v - [dx, dy][i] * tb)];
}

export function edgePoint(graph, edgeId, progress) {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new Error('Invalid edge progress');
  const edge = graph.edges.find(e => e.id === edgeId);
  if (!edge) throw new Error('Unknown graph edge');
  const [a, b] = endpoints(graph, edge);
  return a.map((v, i) => v + (b[i] - v) * progress);
}

function nodePrimitives(node, value, active) {
  const [x, y] = node.at, w = node.width ?? 23, h = node.height ?? 20;
  const label = (key, yy, content) => ({ ...text(key, x, yy, content, 5.5, 'hi'), font: 'sans', anchor: 'middle' });
  return [
    { t: 'rect', key: `node-${node.id}`, from: [x - w / 2, y - h / 2], to: [x + w / 2, y + h / 2], tone: active ? 'lit' : 'hi', plate: true },
    label(`label-${node.id}`, y + (node.singleLine ? 2 : -2.5), node.label ?? node.id),
    { ...label(`value-${node.id}`, y + 6, value ?? ''), visible: !node.singleLine },
  ];
}

/** Stable keys: one arrow and one travelling dot per edge, three prims per node.
 * state: {values:{[nodeId]:string}, activeNodes:string[], activeEdges:string[],
 *         markers:{[edgeId]:number}}. Missing markers are transparent.
 * Coordinates and rectangle dimensions are plane-local units. */
export function graphPrimitives(graph, state = {}) {
  const edges = graph.edges.flatMap(e => {
    const [from, to] = endpoints(graph, e), progress = state.markers?.[e.id];
    return [
      { t: 'arrow', key: `edge-${e.id}`, from, to, width: 0.5, tone: state.activeEdges?.includes(e.id) ? 'lit' : 'hi' },
      { t: 'dot', key: `mark-${e.id}`, at: edgePoint(graph, e.id, progress ?? 0), r: 1.4, tone: 'lit', alpha: progress === undefined ? 0 : 1 },
    ];
  });
  return [...edges, ...graph.nodes.flatMap(n => nodePrimitives(n, state.values?.[n.id], state.activeNodes?.includes(n.id)))];
}
