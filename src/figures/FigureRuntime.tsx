/**
 * Werkbank figure stage: the lazy chunk behind FigureBlock. Owns the
 * FigureEngine (rAF loop, camera springs, drag), the beat/view controls,
 * the predict gate and a11y plumbing. One engine per mount — it binds to
 * the real DOM once and then only writes changed attributes.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { MathMarkup } from '../ui/MathMarkup';
import { Button } from '../ui/Button';
import { VizCheckpointPanel } from '../ui/VisualizationBlock';
import { FigureEngine } from './engine';
import { grainTile, resolveTokens } from './painter';
import { FIGURE_STYLES, resolveFigureStyle } from './styles';
import type { FigureSpec, VizCheckpoint } from '../app/types';
import type { FigureStyleId } from './styles';
import './figures.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  scene: any;
  spec: FigureSpec;
  style?: FigureStyleId | null;
  initialBeat?: number;
  onPredictDone?: () => void;
}

interface DragState { id: number; x: number; y: number; lastX: number; active: boolean }

const STAGE_KEYS =
  'Pfeiltasten links/rechts: Schritt. Leertaste: wiederholen. Umschalt+Pfeile: drehen. Pfeile hoch/runter: neigen. Pos1: Ansicht zurücksetzen.';

/** 20px stroke icon in currentColor; icon-only buttons carry aria-label+title. */
function Icon({ children }: { children: preact.ComponentChildren }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const IconReplay = () => (
  <Icon>
    <path d="M19 11a8 8 0 1 1-8-8c2.24 0 4.38.89 5.99 2.44L19 7.5" />
    <path d="M19 2.5v4.9h-4.9" />
  </Icon>
);
const IconRestart = () => (
  <Icon>
    <path d="M5 4v12" />
    <path d="M16.5 4.5 8.5 10l8 5.5z" fill="currentColor" stroke="none" />
  </Icon>
);
const IconRotL = () => (
  <Icon>
    <path d="M2.5 3v4.9h4.9" />
    <path d="M2.5 7.9a8 8 0 1 0 3.8-2.6L2.5 7.9" />
  </Icon>
);
const IconRotR = () => (
  <Icon>
    <path d="M17.5 3v4.9h-4.9" />
    <path d="M17.5 7.9a8 8 0 1 1-3.8-2.6L17.5 7.9" />
  </Icon>
);
const IconUp = () => (<Icon><path d="M4 13.5 10 6l6 7.5" /></Icon>);
const IconDown = () => (<Icon><path d="M4 6.5 10 14l6-7.5" /></Icon>);
const IconHome = () => (<Icon><path d="M3.5 9.5 10 4l6.5 5.5V16h-13z" /></Icon>);

function stageKeyAction(key: string, shift: boolean): string | null {
  if (key === 'ArrowLeft') return shift ? 'rotL' : 'prev';
  if (key === 'ArrowRight') return shift ? 'rotR' : 'next';
  if (key === ' ') return 'replay';
  if (key === 'ArrowUp') return 'tiltUp';
  if (key === 'ArrowDown') return 'tiltDown';
  if (key === 'Home') return 'reset';
  return null;
}

function predictCheckpointOf(spec: FigureSpec): VizCheckpoint | null {
  if (!spec.predict) return null;
  const { prompt, input, expected, tolerance, hints, typicalErrors } = spec.predict;
  return { prompt, input, expected, tolerance, hints, typicalErrors };
}

function stageBackground(style: FigureStyleId | undefined, dark: boolean): string | undefined {
  if (!style) return undefined;
  const tech = FIGURE_STYLES[style].technique;
  const paper = resolveTokens(style).paper;
  if (tech === 'halftone' || tech === 'hatch') {
    return `${paper} url("${grainTile(dark)}")`;
  }
  return paper;
}

export default function FigureRuntime({ scene, spec, style, initialBeat, onPredictDone }: Props) {
  const model = useMemo(() => scene.model(spec.params), [scene, spec]);
  const [beat, setBeat] = useState(initialBeat ?? 0);
  const [predictDone, setPredictDone] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const haloRef = useRef<SVGEllipseElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const engineRef = useRef<FigureEngine | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const styleId = resolveFigureStyle(style);
  const nBeats = scene.beatIds.length;

  useEffect(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    const readout = readoutRef.current;
    if (!stage || !svg || !haloRef.current || !readout) return undefined;
    const rect = stage.getBoundingClientRect();
    const engine = new FigureEngine({
      svg, halo: haloRef.current, readout, scene, model,
      style: styleId,
      stage,
      viewport: { width: Math.max(rect.width, 200), height: Math.max(rect.height, 160) },
      initialBeat: initialBeat ?? 0,
      onBeat: setBeat,
    });
    engineRef.current = engine;
    const setSize = () => {
      const r = stage.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${Math.max(r.width, 1)} ${Math.max(r.height, 1)}`);
      engine.setViewport({ width: r.width, height: r.height });
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(stage);
    const io = new IntersectionObserver(
      (entries) => engine.setVisible(entries[entries.length - 1]!.isIntersecting),
      { rootMargin: '120px 0px' },
    );
    io.observe(stage);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    engine.setReducedMotion(media.matches);
    const onMedia = () => engine.setReducedMotion(media.matches);
    media.addEventListener?.('change', onMedia);
    const applyBg = () => {
      stage.style.background = stageBackground(styleId, document.documentElement.dataset.theme === 'dark') ?? '';
    };
    applyBg();
    const mo = new MutationObserver(() => { applyBg(); engine.themeChanged(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      engine.dispose();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      media.removeEventListener?.('change', onMedia);
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, model, styleId, initialBeat]);

  const beatId = scene.beatIds[beat] as string;
  const atPredict = spec.predict?.beat === beatId;
  const gatePredict = atPredict && !predictDone;
  const engine = () => engineRef.current;

  const next = () => { if (!gatePredict) engine()?.next(); };
  const skipPredict = () => { setPredictDone(true); onPredictDone?.(); };
  // A parseable answer — right or wrong — unlocks Weiter; unparseable input
  // (grader ok:false) is a typo prompt, not an answer, and keeps the gate.
  const graded = (result: { ok: boolean }) => {
    if (!result.ok) return;
    setPredictDone(true);
    onPredictDone?.();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const action = stageKeyAction(event.key, event.shiftKey);
    const eng = engineRef.current;
    if (!action || !eng) return;
    event.preventDefault();
    const run: Record<string, () => void> = {
      prev: () => eng.prev(), next, replay: () => eng.replay(),
      rotL: () => eng.nudge(-15, 0), rotR: () => eng.nudge(15, 0),
      tiltUp: () => eng.nudge(0, 5), tiltDown: () => eng.nudge(0, -5),
      reset: () => eng.resetView(),
    };
    run[action]?.();
  };

  const onPointerDown = (event: PointerEvent) => {
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, active: false };
  };

  const onPointerMove = (event: PointerEvent) => {
    const d = dragRef.current;
    const eng = engineRef.current;
    if (!d || !eng || event.pointerId !== d.id) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dx) <= 6 || Math.abs(dx) <= Math.abs(dy)) return;
      d.active = true;
      eng.dragging = true;
      stageRef.current?.setPointerCapture(event.pointerId);
    }
    eng.dragDelta(event.clientX - d.lastX);
    d.lastX = event.clientX;
  };

  const onPointerEnd = (event: PointerEvent) => {
    const d = dragRef.current;
    if (!d || event.pointerId !== d.id) return;
    dragRef.current = null;
    if (engineRef.current) engineRef.current.dragging = false;
  };

  const predictCheckpoint = predictCheckpointOf(spec);

  return (
    <div class="figure-runtime" data-style={styleId}>
      <div
        class="figure-stage"
        ref={stageRef}
        tabIndex={0}
        role="group"
        aria-roledescription="Figur"
        aria-label={`${spec.title}. ${STAGE_KEYS}`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <svg ref={svgRef} role="img" aria-label={scene.describe(model, beat, 'lesson')}>
          <ellipse ref={haloRef} />
        </svg>
      </div>
      <p class="figure-beat-caption"><MathMarkup html={spec.beats[beat]?.caption ?? ''} inline /></p>
      <p class="figure-readout" aria-hidden="true" ref={readoutRef} />
      <span class="visually-hidden" aria-live="polite">{scene.describe(model, beat, 'lesson')}</span>
      <div class="figure-controls" role="group" aria-label="Schritte">
        <Button size="sm" disabled={beat === 0} onClick={() => engine()?.prev()}>Zurück</Button>
        <span class="figure-step" aria-live="off">{beat + 1} / {nBeats}</span>
        <Button size="sm" variant="primary" disabled={beat >= nBeats - 1 || gatePredict} onClick={next}>Weiter</Button>
        <button class="figure-icon-btn" type="button" aria-label="Nochmal" title="Nochmal" onClick={() => engine()?.replay()}><IconReplay /></button>
        <button class="figure-icon-btn" type="button" aria-label="Von vorn" title="Von vorn" onClick={() => engine()?.restart()}><IconRestart /></button>
      </div>
      <div class="figure-controls figure-controls-view" role="group" aria-label="Ansicht">
        <button class="figure-icon-btn" type="button" aria-label="Nach links drehen" title="Nach links drehen" onClick={() => engine()?.nudge(-15, 0)}><IconRotL /></button>
        <button class="figure-icon-btn" type="button" aria-label="Nach rechts drehen" title="Nach rechts drehen" onClick={() => engine()?.nudge(15, 0)}><IconRotR /></button>
        <button class="figure-icon-btn" type="button" aria-label="Steiler" title="Steiler" onClick={() => engine()?.nudge(0, 5)}><IconUp /></button>
        <button class="figure-icon-btn" type="button" aria-label="Flacher" title="Flacher" onClick={() => engine()?.nudge(0, -5)}><IconDown /></button>
        <button class="figure-icon-btn" type="button" aria-label="Ansicht zurücksetzen" title="Ansicht zurücksetzen" onClick={() => engine()?.resetView()}><IconHome /></button>
      </div>
      {atPredict && predictCheckpoint ? (
        <div class="figure-predict">
          <VizCheckpointPanel checkpoint={predictCheckpoint} onGraded={graded} />
          {predictDone ? null : <Button size="sm" variant="ghost" onClick={skipPredict}>Überspringen</Button>}
        </div>
      ) : null}
    </div>
  );
}
