// Spotlight tour content. `route` is a top-level hash section (App.tsx
// navigates there on step change), `target` a [data-tour] attribute value;
// steps without a target render as a centered card over the full dim.
export interface TourStep {
  id: string;
  route?: string;
  target?: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'intro',
    title: 'Kurzer Rundgang',
    body: 'In acht kurzen Schritten zeigen wir dir, wo was liegt. Du kannst die Tour jederzeit beenden und später in den Einstellungen neu starten.',
  },
  {
    id: 'nav',
    route: 'today',
    target: 'nav-main',
    title: 'Alles in Reichweite',
    body: 'Hier wechselst du zwischen Heute, Lernen, Review, Fortschritt und Einstellungen. Lektüren und Werkzeuge liegen darunter, auf kleinen Bildschirmen unter „Mehr“.',
  },
  {
    id: 'today-primary',
    route: 'today',
    target: 'today-primary',
    title: 'Dein nächster Schritt',
    body: 'Diese Karte empfiehlt, was jetzt dran ist: eine fällige Wiederholung, die Einstufung oder die nächste Aufgabe aus deinem Plan.',
  },
  {
    id: 'today-plan',
    route: 'today',
    target: 'today-plan',
    title: 'Dein Wochenplan',
    body: 'Der Plan verteilt dein Wochenbudget auf die Tage und mischt neue Aufgaben mit fälligen Wiederholungen.',
  },
  {
    id: 'learn',
    route: 'learn',
    target: 'learn-rail',
    title: 'Der Katalog',
    body: 'Die Module deines Lernpfads liegen hier in der empfohlenen Reihenfolge. Über die Pfad-Chips in dieser Ansicht erkundest du die übrigen Kataloge.',
  },
  {
    id: 'review',
    route: 'review',
    target: 'review-view',
    title: 'Review',
    body: 'Fällige Kurzabrufe aus allen Kompetenzen sammeln sich hier. Regelmäßiges Wiederholen hält deine Nachweise frisch.',
  },
  {
    id: 'progress',
    route: 'progress',
    target: 'progress-overview',
    title: 'Fortschritt',
    body: 'Nachgewiesene Kompetenzen, Frische-Fristen und dein Fehlerjournal. Alles bleibt lokal in deinem Browser.',
  },
  {
    id: 'settings',
    route: 'settings',
    target: 'settings-form',
    title: 'Einstellungen',
    body: 'Wochenbudget, Lernpfad und Reviewabstände stellst du hier ein; Export und Import deines Fortschritts liegen daneben. Diese Tour kannst du hier jederzeit neu starten. Viel Erfolg beim Lernen!',
  },
];
