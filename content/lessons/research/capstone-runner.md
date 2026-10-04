# Capstone-Pipeline: Stage-Runner und Budgets

Diese Phase betreibt die Gewerke: Die Stages laufen in fester Reihenfolge und übergeben jedes Ergebnis nach Vertrag, mit Budget und Sentinel-Zuständen. Die Capstone-Phasen entwickeln eine Pipeline weiter, kein neues Miniprojekt pro Lektion.

## Das Bild dahinter: Gewerke mit Übergabeprotokoll

Stell dir die Ausführung auf der Baustelle vor: Jedes Gewerk übergibt seine Arbeit mit einem Protokoll an das nächste. Fehlt die Übergabe oder ist sie fehlerhaft, stoppt die Baustelle, statt mit einem „geht schon“ weiterzumachen. Das Zeit- und Kostenbudget entscheidet, wann abgebrochen wird.

Wo der Vergleich hinkt: Ein Bauwerk wird einmal gebaut. Deine Pipeline läuft immer wieder; jedes Übergabeprotokoll muss deshalb maschinell prüfbar sein, nicht nur lesbar.


## Manifest und Freeze: zuerst zubetonieren, dann bauen

Bevor Implementierung losgeht, wird festgezurrt, was sich nicht mehr ändern
darf: Golden Set, Angriffs-Fixtures, Experimentkonfiguration, Testdateien und
der gepinnte Kern des GenAI-Prototyps. Das `check-manifest.json` hält für jede dieser Dateien
den sha256 fest; Lernenden-Dateien stehen dort mit `sha256: null` und werden
nur auf Anwesenheit geprüft: Du darfst an `src/pipeline.py` arbeiten, an
`golden/` nicht. `assert_frozen()` rechnet die Hashes bei jedem Lauf nach und
scheitert hörbar, wenn jemand „nur schnell“ eine Erwartung angepasst hat.
Dazu gehören **versionierte Seeds und Konfiguration**: `seeds.pipeline` und
Konsorten stehen in `config/experiment.json`, nicht verstreut im Code. Ein
Wechsel eines Seeds ist ein Experimentwechsel; er gehört in eine neue
Version, nicht in eine stillschweigende Korrektur. Sandve et al. fassen die
Regel so: Jede Zahl im Bericht muss aus Code und Daten wieder ableitbar sein.

## Pipeline-Stages mit IO-Verträgen

Die Pipeline ist ein gerichteter Graph aus Stages. Jede Stage deklariert,
welche **Ausgaben anderer Stages** sie konsumiert und welche Schlüssel sie
selbst erzeugt; Schlüssel ohne erzeugende Stage sind externe Dateien. Daraus
lässt sich die Reihenfolge topologisch sortieren; ein Zyklus ist ein
Designfehler, der beim Sortieren sichtbar wird statt zur Laufzeit. Der
Integrationsvertrag steckt in den IO-Schlüsseln: Wer `rankings` verbraucht,
weiß, welche Form zu erwarten ist. Fehlerzustände sind Teil des Vertrags:
Eine Stage antwortet immer mit einem Sentinel-Status (`ok`, `fehler`,
`timeout`), niemals mit `None`, einem Ersatzwert oder einem stillen
Fallback. Timeouts messen wir mit einer **virtuellen Uhr**
(`call_with_timeout(fn, budget, clock)`): Die Uhr ist ein Parameter, es gibt
kein `sleep`, und die Tests steuern die Zeit von Hand.

## Demo aus festen Messwerten

Die Demo erfindet nichts: `demo_metrics()` liest die eingefrorenen Werte aus
`golden/expected_results.json` und assertiert sie gegen jede Neuberechnung; weicht etwas ab, wirft die Funktion, statt alte Zahlen vorzuzeigen. Abbildungen
und Folien entstehen aus genau diesen Messwerten (Rougier et al.: Eine gute
Abbildung ist eine Aussage über Daten, die man benennen kann). Die
Abschlussdiagnose (`final_diagnosis`) prüft Evidenzregeln: zwei unabhängige
Treffer, zwei verschiedene Definitionen, mindestens vierzehn Tage Abstand; das Anzeigen einer Lösung disqualifiziert genau diese Instanz.

## Typische Fehlvorstellungen

- *„Stiller Fallback ist Robustheit.“* Das Gegenteil: Ein Ersatzwert
  versteckt den Fehler; der Sentinel zeigt ihn.
- *„Grüne Tests bedeuten Produktionsreife.“* Sie bedeuten nur, dass die
  gelieferten Verträge im gelieferten Rahmen halten, mehr nicht.

## Wo dir das in der KI begegnet

Produktive ML-Systeme laufen in solchen Pipelines: eingefrorene Daten, Stages mit Verträgen und automatische Regressionstests bei jeder Änderung.

## Worked Example am Projekt

Ein kompaktes Worked Example für diese Phase, direkt am Projekt
`p-rag-capstone` nachlesbar (`content/projects/rag-capstone/`, Dateien in
Klammern).

**Integrationsphase: Hauptfunktion und Integration: virtuelle Uhr statt sleep.** Der Stub
`langsam()` soll nach 200 virtuellen Millisekunden fertig sein, das Budget
liegt bei 120. `call_with_timeout(fn, 120, clock)` zieht eine injizierte Uhr
und liefert den Zustand `"timeout:retrieval"` statt still `NO_HIT`
(`src/pipeline.py`, `_StageAbbruch`). Der Test `test_w36_pipeline.py`
erzwingt denselben Abbruch ohne eine einzige reale Wartezeit; Zeitverhalten
ist damit deterministisch prüfbar.

## Capstone-Artefakte sind Arbeitsnachweise

Demo, Retrospektive, Karteninhalte und Selbstberichte dokumentieren Arbeit: Sie sind **Arbeitsnachweise, nie Kompetenznachweise**. Mastery entsteht in dieser Plattform
ausschließlich aus den deterministisch geprüften Teiltests der Phasen
(≥ 2 unabhängige Treffer, ≥ 2 Definitionen, ≥ 14 Tage Abstand, keine
disqualifizierte Instanz). Der Projekt-Runner-Report trägt deshalb
`integrity: self-reported`: Er ist ein lokaler Nachweis, kein Zertifikat. Und genau diese Grenze offen zu legen ist Teil der Abschlussnote an dich
selbst.

## Begriffe auf einen Blick

- **Stage**: ein abgeschlossener Schritt der Pipeline mit Ein- und Ausgaben.
- **IO-Vertrag**: die verbindliche Form, in der eine Stage ihr Ergebnis an die nächste übergibt.
- **Sentinel-Status**: ein expliziter Fehlerzustand wie `fehler` oder `timeout`, der niemals durch Ersatzwerte versteckt wird.
- **Budget**: der Zeit- und Kostenrahmen, den eine Stage oder der Lauf nicht überschreiten darf.
- **Virtuelle Uhr**: eine simulierte Zeit, mit der Timeouts getestet werden, ohne real zu warten.
- **Arbeitsnachweis**: Demo, Retrospektive und Berichte dokumentieren Arbeit; sie sind kein Kompetenznachweis.
