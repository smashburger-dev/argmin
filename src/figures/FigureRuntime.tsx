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
import { resolveTokens } from './painter';
import { resolveFigureStyle } from './styles';
import type { FigureSpec, VizCheckpoint } from '../app/types';
import type { FigureStyleId } from './styles';
import './figures.css';
import { figureSession } from './session';

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
const IconDots = () => (
  <Icon>
    <circle cx="4.5" cy="10" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="10" cy="10" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="10" r="1.4" fill="currentColor" stroke="none" />
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

/** Stage background = the style's paper token (the card surface). */
function stageBackground(style: FigureStyleId): string {
  return resolveTokens(style).paper;
}

function sceneForSpec(scene: any, spec: FigureSpec, still: boolean) {
  if (!still) return scene;
  const index = scene.beatIds.indexOf(spec.beats[0]!.id);
  return { ...scene, beatIds: [spec.beats[0]!.id],
    pose: (m: any, _index: number, t: number) => scene.pose(m, index, t),
    describe: (m: any) => scene.describe(m, index, 'lesson'),
  };
}

function restoredBeat(key: string, count: number, explicit?: number) {
  const saved = Number(figureSession(key) ?? 0);
  const index = explicit ?? saved;
  return Number.isInteger(index) ? Math.min(count - 1, Math.max(0, index)) : 0;
}

function BeatCaption({ spec, beat, ids }: { spec: FigureSpec; beat: number; ids: string[] }) {
  if (spec.kind === 'inline') return null;
  return <p class="figure-beat-caption">
    <span><MathMarkup html={spec.beats[beat]?.caption ?? ''} inline /></span>
    <span class="figure-step">Schritt {beat + 1} von {ids.length}
      <span class="figure-dots" aria-hidden="true">{ids.map((id, i) =>
        <span key={id} class={`figure-dot${i === beat ? ' is-now' : i < beat ? ' is-done' : ''}`} />)}</span>
    </span>
  </p>;
}

function PredictPanel({ visible, checkpoint, done, graded, skip }: {
  visible: boolean; checkpoint: VizCheckpoint | null; done: boolean;
  graded: (result: { ok: boolean }) => void; skip: () => void;
}) {
  if (!visible || !checkpoint) return null;
  return <div class="figure-predict">
    <VizCheckpointPanel checkpoint={checkpoint} onGraded={graded} />
    {done ? null : <Button size="sm" variant="ghost" onClick={skip}>Überspringen</Button>}
  </div>;
}

function figureOptions(spec: FigureSpec) {
  return {
    mode: spec.kind === 'hint' ? 'hint' as const : 'lesson' as const,
    still: spec.kind === 'static' || spec.kind === 'inline',
    storageKey: `${spec.scene}:${spec.kind ?? 'beats'}:${JSON.stringify(spec.params)}`,
    kind: spec.kind ?? 'beats',
  };
}

function sceneBeatIds(scene: any, mode: string): string[] {
  return mode === 'hint' ? scene.hintBeatIds : scene.beatIds;
}

function NextBeatButton({ last, gated, next, restart }: { last: boolean; gated: boolean; next: () => void; restart: () => void }) {
  return <Button size="sm" variant="primary" class="figure-next" disabled={gated} onClick={last ? restart : next}>
    {last ? 'Von vorn' : 'Weiter'}
  </Button>;
}

export default function FigureRuntime({ scene, spec, style, initialBeat, onPredictDone }: Props) {
  const { mode, still, storageKey, kind } = figureOptions(spec);
  const runtimeScene = useMemo(() => sceneForSpec(scene, spec, still), [scene, spec, still]);
  const model = useMemo(() => scene.model(spec.params, { mode }), [scene, spec, mode]);
  const beatIds = sceneBeatIds(runtimeScene, mode);
  const startBeat = restoredBeat(storageKey, beatIds.length, initialBeat);
  const [beat, setBeat] = useState(startBeat);
  const [predictDone, setPredictDone] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewUsed, setViewUsed] = useState(figureSession('view-used') === '1');
  const [calm, setCalm] = useState(figureSession('calm') === '1');
  const markViewUsed = () => { figureSession('view-used', '1'); setViewUsed(true); };
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const haloRef = useRef<SVGEllipseElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const engineRef = useRef<FigureEngine | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const viewBtnRef = useRef<HTMLButtonElement>(null);
  const styleId = resolveFigureStyle(style);
  const nBeats = beatIds.length;

  useEffect(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    const readout = readoutRef.current;
    if (!stage || !svg || !haloRef.current || !readout) return undefined;
    const rect = stage.getBoundingClientRect();
    const engine = new FigureEngine({
      svg, halo: haloRef.current, readout, scene: runtimeScene, model, mode,
      style: styleId,
      stage,
      viewport: { width: Math.max(rect.width, 200), height: Math.max(rect.height, 160) },
      initialBeat: startBeat,
      onBeat: (index) => { setBeat(index); figureSession(storageKey, String(index)); },
      onCalm: () => setCalm(true),
      cuts: spec.beats.filter((b) => b.cameraTransition === 'cut').map((b) => b.id),
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
    const transcript = stage.parentElement?.querySelector<HTMLDetailsElement>('.figure-transcript');
    let transcriptWasOpen = false;
    const beforePrint = () => { transcriptWasOpen = Boolean(transcript?.open); if (transcript) transcript.open = true; engine.printState(true); };
    const afterPrint = () => { if (transcript) transcript.open = transcriptWasOpen; engine.printState(false); };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    const applyBg = () => {
      stage.style.background = stageBackground(styleId);
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
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeScene, model, styleId, initialBeat]);

  const beatId = beatIds[beat] as string;
  const atPredict = mode !== 'hint' && spec.predict?.beat === beatId;
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
      markViewUsed();
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
    <div class="figure-runtime" data-style={styleId} data-kind={kind}>
      {!viewUsed && !still ? <p class="figure-drag-hint">Ziehen dreht die Ansicht. Senkrechtes Wischen scrollt die Seite.</p> : null}
      {calm ? <p class="figure-calm" role="status">Vereinfachte Bewegung</p> : null}
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
        <svg ref={svgRef} role="img" aria-label={runtimeScene.describe(model, beat, mode)}>
          <ellipse ref={haloRef} />
        </svg>
      </div>
      <BeatCaption spec={spec} beat={beat} ids={beatIds} />
      <p class="figure-readout" aria-hidden="true" ref={readoutRef} />
      <span class="visually-hidden" aria-live="polite">{runtimeScene.describe(model, beat, mode)}</span>
      {viewOpen ? (
        <div
          class="figure-view-panel"
          role="group"
          aria-label="Ansicht"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            setViewOpen(false);
            viewBtnRef.current?.focus();
          }}
        >
          <button class="figure-icon-btn" type="button" aria-label="Nach links drehen" title="Nach links drehen" onClick={() => engine()?.nudge(-15, 0)}><IconRotL /></button>
          <button class="figure-icon-btn" type="button" aria-label="Nach rechts drehen" title="Nach rechts drehen" onClick={() => engine()?.nudge(15, 0)}><IconRotR /></button>
          <button class="figure-icon-btn" type="button" aria-label="Steiler" title="Steiler" onClick={() => engine()?.nudge(0, 5)}><IconUp /></button>
          <button class="figure-icon-btn" type="button" aria-label="Flacher" title="Flacher" onClick={() => engine()?.nudge(0, -5)}><IconDown /></button>
          <button class="figure-icon-btn" type="button" aria-label="Ansicht zurücksetzen" title="Ansicht zurücksetzen" onClick={() => engine()?.resetView()}><IconHome /></button>
        </div>
      ) : null}
      {!still ? <div class="figure-controls" role="group" aria-label="Schritte">
        <Button size="sm" disabled={beat === 0} onClick={() => engine()?.prev()}>Zurück</Button>
        <NextBeatButton last={beat >= nBeats - 1} gated={Boolean(gatePredict)} restart={() => engine()?.restart()} next={next} />
        <button class="figure-icon-btn" type="button" aria-label="Nochmal" title="Nochmal" onClick={() => engine()?.replay()}><IconReplay /></button>
        <button
          ref={viewBtnRef}
          class="figure-icon-btn"
          type="button"
          aria-label="Ansicht"
          title="Ansicht"
          aria-expanded={viewOpen}
          onClick={() => { markViewUsed(); setViewOpen((open) => !open); }}
        >
          <IconDots />
        </button>
      </div> : null}
      <PredictPanel visible={Boolean(atPredict)} checkpoint={predictCheckpoint} done={predictDone} graded={graded} skip={skipPredict} />
      <details class="figure-transcript">
        <summary>Ablauf als Text</summary>
        <ol>{beatIds.map((id, i) => <li key={id}>{runtimeScene.describe(model, i, mode)}</li>)}</ol>
      </details>
    </div>
  );
}
