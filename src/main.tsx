import { render } from 'preact';
import { applyTheme, readThemePreference, watchSystemTheme } from './app/theme';
import { App } from './ui/App';
import './styles/next.css';

applyTheme(readThemePreference());
watchSystemTheme();

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App-Root fehlt');
render(<App />, root);

// Offline cache: only in release builds (dev serves the repo root, where no
// generated sw.js exists). Registered after load so first paint never waits.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
    void navigator.storage?.persist?.().catch(() => {});
  });
}
