import { lazy, Suspense } from 'preact/compat';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { loadCatalog } from '../adapters/content-repository';
import { loadProgressSnapshot, saveLearningPreferences, type ProgressSnapshot } from '../adapters/local-progress';
import { CompetencyView, DiagnosticView, LearnView, PlaceholderView, ProgressView, ReviewFindingsView, ReviewView, RoadmapView, SettingsView, SourcesView, TodayView, ToolsView } from './views';
import { ProjectView } from './ProjectView';
import { LessonView } from './LessonView';
import { VisualizationView } from './VisualizationView';

// Route-lazy exercise surface: the grader + seed-generator stack travels in
// the exercise chunk instead of the initial payload (ADR-0015; same pattern
// as the code workspace).
const ExerciseView = lazy(() => import('./ExerciseView').then((module) => ({ default: module.ExerciseView })));
const LabView = lazy(() => import('./LabView').then((module) => ({ default: module.LabView })));
const ModuleView = lazy(() => import('./ModuleView').then((module) => ({ default: module.ModuleView })));
const FamilyExerciseView = lazy(() => import('./FamilyExerciseView').then((module) => ({ default: module.FamilyExerciseView })));

const navigation = [
  { route: 'today', label: 'Heute' },
  { route: 'learn', label: 'Lernen' },
  { route: 'review', label: 'Review' },
  { route: 'progress', label: 'Fortschritt' },
  { route: 'settings', label: 'Einstellungen' },
];

const currentRoute = () => location.hash.replace(/^#\//, '') || 'today';

export function App() {
  const catalog = useMemo(loadCatalog, []);
  const [route, setRoute] = useState(currentRoute);
  const [progress, setProgress] = useState<ProgressSnapshot>({
    attemptsCount: 0,
    dueReviews: [],
    scheduledReviewCount: 0,
    journal: [],
    evidenceStates: Object.fromEntries(catalog.competencies.map((item) => [item.competencyId, 'unassessed'])),
    evidenceDueAt: Object.fromEntries(catalog.competencies.map((item) => [item.competencyId, null])),
    weeklyMinutes: 180,
    trackId: 'common-core',
    reviewSlotsWeeks: [2, 5, 11],
  });
  const [progressReady, setProgressReady] = useState(false);
  const progressRequest = useRef(0);
  const refreshProgress = useCallback(async () => {
    const request = ++progressRequest.current;
    const snapshot = await loadProgressSnapshot(catalog);
    if (request === progressRequest.current) {
      setProgress(snapshot);
      setProgressReady(true);
    }
    return snapshot;
  }, [catalog]);

  useEffect(() => {
    const update = () => setRoute(currentRoute());
    addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    const refresh = () => { void refreshProgress().catch(() => setProgressReady(true)); };
    refresh();
    addEventListener('learning-progress-changed', refresh);
    return () => {
      progressRequest.current += 1;
      removeEventListener('learning-progress-changed', refresh);
    };
  }, [refreshProgress]);

  useEffect(() => {
    requestAnimationFrame(() => document.querySelector<HTMLElement>('main h1')?.focus());
  }, [route]);

  const [section = 'today', routeId = ''] = route.split('/');
  const familyRef = section === 'family' ? route.split('/').slice(1).join('/') : '';
  const activeNavigation = ['competency', 'diagnostic', 'lesson', 'module', 'exercise', 'lab', 'project', 'sources', 'tools', 'roadmap', 'visualization', 'quality'].includes(section) ? 'learn' : section;

  const savePreferences = async (weeklyMinutes: number, trackId: string, reviewSlotsWeeks: number[]) => {
    const safeMinutes = Math.min(2400, Math.max(30, Math.round(weeklyMinutes / 15) * 15));
    const normalizedSlots = reviewSlotsWeeks.map(Number).filter((value) => Number.isFinite(value) && value > 0 && value <= 520);
    const safeSlots = normalizedSlots.length > 0 && normalizedSlots.every((value, index) => index === 0 || value > normalizedSlots[index - 1]!)
      ? normalizedSlots
      : progress.reviewSlotsWeeks;
    await saveLearningPreferences(safeMinutes, trackId, safeSlots);
    await refreshProgress();
  };

  const view = section === 'today' ? <TodayView catalog={catalog} progress={progress} />
    : section === 'learn' ? <LearnView catalog={catalog} progress={progress} />
      : section === 'review' ? <ReviewView catalog={catalog} progress={progress} />
        : section === 'progress' ? <ProgressView catalog={catalog} progress={progress} />
          : section === 'settings' ? progressReady
            ? <SettingsView catalog={catalog} progress={progress} onSave={savePreferences} />
            : <section class="view" aria-labelledby="settings-title" aria-busy="true"><h1 id="settings-title" tabIndex={-1}>Einstellungen</h1><p role="status">Lokale Einstellungen werden geladen.</p></section>
            : section === 'diagnostic' ? <DiagnosticView catalog={catalog} progress={progress} />
              : section === 'sources' ? <SourcesView catalog={catalog} />
                : section === 'tools' ? <ToolsView catalog={catalog} />
                  : section === 'quality' ? <ReviewFindingsView catalog={catalog} />
                    : section === 'roadmap' ? <RoadmapView catalog={catalog} />
                    : section === 'visualization' ? <VisualizationView visualizationId={routeId} />
              : section === 'lab' ? <Suspense fallback={<section class="view"><p role="status">Codeworkspace wird geladen.</p></section>}><LabView key={routeId} catalog={catalog} exerciseId={routeId} /></Suspense>
                : section === 'module' ? <Suspense fallback={<section class="view"><p role="status">Modul wird geladen.</p></section>}><ModuleView key={routeId} catalog={catalog} moduleId={routeId} /></Suspense>
                : section === 'family' ? <Suspense fallback={<section class="view"><p role="status">Variante wird geladen.</p></section>}><FamilyExerciseView key={familyRef} familyRef={familyRef} /></Suspense>
                : section === 'lesson' ? <LessonView catalog={catalog} lessonId={routeId} />
                  : section === 'exercise' ? <Suspense fallback={<section class="view"><p role="status">Aufgabe wird geladen.</p></section>}><ExerciseView key={routeId} catalog={catalog} exerciseId={routeId} /></Suspense>
                    : section === 'project' ? <ProjectView catalog={catalog} projectId={routeId} />
                    : section === 'competency' ? <CompetencyView catalog={catalog} progress={progress} competencyId={routeId} />
                : <PlaceholderView title="Nicht gefunden" />;

  return (
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="#/today" aria-label="KI-Lernplattform, zur Heute-Ansicht">
          <span class="brand-mark" aria-hidden="true">KL</span>
          <span><strong>KI-Lernplattform</strong><small>Local-first Lernsystem</small></span>
        </a>
        <div class="topbar-meta"><span class="local-status"><span aria-hidden="true" />Lokal</span><span class="catalog-version">Katalog {catalog.version}</span></div>
      </header>
      <div class="app-body">
        <nav class="main-nav" aria-label="Hauptnavigation">
          <p class="nav-label">Lernen</p>
          {navigation.map((item) => (
            <a href={`#/${item.route}`} aria-current={activeNavigation === item.route ? 'page' : undefined} key={item.route}>
              <span class={`nav-icon nav-icon-${item.route}`} aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          ))}
          <div class="nav-foot"><span>Ohne Account nutzbar</span><a href="#/roadmap">Roadmap</a><a href="#/sources">Lektüren</a><a href="#/tools">Werkzeuge</a><a href="#/quality">Qualität</a></div>
        </nav>
        <main id="main-content">{view}</main>
      </div>
      <footer class="mobile-context" aria-label="Lokaler Status"><span>Local-first</span><span>{catalog.competencies.length} Kompetenzen</span></footer>
    </div>
  );
}
