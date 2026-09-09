import type { ExerciseSummary } from '../app/types';
import { activityLabel, difficultyLabelFor } from './exercise-context';

export function minutesLabel(minutes: number) {
  return minutes >= 60 ? `${Math.round(minutes / 60)} Std.` : `${minutes} Min.`;
}

export function learnerExerciseLabel(exercise: Pick<ExerciseSummary, 'activityType' | 'difficulty'> | undefined) {
  return exercise
    ? `${activityLabel(exercise.activityType)} · ${difficultyLabelFor(exercise.difficulty)}`
    : 'Aufgabe';
}

const reasonCodeLabels: Record<string, string> = {
  'missing-evidence': 'Beleg fehlt',
  'goal-competency': 'Zielkompetenz',
  'goal-prerequisite': 'Voraussetzung',
  'review-due': 'Review fällig',
  'weak-competency': 'Kompetenz stärken',
  'strengthen-competency': 'Kompetenz stärken',
  'build-competency': 'Kompetenz aufbauen',
};

export function reasonCodeLabel(code: string) {
  return reasonCodeLabels[code] ?? code;
}

export function countLabel(count: number, singular: string, plural: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}
