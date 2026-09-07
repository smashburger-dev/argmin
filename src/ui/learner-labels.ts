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
