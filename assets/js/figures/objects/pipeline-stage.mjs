import { panel, label, line, dot } from './optimization-plot.mjs';
import { rectangle, arrow } from './f12-diagram.mjs';

const shown = phase => Math.floor(phase + 0.000001);
const number = n => String(n).replace('.', ',');
const heading = text => label('heading', 6, 10, text);
const box = (key, y, title, value, active = false) => [
  rectangle(key + '-box', [6, y], [94, y + 18], active ? 'lit' : 'hi'),
  label(key + '-name', 10, y + 7, title, active ? 'lit' : 'hi'),
  label(key + '-value', 10, y + 14, value),
];

// K9: a station is useful only with named input/output contracts.
export function station({ input, operation, output, active }) {
  return [
    ...box('input', 18, 'Eingang', input, active === 0),
    arrow('input-flow', [50, 37], [50, 43]),
    ...box('operation', 44, operation, 'prüfen → übergeben', active === 1),
    arrow('output-flow', [50, 63], [50, 69]),
    ...box('output', 70, 'Ausgang', output, active === 2),
  ];
}

export function goodsItems(m, phase) {
  const k = shown(phase), row = m.rows[Math.min(k, m.rows.length - 1)];
  const isError = Boolean(row.error);
  return [panel([
    heading('Prüfen am Wareneingang'),
    ...station({ input: `age = "${row.raw}"`, operation: 'int → Bereich 0…130', output: isError ? row.error : `age = ${row.value}`, active: Math.min(k, 2) }),
    { ...arrow('chute', [94, 53], [94, 94]), visible: isError },
    label('issues', 6, 97, isError ? `issues: ${row.reason}` : 'Nur geprüfte Zahlen hinein'),
  ])];
}
export const goodsDetail = (m, p) => {
  const r = m.rows[Math.min(shown(p), m.rows.length - 1)];
  return r.error ? `${r.raw}: ${r.error}, ${r.reason}. Nur dieser erwartete Fehler wird aufgefangen. ${m.uncaught} bleibt sichtbar.` : `${r.raw} wird als Alter ${r.value} übergeben.`;
};

export function cleaningItems(m, phase) {
  const k = shown(phase), state = m.states[k];
  const labels = ['Eingang', 'Schema geprüft', 'Kopien entfernt', 'Zielwerte vollständig'];
  return [panel([
    heading(labels[k]),
    label('id', 6, 23, 'id'), label('age', 24, 23, 'Alter'), label('revenue', 44, 23, 'Umsatz'), label('result', 72, 23, 'Status'),
    ...state.rows.flatMap((r, i) => {
      const y = 33 + i * 7;
      const reason = r.invalid ? 'Alter' : r.duplicate ? 'Kopie' : 'fehlt';
      return [label(`id-${i}`, 6, y, r.id), label(`age-${i}`, 24, y, r.age),
        label(`rev-${i}`, 44, y, r.revenue === null ? 'None' : r.revenue),
        label(`status-${i}`, 72, y, r.rejected ? reason : k === 0 ? '·' : '✓', r.rejected ? 'lit' : 'hi')];
    }),
    line('bottom', [6, 87], [94, 87]), label('remaining', 6, 96, `${state.remaining} Zeilen bleiben`),
  ])];
}
export const cleaningDetail = (m, p) => {
  const s = m.states[shown(p)];
  return `${s.remaining} Zeilen. Verbleibende IDs: ${s.ids.join(', ')}. Fehler werden dokumentiert; Sentinel −1 ist kein Umsatz.`;
};

export function foldItems(m, phase) {
  const s = m.states[shown(phase)];
  return [panel([
    heading(`${m.n} Zeilen · ${m.k} Folds`),
    ...m.folds.flatMap((rows, i) => {
      const y = 18 + i * 12, held = s.held === i;
      return [rectangle(`fold-${i}`, [6, y], [94, y + 10], held ? 'lit' : 'hi'),
        label(`role-${i}`, 9, y + 7, held ? 'Test' : 'Train', held ? 'lit' : 'hi'),
        label(`rows-${i}`, 31, y + 7, `IDs ${rows.join(' · ')}`), label(`size-${i}`, 85, y + 7, rows.length)];
    }),
    { ...arrow('crossing', [98, 18 + s.held * 12 + 5], [98, 83]), visible: s.leakage },
    { ...line('crossing-in', [98, 18 + s.held * 12 + 5], [94, 18 + s.held * 12 + 5], 'lit'), visible: s.leakage },
    label('fit-scope', 6, 88, s.leakage ? 'fit: alle Zeilen → Leakage' : 'fit: nur Train → sauber', s.leakage ? 'lit' : 'hi'),
    label('leak-count', 6, 98, `${s.leakRows.length} Testzeilen im fit`),
  ])];
}
export const foldDetail = (m, p) => {
  const s = m.states[shown(p)];
  return `Fold-Größen ${m.sizes.join(', ')}. Test: ${s.test.join(', ')}. Fit sieht ${s.fitRows.length} Zeilen; ${s.leakRows.length} davon sind Testzeilen. ${s.leakage ? 'Leakage: Statistik über alle Zeilen gelernt.' : 'Kein Testeintrag beeinflusst die Statistik.'}`;
};

export function tokenItems(m, phase) {
  const k = shown(phase), step = m.steps[Math.min(k, m.steps.length - 1)];
  return [panel([
    heading('Toy: höchster Logit gewinnt'),
    ...box('context', 18, 'Kontext → Forward-Fixtur', step.before.map(id => m.vocabulary[id]).join(' · ')),
    ...m.vocabulary.flatMap((token, i) => {
      const x = 8 + i * 30;
      return [rectangle(`logit-box-${i}`, [x, 45], [x + 25, 65], i === step.next ? 'lit' : 'hi'),
        label(`token-${i}`, x + 3, 53, token), label(`logit-${i}`, x + 3, 61, number(step.logits[i]), i === step.next ? 'lit' : 'hi')];
    }),
    arrow('return', [91, 73], [91, 37]),
    label('result', 6, 80, `argmax → ${m.vocabulary[step.next]}`, 'lit'),
    label('sequence', 6, 91, step.after.map(id => m.vocabulary[id]).join(' · ')),
    label('stop', 6, 99, step.stopped ? '<eos>: Ende, mitgezählt' : 'Token zurück in den Kontext'),
  ])];
}
export const tokenDetail = (m, p) => {
  const s = m.steps[Math.min(shown(p), m.steps.length - 1)];
  return `Logits ${s.logits.join(', ')}. Argmax ${s.next}: ${m.vocabulary[s.next]}. Kontext danach: ${s.after.join(', ')}. ${s.stopped ? 'Ende-Token stoppt die Schleife.' : 'Nächster Durchlauf erhält den erweiterten Kontext.'}`;
};

export function mailItems(m, phase) {
  const k = shown(phase), request = m.requests[Math.min(k, m.requests.length - 1)];
  return [panel([
    heading('Inhalt bleibt im Umschlag'),
    ...box('envelope', 18, `${m.envelope.source} · untrusted`, `„${m.envelope.text}“`),
    line('seal-1', [6, 15], [50, 18]), line('seal-2', [94, 15], [50, 18]),
    ...box('gate', 46, `Allowlist: ${m.allowlist.join(', ')}`, `Werkzeugwunsch: ${request.tool}`, true),
    arrow('gate-flow', [50, 65], [50, 71]),
    ...box('decision', 73, request.allowed ? 'erlaubt' : 'tool-verboten', request.allowed ? 'Nur Suche, kein Versand' : 'Kein Aufruf, keine Datei'),
    label('boundary', 6, 99, 'Dokument ist keine Autorität'),
  ])];
}
export const mailDetail = (m, p) => {
  const r = m.requests[Math.min(shown(p), m.requests.length - 1)];
  return `Dokumentinhalt ist nicht vertrauenswürdig. Werkzeug ${r.tool}: ${r.allowed ? 'erlaubt' : 'tool-verboten'}. Allowlist: ${m.allowlist.join(', ')}. Es wird kein Werkzeug ausgeführt.`;
};

export function ablationItems(m, phase) {
  const state = m.states[shown(phase)];
  return [panel([
    heading(state.control ? 'Kontrolle eingesetzt' : 'Kontrolle entfernt'),
    line('roof-left', [8, 26], [50, 14]), line('roof-right', [50, 14], [92, 26]),
    rectangle('house', [8, 26], [92, 72]),
    ...state.rows.flatMap((r, i) => {
      const y = 34 + i * 8;
      return [label(`id-${i}`, 12, y, r.id), label(`out-${i}`, 30, y, r.blocked ? 'blockiert' : r.hits ? 'Treffer' : 'kein Treffer'),
        label(`risk-${i}`, 75, y, r.unsafe ? 'Risiko' : '✓', r.unsafe ? 'lit' : 'hi')];
    }),
    label('recall', 6, 83, `Recall@k = ${number(state.recall)}`),
    label('unsafe', 6, 94, `${state.unsafe} unsichere Freigaben`, 'lit'),
  ])];
}
export const ablationDetail = (m, p) => {
  const s = m.states[shown(p)];
  return `Dieselben ${s.rows.length} Fixturfragen. Recall@k ${s.recall}; ${s.blocked} blockierte Anfragen; ${s.unsafe} unsichere Freigaben. Der Recall-Verlust ist eine sichtbare Kostenfolge der Kontrolle.`;
};

export function tradesItems(m, phase) {
  const k = shown(phase);
  return [panel([
    heading('Stage-Protokoll · virtuelle Uhr'),
    ...m.results.flatMap((s, i) => {
      const y = 19 + i * 23, started = i <= k;
      return [rectangle(`stage-${i}`, [6, y], [94, y + 20], i === k ? 'lit' : 'hi'),
        label(`io-${i}`, 10, y + 7, `${s.consumes} → ${s.produces}`),
        label(`time-${i}`, 10, y + 16, started ? `${s.duration}/${s.budget} ms · ${s.status}` : 'wartet auf Übergabe'),
        { ...dot(`clock-${i}`, [88, y + 15], i === k ? 'lit' : 'hi'), visible: started }];
    }),
    label('status', 6, 97, k === 0 ? 'docs wird übergeben' : `Pipeline: ${m.status}`, 'lit'),
  ])];
}
export const tradesDetail = (m, p) => {
  const stage = m.results[Math.min(shown(p), m.results.length - 1)];
  return `${stage.name}: ${stage.duration} ms, Budget ${stage.budget} ms, Status ${stage.status}. ${stage.output ? `Übergabe ${stage.output}.` : 'Keine Ausgabe wird weitergereicht.'} Pipeline ${m.status}.`;
};
