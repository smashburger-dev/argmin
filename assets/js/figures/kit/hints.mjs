/** Shared selection and materialization for compiler and lazy hint runtime. */
export function figureHintFor(entries, instance) {
  return entries.find((entry) => entry.familyId === instance.familyId
    && (!entry.caseIds || entry.caseIds.includes(instance.caseId))) ?? null;
}

export function hintSpec(entry, scene, instance) {
  const params = entry.source === 'neighbor'
    ? entry.neighborParams : scene.hintParams(instance.familyId, instance.parameters);
  if (!params) throw new Error(`${entry.scene}: hintParams rejected mapped case`);
  scene.validateParams(params, { mode: 'hint' });
  const model = scene.model(params, { mode: 'hint' });
  return {
    schemaVersion: 1, kind: 'hint', engine: 'argmin-figure', scene: entry.scene,
    title: 'Spalten als Zutaten',
    caption: entry.source === 'neighbor' ? 'Ein festes Nachbarbeispiel. Übertrage die Idee auf deine Aufgabe.' : 'Finde die Gewichte der Spalten deiner Aufgabe.',
    hint: '', params,
    beats: scene.hintBeatIds.map((id, index) => ({ id, caption: scene.describe(model, index, 'hint') })),
  };
}

/** Only authored/readable strings, never geometry coordinates or item ids. */
export function hintTexts(items) {
  return items.flatMap((item) => (item.prims ?? []).filter((prim) => prim.t === 'text')
    .map((prim) => (prim.runs ?? []).map((run) => `${run.text ?? ''}${run.sub ?? ''}${run.sup ?? ''}`).join('')));
}

export function answerNumbers(solved) {
  if (typeof solved === 'number') return [solved];
  if (typeof solved === 'string') return [...solved.matchAll(/[-−]?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?/g)].map((m) => parseNumber(m[0]));
  if (solved && typeof solved === 'object') return Object.values(solved).flatMap(answerNumbers);
  return [];
}

function parseNumber(raw) {
  const [n, d = '1'] = raw.replaceAll('−', '-').replace(',', '.').split('/');
  return Number(n) / Number(d);
}

export function assertNoHintLeak(texts, answers, label) {
  const numbers = texts.flatMap((text) => answerNumbers(String(text)));
  for (const expected of answers.filter(Number.isFinite)) {
    const rounded = [expected, ...[0, 1, 2, 3].map((places) => Number(expected.toFixed(places)))];
    if (numbers.some((value) => rounded.some((candidate) => Math.abs(candidate - value) < 1e-9))) {
      throw new Error(`${label}: E_FIGURE_HINT_LEAK Antwortwert ${expected} im Hinweis`);
    }
  }
}
