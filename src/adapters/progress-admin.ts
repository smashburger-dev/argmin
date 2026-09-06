import { progress } from '../../assets/js/core/progress_store.js';

export async function exportProgressJson(): Promise<string> {
  if (!progress) throw new Error('Lokaler Fortschrittsspeicher ist nicht verfügbar.');
  return `${JSON.stringify(await progress.exportAll(), null, 2)}\n`;
}

export async function importProgressJson(text: string): Promise<void> {
  if (!progress) throw new Error('Lokaler Fortschrittsspeicher ist nicht verfügbar.');
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Die Datei enthält kein gültiges JSON.');
  }
  await progress.importAll(payload);
  dispatchEvent(new CustomEvent('learning-progress-changed'));
}
