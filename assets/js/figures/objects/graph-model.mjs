// Forward values and reverse derivatives share one directed operation graph.
export function topologicalOrder(stages) {
  const pending = new Set(Object.keys(stages)), result = [];
  for (const deps of Object.values(stages)) {
    if (!Array.isArray(deps) || deps.some(d => !pending.has(d))) throw new Error('Unknown dependency');
  }
  while (pending.size) {
    const ready = [...pending].filter(n => stages[n].every(d => !pending.has(d))).sort();
    if (!ready.length) throw new Error('Cyclic graph');
    result.push(ready[0]); pending.delete(ready[0]);
  }
  return result;
}

const operations = {
  input: (n) => ({ value: n.value, partials: [] }),
  scale: (n, xs) => ({ value: n.factor * xs[0], partials: [n.factor] }),
  square: (_n, xs) => ({ value: xs[0] ** 2, partials: [2 * xs[0]] }),
  sum: (_n, xs) => ({ value: xs.reduce((a, b) => a + b, 0), partials: xs.map(() => 1) }),
  product: (_n, xs) => ({ value: xs.reduce((a, b) => a * b, 1), partials: xs.map((_, i) => xs.reduce((a, b, j) => a * (i === j ? 1 : b), 1)) }),
};

function evaluateNode(node, values) {
  const inputs = node.inputs ?? [];
  if (!operations[node.op]) throw new Error('Unknown operation');
  if (['scale', 'square'].includes(node.op) && inputs.length !== 1) throw new Error('Unary operation needs one input');
  if (node.op === 'input' && inputs.length) throw new Error('Input cannot have dependencies');
  const result = operations[node.op](node, inputs.map(id => values[id]));
  if (!Number.isFinite(result.value) || !result.partials.every(Number.isFinite)) throw new Error('Non-finite graph value');
  return result;
}

export function differentiate(nodes, output) {
  if (nodes.some(n => !/^[A-Za-z][A-Za-z0-9_-]*$/.test(n.id))) throw new Error('Invalid graph identifier');
  const byId = new Map(nodes.map(n => [n.id, n]));
  if (byId.size !== nodes.length || !byId.has(output)) throw new Error('Invalid graph IDs');
  const order = topologicalOrder(Object.fromEntries(nodes.map(n => [n.id, n.inputs ?? []])));
  const values = {}, gradients = Object.fromEntries(order.map(id => [id, 0])), edges = [];
  for (const id of order) {
    const n = byId.get(id), result = evaluateNode(n, values);
    values[id] = result.value;
    (n.inputs ?? []).forEach((from, i) => edges.push({ id: `${id}-${i}`, from, to: id, local: result.partials[i] }));
  }
  gradients[output] = 1;
  for (const id of [...order].reverse()) {
    for (const e of edges.filter(e => e.to === id)) gradients[e.from] += gradients[id] * e.local;
  }
  return { order, values, gradients, edges: edges.map(e => ({ ...e, contribution: gradients[e.to] * e.local })) };
}

export function autogradExample(x) {
  if (!Number.isFinite(x)) throw new Error('Invalid input');
  return differentiate([
    { id: 'x', op: 'input', value: x },
    { id: 'a', op: 'scale', factor: 3, inputs: ['x'] },
    { id: 'b', op: 'square', inputs: ['x'] },
    { id: 'L', op: 'sum', inputs: ['a', 'b'] },
  ], 'L');
}

export function gitStates() {
  const edited = { working: 'v2', index: 'v1', head: 'v1' };
  const staged = { ...edited, index: edited.working };
  const editedAgain = { ...staged, working: 'v3' };
  const committed = { ...editedAgain, head: editedAgain.index };
  return [edited, staged, editedAgain, committed];
}
