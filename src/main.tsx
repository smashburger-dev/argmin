import { render } from 'preact';
import { applyTheme, readThemePreference, watchSystemTheme } from './app/theme';
import { App } from './ui/App';
import './styles/next.css';

applyTheme(readThemePreference());
watchSystemTheme();

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App-Root fehlt');
render(<App />, root);
