import { useEffect, useRef, useState } from 'preact/hooks';
import { compileExpression, compileTemplate, compileValue } from '../../assets/js/domain/expression_eval.mjs';
import type { VisualizationCoord, VisualizationExpr, VisualizationSpec } from '../app/types';
export type { VisualizationSpec } from '../app/types';

type Expr = VisualizationExpr;
type Coord = VisualizationCoord;

interface JxgSlider { Value: () => number }
interface JxgCurve { dataX: number[]; dataY: number[]; updateDataArray: () => void }
interface JxgBoard { create: (kind: string, parents: unknown[], attributes?: Record<string, unknown>) => unknown; update: () => void }
declare global {
  interface Window {
    JXG?: { JSXGraph: { initBoard: (id: string, options: Record<string, unknown>) => JxgBoard; freeBoard: (board: JxgBoard) => void } };
  }
}

let jsxGraphReady: Promise<boolean> | null = null;
export function ensureJsxGraph() {
  if (window.JXG) return Promise.resolve(true);
  if (jsxGraphReady) return jsxGraphReady;
  const styleUrl = new URL('vendor/jsxgraph/jsxgraph.css', document.baseURI).href;
  const scriptUrl = new URL('vendor/jsxgraph/jsxgraphcore.js', document.baseURI).href;
  if (!document.querySelector(`link[data-runtime="${styleUrl}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = styleUrl;
    link.dataset.runtime = styleUrl;
    document.head.appendChild(link);
  }
  jsxGraphReady = import(/* @vite-ignore */ scriptUrl).then(() => Boolean(window.JXG)).catch(() => false);
  return jsxGraphReady;
}

const PALETTE = ['#294bd6', '#16713a', '#9c4b00', '#b72f2a', '#5b5a53'];
const COLORS_BY_INDEX = (index: number) => PALETTE[index % PALETTE.length];

export function buildBoard(board: JxgBoard, spec: VisualizationSpec) {
  const [xmin, ymax, xmax, ymin] = spec.boundingbox;
  const width = xmax - xmin;
  const height = ymax - ymin;
  const sliders = spec.sliders || [];
  const names = sliders.map((slider) => slider.name);
  const handles: Record<string, JxgSlider> = {};
  sliders.forEach((slider, index) => {
    const y = ymax - height * (0.08 + 0.09 * index);
    handles[slider.name] = board.create(
      'slider',
      [[xmin + width * 0.08, y], [xmin + width * 0.34, y], [slider.range[0], slider.value, slider.range[1]]],
      { name: slider.label || slider.name, snapWidth: slider.step ?? 0.1, withTicks: false, strokeColor: '#171713', fillColor: '#d9ff45', highlightFillColor: '#d9ff45', baseline: { strokeColor: '#171713' }, label: { fontSize: 14 } },
    ) as JxgSlider;
  });
  const scope = () => Object.fromEntries(names.map((name) => {
    const handle = handles[name];
    if (!handle) throw new Error(`Slider ${name} fehlt`);
    return [name, handle.Value()];
  }));
  const coord = (value: Expr) => { const f = compileValue(value, names); return () => f(scope()); };
  const pair = ([x, y]: Coord): [() => number, () => number] => [coord(x), coord(y)];
  spec.objects.forEach((object, index) => {
    const color = ('color' in object && object.color) || COLORS_BY_INDEX(index);
    const filled = object.kind === 'point';
    const style = { strokeColor: color, fillColor: filled ? color : 'none', highlightStrokeColor: color, highlightFillColor: filled ? color : 'none', dash: 'dash' in object && object.dash ? 2 : 0, fixed: true };
    if (object.kind === 'functiongraph') {
      const f = compileExpression(object.expr, [...names, 'x']);
      const domain = object.domain ? pair(object.domain) : [() => xmin, () => xmax];
      // Parametric curve with JS functions: 'functiongraph' would route its x-term through JessieCode, which needs eval (blocked by the CSP).
      board.create('curve', [(x: number) => x, (x: number) => f({ ...scope(), x }), domain[0], domain[1]], { ...style, strokeWidth: 3, name: object.label || '', withLabel: Boolean(object.label) });
    } else if (object.kind === 'point') {
      board.create('point', pair(object.at), { ...style, size: 4, name: object.label || '', withLabel: Boolean(object.label), label: { fontSize: 14 } });
    } else if (object.kind === 'arrow' || object.kind === 'segment') {
      board.create(object.kind, [pair(object.from), pair(object.to)], { ...style, strokeWidth: 3, name: object.label || '', withLabel: Boolean(object.label), label: { fontSize: 14 } });
    } else if (object.kind === 'text') {
      const render = compileTemplate(object.text, names);
      const [x, y] = pair(object.at);
      board.create('text', [x, y, () => render(scope())], { strokeColor: color, fontSize: 15, fixed: true });
    } else if (object.kind === 'polygon') {
      board.create('polygon', object.points.map(pair), { fillColor: color, fillOpacity: 0.18, borders: { strokeColor: color, strokeWidth: 2 }, vertices: { visible: false }, fixed: true });
    } else if (object.kind === 'curve') {
      const points = object.points.map(pair);
      const curve = board.create('curve', [[], []], { ...style, strokeWidth: 3 }) as JxgCurve;
      curve.updateDataArray = () => {
        curve.dataX = points.map(([x]) => x());
        curve.dataY = points.map(([, y]) => y());
      };
    }
  });
  board.update();
}

export function VisualizationBlock({ id, spec }: { id: string; spec: VisualizationSpec }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const boardRef = useRef<JxgBoard | null>(null);
  const domId = `viz-${id}`;
  useEffect(() => {
    let active = true;
    void ensureJsxGraph().then((ready) => {
      if (!active || !ready || !window.JXG) { if (active) setStatus('error'); return; }
      try {
        const board = window.JXG.JSXGraph.initBoard(domId, { boundingbox: spec.boundingbox, axis: spec.axis ?? true, keepaspectratio: spec.keepAspectRatio ?? false, showNavigation: false, showCopyright: false, pan: { enabled: false }, zoom: { enabled: false } });
        buildBoard(board, spec);
        boardRef.current = board;
        setStatus('ready');
      } catch { setStatus('error'); }
    });
    return () => {
      active = false;
      if (boardRef.current && window.JXG) window.JXG.JSXGraph.freeBoard(boardRef.current);
      boardRef.current = null;
    };
  }, [domId, spec]);
  return (
    <figure class="visualization-block">
      <figcaption><strong>{spec.title}</strong> {spec.caption}</figcaption>
      <div id={domId} class="jxgbox viz-board" aria-label={spec.title} />
      {status === 'loading' ? <p role="status">Visualisierung wird geladen.</p> : null}
      {status === 'error' ? <p role="alert">Die lokale JSXGraph-Runtime konnte nicht geladen werden.</p> : null}
    </figure>
  );
}
