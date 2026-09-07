export type EvidenceState = 'unassessed' | 'learning' | 'demonstrated' | 'review_due' | 'retained';

export interface EvidencePolicy {
  minimumIndependentHits: number;
  minimumDistinctDefinitions: number;
  delayedHitRequired: boolean;
  minimumDelayDays: number;
  freshnessDays: number;
}

export interface Competency {
  competencyId: string;
  locale: 'de';
  title: string;
  description: string;
  domain: string;
  level: 'recall' | 'apply' | 'transfer';
  requires: string[];
  relations: Array<{ type: 'supports' | 'related' | 'usedBy'; competencyId: string }>;
  trackIds: string[];
  estimatedMinutes: number;
  evidencePolicy: EvidencePolicy;
  rightsId: string;
  releaseStatus: string;
}

export interface Track {
  trackId: string;
  locale: 'de';
  title: string;
  description: string;
  competencyIds: string[];
  milestoneIds: string[];
  releaseStatus: string;
}

export interface MilestoneCoverage {
  competencyId: string;
  status: 'w01-reuse' | 'w02-w04-expand' | 'new' | 'complete';
  requiredArtifacts: string[];
}

export interface Milestone {
  milestoneId: string;
  locale: 'de';
  title: string;
  description: string;
  estimatedMinutes: number;
  competencyIds: string[];
  lessonIds: string[];
  projectIds: string[];
  coverage: MilestoneCoverage[];
  releaseStatus: string;
}

export interface ExerciseSummary {
  definitionId: string;
  version: number;
  title: string;
  prompt: string;
  activityType: string;
  graderId: string;
  generatorId: string | null;
  referenceSolverId: string | null;
  competencyIds: string[];
  estimatedMinutes: number;
  difficulty: number | string;
  deterministicSeed: number;
  masteryEligible: boolean;
  active: boolean;
  releaseStatus: string;
  parameters: Record<string, unknown>;
  choices: Array<{ id: string; text: string; correct: boolean }>;
  expectedAnswer: Record<string, unknown>;
  tolerancePolicy: Record<string, unknown>;
  hints: string[];
  feedbackRules: Array<Record<string, unknown>>;
  fullSolution: string;
  workedExample: Record<string, unknown> | null;
  rubric: Array<Record<string, unknown>> | null;
  typicalErrors: unknown[] | null;
  testedSeedCount: number;
  starterCode?: string;
  packages?: string[];
  familyId?: string;
  caseId?: string;
  seed?: number;
  seeded?: boolean;
}

export interface LessonBlock {
  blockId: string;
  type: string;
  contentRef: string;
  html: string;
  viz?: VisualizationSpec;
  visualizationId?: string;
}

export type VisualizationExpr = number | string;
export type VisualizationCoord = [VisualizationExpr, VisualizationExpr];
export interface VisualizationSlider {
  name: string;
  range: [number, number];
  value: number;
  step?: number;
  label?: string;
}
export type VisualizationObject =
  | { kind: 'functiongraph'; expr: string; domain?: VisualizationCoord; label?: string; color?: string; dash?: boolean }
  | { kind: 'point'; at: VisualizationCoord; label?: string; color?: string }
  | { kind: 'arrow' | 'segment'; from: VisualizationCoord; to: VisualizationCoord; label?: string; color?: string; dash?: boolean }
  | { kind: 'text'; at: VisualizationCoord; text: string; color?: string }
  | { kind: 'polygon'; points: VisualizationCoord[]; color?: string }
  | { kind: 'curve'; points: VisualizationCoord[]; color?: string; dash?: boolean };
export interface VisualizationSpec {
  schemaVersion: 1;
  engine: 'jsxgraph';
  title: string;
  caption: string;
  boundingbox: [number, number, number, number];
  axis?: boolean;
  keepAspectRatio?: boolean;
  sliders?: VisualizationSlider[];
  objects: VisualizationObject[];
}

export interface Lesson {
  lessonId: string;
  version: number;
  title: string;
  objectives: string[];
  competencyIds: string[];
  requires: string[];
  estimatedMinutes: number;
  blocks: LessonBlock[];
  sourceRefs: Array<{ sourceId: string; role: 'primary' | 'reference' | 'practice' | 'remedial'; locator: string }>;
  releaseStatus: string;
}

export interface ExplanationCard {
  explanationId: string;
  competencyIds: string[];
  diagnosticCodes: string[];
  helpLevel: number;
  body: string;
  steps: string[];
  example?: string;
  counterexample?: string;
  sourceRefs: string[];
  followUpActivityIds: string[];
  revealsSolution: boolean;
}

export interface ProjectDefinition {
  projectId: string;
  version: number;
  title: string;
  description: string;
  runnerMode: 'browser' | 'local' | 'hybrid';
  competencyIds: string[];
  starterFiles: string[];
  deliverables: string[];
  releaseStatus: string;
  estimatedMinutes?: number;
}

export interface ToolCard {
  toolId: string;
  title: string;
  summary: string;
  kind: string;
  competencyIds: string[];
  routes: Array<{ label: string; href: string; type: 'internal' | 'external' }>;
  sourceRefs: string[];
  capabilities: string[];
  limitations: string[];
  availability: 'public' | 'local-only';
  rightsId: string;
  releaseStatus: string;
}

export interface SourceSummary {
  sourceId: string;
  title: string;
  author: string;
  canonicalUrl: string;
  contentClass: string;
  license: string;
  attribution: string;
  allowedUses: string[];
  weeks: number[];
  extractionStatus: string;
  qaStatus: string;
}

export interface ExercisePlacement {
  placementId: string;
  role: 'curated' | 'practice-space';
  familyId: string;
  caseId?: string;
  seed?: number;
  difficulty: 'intro' | 'core' | 'stretch' | 'challenge';
  definitionId?: string;
  lessonId?: string;
  estimatedMinutes?: number;
  masteryEligible?: boolean;
}

export interface LearningModule {
  moduleId: string;
  title: string;
  description: string;
  competencyIds: string[];
  requires: string[];
  trackIds: string[];
  lessonIds: string[];
  explanationIds?: string[];
  placements: ExercisePlacement[];
  projectIds: string[];
  derivedMinutes: number;
  estimatedMinutes: number;
  durationOverridden: boolean;
  releaseStatus: string;
}

export interface CatalogData {
  catalogId: string;
  version: string;
  competencies: Competency[];
  tracks: Track[];
  milestones: Milestone[];
  learningModules: LearningModule[];
  lessons: Lesson[];
  exercises: ExerciseSummary[];
  explanations: ExplanationCard[];
  projects: ProjectDefinition[];
  families?: Array<{ familyId: string; summary: string; activityType?: string }>;
}

export interface VisualizationSummary {
  visualizationId: string;
  lessonId: string;
  spec: VisualizationSpec;
}
