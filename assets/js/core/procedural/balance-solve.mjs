import { familySubseed, rng, randInt } from '../generator_draw_kit.mjs';
import { balanceModel, applyBalanceStep, solveBalance } from '../balance_model.mjs';
import { equationText } from '../../figures/objects/f12-diagram.mjs';

export function balanceSolution(parameters) {
  let state = balanceModel(parameters);
  const steps = [];
  const apply = (operation, x, constant) => {
    const step = { operation, side: 'both', term: { x, constant } };
    state = applyBalanceStep(state, step);
    steps.push(step);
  };
  apply('subtract', state.right.x, '0');
  apply('subtract', '0', state.left.constant);
  apply('divide', '0', state.left.x);
  return { kind: 'scene-build', schemaVersion: 1, form: { equation: state }, steps };
}

export function generate({ seed, caseId, difficulty }) {
  if (caseId !== 'isolate' || !['intro', 'core'].includes(difficulty)) throw new Error('Unbekannter Waagenfall');
  const random = rng(familySubseed(seed, caseId, difficulty));
  const a = randInt(random, 2, 6), b = randInt(random, 1, 6);
  const rightX = difficulty === 'intro' ? 0 : 1 - a;
  const x2 = difficulty === 'intro' ? 2 * randInt(random, 1, 6) : 2 * randInt(random, -4, 4) + 1;
  const parameters = balanceModel({ left: { x: a, constant: b }, right: { x: rightX, constant: `${2 * b + (a - rightX) * x2}/2` } });
  const solution = balanceSolution(parameters);
  const path = solution.steps.map((step) => `${step.operation} (${step.term.x}x + ${step.term.constant})`).join('; ');
  return { parameters, expected: { kind: 'scene-properties', model: 'balance' },
    title: 'Gleichung mit eigenen Schritten lösen',
    prompt: `Stelle x in $${equationText(parameters)}$ frei. Wähle äquivalente Operationen und prüfe deinen Weg. Ganze Zahlen und Brüche wie -3/2 sind erlaubt.`,
    fullSolution: `Ein möglicher Weg: ${path}. Ergebnis: $${equationText(solution.form.equation)}$. Jeder äquivalente Weg mit x allein zählt.`,
    hints: ['Sammle zuerst die x-Terme auf einer Seite und die Zahlen auf der anderen.', 'Teile zuletzt beide Seiten durch den Koeffizienten von x.'] };
}

export const FAMILY_SPEC = {
  familyId: 'balance-solve', familyGroup: 'scene-build',
  summary: 'Wende dieselbe Operation auf beide Seiten an. Die Waage zeigt deinen aktuellen Formularzustand.',
  taskArchetype: 'scene-properties', authorityMode: 'seeded', masteryEligible: true,
  caseTypes: [{ caseId: 'isolate' }], difficultyProfiles: ['intro', 'core'], competencyIds: ['c-algebra'],
  activityType: 'scene-build', graderId: 'deterministic', generate, solve: solveBalance,
};
