# Capstone-Pipeline: Abschlussdiagnose und Abnahme

Diese Phase nimmt ab: eine Demo aus festen Messwerten, die Abschlussdiagnose aus Evidenzregeln und der Vertragscheck aller Vereinbarungen. Die Capstone-Phasen entwickeln eine Pipeline weiter, kein neues Miniprojekt pro Lektion.

## Das Bild dahinter: die Bauabnahme mit Mängelprotokoll

Stell dir die Bauabnahme vor: Der Bauherr geht mit einem Mängelprotokoll durch das fertige Gebäude. Jede Abnahmebedingung wird geprüft, jedes offene Problem steht schriftlich im Protokoll, und nichts gilt als fertig, nur weil es fertig aussieht.

Wo der Vergleich hinkt: Ein Bauherr kann Mängel später reklamieren. Deine Abnahme ist endgültig für diesen Stand; was du nicht dokumentierst, existiert danach nicht mehr.


## Feste Evaluation: einfrieren, nicht nachjustieren

Die Evaluation steht vor der Optimierung fest: acht Queries über dem
ungeänderten Korpus des GenAI-Prototyps, davon die vier Queries des GenAI-Prototyps wörtlich als Teilmenge,
Subgruppen-Labels an jeder Query, Schwellen und Capstone-Baseline in der
Konfiguration. Gemessen wird beides getrennt: **Retrievalfehler** (kein
Dokument gefunden, `retrieval_status: leer`) sind andere Fehler als
**Antwortfehler** (blockiert oder kein Treffer auf der Antwortebene). Wer
beides in einen Topf wirft, kann die Ursache nicht mehr benennen. Die
Subgruppen-Recalls (hier: versand 1,0, garantie 1,0, recht 0,5, rabatt 0,5)
zeigen, wo der lexikalische Retriever systematisch versagt: Zwei Queries
treffen bewusst nicht, und genau die gehören in die Regressionstabelle, nicht
unter den Teppich.

## Defensives Red-Team gegen den eigenen Prototyp

Das Red-Team richtet sich **nur gegen den eigenen Toy-Prototyp**: die
gelieferten Fixtures mit der Domäne `example.invalid`, Regelphrasen aus dem GenAI-Prototyp,
Least-Privilege-Policy. Anfrage **und** bestes Dokument werden geprüft; die
klassische Route steckt im Dokument. Benign-Fälle ohne Regelphrase dürfen
nicht blockiert werden, sonst misst der Detektor seine Scheingenauigkeit.
Verbotene Aktionen (`mail`, `hook`, `export` mit falschem Argument) werden
abgelehnt, Unbekanntes ebenfalls. Aus allem zusammen ergibt das Regelwerk ein
Verdict: **angenommen**, **abgelehnt** (Schwelle oder Erwartung verfehlt)
oder **abgebrochen** (die Pipeline selbst lief nicht sauber). Ein Verdict ist
eine Tabelle, kein Gefühl.

## Demo aus festen Messwerten

Die Demo erfindet nichts: `demo_metrics()` liest die eingefrorenen Werte aus
`golden/expected_results.json` und assertiert sie gegen jede Neuberechnung; weicht etwas ab, wirft die Funktion, statt alte Zahlen vorzuzeigen. Abbildungen
und Folien entstehen aus genau diesen Messwerten (Rougier et al.: Eine gute
Abbildung ist eine Aussage über Daten, die man benennen kann). Die
Abschlussdiagnose (`final_diagnosis`) prüft Evidenzregeln: zwei unabhängige
Treffer, zwei verschiedene Definitionen, mindestens vierzehn Tage Abstand; das Anzeigen einer Lösung disqualifiziert genau diese Instanz.

## Typische Fehlvorstellungen

- *„Ein hoher Gesamt-Recall genügt.“* Falsch: Subgruppen können bei gutem
  Mittel kollabieren: 0,75 Gesamt mit 0,0 in einer Gruppe ist ein
  fairnessberichtspflichtiger Befund.
- *„Grüne Tests bedeuten Produktionsreife.“* Sie bedeuten nur, dass die
  gelieferten Verträge im gelieferten Rahmen halten, mehr nicht.

## Wo dir das in der KI begegnet

Produktive ML-Systeme laufen in solchen Pipelines: eingefrorene Daten, Stages mit Verträgen und automatische Regressionstests bei jeder Änderung.

## Worked Example am Projekt

Ein kompaktes Worked Example für diese Phase, direkt am Projekt
`p-rag-capstone` nachlesbar (`content/projects/rag-capstone/`, Dateien in
Klammern).

**Abschlussphase: Demo und Diagnose aus eingefrorenen Messwerten.** `demo_metrics()`
liest Recall 0,75 → 0,80, Kosten und Subgruppenwerte ausschließlich aus den
eingefrorenen Berichten. Ein Assert gegen das Manifest verhindert heimliche
Neuberechnung mit anderen Seeds. `final_diagnosis(events)` listet am Ende,
welche Kompetenzen `retained` sind und wo ein Wiederholungstag fehlt
(`tests/test_w39_artifacts.py`, `solution/pipeline.py`).

## Capstone-Artefakte sind Arbeitsnachweise

Demo, Retrospektive, Karteninhalte und Selbstberichte dokumentieren Arbeit: Sie sind **Arbeitsnachweise, nie Kompetenznachweise**. Mastery entsteht in dieser Plattform
ausschließlich aus den deterministisch geprüften Teiltests der Phasen
(≥ 2 unabhängige Treffer, ≥ 2 Definitionen, ≥ 14 Tage Abstand, keine
disqualifizierte Instanz). Der Projekt-Runner-Report trägt deshalb
`integrity: self-reported`: Er ist ein lokaler Nachweis, kein Zertifikat. Und genau diese Grenze offen zu legen ist Teil der Abschlussnote an dich
selbst.

## Begriffe auf einen Blick

- **Abnahme**: die formale Prüfung aller Verträge mit Mängelprotokoll am Ende der Pipeline.
- **Mängelprotokoll**: die schriftliche Liste offener Probleme und Grenzen bei der Abnahme.
- **Abschlussdiagnose**: die Auswertung der Evidenzregeln: zwei unabhängige Treffer, zwei Definitionen, vierzehn Tage Abstand.
- **Demo**: die Vorstellung aus eingefrorenen Messwerten; sie erfindet keine Zahlen.
- **Arbeitsnachweis**: Demo, Retrospektive und Berichte dokumentieren Arbeit; sie sind kein Kompetenznachweis.
