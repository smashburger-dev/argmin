import { useEffect, useRef, useState } from 'preact/hooks';

interface BoardHandle {
  board: { create: (...args: unknown[]) => unknown };
  resultArrow: { point2: { moveTo: (point: number[], duration: number) => void } };
}

declare global {
  interface Window {
    JXG?: {
      JSXGraph: {
        initBoard: (id: string, options: Record<string, unknown>) => BoardHandle['board'];
        freeBoard: (board: BoardHandle['board']) => void;
      };
    };
  }
}

let jsxGraphReady: Promise<boolean> | null = null;

function ensureJsxGraph() {
  if (window.JXG) return Promise.resolve(true);
  if (jsxGraphReady) return jsxGraphReady;
  const stylePath = ['vendor', 'jsxgraph', 'jsxgraph.css'].join('/');
  const scriptPath = ['vendor', 'jsxgraph', 'jsxgraphcore.js'].join('/');
  const styleUrl = new URL(stylePath, document.baseURI).href;
  const scriptUrl = new URL(scriptPath, document.baseURI).href;
  if (!document.querySelector(`link[data-runtime="${styleUrl}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = styleUrl;
    link.dataset.runtime = styleUrl;
    document.head.appendChild(link);
  }
  jsxGraphReady = import(/* @vite-ignore */ scriptUrl)
    .then(() => Boolean(window.JXG))
    .catch(() => false);
  return jsxGraphReady;
}

export function VisualizationView({ visualizationId }: { visualizationId: string }) {
  const [x1, setX1] = useState(1);
  const [x2, setX2] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const handle = useRef<BoardHandle | null>(null);
  const resultX = 2 * x1 + x2;
  const resultY = x1 + 3 * x2;
  const result: [number, number] = [resultX, resultY];

  useEffect(() => {
    if (visualizationId !== 'w05-viz1') return;
    let active = true;
    void ensureJsxGraph().then((ready) => {
      if (!active || !ready || !window.JXG) {
        if (active) setStatus('error');
        return;
      }
      const board = window.JXG.JSXGraph.initBoard('w05-column-board', { boundingbox: [-4, 6, 7, -4], axis: true, showNavigation: true, showCopyright: false });
      board.create('arrow', [[0, 0], [2, 1]], { strokeColor: '#16713a', strokeWidth: 3, name: 'a₁', withLabel: true });
      board.create('arrow', [[0, 0], [1, 3]], { strokeColor: '#9c4b00', strokeWidth: 3, name: 'a₂', withLabel: true });
      const resultArrow = board.create('arrow', [[0, 0], result], { strokeColor: '#244cff', strokeWidth: 4, name: 'b', withLabel: true }) as BoardHandle['resultArrow'];
      handle.current = { board, resultArrow };
      setStatus('ready');
    });
    return () => {
      active = false;
      if (handle.current && window.JXG) window.JXG.JSXGraph.freeBoard(handle.current.board);
      handle.current = null;
    };
  }, [visualizationId]);

  useEffect(() => {
    handle.current?.resultArrow.point2.moveTo(result, 0);
  }, [resultX, resultY]);

  if (visualizationId !== 'w05-viz1') return <section class="view"><div class="empty-state"><h1>Visualisierung nicht gefunden</h1><a class="button button-secondary" href="#/tools">Zu den Werkzeugen</a></div></section>;
  return <section class="view" aria-labelledby="visualization-title"><header class="view-header"><p class="eyebrow">Interaktive Matrixansicht</p><h1 id="visualization-title" tabIndex={-1}>Spaltenbild von A·x</h1><p class="lede">Verändere die Koeffizienten. Der blaue Vektor b ist die Linearkombination x₁·a₁ + x₂·a₂ der beiden Matrixspalten.</p></header><div class="visualization-layout"><div><div id="w05-column-board" class="jxgbox matrix-board" aria-label="Koordinatensystem mit den Matrixspalten a1, a2 und dem Ergebnisvektor b" />{status === 'loading' ? <p role="status">Visualisierung wird geladen.</p> : null}{status === 'error' ? <p role="alert">Die lokale JSXGraph-Runtime konnte nicht geladen werden. Die Zahlensteuerung bleibt nutzbar.</p> : null}</div><fieldset class="visualization-controls"><legend>Koeffizienten</legend><label>x₁<input type="number" min="-3" max="3" step="0.1" value={x1} onInput={(event) => setX1(Number(event.currentTarget.value))} /></label><label>x₂<input type="number" min="-3" max="3" step="0.1" value={x2} onInput={(event) => setX2(Number(event.currentTarget.value))} /></label><p>A = [[2, 1], [1, 3]]</p><p>b = A·x = <output aria-live="polite">({resultX.toFixed(1)}, {resultY.toFixed(1)})</output></p><p class="muted">Grün: a₁ = (2, 1). Orange: a₂ = (1, 3). Blau: b.</p></fieldset></div><nav class="catalog-links" aria-label="Verwandte Inhalte"><a href="#/family/trace-assignment-state/column-picture-trace/0/intro">Spaltenbild tracen</a><a href="#/tools">Zu den Werkzeugen</a></nav></section>;
}
