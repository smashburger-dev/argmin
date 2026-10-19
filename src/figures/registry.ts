/**
 * Scene registry for the renderer: scene id -> lazy import of the pure scene
 * module. Keep it tiny — compile_content validates scene ids against the
 * pure registry in assets/js/figures/scenes/index.mjs, this map only says
 * how the browser gets the module.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SCENE_IMPORTS: Record<string, () => Promise<any>> = {
  'bag-unpack': () => import('../../assets/js/figures/scenes/bag-unpack.mjs'),
  'balance-isolate': () => import('../../assets/js/figures/scenes/balance-isolate.mjs'),
  'balance-solve': () => import('../../assets/js/figures/scenes/balance-solve.mjs'),
  'bouncer': () => import('../../assets/js/figures/scenes/bouncer.mjs'),
  'distribution-points': () => import('../../assets/js/figures/scenes/distribution-points.mjs'),
  'early-stopping-flag': () => import('../../assets/js/figures/scenes/early-stopping-flag.mjs'),
  'ledger': () => import('../../assets/js/figures/scenes/ledger.mjs'),
  'missing-high-sales': () => import('../../assets/js/figures/scenes/missing-high-sales.mjs'),
  'mix-to-target': () => import('../../assets/js/figures/scenes/mix-to-target.mjs'),
  'mse-landscape': () => import('../../assets/js/figures/scenes/mse-landscape.mjs'),
  'mse-section': () => import('../../assets/js/figures/scenes/mse-section.mjs'),
  'name-tags': () => import('../../assets/js/figures/scenes/name-tags.mjs'),
  'power-stack': () => import('../../assets/js/figures/scenes/power-stack.mjs'),
  'receipt-echelon-3x3': () => import('../../assets/js/figures/scenes/receipt-echelon-3x3.mjs'),
  'receipt-elimination': () => import('../../assets/js/figures/scenes/receipt-elimination.mjs'),
  'residual-springs': () => import('../../assets/js/figures/scenes/residual-springs.mjs'),
  'rubber-band-coefficients': () => import('../../assets/js/figures/scenes/rubber-band-coefficients.mjs'),
  'seed-ribbon': () => import('../../assets/js/figures/scenes/seed-ribbon.mjs'),
  'smoke-detector': () => import('../../assets/js/figures/scenes/smoke-detector.mjs'),
  'smoothie-column-picture': () => import('../../assets/js/figures/scenes/smoothie.mjs'),
  'smoothie-row-and-column': () => import('../../assets/js/figures/scenes/smoothie-row-and-column.mjs'),
  'solution-cases-3d': () => import('../../assets/js/figures/scenes/solution-cases-3d.mjs'),
  'span-carpet': () => import('../../assets/js/figures/scenes/span-carpet.mjs'),
  'subgroup-river': () => import('../../assets/js/figures/scenes/subgroup-river.mjs'),
  'training-book': () => import('../../assets/js/figures/scenes/training-book.mjs'),
  'tree-vote-field': () => import('../../assets/js/figures/scenes/tree-vote-field.mjs'),
  'two-tags-one-list': () => import('../../assets/js/figures/scenes/two-tags-one-list.mjs'),
  'vending-frame': () => import('../../assets/js/figures/scenes/vending-frame.mjs'),
};
