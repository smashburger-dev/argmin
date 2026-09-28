// Release service worker registration plus the "update ready" signal. The
// worker waits on purpose (tools/sw.js keeps old-version chunks alive for
// open tabs), so the page offers a banner; applyUpdate() sends SKIP_WAITING
// and reloads on controllerchange.

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

type UpdateListener = () => void;

let registration: ServiceWorkerRegistration | null = null;
let waitingWorker: ServiceWorker | null = null;
let lastUpdateCheck = 0;
const listeners = new Set<UpdateListener>();

function notifyReady(worker: ServiceWorker) {
  // A waiting worker only counts as an update when a controller already
  // exists; the very first install activates without interrupting anything.
  if (!navigator.serviceWorker.controller) return;
  // Every tab that saw the update reloads when the new worker takes over,
  // not only the one whose banner was clicked: activation deletes the old
  // cache, and other tabs would otherwise lazy-import missing chunks.
  if (!waitingWorker) navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  waitingWorker = worker;
  for (const listener of listeners) listener();
}

function watch(reg: ServiceWorkerRegistration) {
  if (reg.waiting) notifyReady(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') notifyReady(worker);
    });
  });
}

function checkForUpdate() {
  const now = Date.now();
  if (now - lastUpdateCheck < UPDATE_CHECK_INTERVAL_MS) return;
  lastUpdateCheck = now;
  void registration?.update().catch(() => {});
}

export function initServiceWorkerUpdates() {
  // Only release builds ship sw.js; dev serves the repo root without one.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  addEventListener('load', () => {
    void navigator.storage?.persist?.().catch(() => {});
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        registration = reg;
        watch(reg);
        checkForUpdate();
      })
      .catch(() => {});
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
}

export function onUpdateReady(listener: UpdateListener): () => void {
  listeners.add(listener);
  if (waitingWorker) listener();
  return () => { listeners.delete(listener); };
}

export function applyUpdate() {
  waitingWorker?.postMessage('SKIP_WAITING');
}
