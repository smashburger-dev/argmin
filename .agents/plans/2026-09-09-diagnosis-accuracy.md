## Goal

Der Wochenplan wird nach der Diagnose tatsächlich genauer: Diagnose-Empfehlungen
und Schwäche-Signale bestimmen Auswahl und Reihenfolge der Aktivitäten, statt
dass der Plan nur Nachgewiesenes überspringt. Heute filtert die Engine, sie
priorisiert nicht.

## Success Criteria

- Nach einer Diagnose enthält der Wochenplan die empfohlenen Kompetenzen zuerst.
- Angefangene, nicht nachgewiesene Kompetenzen (`learning`) werden vor
  unberührten (`unassessed`) eingeplant.
- Nachgewiesene Kompetenzen fallen weiter heraus, fällige Reviews bleiben drin.
- Neue Node-Tests für die Engine-Regeln, keine E2E-Regression am Wochenplan.
- Validator, Content-Build, Node-Tests, Typecheck, E2E grün.

## Context And Current Facts

- `buildWeeklyLearningPlan` (`src/adapters/learning-plan.ts:29`) füttert die
  Engine mit Evidence-Zuständen, aber nie mit Diagnose-Empfehlungen.
- `buildFoundationsDiagnosis` (`src/adapters/diagnosis.ts:12`) liefert
  Empfehlungen mit `reasonCodes`, läuft aber auf einem getrennten Pfad
  (nur Diagnose-Ansicht). Niemand speist sie in den Plan ein.
- `PlanEngine.build` (`assets/js/domain/plan_engine.mjs:17`) geht den
  Topologie-Pfad ab und plant pro Kompetenz stur nach Typ und ID
  (`scheduleCompetencyActivities`, Zeilen 70 bis 80). Evidence nutzt sie nur
  für drei Dinge: Nachgewiesenes überspringen (`isSatisfiedState`),
  Freischaltung prüfen (`explainUnlock`), Label wählen
  (`strengthen-competency` gegen `build-competency`). Keine Umordnung nach
  Schwäche, keine Diagnose-Einspeiung.
- Evidence-Fluss: Attempts → `EvidenceEngine` → `evidenceStates`
  (`unassessed`, `learning`, `demonstrated`, `review_due`, `retained`) in
  `loadProgressSnapshot` (`src/adapters/local-progress.ts`).
- Fehlerjournal mit `errorType` pro Eintrag liegt im Snapshot (`journal`),
  wird für Planung nirgends genutzt.
- Es gibt keine Engine-Tests: weder `plan_engine` noch `diagnostic_engine`
  sind abgedeckt. Tests fangen bei null an.

## Constraints And Non-goals

- Kein neues Plan-Format, keine Schema-Änderung, keine Migration.
- Review-Budget (35 Prozent, ADR-0008) und Slot-Logik bleiben unangetastet.
- Determinismus bleibt: gleiche Evidence, gleicher Plan. Testbar ohne Browser.
- Kein LLM in der Planung, keine Telemetrie.

## Key Decisions

1. Diagnose-Empfehlungen werden Plan-Input, kein separates System. Der Adapter
   reicht empfohlene Kompetenz-IDs an die Engine, die Engine sortiert sie vor.
   Ein Parameter, keine neue Klasse.
2. Priorität innerhalb freigeschalteter Kompetenzen: `learning` zuerst
   (angefangen, Momentum nutzen), dann `unassessed` und `review_due`
   (Lücken, Auffrischung), `demonstrated` und `retained` weiter raus.
   Alternative `unassessed` zuerst (Lücken zuerst) verworfen: angefangene
   Kompetenzen versanden sonst. Noa bestätigt die Reihenfolge vor Phase 1.
3. Journal-Fehlertypen sind Phase 2 und optional. Erst beweisen, dass
   Empfehlungen plus Ranking wirken, dann Fehlertypen als Familien-Boost.
4. `reasonCodes` bekommen genau einen neuen Wert (`diagnostic-priority`),
   nur wo die Diagnose die Platzierung verursacht. Kein Reason-Inflation.

## Recommended Approach

Drei kleine Eingriffe in dieser Reihenfolge, jeder einzeln testbar:

- Adapter: `buildWeeklyLearningPlan` ruft `buildFoundationsDiagnosis` (oder
  nimmt Empfehlungen als Parameter, falls billiger testbar) und reicht
  priorisierte Kompetenz-IDs an `PlanEngine.build`.
- Engine: `scheduleCompetencyActivities` sortiert den Pfad vor: empfohlene
  zuerst, dann nach Zustands-Priorität aus Entscheidung 2, dann Topologie.
  Kandidaten-Sortierung (`compareActivity`) bleibt unverändert.
- Journal (Phase 2): Familien mit gehäuften Fehlertypen bekommen eine
  Zusatz-Aktivität im Plan. Nur wenn Phase 0 und 1 messbar wirken.

## Work Plan

### Phase 0: Diagnose-Empfehlungen einspeisen (1 bis 2 Tage)

- Engine-Parameter für priorisierte Kompetenz-IDs, Vorsortierung im Pfad,
  `reasonCode` nur bei Diagnose-Platzierung.
- Neuer `tests/plan_engine.test.mjs`: gleiche Evidence mit und ohne
  Empfehlung liefert verschiedene Reihenfolge, Determinismus bei
  Wiederholung, leere Empfehlungen ändern nichts.
- Validierung: `node --test tests/`, `npm run typecheck`.

### Phase 1: Schwäche-Ranking (1 bis 2 Tage)

- Zustands-Priorität aus Entscheidung 2 in `scheduleCompetencyActivities`.
  Reihenfolge vorher mit Noa bestätigen.
- Tests erweitern: `learning` vor `unassessed`, Nachgewiesenes weiter raus,
  Freischaltung (Voraussetzungen) schlägt Priorität.
- Validierung: `node --test tests/`, `npm run typecheck`, E2E
  (`next-shell` Wochenplan-Abschnitt), manuell: Diagnose durchlaufen, Plan
  ändert sich sichtbar und nachvollziehbar.

### Phase 2: Journal-Fehlertypen (optional, 2 bis 3 Tage)

- Nur nach Wirkungsnachweis von Phase 0 und 1. Gehäufte `errorType`-Werte
  je Familie erzeugen eine Zusatz-Aktivität mit eigenem `reasonCode`.
- Validierung wie Phase 1, plus Datenschutz-Blick: alles bleibt lokal,
  keine neuen Persistenz-Felder ohne Migration.

## Validation Plan

- Pro Phase: `node --test tests/`, `npm run typecheck`.
- E2E: Wochenplan rendert, Determinismus per gemockter Uhr falls vorhanden,
  keine Axe-Regression auf Heute.
- Manuell: frisches Profil (Plan vorläufig) gegen Profil nach Diagnose
  (empfohlene Kompetenzen oben, angefangene vor unberührten).
- Copy-Check: Die Plan-Notiz („Nach der Diagnose fällt Nachgewiesenes
  heraus") darf erst dann wieder von Genauigkeit sprechen, wenn Phase 0
  und 1 wirken.

## Risks / Rollback

- Ranking bricht Nutzer-Erwartung (gewohnte Reihenfolge ändert sich):
  Gegenmaßnahme reasonCodes als sichtbare Begründung in der UI.
- Diagnose-Empfehlungen leer oder veraltet: Fallback heutiges Verhalten,
  keine leeren Pläne.
- Scope-Kriech Richtung Empfehlungssystem: Phasentor, kein Scoring,
  keine Gewichte, nur Ordnung.

## Open Questions

- Bestätigt Noa die Priorität `learning` vor `unassessed`? Einzige offene
  Entscheidung vor Phase 1, alles andere ist reversibel.

## Handoff an die Umsetzungs-Session

Stand: Nur dieser Plan, kein Code. Der Redesign-Branch
`ui/redesign-neo-minimal` läuft parallel, Abstimmung bei
`src/adapters/learning-plan.ts` und `src/ui/TodayView.tsx` falls dort
gleichzeitig gearbeitet wird.

Kopierbarer Prompt für die andere Session:

```text
Du übernimmst die Diagnose-Genauigkeit im Repo argmin, Branch
ui/redesign-neo-minimal. Lies zuerst AGENTS.md und den Plan
.agents/plans/2026-09-09-diagnosis-accuracy.md.

Stand: Der Wochenplan filtert heute nur (Nachgewiesenes raus, Fälliges
rein), er priorisiert nicht. Deine Aufgabe: Phase 0 (Diagnose-Empfehlungen
in den Plan einspeisen) und danach Phase 1 (Schwäche-Ranking). Phase 2
(Journal-Fehlertypen) nur nach Wirkungsnachweis und mit Noas Go.

Regeln: Kein neues Plan-Format, keine Schema-Änderung, keine Migration,
Determinismus erhalten, Tests von null aufbauen
(tests/plan_engine.test.mjs). Vor Phase 1 die Prioritäts-Reihenfolge mit
Noa bestätigen (offene Frage im Plan). Halte dich an shrink-complexity:
ein Engine-Parameter, eine Vorsortierung, ein neuer reasonCode.

Validierung pro Phase: node --test tests/, npm run typecheck, betroffene
E2E-Specs. Bei jeder Abweichung vom Plan: erst Noa fragen. Commits nur
auf ausdrückliche Anweisung.
```
