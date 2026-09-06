import { render } from 'preact';
import { App } from './ui/App';
import './styles/next.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App-Root fehlt');
render(<App />, root);
