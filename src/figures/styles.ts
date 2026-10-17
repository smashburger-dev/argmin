/**
 * Figure style registry: the four Werkbank looks Noa compares. Styles differ
 * ONLY by tokens and painter parameters, never by scene code — every style
 * paints the same items and the same paint order.
 */
export type FigureStyleId = 'a1' | 'a2' | 'a3' | 'a4';
export type FigureTechnique = 'tonal' | 'halftone' | 'hatch' | 'matte';

export interface FigureStyleDef {
  id: FigureStyleId;
  name: string;
  technique: FigureTechnique;
  /** Shade quantization steps (a tonal ramp or pattern density steps). */
  levels: number;
  /** Outline width in px; 0 means no outlines at all. */
  lineWidth: number;
  /** How far face fills mix toward the ink at shade 0 (solid styles). */
  strength: number;
}

export const FIGURE_STYLES: Record<FigureStyleId, FigureStyleDef> = {
  a1: { id: 'a1', name: 'Tonale Werkbank', technique: 'tonal', levels: 4, lineWidth: 0.6, strength: 0.5 },
  a2: { id: 'a2', name: 'Zweifarbdruck', technique: 'halftone', levels: 5, lineWidth: 0.75, strength: 1 },
  a3: { id: 'a3', name: 'Kupferstich', technique: 'hatch', levels: 4, lineWidth: 0.9, strength: 1 },
  a4: { id: 'a4', name: 'Matte Keramik', technique: 'matte', levels: 8, lineWidth: 0, strength: 0.45 },
};

export const FIGURE_STYLE_IDS = Object.keys(FIGURE_STYLES) as FigureStyleId[];
export const DEFAULT_FIGURE_STYLE: FigureStyleId = 'a2';

const isStyleId = (v: string | null): v is FigureStyleId => Boolean(v && v in FIGURE_STYLES);

/** Dev-only `?figstil=a1..a4` override, valid on any route. Tree-shaken out
 *  of release builds by the import.meta.env.DEV guard. */
export function figureStyleOverride(): FigureStyleId | null {
  if (!import.meta.env.DEV) return null;
  const raw = new URLSearchParams(window.location.search).get('figstil');
  return isStyleId(raw) ? raw : null;
}

/** Effective style: lab/prop override, then ?figstil, then the default. */
export function resolveFigureStyle(preferred?: string | null): FigureStyleId {
  if (isStyleId(preferred ?? null)) return preferred as FigureStyleId;
  return figureStyleOverride() ?? DEFAULT_FIGURE_STYLE;
}
