// Procedural family trace-toposort-dependency-order: the seed draws a small
// staged DAG from the curated German name pool — 4 or 5 stages, dependencies
// only towards lower levels so the graph is acyclic by construction, and at
// least one step with >=2 ready stages so the alphabetical tie-break (the
// didactic point of the base case) stays visible. The snippet, the expected
// Python-list output and the solution are all rebuilt from the drawn params;
// the JS topo mirror below recomputes the order one-to-one.
// Base fields pin the curated oracle case verbatim (anchor tests compare
// them against the JSON); the draw domain is documented here.

import { randInt, rng, shuffle, until } from '../generator_draw_kit.mjs';

const DRAW_SCOPE = 'trace-toposort-dependency-order';

const TOPO_BASE_SNIPPET = `def topo(stages):
    offen = set(stages)
    erledigt = []
    while offen:
        bereit = sorted(n for n in offen if not (set(stages[n]) & offen))
        naechster = bereit[0]
        erledigt.append(naechster)
        offen.discard(naechster)
    return erledigt

stages = {
    "gold": [],
    "regel": ["gold"],
    "punkte": ["gold"],
    "bericht": ["regel", "punkte"],
}
print(topo(stages))`;

const TOPO_BASE_OUTPUT = "['gold', 'punkte', 'regel', 'bericht']";

const TOPO_BASE_SOLUTION = 'Start: nur gold (keine Abhängigkeiten). Danach sind punkte und regel gleichzeitig bereit → alphabetisch punkte zuerst, dann regel. bericht braucht beide → kommt zuletzt: <code>[\'gold\', \'punkte\', \'regel\', \'bericht\']</code>. Der Zyklentest steckt in bereit: wäre die Liste leer, gäbe es einen Kreis.';

const TOPO_PROMPT = 'Topologisches Sortieren von Hand ausführen: Was gibt dieses Programm aus? Sage die <code>print</code>-Zeile vorher, ohne den Code auszuführen. Bei mehreren bereiten Stufen wählt der Algorithmus alphabetisch den kleinsten Namen.';

// Curated German stage names — short, lowercase, pipeline-flavoured.
const STAGE_POOL = ['audit', 'bericht', 'daten', 'export', 'gold', 'index', 'metrik', 'modell', 'punkte', 'regel', 'schema', 'split'];

// Draw an acyclic staged DAG: levels guarantee the order, deps point only
// downwards. Reject draws where every step has exactly one ready stage —
// a pure chain teaches nothing about the alphabetical tie-break.
function drawStages(r) {
  return until(r, () => {
    const count = randInt(r, 4, 5);
    const names = shuffle(r, [...STAGE_POOL]).slice(0, count);
    const levels = [];
    let assigned = 0;
    while (assigned < count) {
      const take = Math.min(count - assigned, randInt(r, 1, 2));
      levels.push(names.slice(assigned, assigned + take));
      assigned += take;
    }
    const stages = {};
    names.forEach((name) => { stages[name] = []; });
    for (let level = 1; level < levels.length; level += 1) {
      const lower = levels.slice(0, level).flat();
      for (const name of levels[level]) {
        const depCount = randInt(r, 1, Math.min(2, lower.length));
        stages[name] = shuffle(r, [...lower]).slice(0, depCount).sort();
      }
    }
    return stages;
  }, (stages) => topoTieCount(stages) >= 1, { scope: DRAW_SCOPE });
}

// Mirrors the snippet: ready = alphabetically sorted names whose dep set no
// longer intersects the open set; the first ready name runs each step.
export function topoOrder(stages) {
  const offen = new Set(Object.keys(stages));
  const erledigt = [];
  while (offen.size) {
    const bereit = [...offen].filter((n) => !(stages[n] || []).some((dep) => offen.has(dep))).sort();
    if (!bereit.length) return null;
    erledigt.push(bereit[0]);
    offen.delete(bereit[0]);
  }
  return erledigt;
}

// Number of steps where >=2 stages are ready simultaneously — guards the
// tie-break teaching point.
function topoTieCount(stages) {
  const offen = new Set(Object.keys(stages));
  let ties = 0;
  while (offen.size) {
    const bereit = [...offen].filter((n) => !(stages[n] || []).some((dep) => offen.has(dep))).sort();
    if (!bereit.length) return -1;
    if (bereit.length >= 2) ties += 1;
    offen.delete(bereit[0]);
  }
  return ties;
}

// Python prints a list of strings with single quotes.
const pyList = (names) => `[${names.map((n) => `'${n}'`).join(', ')}]`;

export function topoOutput(stages) {
  return pyList(topoOrder(stages) || []);
}

function topoSnippet(stages) {
  const rows = Object.entries(stages)
    .map(([name, deps]) => `    "${name}": [${deps.map((d) => `"${d}"`).join(', ')}],`)
    .join('\n');
  return `def topo(stages):
    offen = set(stages)
    erledigt = []
    while offen:
        bereit = sorted(n for n in offen if not (set(stages[n]) & offen))
        naechster = bereit[0]
        erledigt.append(naechster)
        offen.discard(naechster)
    return erledigt

stages = {
${rows}
}
print(topo(stages))`;
}

function topoSolution(stages) {
  const offen = new Set(Object.keys(stages));
  const steps = [];
  while (offen.size) {
    const bereit = [...offen].filter((n) => !(stages[n] || []).some((dep) => offen.has(dep))).sort();
    steps.push(bereit);
    offen.delete(bereit[0]);
  }
  const order = steps.map((step) => step[0]);
  const trace = steps
    .map((bereit, i) => (bereit.length > 1 ? `Schritt ${i + 1}: bereit {${bereit.join(', ')}} → alphabetisch ${bereit[0]}` : `Schritt ${i + 1}: nur ${bereit[0]} bereit`))
    .join('; ');
  return `${trace}. Ergebnis: <code>${pyList(order)}</code>. Der Zyklentest steckt in bereit: wäre die Liste leer, gäbe es einen Kreis.`;
}

export const TOPO_CASES = {
  'toposort-dependency-order': {
    caseId: 'toposort-dependency-order',
    difficulty: 'core',
    baseSnippet: TOPO_BASE_SNIPPET,
    baseOutput: TOPO_BASE_OUTPUT,
    baseSolution: TOPO_BASE_SOLUTION,
    baseParams: { stages: { gold: [], regel: ['gold'], punkte: ['gold'], bericht: ['regel', 'punkte'] } },
    prompt: TOPO_PROMPT,
    competencyIds: ['c-capstone-pipeline', 'c-python-reading'],
    draw: drawStages,
    toParams: (stages) => ({ stages }),
    buildSnippet: (p) => topoSnippet(p.stages),
    buildOutput: (p) => topoOutput(p.stages),
    buildSolution: (p) => topoSolution(p.stages),
    checkParams(p) {
      const stages = p?.stages;
      if (!stages || typeof stages !== 'object' || Array.isArray(stages)) return false;
      const names = Object.keys(stages);
      if (names.length < 4 || names.length > 5 || new Set(names).size !== names.length) return false;
      if (!names.every((n) => STAGE_POOL.includes(n))) return false;
      for (const [name, deps] of Object.entries(stages)) {
        if (!Array.isArray(deps) || deps.some((d) => !names.includes(d) || d === name)) return false;
      }
      const order = topoOrder(stages);
      if (!order || order.length !== names.length) return false;
      return topoTieCount(stages) >= 1;
    },
  },
};

// Capsule shape: parameters carry the drawn stages plus the snippet rebuilt
// verbatim from them — honest distinctness (the code text itself differs).
export function topoCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (!caseDef.checkParams(parameters)) return false;
    return parameters.snippet === caseDef.buildSnippet(parameters);
  } catch { return false; }
}

export function genTopoCase(seed, caseDef) {
  const drawn = caseDef.draw(rng(seed));
  const parameters = {
    caseId: caseDef.caseId,
    difficulty: caseDef.difficulty,
    ...caseDef.toParams(drawn),
  };
  parameters.snippet = caseDef.buildSnippet(parameters);
  return {
    parameters,
    expected: { kind: 'output-lines', output: caseDef.buildOutput(parameters) },
    prompt: caseDef.prompt,
    fullSolution: caseDef.buildSolution(parameters),
    competencyIds: caseDef.competencyIds,
  };
}

export function solveTopoFamily(parameters) {
  const caseDef = TOPO_CASES[parameters?.caseId];
  if (!caseDef || !topoCaseOk(parameters, caseDef)) {
    throw new Error('trace-toposort-dependency-order: Parameter verletzen die Kapselform');
  }
  return { output: caseDef.buildOutput(parameters) };
}

export const TOPO_CONTRACT = {
  familyId: 'trace-toposort-dependency-order',
  familyGroup: 'trace-state',
  summary: 'Führt ein kleines Staged-DAG per Hand topologisch aus und sagt die exakte Listen-Ausgabe voraus.',
  taskArchetype: 'predict-output',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'toposort-dependency-order', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-capstone-pipeline', 'c-python-reading'],
  graderId: 'deterministic',
  activityType: 'predict-output',
};

export function generateTopoFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = TOPO_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genTopoCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...TOPO_CONTRACT, generate: generateTopoFamily, solve: solveTopoFamily };
