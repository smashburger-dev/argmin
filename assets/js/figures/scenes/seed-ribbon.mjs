import { seedRecords } from '../objects/seeded-examples.mjs';
import { statistics, numericParams, format } from '../objects/distribution-model.mjs';
import { figure, panel, label, line, dot } from '../objects/optimization-plot.mjs';

export const defaults = { seed: 7 };
export const captions = [
  'Zwei Generatoren mit Seed 7 beginnen mit derselben Folge. Die Aufzeichnung stammt vom Plattform-PRNG Mulberry32.',
  'Ohne Neustart folgt die nächste Ziehung. Ein neuer Generator beginnt wieder am Anfang.',
  'Andere Seeds ändern den Split derselben zehn Zeilen. Gemessen wird eine auf Train gelernte Mehrheitsbaseline.',
];

export function randomSequence(seed, count = 8) {
  const record = seedRecords[seed];
  if (!record || !Number.isInteger(count) || count < 0 || count > record.sequence.length) throw new Error('Unrecorded seed or draw count');
  return record.sequence.slice(0, count);
}

// A fixed labelled population; only its seeded split changes between runs.
export function seededBaseline(seed) {
  const labels = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
  const record = seedRecords[seed];
  if (!record) throw new Error('Unrecorded seed');
  const order = record.permutation;
  const test = order.slice(0, 4), train = order.slice(4);
  const counts = train.map(i => train.filter(j => labels[j] === labels[i]).length);
  const prediction = labels[train[counts.indexOf(Math.max(...counts))]];
  const correct = test.filter(i => labels[i] === prediction).length;
  return { seed, train, test, prediction, correct, n: test.length, accuracy: correct / test.length * 100 };
}
function compute(params) {
  const sequence = randomSequence(params.seed), repeated = randomSequence(params.seed);
  const runs = [params.seed, params.seed + 1, params.seed + 2].map(seededBaseline);
  return { ...params, prngBits: 32, sequence, repeated, runs, spread: statistics(runs.map(run => run.accuracy)).range };
}
function sequenceRows(m, phase) {
  const offset = phase >= 0.8 ? 4 : 0;
  return [label('title', 8, 7, 'Gleicher Seed, gleiche Folge'), label('generator', 8, 20, 'Mulberry32 · Werte 0 bis 9'),
    label('a', 8, 36, `A · Seed ${m.seed}`), label('b', 8, 64, `B · Seed ${m.seed}`),
    ...Array.from({ length: 4 }, (_, i) => label('a-' + i, 20 + i * 20, 49, m.sequence[offset + i], 'lit', 'middle')),
    ...Array.from({ length: 4 }, (_, i) => label('b-' + i, 20 + i * 20, 77, m.repeated[i], 'hi', 'middle')),
    label('summary', 8, 98, phase < 0.8 ? 'A und B starten neu.' : 'A läuft weiter · B startet neu.')];
}
function runRows(m) {
  return [label('run-title', 8, 7, 'Seeds ändern den Testsplit'), label('run-unit', 8, 20, 'Treffer auf je 4 Testzeilen'),
    ...m.runs.flatMap((run, i) => [
      label('seed-' + i, 8, 37 + i * 19, `Seed ${run.seed}`),
      line('bar-' + i, [40, 35 + i * 19], [40 + run.accuracy * 0.3, 35 + i * 19], 'lit', { width: 1.5 }),
      label('score-' + i, 94, 37 + i * 19, `${run.correct}/${run.n}`, 'hi', 'end'),
      dot('end-' + i, [40 + run.accuracy * 0.3, 35 + i * 19], 'lit'),
    ]), label('range', 8, 98, `Spannweite ${format(m.spread)} Prozentpunkte`)];
}
function items(m, phase) {
  return [panel([
    ...sequenceRows(m, phase).map(prim => ({ ...prim, visible: phase < 1.8 })),
    ...runRows(m).map(prim => ({ ...prim, visible: phase >= 1.8 })),
  ])];
}
const scene = figure({ id: 'seed-ribbon', captions, validate: p => numericParams(p, { seed: [7, 7] }), compute, items,
  detail: (m, phase) => phase < 1.8 ? `A: ${m.sequence.join(', ')}. B nach Neustart: ${m.repeated.slice(0, 4).join(', ')}. Mulberry32 ist nicht NumPys PCG64.` :
    m.runs.map(run => `Seed ${run.seed}: Test-IDs ${run.test.join(', ')}, ${run.correct}/${run.n} Treffer`).join('; ') + `. Spannweite ${m.spread} Prozentpunkte.`,
});
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const viewMode = 'flat';
