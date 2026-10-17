/**
 * Per-figure runtime engine: one rAF loop, camera springs, user view
 * offsets, drag rotate, and the paint call. Everything visual goes through
 * the Painter; everything geometric through the pure kit/scene modules —
 * this class only owns timing and DOM plumbing.
 */
import { deg, project } from '../../assets/js/figures/kit/camera.mjs';
import { paintList } from '../../assets/js/figures/kit/depth.mjs';
import { clampDt, follow, settle } from '../../assets/js/figures/kit/motion.mjs';
import { Painter } from './painter';
import type { FigureStyleId } from './styles';
import { figureSession } from './session';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Scene = any;
type Camera = any;
type Viewport = { width: number; height: number };

interface Spring { x: number; v: number }
const spring = (x: number): Spring => ({ x, v: 0 });
const EL_MIN = 0;
const EL_MAX = deg(90);

declare global {
  interface Window {
    __argminFigurePerf?: Array<{ style: string; ms: number; build: number; sort: number; paint: number; faces: number }>
  }
}

export interface EngineOpts {
  svg: SVGSVGElement;
  halo: SVGEllipseElement;
  readout: HTMLElement;
  scene: Scene;
  model: any;
  style: FigureStyleId;
  viewport: Viewport;
  /** Stage element for test hooks: data-beat / data-azimuth / data-settled. */
  stage?: HTMLElement | null;
  initialBeat?: number;
  onBeat?: (index: number) => void;
  mode?: 'lesson' | 'hint';
  onCalm?: () => void;
  cuts?: string[];
}

export class FigureEngine {
  private svg: SVGSVGElement;
  private halo: SVGEllipseElement;
  private readout: HTMLElement;
  private scene: Scene;
  private model: any;
  private painter: Painter;
  private style: FigureStyleId;
  private vp: Viewport;
  beat = 0;
  private beatT = 0;
  private playing = false;
  private calm = false;
  private visible = true;
  private last = 0;
  private raf = 0;
  dragging = false;
  private cam = { az: spring(0), el: spring(0), zoom: spring(6), tx: spring(0), ty: spring(0), tz: spring(0) };
  private off = {
    az: { x: 0, target: 0 },
    el: { x: 0, target: 0 },
  };
  private onBeat: (index: number) => void;
  private stage: HTMLElement | null = null;
  private poseKey = '';
  private lastReadout = '';
  private poseCache: any = null;
  private builtPose: any = null;
  private builtItems: any[] | null = null;
  private targetKey = '';
  private targetCam: Camera | null = null;
  private mode: 'lesson' | 'hint';
  private slowFrames = 0;
  private adaptiveCalm = figureSession('calm') === '1';
  private onCalm: () => void;
  private cuts: string[];
  private fadeUntil = 0;
  private get ids(): string[] { return this.mode === 'hint' ? this.scene.hintBeatIds : this.scene.beatIds; }

  constructor(opts: EngineOpts) {
    this.svg = opts.svg;
    this.halo = opts.halo;
    this.readout = opts.readout;
    this.scene = opts.scene;
    this.mode = opts.mode ?? 'lesson';
    this.onCalm = opts.onCalm ?? (() => {});
    this.cuts = opts.cuts ?? [];
    this.calm = this.adaptiveCalm;
    this.model = opts.model;
    this.style = opts.style;
    this.vp = opts.viewport;
    this.stage = opts.stage ?? null;
    this.onBeat = opts.onBeat ?? (() => {});
    this.painter = new Painter(opts.svg, opts.style);
    this.beat = opts.initialBeat ?? 0;
    this.beatT = this.duration(this.beat);
    const items = this.buildItems(this.pose())!;
    this.painter.mount(items);
    this.snapCamera();
    this.paintNow(items);
    this.svg.setAttribute('aria-label', this.scene.describe(this.model, this.beat, this.mode));
    if (this.stage) {
      this.stage.dataset.beat = String(this.beat);
      this.stage.dataset.settled = 'true';
    }
  }

  private duration(b: number): number { return this.scene.beatDuration(this.ids[b]); }

  /** Pose memoized on (beat, beatT): a drag tick reuses the same object, so
   *  build() and the painter see identical items and can skip rebuilds. */
  private pose() {
    const key = `${this.beat}|${this.beatT}`;
    if (key !== this.poseKey) {
      this.poseKey = key;
      this.poseCache = this.scene.pose(this.model, this.beat, this.beatT, this.mode);
    }
    return this.poseCache;
  }

  /** Items are rebuilt only when the pose object changes; a static pose
   *  returns the identical array, keeping mesh identity stable for the
   *  painter's projection cache. */
  private buildItems(pose: any) {
    if (pose === this.builtPose && this.builtItems) return this.builtItems;
    this.builtPose = pose;
    this.builtItems = this.scene.build(this.model, pose, this.mode);
    return this.builtItems;
  }

  /** Target camera memoized on (pose.camera, viewport): fitZoom runs once
   *  per viewport instead of twice per tick (spring test + settle). */
  private targetFor(p: any): Camera {
    const key = `${p.camera}|${this.vp.width}x${this.vp.height}`;
    if (key !== this.targetKey) {
      this.targetKey = key;
      this.targetCam = this.scene.cameraFor(this.model, p, this.vp);
    }
    return this.targetCam!;
  }

  private cameraNow(): Camera {
    return {
      azimuth: this.cam.az.x + this.off.az.x,
      elevation: Math.min(EL_MAX, Math.max(EL_MIN, this.cam.el.x + this.off.el.x)),
      zoom: this.cam.zoom.x,
      target: [this.cam.tx.x, this.cam.ty.x, this.cam.tz.x],
    };
  }

  private snapCamera(): void {
    const c = this.targetFor(this.pose());
    this.cam = { az: spring(c.azimuth), el: spring(c.elevation), zoom: spring(c.zoom), tx: spring(c.target[0]), ty: spring(c.target[1]), tz: spring(c.target[2]) };
  }

  private paintNow(items?: any[], pose?: any): { build: number; sort: number; paint: number; faces: number } {
    const t0 = performance.now();
    const p = pose ?? this.pose();
    const list0 = items ?? this.buildItems(p)!;
    const t1 = performance.now();
    const cam = this.cameraNow();
    const entries = paintList(list0, cam);
    const t2 = performance.now();
    this.painter.paint(entries, cam, this.vp);
    this.paintHalo(cam);
    const text = this.scene.readout(this.model, p, this.mode);
    if (text !== this.lastReadout) { this.lastReadout = text; this.readout.textContent = text; }
    const t3 = performance.now();
    if (this.stage) this.stage.dataset.azimuth = ((cam.azimuth * 180) / Math.PI).toFixed(1);
    let faces = 0;
    for (const e of entries) if (e.face) faces += 1;
    return { build: t1 - t0, sort: t2 - t1, paint: t3 - t2, faces };
  }

  /** Soft contact halo under the cabinet: the scene's ground() footprint. */
  private paintHalo(cam: Camera): void {
    const g = typeof this.scene.ground === 'function' ? this.scene.ground(this.model) : null;
    if (!g) { this.halo.setAttribute('display', 'none'); return; }
    const [cx, cy] = g.center;
    const [w, d] = g.size;
    const pts = [
      project(cam, this.vp, [cx - w / 2, cy - d / 2, 0]),
      project(cam, this.vp, [cx + w / 2, cy - d / 2, 0]),
      project(cam, this.vp, [cx + w / 2, cy + d / 2, 0]),
      project(cam, this.vp, [cx - w / 2, cy + d / 2, 0]),
    ];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    this.halo.setAttribute('cx', ((Math.min(...xs) + Math.max(...xs)) / 2).toFixed(1));
    this.halo.setAttribute('cy', ((Math.min(...ys) + Math.max(...ys)) / 2).toFixed(1));
    this.halo.setAttribute('rx', (((Math.max(...xs) - Math.min(...xs)) / 2) * 1.05).toFixed(1));
    this.halo.setAttribute('ry', (((Math.max(...ys) - Math.min(...ys)) / 2) * 1.05).toFixed(1));
    this.painter.paintHalo(this.halo);
  }

  private springsMoving(): boolean {
    const t = this.targetFor(this.pose());
    const d = (s: Spring, target: number) => Math.abs(s.x - target) > 1e-4 || Math.abs(s.v) > 1e-4;
    if (d(this.cam.az, t.azimuth) || d(this.cam.zoom, t.zoom)) return true;
    if (d(this.cam.el, t.elevation) || d(this.cam.tx, t.target[0])) return true;
    return d(this.cam.ty, t.target[1]) || d(this.cam.tz, t.target[2]);
  }

  private offsetsMoving(): boolean {
    return Math.abs(this.off.az.x - this.off.az.target) > 1e-4
      || Math.abs(this.off.el.x - this.off.el.target) > 1e-4;
  }

  private needsFrame(): boolean {
    return this.playing || this.dragging || this.springsMoving() || this.offsetsMoving() || this.fadeUntil > performance.now();
  }

  private schedule(): void {
    if (this.raf || !this.visible || !this.needsFrame()) {
      if (!this.raf && this.stage) this.stage.dataset.settled = 'true';
      return;
    }
    if (this.stage) this.stage.dataset.settled = 'false';
    this.raf = requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number): void {
    this.raf = 0;
    const t0 = performance.now();
    const dt = clampDt(now, this.last || now - 16);
    this.last = now;
    this.observeFrame(dt);
    if (this.fadeUntil) {
      this.svg.style.opacity = String(Math.min(1, Math.max(0, 1 - (this.fadeUntil - now) / 150)));
      if (now >= this.fadeUntil) this.fadeUntil = 0;
    }
    if (this.playing) {
      this.beatT = Math.min(this.beatT + dt, this.duration(this.beat));
      if (this.beatT >= this.duration(this.beat)) this.playing = false;
    }
    const pose = this.pose();
    const target = this.targetFor(pose);
    const cam = this.cam;
    settle(cam.az, target.azimuth, dt, 0.32, this.calm);
    settle(cam.el, target.elevation, dt, 0.32, this.calm);
    settle(cam.zoom, target.zoom, dt, 0.32, this.calm);
    settle(cam.tx, target.target[0], dt, 0.32, this.calm);
    settle(cam.ty, target.target[1], dt, 0.32, this.calm);
    settle(cam.tz, target.target[2], dt, 0.32, this.calm);
    this.off.az.x = follow(this.off.az.x, this.off.az.target, dt, 0.12, this.calm);
    this.off.el.x = follow(this.off.el.x, this.off.el.target, dt, 0.12, this.calm);
    const phases = this.paintNow(undefined, pose);
    if (Array.isArray(window.__argminFigurePerf)) {
      window.__argminFigurePerf.push({ style: this.style, ms: performance.now() - t0, ...phases });
    }
    this.schedule();
  }

  private notify(): void { this.onBeat(this.beat); }

  private observeFrame(dt: number): void {
    // The opt-in benchmark measures full motion, before the adaptive fallback.
    if (Array.isArray(window.__argminFigurePerf)) return;
    this.slowFrames = dt > 0.024 ? this.slowFrames + 1 : 0;
    if (this.slowFrames < 30 || this.adaptiveCalm) return;
    this.adaptiveCalm = true;
    figureSession('calm', '1');
    this.setReducedMotion(true);
    this.onCalm();
  }

  private go(index: number, animate: boolean): void {
    const previousCamera = this.pose().camera;
    this.beat = index;
    this.beatT = animate && !this.calm ? 0 : this.duration(index);
    this.playing = animate && !this.calm;
    if (this.ids[index] === 'board') { this.off.az.target = 0; this.off.el.target = 0; }
    this.transitionCamera(previousCamera, animate);
    // describe() is written only on a beat change, not per frame.
    this.svg.setAttribute('aria-label', this.scene.describe(this.model, index, this.mode));
    if (this.stage) {
      this.stage.dataset.beat = String(index);
      this.stage.dataset.settled = 'false';
    }
    this.notify();
    if (this.playing) this.schedule();
    else { this.paintNow(); this.schedule(); }
  }

  private transitionCamera(previous: string, animate: boolean): void {
    const cameraChanged = previous !== this.pose().camera;
    if (this.cuts.includes(this.ids[this.beat]!) || (this.calm && cameraChanged)) {
      this.beatT = this.duration(this.beat);
      this.playing = false;
      this.snapCamera();
      this.fadeUntil = performance.now() + 150;
      this.svg.style.opacity = '0';
    } else if (!animate) this.snapCamera();
  }

  next(): void {
    if (this.beat < this.ids.length - 1) this.go(this.beat + 1, true);
  }

  prev(): void { if (this.beat > 0) this.go(this.beat - 1, false); }
  replay(): void { this.go(this.beat, true); }
  restart(): void { this.go(0, false); }

  /** Buttons: rotate ±deg and tilt ±deg around the target camera. */
  nudge(dAzimuthDeg: number, dElevationDeg: number): void {
    this.off.az.target += deg(dAzimuthDeg);
    this.off.el.target += deg(dElevationDeg);
    this.schedule();
  }

  resetView(): void {
    this.off.az.target = 0;
    this.off.el.target = 0;
    this.schedule();
  }

  dragDelta(dxPx: number): void {
    this.off.az.target += dxPx * deg(0.45);
    this.schedule();
  }

  setViewport(vp: Viewport): void {
    const same = Math.abs(vp.width - this.vp.width) < 1 && Math.abs(vp.height - this.vp.height) < 1;
    if (same) return;
    this.vp = vp;
    this.snapCamera();
    this.paintNow();
  }

  setReducedMotion(calm: boolean): void {
    calm = calm || this.adaptiveCalm;
    if (calm === this.calm) return;
    this.calm = calm;
    if (calm) { this.beatT = this.duration(this.beat); this.playing = false; this.snapCamera(); }
    this.paintNow();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (!visible) return;
    this.last = 0;
    if (this.fadeUntil && this.fadeUntil <= performance.now()) {
      this.fadeUntil = 0;
      this.svg.style.opacity = '1';
    }
    this.schedule();
  }

  themeChanged(): void {
    this.painter.restyle();
    this.paintNow();
  }

  printState(last: boolean): void {
    if (last) { this.printBeat = this.beat; this.go(this.ids.length - 1, false); }
    else this.go(this.printBeat, false);
    this.fadeUntil = 0;
    this.svg.style.opacity = '1';
  }
  private printBeat = 0;

  dispose(): void { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
}
