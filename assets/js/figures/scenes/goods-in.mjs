import { figure } from '../objects/optimization-plot.mjs';
import { goodsModel, noParams } from '../objects/pipeline-model.mjs';
import { goodsItems, goodsDetail } from '../objects/pipeline-stage.mjs';

export const defaults = {};
export const captions = [
  "Die erste Zeile passiert Parser und Bereichsprüfung als gültige Zahl.",
  "Unlesbarer Text läuft als erwarteter ValueError in die Fehlerliste.",
  "Auch eine Zahl kann den Wertebereich verletzen. Programmfehler gehören nicht in diese Rutsche."
];
const scene = figure({ id: 'goods-in', captions, validate: noParams, compute: goodsModel, items: goodsItems, detail: goodsDetail });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, describe, predictValue, answerValues, displayNumbers } = scene;
export const readout = () => '';
export const viewMode = 'flat';

