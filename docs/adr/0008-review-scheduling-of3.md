# ADR-0008: Review-Scheduling mit Expanding Retrieval; FSRS bleibt Experiment

Status: Angenommen 2026-08-25, produktive Policy korrigiert 2026-08-29, FSRS-Experiment am 2026-09-02 vollständig entfernt (S1A). Datum: 2026-08-25.
Entscheidungsvorlage: `research/lernmethodik/of3-algorithmen.md` (OF-3-Lückenschluss der
Evidenzsynthese `KI_Lernmethodik_Evidenzsynthese.md`). Implementiert LM-R1 und LM-R3
aus `research/lernmethodik/requirements.md`.

## Kontext

Die Ist-Annahme „einmal bewiesen gilt für immer" (masteryFromAttempts ohne Zeitdimension,
G-02/G-05 in `research/lernmethodik/gap-matrix.md`) widerspricht Vergessensverläufen
(@murre<dros><2015>) und dem Testrepetitionseffekt (@yang<testing><2021>;
@rowland<metaanalyse><2014>). Der in ADR-0005 genannte `reviewQueue`-Store wurde nie
angelegt (G-28). OF-3 fragte, welcher Scheduling-Algorithmus die Lücke schließt:
FSRS, SM-2, HLR, MCM/DASH, Punkt-Prozesse oder einfache expanding retrieval.

## Entscheidung

Produktiv läuft genau ein Scheduler:

1. **Manuell geplante Expanding-Retrieval-Slots** nach dem Muster Woche+2 /
   Woche+5 / Woche+11, relativ zum letzten qualifizierten Treffer (korrekt,
   höchstens 1 Hinweis, keine vorherige Lösungsanzeige). Treffer 1 macht den
   Nachweis 2 Wochen gültig, Treffer 2 für 5 Wochen und Treffer 3 für 11 Wochen.
   Danach wird das letzte Intervall wiederholt. Nach Ablauf erscheint die Aufgabe
   in der Review-Liste; ein qualifizierter Review-Treffer erneuert die Gültigkeit.
2. **ts-fsrs wurde am 2026-09-02 vollständig entfernt (S1A).** Bis dahin war es ein
   inaktives Experiment: Die vendorte MIT-Distribution und `fsrsReviewState()` blieben
   für vergleichende Tests erhalten, ohne produktiven Caller. Das Retirement entfernte
   Vendor-Verzeichnis, Scheduler-Code (`fsrsThreshold`, `fsrsReviewState`,
   `attemptToRating`, `schedulerModeFor`), Tests, Notice und Dokumentationsbehauptung;
   die Queue schreibt seither `mode: 'expanding'` direkt. Eine spätere FSRS-Nutzung
   erfordert ein neues ADR samt neuer Vendoring-Entscheidung.

Nicht übernommen: HLR, MCM/DASH, ACT-R/Punkt-Prozess — Begründung und
Empfehlungsmatrix in `research/lernmethodik/of3-algorithmen.md`.

## Belege

- @osr<benchmark><github>: FSRS im größten öffentlichen Benchmark (10k Anki-Nutzer)
  unter den kognitiven Modellen beste Kalibrierung (FSRS-6 Log Loss 0,3460 vs. HLR
  0,4694, DASH[MCM] 0,3682, ACT-R 0,4033); nur neuronale Netze schlagen es, bei
  um Größenordnungen größerer Codefläche.
- @settles<halflife><2016>: trainierbares HLR-Modell schlägt heuristische Schedules —
  braucht aber Training pro Nutzer und ist bei wenigen Items instabil (Referenzcode
  Python 2, BSD-artig): für eine Ein-Personen-Plattform mit 13 Aufgaben/Woche
  ungeeignet.
- @mozer<mcm><2009>: MCM sagt Spacing-Funktionen blind aus 4 Parametern vorher und
  zeigt, dass das optimale ISI mit der Retentionsdauer wächst — stützt wachsende
  Intervalle; Parameterfitting und Forschungscode-Status sprechen gegen Einsatz.
- @murray<spacing><2025>: Mathematik-Spacing ist gegenüber massierter Praxis
  klein bis mittel positiv (g = 0,282, 95%-KI [0,188; 0,376]), legt aber kein
  optimales Intervall und keinen Scheduler fest. @cepeda<distributed><2006>
  stützt wachsende Abstände allgemein. Die konkrete Folge +2/+5/+11 Wochen
  bleibt eine konfigurierbare Eigenableitung und wird im eigenen System geprüft.

## Decay-Parameter (konfigurierbar, keine Magic Numbers)

Alle produktiven Parameter liegen als benannte Konstanten in
`assets/js/core/review_scheduler.js` (`DEFAULT_REVIEW_PARAMS`:
`expandingSlotsWeeks: [2, 5, 11]`, `postLadderPolicy: 'repeat-last'`) und können
im settings-Store unter `reviewParams` partiell übersteuert werden
(`resolveReviewParams`). Die frühere reservierte `fsrsThreshold` wurde mit dem
FSRS-Experiment entfernt. Die Intervallfolge
[2, 5, 11] ist eine Eigenableitung, keine literaturgeprüfte Dosierung.

Nach dem dritten Slot wiederholt der Default das letzte 11-Wochen-Intervall.
`postLadderPolicy: 'consolidate'` bleibt für alte Importe lesbar, ist aber nicht
mehr der Default. Damit behauptet das System keine dauerhaft unverfallbare
Beherrschung.

## Konsequenzen

- `schemaVersion` der IndexedDB steigt auf 2; Migration legt `reviewQueue` an und
  befüllt ihn initial aus `attempts` (bestehende Versuche bleiben erhalten).
  Importe mit schemaVersion 1 bleiben zulässig; `reviewQueue` wird daraus
  rekonstruiert (er ist eine Ableitung, keine Leading-Datenquelle).
- Gates bewerten Mastery zeitlich bedingt: Ein abgelaufenes Mastery schließt das
  Gate wieder, bis ein Review-Treffer die Gültigkeit erneuert (LM-R1).
- Der FSRS-Replay wurde mit S1A entfernt (kein produktiver Caller, reiner
  Experimentspfad). Die Queue stempelt `mode: 'expanding'` direkt; Queue-Modus und
  Termin stammen aus derselben Policy.
- Grenze: Review-Treffer laufen zunächst auf derselben Aufgabeninstanz (gleicher
  Seed); neue Seeds je Review erfordern generierte Prompt-Texte und kommen mit der
  W6-Autorenpipeline (Konflikt requirements.md ↔ statische Prompts — Realität
  gewinnt, im Protokoll dokumentiert).

## Wartung / Rückbau

Scheduler-Funktionen sind rein (`review_scheduler.js`), offline, deterministisch,
in Node testbar. Rückbau: Parameter auf unendliche Gültigkeit stellen bzw. Modul
entfernen — `attempts` bleibt die wahre Historie, `reviewQueue` ist jederzeit aus
ihr rekonstruierbar.
