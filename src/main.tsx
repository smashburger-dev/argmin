import { render } from 'preact';
import { applyTheme, readThemePreference, watchSystemTheme } from './app/theme';
import { initServiceWorkerUpdates } from './app/sw-update';
import { App } from './ui/App';
import './styles/next.css';

applyTheme(readThemePreference());
watchSystemTheme();

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App-Root fehlt');
render(<App />, root);

// Offline cache and update notice: only in release builds (dev serves the
// repo root, where no generated sw.js exists).
initServiceWorkerUpdates();
