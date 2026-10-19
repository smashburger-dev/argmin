/**
 * Scene registry for the renderer: scene id -> lazy import of the pure scene
 * module. Keep it tiny — compile_content validates scene ids against the
 * pure registry in assets/js/figures/scenes/index.mjs, this map only says
 * how the browser gets the module.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SCENE_IMPORTS: Record<string, () => Promise<any>> = {
  'backprop-network': () => import('../../assets/js/figures/scenes/backprop-network.mjs'),
  'bag-unpack': () => import('../../assets/js/figures/scenes/bag-unpack.mjs'),
  'balance-isolate': () => import('../../assets/js/figures/scenes/balance-isolate.mjs'),
  'balance-solve': () => import('../../assets/js/figures/scenes/balance-solve.mjs'),
  'bouncer': () => import('../../assets/js/figures/scenes/bouncer.mjs'),
  'bpe-letterpress': () => import('../../assets/js/figures/scenes/bpe-letterpress.mjs'),
  'chunk-windows': () => import('../../assets/js/figures/scenes/chunk-windows.mjs'),
  'early-stopping-flag': () => import('../../assets/js/figures/scenes/early-stopping-flag.mjs'),
  'evidence-cards': () => import('../../assets/js/figures/scenes/evidence-cards.mjs'),
  'freeze-order': () => import('../../assets/js/figures/scenes/freeze-order.mjs'),
  'git-snapshots': () => import('../../assets/js/figures/scenes/git-snapshots.mjs'),
  'ledger': () => import('../../assets/js/figures/scenes/ledger.mjs'),
  'mix-to-target': () => import('../../assets/js/figures/scenes/mix-to-target.mjs'),
  'mse-landscape': () => import('../../assets/js/figures/scenes/mse-landscape.mjs'),
  'mse-section': () => import('../../assets/js/figures/scenes/mse-section.mjs'),
  'name-tags': () => import('../../assets/js/figures/scenes/name-tags.mjs'),
  'power-stack': () => import('../../assets/js/figures/scenes/power-stack.mjs'),
  'receipt-echelon-3x3': () => import('../../assets/js/figures/scenes/receipt-echelon-3x3.mjs'),
  'receipt-elimination': () => import('../../assets/js/figures/scenes/receipt-elimination.mjs'),
  'residual-springs': () => import('../../assets/js/figures/scenes/residual-springs.mjs'),
  'retrieval-handoffs': () => import('../../assets/js/figures/scenes/retrieval-handoffs.mjs'),
  'rubber-band-coefficients': () => import('../../assets/js/figures/scenes/rubber-band-coefficients.mjs'),
  'sha256-seal': () => import('../../assets/js/figures/scenes/sha256-seal.mjs'),
  'smoke-detector': () => import('../../assets/js/figures/scenes/smoke-detector.mjs'),
  'smoothie-column-picture': () => import('../../assets/js/figures/scenes/smoothie.mjs'),
  'smoothie-row-and-column': () => import('../../assets/js/figures/scenes/smoothie-row-and-column.mjs'),
  'solution-cases-3d': () => import('../../assets/js/figures/scenes/solution-cases-3d.mjs'),
  'span-carpet': () => import('../../assets/js/figures/scenes/span-carpet.mjs'),
  'training-book': () => import('../../assets/js/figures/scenes/training-book.mjs'),
  'two-tags-one-list': () => import('../../assets/js/figures/scenes/two-tags-one-list.mjs'),
  'vending-frame': () => import('../../assets/js/figures/scenes/vending-frame.mjs'),
};
