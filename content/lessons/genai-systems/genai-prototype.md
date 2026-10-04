# Minimaler abgesicherter GenAI-Prototyp

Diese Lektion fügt zusammen, was die drei Lektionen davor getrennt geübt haben: Retrieval aus [Chunks und Index deterministisch bauen](#/lesson/l-genai-rag), deterministische Evaluation aus [Fragenkataloge einfrieren und messen](#/lesson/l-genai-eval) und defensive Kontrollen aus [Injection regelbasiert erkennen](#/lesson/l-genai-security). Das Ergebnis ist ein **minimaler Prototyp**, bewusst klein, vollständig deterministisch und mit einem Stub statt eines echten Sprachmodells. Das ist kein MVP eines Produkts, sondern ein Laboraufbau: Er beweist, dass die Kontrollen greifen, bevor irgendetwas Leistungsstarkes (und Undurchsichtiges) dazukommt.

## Das Bild dahinter: Hausbau aus geprüften Bauteilen

Stell dir ein Haus aus Bauteilen vor, die einzeln abgenommen wurden: Retrieval, Evaluation und Kontrolle sind schon geprüft; jetzt wird getestet, ob sie zusammenhalten. Die Ablation ist in diesem Bild die Sicherung, die du herausnimmst und wieder einsetzt, um zu sehen, welcher Stromkreis wofür zuständig ist.

Wo der Vergleich hinkt: Ein Haus steht still. Ein Prototyp bekommt immer neue Eingaben, darunter auch solche, die seine Regeln aushebeln wollen.

## Der Bauplan

Der Prototyp besteht aus vier Bausteinen mit klaren Verträgen:

1. **Retrieval**: die TF-IDF- und Termüberlappungssuche aus der RAG-Lektion mit gepinnter Normalisierung und Tie-Break über den Dokumentindex.
2. **Stub-Generator**: kein LLM. Der Stub wählt aus dem besten Dokument den ersten Satz, der einen Anfrageterm enthält. Findet er nichts, antwortet er fest „kein treffer“, ein nachvollziehbarer Fehler statt erfundener Glätte.
3. **Kontrollen**: Injektionsprüfung auf Anfrage *und* bestes Dokument (Regelwerk aus der Sicherheitslektion) plus Tool-Policy.
4. **Fixtur-Evaluation**: ein eingefrorenes Query-Set mit relevanten Dokumenten, so dass `metrics()` jederzeit Recall@k reproduzierbar ausgeben kann.

Warum ein Stub? Weil jede Verhaltensaussage über einen echten Generator („der Assistent formuliert höflich“) eine echte Modellausführung bräuchte, die hier nicht läuft. Der Stub macht die Pipeline *messbar*: Änderst du Retrieval oder Kontrolle, siehst du die Wirkung sofort in festen Zahlen.

## Least Privilege konkret

Die Policy ist eine Datenstruktur, kein Stilgefühl: immer erlaubte Werkzeuge, eingeschränkte Werkzeuge mit Argument-Allowlist, verbotene Werkzeuge, und alles Unbekannte abgelehnt. Jede Anfrage an ein Werkzeug läuft durch `request_action(tool, arg)` und erhält einen der vier Entscheide: erlaubt, argument-nicht-erlaubt, tool-verboten, werkzeug-unbekannt. Ablehnungen tragen ihren Grund; ein Prototyp, der stillschweigend nichts tut, ist nicht debuggbar.

## Nachvollziehbare Fehler

Ein abgesicherter Prototyp unterscheidet sich von einer Demo durch seine Fehlerbehandlung. Jeder Fehlertyp hat eine feste, abfragbare Form: „kein treffer“ (Retrieval leer), „abgelehnt: injektionsverdacht“ (Kontrolle griff), „abgelehnt:argument-nicht-erlaubt“ (Policy griff). Keine dieser Antworten gibt vor, richtig zu *wissen*; sie sagen ehrlich, warum nichts zustande kam. Genau diese Ehrlichkeit macht den Prototyp prüfbar: Ein Test kann sich auf die Fehlertexte verlassen.

## Ablation: Kontrolle an, Kontrolle aus

Der wichtigste Messversuch des Prototyps ist die **Ablation**, derselbe Fixturdatensatz einmal mit, einmal ohne Kontrollen:

| Messwert | mit Kontrolle | ohne Kontrolle |
|---|---|---|
| Recall@k über alle Fixture-Queries | sinkt (blockierte Queries zählen 0) | maximal |
| blockierte Injektions-Queries | $> 0$ | $0$ |
| abgelehnte Tool-Aktionen | $> 0$ | $0$ |

Das liest sich richtig: Kontrolle *kostet* sichtbar Recall auf der Injektions-Query, nicht als Defekt, sondern als beabsichtigte Verweigerung. Wer nur die Recall-Zeile zeigt und die blockierten Zeilen unterschlägt, verkauft die Schwächung als Fortschritt. Die Ablationstabelle erzwingt die ehrliche Gesamtrechnung.

## Threat Model für den Prototyp

Dasselbe schriftliche Format wie in der Sicherheitslektion, jetzt bezogen auf das eigene System: Assets (Fixtur-Dokumente, Policy-Datei, Nutzervertrauen), Kanäle hinein (Queries, abgerufene Dokumente inklusive der Injektions-Fixture) und hinaus (Antworten, Tool-Aufrufe), Befunde (Injektions-Doc wird geflaggt; verbotene Aktion abgelehnt) und Kosten der Kontrolle (Recall-Dämpfung aus der Ablation). Das Threat Model ist die Erklärungsfolie für die Tests; jeder Testfall sollte einem Eintrag entsprechen.

## Grenzen offen dokumentieren

Dieser Prototyp ist **kein produktives LLM-System**, und die Grenzen gehören in die Dokumentation, nicht in das Kleingedruckte: kein echtes Sprachmodell (Stub), keine semantische Suche (Termüberlappung statt Embeddings), Regel-Detektor statt robustem Injektionsschutz, kleine Fixtursätze statt Lasttests, Selbstbericht statt Zertifikat. Ein Leser muss am Ende wissen: Was wurde bewiesen (Kontrollen greifen deterministisch), und was wurde bewusst nicht behauptet (Antwortqualität eines echten Generators).

## Wo dir das in der KI begegnet

Produktive Assistenten kombinieren Retrieval, Evaluation und Schutzregeln genau in diesem Aufbau. Und Ablationen zeigen dort wie hier, welche Kontrolle wirklich etwas abfängt und welche nur Papier ist.

## Direkter Check

In einer Einstiegsaufgabe zählst du erlaubte Aktionen unter einer Richtlinie ab. Die [Kernaufgabe: Prototyp-Kern](#/family/construct-stub-prototype-contract/stub-prototype-contract/0/core) baut `build_prototype` mit `answer` und `metrics`; die [Vertiefungsaufgabe: Abgesicherter Prototyp](#/family/construct-secure-prototype-contract/secure-prototype-contract/0/stretch) ergänzt `audit` und `request_action` zur vollen Kontrolle; die [Herausforderung](#/family/reproduce-pipeline-status-report/pipeline-status-report/0/challenge) misst die Ablation mit und ohne Kontrolle gegen Referenzwerte. Das Runner-Projekt **rag-secure-prototype** führt dasselbe lokal mit pytest aus.

## Begriffe auf einen Blick

- **Prototyp**: der minimale, vollständig prüfbare Aufbau aus Retrieval, Stub-Generator, Kontrollen und Fixtur-Evaluation.
- **Least Privilege**: jedes Werkzeug einzeln erlaubt, Argumente eingeschränkt, alles Unbekannte abgelehnt.
- **Ablation**: kontrollierter Vergleich, bei dem genau eine Variable geändert wird.
- **Threat Model**: schriftliche Liste von Assets, Kanälen, Befunden und Kosten der Kontrollen.
- **Nachvollziehbarer Fehler**: Fehlerantwort in fester, abfragbarer Form, die den Grund nennt statt zu raten.
- **Stub-Generator**: Ersatz für das Sprachmodell, der deterministisch aus Dokumenten antwortet und „kein treffer“ meldet.
