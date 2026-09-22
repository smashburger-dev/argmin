// Cross-tab progress invalidation: same-tab CustomEvent plus a BroadcastChannel
// ping, so a second open tab reloads its snapshot instead of staying stale until
// reload (a tab never receives its own posts). Lazily created and guarded so
// importing this module in Node tests stays inert; Node's BroadcastChannel refs
// the event loop, hence the defensive unref.
export const PROGRESS_CHANNEL_NAME = 'argmin-progress';

let progressChannel = null;

export function notifyProgressChanged() {
  if (typeof dispatchEvent === 'function') dispatchEvent(new CustomEvent('learning-progress-changed'));
  if (typeof BroadcastChannel !== 'function') return;
  // Sandboxed iframes/opaque origins throw SecurityError on construction; a
  // failure here must never propagate into a committed write's afterCommit.
  try {
    if (!progressChannel) {
      progressChannel = new BroadcastChannel(PROGRESS_CHANNEL_NAME);
      progressChannel.unref?.();
    }
    progressChannel.postMessage('changed');
  } catch { /* cross-tab ping is best-effort */ }
}
