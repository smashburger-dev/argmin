import { useEffect, useRef } from 'preact/hooks';
import { SafeMarkup } from './SafeMarkup';

declare global {
  interface Window {
    renderMathInElement?: (element: HTMLElement, options: Record<string, unknown>) => void;
  }
}

let katexReady: Promise<boolean> | null = null;

function loadScript(source: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-runtime="${source}"]`);
    if (existing?.dataset.loaded === 'true') return resolve();
    const script = existing || document.createElement('script');
    script.dataset.runtime = source;
    script.src = source;
    script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
    script.onerror = () => reject(new Error(`Runtime nicht ladbar: ${source}`));
    if (!existing) document.head.appendChild(script);
  });
}

function ensureKatex() {
  if (katexReady) return katexReady;
  const stylePath = ['vendor', 'katex', 'dist', 'katex.min.css'].join('/');
  const katexPath = ['vendor', 'katex', 'dist', 'katex.min.js'].join('/');
  const renderPath = ['vendor', 'katex', 'dist', 'contrib', 'auto-render.min.js'].join('/');
  const styleUrl = new URL(stylePath, document.baseURI).href;
  const katexUrl = new URL(katexPath, document.baseURI).href;
  const renderUrl = new URL(renderPath, document.baseURI).href;
  if (!document.querySelector(`link[data-runtime="${styleUrl}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = styleUrl;
    link.dataset.runtime = styleUrl;
    document.head.appendChild(link);
  }
  katexReady = loadScript(katexUrl)
    .then(() => loadScript(renderUrl))
    .then(() => true)
    .catch(() => false);
  return katexReady;
}

export function MathMarkup({ html, inline = false }: { html: string; inline?: boolean }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    void ensureKatex().then((ready) => {
      if (!active || !ready || !root.current || !window.renderMathInElement) return;
      window.renderMathInElement(root.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    });
    return () => { active = false; };
  }, [html]);
  const Tag = inline ? 'span' : 'div';
  return <Tag ref={root as never}><SafeMarkup html={html} /></Tag>;
}
