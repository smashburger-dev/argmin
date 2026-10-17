/**
 * Figure style registry. Noa picked A1 "Tonale Werkbank"; the registry shape
 * stays so a second style can return without touching painter or runtime.
 */
export type FigureStyleId = 'a1';
export type FigureTechnique = 'tonal';

export interface FigureStyleDef {
  id: FigureStyleId;
  name: string;
  technique: FigureTechnique;
  /** Shade quantization steps on the tonal ramp. */
  levels: number;
  /** Outline width in px; 0 means no outlines at all. */
  lineWidth: number;
  /** How far face fills mix toward the ink at shade 0. */
  strength: number;
}

export const FIGURE_STYLES: Record<FigureStyleId, FigureStyleDef> = {
  a1: { id: 'a1', name: 'Tonale Werkbank', technique: 'tonal', levels: 4, lineWidth: 0.6, strength: 0.5 },
};

export const FIGURE_STYLE_IDS = Object.keys(FIGURE_STYLES) as FigureStyleId[];
export const DEFAULT_FIGURE_STYLE: FigureStyleId = 'a1';

/** Effective style: a valid explicit choice wins, else the single default. */
export function resolveFigureStyle(preferred?: string | null): FigureStyleId {
  return preferred && preferred in FIGURE_STYLES ? (preferred as FigureStyleId) : DEFAULT_FIGURE_STYLE;
}
