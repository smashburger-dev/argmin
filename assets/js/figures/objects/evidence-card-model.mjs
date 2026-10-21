import { sha256 } from './sha256.mjs';

const digest = sha256('["fixture"]');
export const cards = {
  review: {
    caption: 'Ein eigener Abruf liefert einen zeitlich begrenzten Nachweis. Fälligkeit plant den nächsten Abruf, keine tägliche Streak.',
    rows: [], note: 'Abstände sind eine einstellbare Arbeitshypothese, keine optimale universelle Zeitvorgabe.',
  },
  journal: {
    caption: 'Vier Felder trennen Beobachtung, Reproduktion, Ursache und nächste Prüfung.',
    rows: [['Beobachtung', 'Erwartet: 1. Erhalten: 0.'], ['Kleinste Reproduktion', 'Zwei gleiche Kennungen'], ['Ursachenhypothese', 'Zustand wird zurückgesetzt'], ['Nächster Test', 'Zweite Kennung erneut prüfen']],
    note: 'Abruf → Fälligkeit → neuer Abruf',
  },
  papers: {
    caption: 'Ein Claim hat einen Beleg. Absoluter und relativer Unterschied benutzen dieselben Ausgangswerte.',
    rows: [['Claim', 'Halbierte Fehlerrate'], ['Beleg', '2 % → 1 %'], ['Absolut', `${1 - 2} Prozentpunkt`], ['Relativ', `${100 * (1 - 2) / 2} %`]],
    note: 'Gleiche Basis, zwei Lesarten', numbers: [2, 1, -1, -50],
  },
  protocol: {
    caption: 'Das Protokoll wird vor dem Lauf festgelegt. Eine spätere Schwellenänderung ist ein Goal-Shift.',
    rows: [['Vor dem Hauptlauf', 'recall@5 ≥ 0,75'], ['Im Hauptlauf', 'Gemessen wird dieselbe Metrik'], ['Nach dem Hauptlauf', 'Schwelle auf 0,60 gesenkt'], ['Befund', 'Schwelle nachträglich geändert']],
    note: 'Vorhersage braucht feste Regeln', numbers: [5, 0.75, 0.6],
  },
  cards: {
    caption: 'Drei Karten teilen denselben Projektnamen. Eine Konsistenzlinie ersetzt nicht die Prüfung ihrer Pflichtfelder.',
    rows: [['Datenkarte', 'name: toy-rag'], ['Modellkarte', 'name: toy-rag'], ['Systemkarte', 'name: toy-rag']],
    note: 'Name und Version abgleichen',
  },
  acceptance: {
    caption: 'Die Bauabnahme benennt Kriterien und Befunde. Ein Dokument bleibt ein Arbeitsnachweis.',
    rows: [['Manifest', 'Stand vor dem Lauf fixiert'], ['Messwerte', 'Aus der festen Evaluation'], ['Mängelprotokoll', 'Bekannte Fehler benannt'], ['Kompetenznachweis', 'Separat deterministisch prüfen']],
    note: 'Kein Urteil allein nach Aussehen',
  },
  regression: {
    caption: 'Zwei verschiedene Fehlergrenzen brauchen getrennte Befunde: fehlender Beleg und falsche Antwort.',
    rows: [['Retrievalfehler', 'Relevanter Beleg fehlt'], ['Antwortfehler', 'Beleg da, Antwort falsch'], ['Statikprüfung', 'Feste Fälle nach Änderung'], ['Brandschutz', 'Eigener Toy-Prototyp']],
    note: 'Grenzen getrennt dokumentieren',
  },
  repro: {
    caption: 'Die Bauakte verbindet Konfiguration und zwei frische Läufe. Die gezeigten Digest-Auszüge stammen aus echtem SHA-256.',
    rows: [['Frischer Lauf A', `Digest: ${digest.slice(0, 12)}…`], ['Frischer Lauf B', `Digest: ${digest.slice(0, 12)}…`], ['Bauakte', 'Konfiguration und Versionen'], ['Ergebnis', 'Gleiche kanonische Bytes']],
    note: 'Arbeitsbeleg, keine Mastery', digest,
  },
};

const shortRows = {
  journal: [['Beobachtung', '1 erwartet, 0 da'], ['Reproduktion', 'Gleiche Kennung'], ['Hypothese', 'Zustand gelöscht'], ['Nächster Test', 'Zweite Kennung']],
  papers: [['Claim', 'Fehler halbiert'], ['Beleg', '2 % → 1 %'], ['Absolut', '−1 Prozentpunkt'], ['Relativ', '−50 %']],
  protocol: [['Vor dem Lauf', 'recall@5 ≥ 0,75'], ['Im Hauptlauf', 'Gleiche Metrik'], ['Nach dem Lauf', 'Schwelle 0,60'], ['Befund', 'Goal-Shift']],
  cards: [['Datenkarte', 'toy-rag'], ['Modellkarte', 'toy-rag'], ['Systemkarte', 'toy-rag']],
  acceptance: [['Manifest', 'Fixierter Stand'], ['Messwerte', 'Feste Evaluation'], ['Mängel', 'Benannte Fehler'], ['Mastery', 'Separat prüfen']],
  regression: [['Retrieval', 'Beleg fehlt'], ['Antwort', 'Beleg da, falsch'], ['Statik', 'Feste Testfälle'], ['Brandschutz', 'Eigener Prototyp']],
  repro: [['Lauf A', `${digest.slice(0, 12)}…`], ['Lauf B', `${digest.slice(0, 12)}…`], ['Bauakte', 'Versionen + Seeds'], ['Ergebnis', 'Gleiche Bytes']],
};

export function evidenceCard(params) {
  if (!params || Object.keys(params).join() !== 'card' || !Object.hasOwn(cards, params.card)) throw new Error('Unknown evidence card');
  return { ...cards[params.card], shortRows: shortRows[params.card] ?? [], card: params.card };
}
