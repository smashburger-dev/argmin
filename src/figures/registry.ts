/**
 * Scene registry for the renderer: scene id -> lazy import of the pure scene
 * module. Keep it tiny — compile_content validates scene ids against the
 * pure registry in assets/js/figures/scenes/index.mjs, this map only says
 * how the browser gets the module.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SCENE_IMPORTS: Record<string, () => Promise<any>> = {
  'early-stopping-flag': () => import('../../assets/js/figures/scenes/early-stopping-flag.mjs'),
  'mse-landscape': () => import('../../assets/js/figures/scenes/mse-landscape.mjs'),
  'mse-section': () => import('../../assets/js/figures/scenes/mse-section.mjs'),
  'receipt-echelon-3x3': () => import('../../assets/js/figures/scenes/receipt-echelon-3x3.mjs'),
  'receipt-elimination': () => import('../../assets/js/figures/scenes/receipt-elimination.mjs'),
  'residual-springs': () => import('../../assets/js/figures/scenes/residual-springs.mjs'),
  'rubber-band-coefficients': () => import('../../assets/js/figures/scenes/rubber-band-coefficients.mjs'),
  'smoothie-column-picture': () => import('../../assets/js/figures/scenes/smoothie.mjs'),
  'smoothie-row-and-column': () => import('../../assets/js/figures/scenes/smoothie-row-and-column.mjs'),
  'solution-cases-3d': () => import('../../assets/js/figures/scenes/solution-cases-3d.mjs'),
  'span-carpet': () => import('../../assets/js/figures/scenes/span-carpet.mjs'),
  'training-book': () => import('../../assets/js/figures/scenes/training-book.mjs'),
};
