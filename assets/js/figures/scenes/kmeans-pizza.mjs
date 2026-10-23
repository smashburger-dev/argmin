import { format } from '../objects/optimization-model.mjs';
import { KMEANS_PIZZA_TRACE } from '../objects/kmeans-pizza-trace.mjs';
import { figure, panel, label, line, dot } from '../objects/optimization-plot.mjs';

export const captions = [
  'Punkt zum nächsten Zentrum.',
  'Zentren wandern zu Gruppenmitteln.',
  'Neue Zentren: erneut zuordnen.',
  'Konvergenz: Zuordnung bleibt stabil.',
];

function validate(params) {
  if (!params || Object.keys(params).length !== 0) throw new Error('Diese Szene hat keine Parameter');
}

function compute() {
  return { points: KMEANS_PIZZA_TRACE.points, initialCenters: KMEANS_PIZZA_TRACE.initialCenters, rounds: KMEANS_PIZZA_TRACE.rounds };
}

function xy([x, y]) { return [15 + x * 6.2, 82 - y * 6.2]; }

function items(model, phase) {
  const stage = Math.min(3, Math.floor(Math.max(0, Math.min(3.999, phase))));
  const roundIndex = stage < 2 ? 0 : stage === 2 ? 1 : 2;
  const round = model.rounds[roundIndex];
  const shownCenters = stage === 0 ? model.initialCenters : round.centers;
  const previousCenters = stage === 1 ? model.initialCenters : stage === 3 ? model.rounds[1].centers : null;
  return [panel([
    label('title', 8, 8, `k-Means · Runde ${roundIndex + 1}`),
    ...model.points.map((point, index) => {
      const cluster = round.assignments[index];
      const center = shownCenters[cluster];
      return line(`membership-${index}`, xy(point), xy(center), cluster ? 'hi' : 'lit', { dash: [0.6, 0.5], width: 0.35 });
    }),
    ...model.points.flatMap((point, index) => {
      const cluster = round.assignments[index];
      const at = xy(point);
      return [dot(`pizza-${index}`, at, cluster ? 'hi' : 'lit', { r: 1.25 }),
        label(`cluster-${index}`, at[0] + 2, at[1] - 1.5, cluster ? 'B' : 'A', 'hi')];
    }),
    ...shownCenters.map((center, index) => dot(`center-${index}`, xy(center), index ? 'hi' : 'lit', { r: 2.3 })),
    ...(previousCenters ? previousCenters.map((center, index) => line(`center-move-${index}`, xy(center), xy(round.centers[index]), 'mid', { width: 0.8 })) : []),
    label('step', 8, 94, captions[stage]),
    label('centers', 8, 101, `Zentren: (${shownCenters.map((center) => center.map(format).join('; ')).join(') und (')})`),
  ])];
}

const scene = figure({
  id: 'kmeans-pizza', captions, validate, compute, items,
  detail: (model) => `Nach zwei Zuordnungen bleiben die Gruppen ${model.rounds[1].assignments.join(', ')} und Zentren unverändert.`,
});

const basePose = scene.pose;
export const { id, beatIds, validateParams, model, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
export const pose = (m, beat, time) => ({ ...basePose(m, beat, time), phase: Math.max(0, Math.min(3, beat)) });
export const viewMode = 'flat';

