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

const FLAT_KEYS = 'Pfeiltasten links/rechts: Schritt. Leertaste: wiederholen.';
const STAGE_KEYS =
  'Pfeiltasten links/rechts: Schritt. Leertaste: wiederholen. Umschalt+Pfeile: drehen. Pfeile hoch/runter: neigen. Pos1: Ansicht zurücksetzen.';

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
    describe: (m: any, _index: number, _mode: string, partId?: string) => scene.describe(m, index, 'lesson', partId),
  };
}

function restoredBeat(key: string, count: number, explicit?: number) {
  const saved = Number(figureSession(key) ?? 0);
  const index = explicit ?? saved;
  return Number.isInteger(index) ? Math.min(count - 1, Math.max(0, index)) : 0;
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

function StaticExplanation({ text, close }: { text: string | null; close: () => void }) {
  if (!text) return null;
  return <section class="figure-part-card" role="status"><p>{text}</p>
    <Button size="sm" variant="ghost" onClick={close}>Erklärung schließen</Button>
  </section>;
}

function stageInstructions(kind: string, spatial: boolean): string {
  const keys = spatial ? STAGE_KEYS : FLAT_KEYS;
  return kind === 'static' ? `Teile antippen oder Eingabetaste: Erklärung öffnen. ${keys}` : keys;
}

interface StepPanelProps {
  scene: any;
  model: any;
  spec: FigureSpec;
  beat: number;
  predictDone: boolean;
  mode: 'lesson' | 'hint';
  still: boolean;
  beatIds: string[];
  readoutRef: preact.RefObject<HTMLParagraphElement>;
  actions: { previous: () => void; next: () => void; restart: () => void; skip: () => void; graded: (result: { ok: boolean }) => void };
}

function FigureQuestion({ checkpoint, active, done, actions }: { checkpoint: VizCheckpoint; active: boolean; done: boolean; actions: StepPanelProps['actions'] }) {
  return (
    <div class="figure-predict" hidden={!active}>
      <VizCheckpointPanel checkpoint={checkpoint} onGraded={actions.graded} />
      {done ? null : <Button size="sm" variant="ghost" class="figure-skip" onClick={actions.skip}>Überspringen</Button>}
    </div>
  );
}

function FigureStepPanel({ scene, model, spec, beat, predictDone, mode, still, beatIds, readoutRef, actions }: StepPanelProps) {
  const nBeats = beatIds.length;
  const atPredict = spec.predict?.beat === beatIds[beat];
  const gatePredict = atPredict && !predictDone;
  const predictCheckpoint = mode === 'hint' ? null : predictCheckpointOf(spec);
  return (
      <div class="figure-step-body">
        <p class="figure-beat-caption"><MathMarkup html={spec.beats[beat]?.caption ?? ''} inline /></p>
        <p class="figure-readout" aria-hidden="true" ref={readoutRef} />
        <span class="visually-hidden" aria-live="polite">{scene.describe(model, beat, mode)}</span>
        {predictCheckpoint ? <FigureQuestion checkpoint={predictCheckpoint} active={atPredict} done={predictDone} actions={actions} /> : null}
        {!still ? <div class="figure-controls" role="group" aria-label="Schritte">
          <Button size="sm" variant="ghost" disabled={beat === 0} onClick={actions.previous}>Zurück</Button>
          <span class="figure-step" aria-label={`Schritt ${beat + 1} von ${nBeats}`}>{beat + 1} / {nBeats}</span>
          <Button size="sm" variant="primary" class="figure-next" disabled={gatePredict}
            onClick={beat >= nBeats - 1 ? actions.restart : actions.next}>
            {beat >= nBeats - 1 ? 'Von vorn' : 'Weiter'}
          </Button>
        </div> : null}
      </div>
  );
}

export default function FigureRuntime({ scene, spec, style, initialBeat, onPredictDone }: Props) {
  const { mode, still, storageKey, kind } = figureOptions(spec);
  const runtimeScene = useMemo(() => sceneForSpec(scene, spec, still), [scene, spec, still]);
  const model = useMemo(() => scene.model(spec.params, { mode }), [scene, spec, mode]);
  const beatIds = sceneBeatIds(runtimeScene, mode);
  const startBeat = restoredBeat(storageKey, beatIds.length, initialBeat);
  const [beat, setBeat] = useState(startBeat);
  const [predictDone, setPredictDone] = useState(false);
  const [calm, setCalm] = useState(figureSession('calm') === '1');
  const [partText, setPartText] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const haloRef = useRef<SVGEllipseElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const engineRef = useRef<FigureEngine | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const styleId = resolveFigureStyle(style);
  const spatial = runtimeScene.viewMode !== 'flat';

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
    if (kind === 'static' && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      setPartText(runtimeScene.describe(model, beat, mode));
      return;
    }
    const action = stageKeyAction(event.key, event.shiftKey);
    const eng = engineRef.current;
    if (!action || !eng) return;
    if (!spatial && ['rotL', 'rotR', 'tiltUp', 'tiltDown', 'reset'].includes(action)) return;
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
    if (!spatial || !event.isPrimary || event.button !== 0) return;
    if (event.pointerType === 'mouse') event.preventDefault();
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
    event.preventDefault();
    eng.dragDelta(event.clientX - d.lastX);
    d.lastX = event.clientX;
  };

  const onPointerEnd = (event: PointerEvent) => {
    const d = dragRef.current;
    if (!d || event.pointerId !== d.id) return;
    dragRef.current = null;
    if (stageRef.current?.hasPointerCapture(event.pointerId)) stageRef.current.releasePointerCapture(event.pointerId);
    if (engineRef.current) engineRef.current.dragging = false;
  };

  const inspectPart = (event: MouseEvent) => {
    if (kind !== 'static') return;
    const item = (event.target as Element).closest('[data-item]')?.getAttribute('data-item');
    if (item) setPartText(runtimeScene.describe(model, beat, mode, item));
  };

  return (
    <div class="figure-runtime" data-style={styleId} data-kind={kind} data-view-mode={spatial ? 'spatial' : 'flat'}>
      {calm ? <p class="figure-calm" role="status">Vereinfachte Bewegung</p> : null}
      <div
        class="figure-stage"
        ref={stageRef}
        tabIndex={kind === 'inline' ? undefined : 0}
        role="group"
        aria-roledescription="Figur"
        aria-label={`${spec.title}. ${stageInstructions(kind, spatial)}`}
        onKeyDown={onKeyDown}
        onClick={inspectPart}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={(event) => {
          // Touch transfers implicit capture from the SVG child to the stage.
          if (event.target === event.currentTarget) onPointerEnd(event);
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        <svg ref={svgRef} role="img" aria-label={runtimeScene.describe(model, beat, mode)}>
          <ellipse ref={haloRef} />
        </svg>
      </div>
      <FigureStepPanel scene={runtimeScene} model={model} spec={spec} beat={beat} predictDone={predictDone}
        mode={mode} still={still} beatIds={beatIds} readoutRef={readoutRef}
        actions={{ previous: () => engine()?.prev(), next, restart: () => engine()?.restart(), skip: skipPredict, graded }} />
      <StaticExplanation text={partText} close={() => setPartText(null)} />
      <details class="figure-transcript">
        <summary>Ablauf als Text</summary>
        <ol>{beatIds.map((id, i) => <li key={id}>{runtimeScene.describe(model, i, mode)}</li>)}</ol>
      </details>
    </div>
  );
}
