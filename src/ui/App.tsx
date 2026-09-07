import { lazy, Suspense } from 'preact/compat';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { loadCatalog } from '../adapters/content-repository';
import { loadOnboardingDone, loadProgressSnapshot, saveLearningPreferences, saveOnboardingDone, type ProgressSnapshot } from '../adapters/local-progress';
import { CompetencyView, DiagnosticView, LearnView, PlaceholderView, ReviewView, SettingsView, SourcesView, ToolsView } from './views';
import { ProjectView } from './ProjectView';
import { LessonView } from './LessonView';
import { VisualizationView } from './VisualizationView';
import { ProgressView } from './ProgressView';
import { TodayView } from './TodayView';
import { Button } from './Button';
import { OnboardingOverlay } from './OnboardingOverlay';
import { readThemePreference, saveThemePreference, type ThemePreference } from '../app/theme';

const ModuleView = lazy(() => import('./ModuleView').then((module) => ({ default: module.ModuleView })));
const FamilyExerciseView = lazy(() => import('./FamilyExerciseView').then((module) => ({ default: module.FamilyExerciseView })));

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 1.4,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': true,
} as const;

const navigation = [
  {
    route: 'today', label: 'Heute', icon: (
      <svg {...iconProps}><rect x="2.5" y="3.5" width="11" height="10" rx="2" /><path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" /></svg>
    ),
  },
  {
    route: 'learn', label: 'Lernen', icon: (
      <svg {...iconProps}><path d="M8 4.5C6 3.5 4 3.5 2.5 4v8c1.5-.5 3.5-.5 5.5.5 2-1 4-1 5.5-.5v-8c-1.5-.5-3.5-.5-5.5.5zM8 4.5v8" /></svg>
    ),
  },
  {
    route: 'review', label: 'Review', icon: (
      <svg {...iconProps}><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v2.6h-2.6" /></svg>
    ),
  },
  {
    route: 'progress', label: 'Fortschritt', icon: (
      <svg {...iconProps}><path d="M3 13V9M8 13V5M13 13V7" /></svg>
    ),
  },
  {
    route: 'settings', label: 'Einstellungen', icon: (
      <svg {...iconProps}><path d="M2.5 5.5h11M2.5 10.5h11" /><circle cx="6" cy="5.5" r="1.6" /><circle cx="10" cy="10.5" r="1.6" /></svg>
    ),
  },
];

const currentRoute = () => location.hash.replace(/^#\//, '') || 'today';

const routeTitles: Record<string, string> = {
  today: 'Heute',
  learn: 'Lernen',
  review: 'Review',
  progress: 'Fortschritt',
  settings: 'Einstellungen',
  diagnostic: 'Diagnose',
  sources: 'Lektüren',
  tools: 'Werkzeuge',
  visualization: 'Visualisierung',
  module: 'Modul',
  family: 'Aufgabe',
  lesson: 'Lektion',
  project: 'Projekt',
  competency: 'Kompetenz',
};

const learnSections = ['competency', 'family', 'lesson', 'module', 'project', 'visualization'];

export function App() {
  const catalog = useMemo(loadCatalog, []);
  const [route, setRoute] = useState(currentRoute);
  const [progress, setProgress] = useState<ProgressSnapshot>({
    attemptsCount: 0,
    lastAttempt: null,
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
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference);
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
    let live = true;
    const forced = new URLSearchParams(location.search).has('fresh');
    void loadOnboardingDone()
      .then((done) => { if (live) setShowOnboarding((forced || !navigator.webdriver) && !done); })
      .catch(() => { if (live) setShowOnboarding(false); });
    return () => { live = false; };
  }, []);

  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = route.split('/')[0] || 'today';
    document.title = `${routeTitles[section] ?? 'argmin'} – argmin`;
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
    requestAnimationFrame(() => document.querySelector<HTMLElement>('main h1')?.focus());
  }, [route]);

  const [section = 'today', routeId = ''] = route.split('/');
  const familyRef = section === 'family' ? route.split('/').slice(1).join('/') : '';
  const activeNavigation = learnSections.includes(section) ? 'learn' : section;

  const savePreferences = async (weeklyMinutes: number, trackId: string, reviewSlotsWeeks: number[]) => {
    const safeMinutes = Math.min(2400, Math.max(30, Math.round(weeklyMinutes / 15) * 15));
    const normalizedSlots = reviewSlotsWeeks.map(Number).filter((value) => Number.isFinite(value) && value > 0 && value <= 520);
    const safeSlots = normalizedSlots.length > 0 && normalizedSlots.every((value, index) => index === 0 || value > normalizedSlots[index - 1]!)
      ? normalizedSlots
      : progress.reviewSlotsWeeks;
    await saveLearningPreferences(safeMinutes, trackId, safeSlots);
    await refreshProgress();
  };

  const finishOnboarding = useCallback(async (trackId: string, weeklyMinutes: number) => {
    await savePreferences(weeklyMinutes, trackId, progress.reviewSlotsWeeks);
    await saveOnboardingDone();
    setShowOnboarding(false);
  }, [progress.reviewSlotsWeeks, savePreferences]);

  const skipOnboarding = useCallback(async () => {
    await saveOnboardingDone();
    setShowOnboarding(false);
  }, []);

  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    const preference: ThemePreference = next;
    setThemePreference(preference);
    saveThemePreference(preference);
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
                  : section === 'visualization' ? <VisualizationView visualizationId={routeId} />
                : section === 'module' ? <Suspense fallback={<section class="view"><p role="status">Modul wird geladen.</p></section>}><ModuleView key={routeId} catalog={catalog} moduleId={routeId} /></Suspense>
                : section === 'family' ? <Suspense fallback={<section class="view"><p role="status">Variante wird geladen.</p></section>}><FamilyExerciseView key={familyRef} catalog={catalog} familyRef={familyRef} /></Suspense>
                : section === 'lesson' ? <LessonView catalog={catalog} lessonId={routeId} />
                    : section === 'project' ? <ProjectView catalog={catalog} projectId={routeId} />
                    : section === 'competency' ? <CompetencyView catalog={catalog} progress={progress} competencyId={routeId} />
                : <PlaceholderView title="Nicht gefunden" />;

  return (
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="#/today" aria-label="argmin, zur Heute-Ansicht">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
              <path d="M5 8 Q5 27 18 27 Q31 27 31 8" />
              <circle cx="18" cy="27" r="4.2" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span><strong>argmin</strong><small>KI lernen, lokal &amp; gratis</small></span>
        </a>
        <div class="topbar-meta"><span class="local-status"><span aria-hidden="true" />Lokal</span><span class="catalog-version">Katalog {catalog.version}</span><Button variant="ghost" size="sm" class="theme-toggle" aria-label="Farbschema wechseln" onClick={toggleTheme}>{themePreference === 'dark' ? '☀' : '☾'}</Button></div>
      </header>
      <div class="app-body">
        <nav class="main-nav" aria-label="Hauptnavigation" data-tour="nav-main">
          <p class="nav-label">Lernen</p>
          {navigation.map((item) => (
            <a href={`#/${item.route}`} aria-current={activeNavigation === item.route ? 'page' : undefined} key={item.route}>
              {item.icon}
              <span>{item.label}</span>
            </a>
          ))}
          <div class="nav-foot"><span>Ohne Account nutzbar</span><a href="#/sources">Lektüren</a><a href="#/tools">Werkzeuge</a></div>
        </nav>
        <main id="main-content" ref={mainRef} tabIndex={-1}>{view}</main>
      </div>
      <footer class="mobile-context" aria-label="Lokaler Status">
        <span>Local-first</span>
        <span>{catalog.competencies.length} Kompetenzen</span>
        <nav class="mobile-more" aria-label="Mehr" data-tour="nav-more"><a href="#/sources">Lektüren</a><a href="#/tools">Werkzeuge</a></nav>
      </footer>
      {showOnboarding ? (
        <OnboardingOverlay
          catalog={catalog}
          initialTrackId={progress.trackId}
          onDone={(trackId, weeklyMinutes) => void finishOnboarding(trackId, weeklyMinutes)}
          onSkip={() => void skipOnboarding()}
        />
      ) : null}
    </div>
  );
}
