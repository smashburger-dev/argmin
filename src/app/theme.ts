export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'ki-lernplattform:theme';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function readThemePreference(): ThemePreference {
  if (typeof localStorage === 'undefined') return 'system';
  const stored = localStorage.getItem(KEY);
  return isThemePreference(stored) ? stored : 'system';
}

export function applyTheme(pref: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const theme = pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
  document.documentElement.dataset.theme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0e0e11' : '#f6f6f7');
}

export function saveThemePreference(pref: ThemePreference): void {
  localStorage.setItem(KEY, pref);
  applyTheme(pref);
}

export function watchSystemTheme(): void {
  if (typeof window === 'undefined') return;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const update = () => {
    if (readThemePreference() === 'system') applyTheme('system');
  };
  media.addEventListener?.('change', update);
  if (!media.addEventListener) media.addListener(update);
}
