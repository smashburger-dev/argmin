import { CompetencyGraph } from '../../assets/js/domain/competency_graph.mjs';
import { DiagnosticEngine } from '../../assets/js/domain/diagnostic_engine.mjs';
import type { CatalogData } from '../app/types';
import type { ProgressSnapshot } from './local-progress';

export interface Recommendation {
  type: 'review' | 'lesson' | 'diagnostic';
  competencyId: string;
  reasonCodes: string[];
}

export function buildFoundationsDiagnosis(catalog: CatalogData, progress: ProgressSnapshot): Recommendation[] {
  const milestone = catalog.milestones.find((item) => item.milestoneId === 'ms-foundations');
  if (!milestone) return [];
  const graph = new CompetencyGraph(catalog.competencies);
  const engine = new DiagnosticEngine(graph);
  const evidenceByCompetency = Object.fromEntries(Object.entries(progress.evidenceStates).map(([id, state]) => [id, { state }]));
  return engine.diagnose({ goalCompetencyIds: milestone.competencyIds, evidenceByCompetency }).recommendations as Recommendation[];
}
