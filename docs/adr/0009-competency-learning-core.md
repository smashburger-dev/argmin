# ADR-0009: Kompetenzbasierter Lernkern mit erklärbaren Regeln

Status: Angenommen. Datum: 2026-08-29.

## Kontext

Die 39-Wochen-Roadmap ordnet Themen und Zeit, kann aber Vorkenntnisse, Zielpfade und fällige Wiederholungen nicht sauber ausdrücken. W1 und W5 besitzen bereits Aufgaben, Grader und Verlaufsevidenz. Diese geprüften Teile sollen erhalten bleiben.

Die Architektur-Evidenzsynthese stützt adaptive tutorielle Systeme und verteilte Praxis in der Richtung. Sie belegt weder einen bestimmten Sequenzierungsalgorithmus noch feste Mastery-Schwellen oder Reviewintervalle. BKT, IRT und Deep Knowledge Tracing benötigen kalibrierte Itembanken und reale Antwortdaten, die im Pilot nicht vorliegen.

## Entscheidung

Der neue Kern besteht aus sechs reinen Modulen unter `assets/js/domain/`:

- `CompetencyGraph` validiert `requires` als DAG, löst Voraussetzungen und erklärt Freischaltung.
- `EvidenceEngine` leitet `unassessed`, `learning`, `demonstrated`, `review_due` und `retained` aus Ereignissen ab.
- `DiagnosticEngine` priorisiert fällige Reviews und die früheste schwache Voraussetzung. Jede Empfehlung trägt Reason-Codes.
- `PlanEngine` erzeugt deterministische Wochen- und Tagespläne innerhalb eines Minutenbudgets und begrenzt Review-Überhang.
- `ExerciseRegistry` trennt Definition und Instanz. Der Legacy-Adapter unterscheidet Seed-Generatoren von Referenzsolvern.
- `StaticTutor` wählt freigegebene Erklärbausteine nach Kompetenz, Diagnosecode und Hilfestufe. Lösungen sind nur auf Hilfestufe 6 zulässig.

Alle Inhalte bleiben unabhängig von Empfehlungen erreichbar. `review_due` blockiert Navigation nicht. Ein LLM kann später über Prompt- oder Backend-Adapter erklären, aber keinen Grader, Kompetenzstatus oder Plan verbindlich verändern.

## Evidence-Policy

Jede Kompetenz deklariert:

- Mindestzahl unabhängiger Treffer;
- Mindestzahl verschiedener Aufgabendefinitionen;
- ob ein verzögerter Treffer nötig ist;
- Mindestabstand für den verzögerten Treffer;
- Frist bis zur nächsten Evidence-Prüfung.

Der erste Katalog verwendet einen Tag Mindestabstand und 77 Tage Frische für fachliche Kompetenzen. Diese Werte sind transparente Produktheuristiken. Sie werden nicht als optimale Literaturwerte dargestellt und müssen später mit eigenen Retention-Daten geprüft werden.

Eine Lösungsanzeige disqualifiziert nur dieselbe Aufgabeninstanz. Andere frische Instanzen können weiterhin Evidence liefern.

## Legacy-Integration

`tools/compile_content.mjs` normalisiert W1 und W5 und ergänzt eigenständige Foundations- und Lineare-Algebra-Definitionen. Der aktuelle Stand umfasst 51 Public- und 52 Local-Definitionen. Bestehende IDs bleiben stabil. Die neue Oberfläche liest das profilgebundene Bundle und führt alle öffentlichen Legacy-Aktivitäten nativ aus; die alte Oberfläche bleibt Fallback.

## Konsequenzen

- Domain-Logik ist in Node ohne Browser testbar.
- Die alte Roadmap bleibt als Projektion verfügbar, ist aber kein fachlicher Kernvertrag mehr.
- Kompetenzzustand ist eine Ableitung aus Ereignissen und wird kein zweiter Wahrheitsstore.
- Ein gehosteter Sync kann später dieselben Ereignisse replizieren.
- Die Oberfläche kann nach dem IndexedDB-v3-Schritt auf Heute, Lernen, Review und Fortschritt umgestellt werden.

## Nicht entschieden

- endgültige Reviewintervalle;
- Aktivierung von FSRS;
- statistisches Knowledge Tracing;
- Modellanbieter und lokales Modell;
- Hosted-Backend und Authentifizierung.

Diese Entscheidungen benötigen eigene Evals, Daten oder ein separates Threat Model.
