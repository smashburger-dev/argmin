import { figure } from '../objects/optimization-plot.mjs';
import { foldModel, noParams } from '../objects/pipeline-model.mjs';
import { foldItems, foldDetail } from '../objects/pipeline-stage.mjs';

export const defaults = {};
export const captions = [
  "Das erste Blatt wird zurückgehalten. Der Rest liefert die Statistik.",
  "Das nächste Blatt wird zum Test. Die Statistik wird aus dem neuen Train-Anteil gelernt.",
  "Jeder Fold dient einmal als unbekanntes Testblatt.",
  "Auch bei ungleichen Größen bleiben alle Zeilen genau einmal einem Fold zugeordnet.",
  "Das letzte Blatt bleibt vom fit ausgeschlossen.",
  "Gegenbeispiel: Der fit sieht alle Zeilen. Die Testinformation hat die Grenze überschritten."
];
const scene = figure({ id: 'fold-rotation', captions, validate: noParams, compute: foldModel, items: foldItems, detail: foldDetail });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, describe, predictValue, answerValues, displayNumbers } = scene;
export const readout = () => '';
export const viewMode = 'flat';

