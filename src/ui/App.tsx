import { lazy, Suspense } from 'preact/compat';
import { Fragment } from 'preact';
import type { JSX } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { loadCatalog } from '../adapters/content-repository';
import { loadOnboardingDone, loadProgressSnapshot, loadTourDone, saveLearningPreferences, saveOnboardingDone, saveTourDone, type ProgressSnapshot } from '../adapters/local-progress';
import { CompetencyView, DiagnosticView, LearnView, PlaceholderView, ReviewView, SettingsView, SourcesView, ToolsView } from './views';
import { ProjectView } from './ProjectView';
import { LessonView } from './LessonView';
import { VisualizationView } from './VisualizationView';
import { ProgressView } from './ProgressView';
import { TodayView } from './TodayView';
import { Button } from './Button';
import { BrandWordmark } from './Brand';
import { SponsorSlots } from './Sponsor';
import { OnboardingOverlay } from './OnboardingOverlay';
import { TourOverlay } from './TourOverlay';
import { TOUR_STEPS } from './tour-steps';
import { readThemePreference, saveThemePreference, type ThemePreference } from '../app/theme';
import { initPageEase } from './page-ease';

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

type NavigationItem = { route: string; label: string; icon: JSX.Element; secondary?: boolean };

const navigation: NavigationItem[] = [
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
  {
    route: 'sources', label: 'Lektüren', secondary: true, icon: (
      <svg {...iconProps}><path d="M4 2.5h5.5L13 6v7.5H4zM9.5 2.5V6H13M6.5 8.5h4M6.5 11h4" /></svg>
    ),
  },
  {
    route: 'tools', label: 'Werkzeuge', secondary: true, icon: (
      <svg {...iconProps}><path d="M10.2 2.6a3.2 3.2 0 0 0-4.3 4L2.5 9.9l3.6 3.6 3.3-3.4a3.2 3.2 0 0 0 4-4.3L11 8.4 7.6 5z" /></svg>
    ),
  },
];

const NAV_KEY = 'ki-lernplattform:nav';

const navToggleIcon = (collapsed: boolean) => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {collapsed
      ? <><path d="M4.5 3.5 8.5 8l-4 4.5" /><path d="M8.5 3.5 12.5 8l-4 4.5" /></>
      : <><path d="M7.5 3.5 3.5 8l4 4.5" /><path d="M11.5 3.5 7.5 8l4 4.5" /></>}
  </svg>
);

const themeIcon = (theme: ThemePreference) => (
  theme === 'dark'
    ? <svg width="19" height="19" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3.2" /><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3" /></svg>
    : <svg width="19" height="19" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.8 9.6A5.8 5.8 0 0 1 6.4 2.2 5.8 5.8 0 1 0 13.8 9.6z" /></svg>
);

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
    attemptCounts: {},
    openedLessons: [],
    recentModules: [],
    recentLessons: [],
    history: [],
    creditedDefinitions: [],
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
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference);
  const [navCollapsed, setNavCollapsed] = useState(() => typeof localStorage !== 'undefined' && localStorage.getItem(NAV_KEY) === 'rail');
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

  useEffect(() => initPageEase(), []);

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
    const params = new URLSearchParams(location.search);
    const forced = params.has('fresh');
    const wantsTour = params.has('tour');
    void Promise.all([loadOnboardingDone(), loadTourDone()])
      .then(([done, tourDone]) => {
        if (!live) return;
        setShowOnboarding((forced || !navigator.webdriver) && !done);
        // The explicit ?tour param wins even under webdriver; otherwise offer
        // the tour once to users whose onboarding is already done.
        if (wantsTour) setTourStep(0);
        else if (!forced && done && !tourDone && !navigator.webdriver) setTourStep(0);
      })
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
  const recentEntries = progress.recentModules.slice(0, 2).flatMap((moduleId) => {
    const entryModule = catalog.learningModules.find((item) => item.moduleId === moduleId);
    if (!entryModule) return [];
    const lessonId = progress.recentLessons.find((id) => entryModule.lessonIds.includes(id));
    const entryLesson = lessonId ? catalog.lessons.find((item) => item.lessonId === lessonId) : undefined;
    return [{ module: entryModule, lesson: entryLesson }];
  });
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
    if (!navigator.webdriver) setTourStep(0);
  }, [progress.reviewSlotsWeeks, savePreferences]);

  const skipOnboarding = useCallback(async () => {
    await saveOnboardingDone();
    setShowOnboarding(false);
    if (!navigator.webdriver) setTourStep(0);
  }, []);

  const closeTour = useCallback(async () => {
    await saveTourDone();
    setTourStep(null);
  }, []);

  const goToStep = useCallback((next: number) => {
    const nextStep = TOUR_STEPS[next];
    if (!nextStep) { void closeTour(); return; }
    if (nextStep.route && currentRoute() !== nextStep.route) location.hash = `#/${nextStep.route}`;
    setTourStep(next);
  }, [closeTour]);

  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    const preference: ThemePreference = next;
    setThemePreference(preference);
    saveThemePreference(preference);
  };

  const toggleNav = () => {
    const next = !navCollapsed;
    setNavCollapsed(next);
    localStorage.setItem(NAV_KEY, next ? 'rail' : 'full');
  };

  const view = section === 'today' ? <TodayView catalog={catalog} progress={progress} />
    : section === 'learn' ? <LearnView catalog={catalog} progress={progress} />
      : section === 'review' ? <ReviewView catalog={catalog} progress={progress} />
        : section === 'progress' ? <ProgressView catalog={catalog} progress={progress} />
          : section === 'settings' ? progressReady
            ? <SettingsView catalog={catalog} progress={progress} onSave={savePreferences} onRestartTour={() => setTourStep(0)} />
            : <section class="view" aria-labelledby="settings-title" aria-busy="true"><h1 id="settings-title" tabIndex={-1}>Einstellungen</h1><p role="status">Lokale Einstellungen werden geladen.</p></section>
            : section === 'diagnostic' ? <DiagnosticView catalog={catalog} progress={progress} />
              : section === 'sources' ? <SourcesView catalog={catalog} />
                : section === 'tools' ? <ToolsView catalog={catalog} />
                  : section === 'visualization' ? <VisualizationView visualizationId={routeId} />
                : section === 'module' ? <Suspense fallback={<section class="view"><p role="status">Modul wird geladen.</p></section>}><ModuleView key={routeId} catalog={catalog} moduleId={routeId} progress={progress} /></Suspense>
                : section === 'family' ? <Suspense fallback={<section class="view"><p role="status">Variante wird geladen.</p></section>}><FamilyExerciseView key={familyRef} catalog={catalog} familyRef={familyRef} /></Suspense>
                : section === 'lesson' ? <LessonView catalog={catalog} lessonId={routeId} />
                    : section === 'project' ? <ProjectView catalog={catalog} projectId={routeId} />
                    : section === 'competency' ? <CompetencyView catalog={catalog} progress={progress} competencyId={routeId} />
                : <PlaceholderView title="Nicht gefunden" />;

  return (
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-left">
          <span class="local-status"><span aria-hidden="true" />Lokal</span>
        </div>
        <SponsorSlots />
        <a class="brand" href="#/today" aria-label="argmin, zur Heute-Ansicht">
          <span class="brand-wordmark"><BrandWordmark /></span>
        </a>
        <SponsorSlots />
        <div class="topbar-right"><Button variant="ghost" size="sm" class="theme-toggle" aria-label="Farbschema wechseln" onClick={toggleTheme}>{themeIcon(themePreference)}</Button></div>
      </header>
      <div class={navCollapsed ? 'app-body nav-collapsed' : 'app-body'}>
        <nav class="main-nav" aria-label="Hauptnavigation" data-tour="nav-main">
          <div class="nav-main">
            <Button variant="ghost" size="sm" class="nav-toggle" aria-label={navCollapsed ? 'Navigation ausklappen' : 'Navigation einklappen'} aria-expanded={!navCollapsed} onClick={toggleNav}>{navToggleIcon(navCollapsed)}</Button>
            {navigation.map((item) => (
              <Fragment key={item.route}>
                <a href={`#/${item.route}`} aria-current={activeNavigation === item.route ? 'page' : undefined} class={item.secondary ? 'nav-secondary' : undefined}>
                  {item.icon}
                  <span>{item.label}</span>
                </a>
                {item.route === 'learn' && !navCollapsed && recentEntries.length > 0 && (
                  <div class="nav-recent" role="group" aria-label="Zuletzt geöffnet">
                    {recentEntries.map(({ module, lesson }) => (
                      <Fragment key={module.moduleId}>
                        <a class="nav-recent-module" href={`#/module/${module.moduleId}`} aria-current={section === 'module' && routeId === module.moduleId ? 'page' : undefined} title={module.title}><span>{module.title}</span></a>
                        {lesson ? <a class="nav-recent-lesson" href={`#/lesson/${lesson.lessonId}`} aria-current={section === 'lesson' && routeId === lesson.lessonId ? 'page' : undefined} title={lesson.title}><span>{lesson.title}</span></a> : null}
                      </Fragment>
                    ))}
                  </div>
                )}
              </Fragment>
            ))}
          </div>
          <div class="nav-footer">Katalog {catalog.version}</div>
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
      {tourStep !== null && !showOnboarding ? (
        <TourOverlay
          step={tourStep}
          onNext={() => (tourStep >= TOUR_STEPS.length - 1 ? void closeTour() : goToStep(tourStep + 1))}
          onPrev={() => goToStep(Math.max(0, tourStep - 1))}
          onClose={() => void closeTour()}
        />
      ) : null}
    </div>
  );
}
