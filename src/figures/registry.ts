/**
 * Scene registry for the renderer: scene id -> lazy import of the pure scene
 * module. Keep it tiny — compile_content validates scene ids against the
 * pure registry in assets/js/figures/scenes/index.mjs, this map only says
 * how the browser gets the module.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SCENE_IMPORTS: Record<string, () => Promise<any>> = {
  'bouncer': () => import('../../assets/js/figures/scenes/bouncer.mjs'),
  'ledger': () => import('../../assets/js/figures/scenes/ledger.mjs'),
  'name-tags': () => import('../../assets/js/figures/scenes/name-tags.mjs'),
  'receipt-echelon-3x3': () => import('../../assets/js/figures/scenes/receipt-echelon-3x3.mjs'),
  'receipt-elimination': () => import('../../assets/js/figures/scenes/receipt-elimination.mjs'),
  'smoke-detector': () => import('../../assets/js/figures/scenes/smoke-detector.mjs'),
  'smoothie-column-picture': () => import('../../assets/js/figures/scenes/smoothie.mjs'),
  'smoothie-row-and-column': () => import('../../assets/js/figures/scenes/smoothie-row-and-column.mjs'),
  'solution-cases-3d': () => import('../../assets/js/figures/scenes/solution-cases-3d.mjs'),
  'span-carpet': () => import('../../assets/js/figures/scenes/span-carpet.mjs'),
  'two-tags-one-list': () => import('../../assets/js/figures/scenes/two-tags-one-list.mjs'),
  'vending-frame': () => import('../../assets/js/figures/scenes/vending-frame.mjs'),
};
