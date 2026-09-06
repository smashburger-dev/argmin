import { learningLedger } from '../../assets/js/core/learning_ledger.mjs';
import type { ProjectDefinition } from '../app/types';

export async function recordProjectReport(project: ProjectDefinition, report: { reportId?: string; status?: string }, valid: boolean): Promise<void> {
  if (!learningLedger) return;
  await learningLedger.record({
    activityId: project.projectId,
    definitionId: project.projectId,
    exerciseId: project.projectId,
    activityVersion: project.version,
    competencyIds: project.competencyIds,
    seed: 0,
    eventType: 'project-report',
    event: valid ? 'validated-self-report' : 'invalid-self-report',
    answer: JSON.stringify({ reportId: report.reportId || null, status: report.status || null }),
    correct: valid,
    errorType: valid ? null : 'invalid-project-report',
  });
}
