import { balanceModel } from '../../core/balance_model.mjs';
import { isSceneBuildAnswer } from '../../domain/scene_answer.mjs';
import { balanceDiagram, equationText, flatCamera } from '../objects/f12-diagram.mjs';
import { readingPlane } from '../objects/linalg-stage.mjs';

export const id = 'balance-solve';
export const viewMode = 'flat';
export const beatIds = ['state'];
export function validateParams(p) {
  if (!isSceneBuildAnswer(p.answer)) throw new Error('Antwortformat v1 fehlt');
  balanceModel(p.answer.form.equation);
}
export function model(p) {
  validateParams(p);
  const state = p.simulation?.state ?? p.answer.form.equation;
  const failed = p.fields?.find((f) => !f.correct && f.path.startsWith('steps.'));
  const side = p.answer.steps.at(-1)?.side;
  const tilt = failed && side !== 'both' ? 6 : 0;
  return { state, tilt, message: failed?.message ?? '', numbers: Object.values(state).flatMap(Object.values) };
}
export const pose = () => ({});
export const beatDuration = () => 0;
export const cameraFor = flatCamera;
export const ground = () => null;
export const readout = () => '';
export const describe = (m) => `${equationText(m.state)}. ${m.message}`;
export const answerValues = () => [];
export const predictValue = () => null;
export const displayNumbers = (m) => m.numbers;
export const build = (m) => [readingPlane('balance-state', [-50, 0, 50], [100, 100],
  balanceDiagram(m.state, { tilt: m.tilt, fontSize: 6, note: m.tilt ? 'Einseitige Änderung verworfen' : 'Dein aktueller Gleichungszustand' }))];
