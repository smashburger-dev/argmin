import { familySubseed, rng, randInt } from '../generator_draw_kit.mjs';
import { solveMixer } from '../scene_build_grader.mjs';

export function generate({ seed, caseId, difficulty }) {
  if (!['unique', 'infinite', 'none'].includes(caseId) || !['intro', 'core'].includes(difficulty)) throw new Error('Unbekannter Mischfall');
  const random = rng(familySubseed(seed, caseId, difficulty));
  const offset = randInt(random, 1, 4);
  const a1 = [2, 1], a2 = caseId === 'unique' ? [1, 2] : [4, 2];
  const portions = difficulty === 'intro' ? [offset, 1] : [-offset / 2, 1.5];
  const target = a1.map((value, i) => value * portions[0] + a2[i] * portions[1]);
  // Scale the whole system to keep the grader's integer-vector contract.
  const parameters = { a1: a1.map((v) => v * 2), a2: a2.map((v) => v * 2), target: target.map((v) => v * 2) };
  if (caseId === 'none') parameters.target[1] += 1;
  const solved = solveMixer(parameters);
  // A dependent pair has target = (portions[0] + 2*portions[1])*a1.
  const example = caseId === 'unique' ? solved.portions : portions;
  const solution = solved.solutionSet === 'none' ? 'Das Ziel liegt außerhalb der gemeinsamen Richtung: keine Lösung.'
    : `Lösungsfall ${solved.solutionSet === 'unique' ? 'eindeutig' : 'unendlich viele'}. Ein gültiges Paar ist (${example.join('; ')}).`;
  return { parameters, expected: { kind: 'scene-properties', model: 'mixer' },
    title: 'Zielvektor mit zwei Portionen treffen',
    prompt: `Bilde $x_1 a_1 + x_2 a_2 = b$ mit $a_1 = (${parameters.a1.join(', ')})$, $a_2 = (${parameters.a2.join(', ')})$ und $b = (${parameters.target.join(', ')})$. Wähle den Lösungsfall und passende Koeffizienten. Negative und gebrochene Portionen sind algebraisch erlaubt.`,
    fullSolution: solution,
    hints: ['Prüfe beide Koordinaten deiner Summe. Der Differenzpfeil zeigt vom Versuch zum Ziel.', 'Sind beide Zutaten parallel, prüfe, ob das Ziel auf derselben Geraden liegt.'] };
}

export const FAMILY_SPEC = {
  familyId: 'mix-to-target', familyGroup: 'scene-build',
  summary: 'Zwei Koeffizienten bestimmen die Linearkombination. Vergleiche die Summe in beiden Koordinaten mit dem Ziel.',
  taskArchetype: 'scene-properties', authorityMode: 'seeded', masteryEligible: true,
  caseTypes: [{ caseId: 'unique' }, { caseId: 'infinite' }, { caseId: 'none' }],
  difficultyProfiles: ['intro', 'core'], competencyIds: ['c-linalg-systems'],
  activityType: 'scene-build', graderId: 'deterministic', generate, solve: solveMixer,
};
