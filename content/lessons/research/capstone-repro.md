# Capstone-Pipeline: Evidenz und Reproduzierbarkeit

Die Capstone-Phasen entwickeln **eine** Pipeline weiter — kein neues
Miniprojekt pro Lektion. Diese Phase macht den Stand nachvollziehbar:
Doppellauf mit Digest-Vergleich, gepinnte Versionen und Dokumentation
ohne Overclaims.

## Manifest und Freeze: zuerst zubetonieren, dann bauen

Bevor Implementierung losgeht, wird festgezurrt, was sich nicht mehr ändern
darf: Golden Set, Angriffs-Fixtures, Experimentkonfiguration, Testdateien und
der gepinnte Kern des GenAI-Prototyps. Das `check-manifest.json` hält für jede dieser Dateien
den sha256 fest; Lernenden-Dateien stehen dort mit `sha256: null` und werden
nur auf Anwesenheit geprüft — du darfst an `src/pipeline.py` arbeiten, an
`golden/` nicht. `assert_frozen()` rechnet die Hashes bei jedem Lauf nach und
scheitert hörbar, wenn jemand „nur schnell“ eine Erwartung angepasst hat.
Dazu gehören **versionierte Seeds und Konfiguration**: `seeds.pipeline` und
Konsorten stehen in `config/experiment.json`, nicht verstreut im Code. Ein
Wechsel eines Seeds ist ein Experimentwechsel — er gehört in eine neue
Version, nicht in eine stillschweigende Korrektur. Sandve et al. fassen die
Regel so: Jede Zahl im Bericht muss aus Code und Daten wieder ableitbar sein.

## Reproduktion und Dokumentation

Reproduktion heißt Doppellauf mit Digest-Vergleich: zwei frische Läufe
erzeugen byte-identische Ergebnisse, und `run_digest` ist der sha256 über die
kanonische Serialisierung. Gepinnte Versionen enthalten keine
Bereichs-Specs — `pytest>=8` ist ein Wetteinsatz, `pytest 8` ein Fakt. Die
Dokumentation nennt ihre Pflichtüberschriften (Setup, Abhängigkeiten,
Konfiguration, Karten, Limitations, Bekannte Fehler) und bleibt frei von
Overclaims: „produktionsreif“, „sicher gegen“, „halluziniert nie“, „getestet
gegen alle“ sind verbotene Phrasen, weil sie unbelegte Sicherheit verkaufen.
Der Overclaim-Detektor ist bewusst ein simpler Phrasenscanner — er ersetzt
kein Review, er erzwingt nur ehrliche Formulierungen. Absolute Pfade des eigenen Rechners
(Heimatverzeichnisse und Ähnliches) gehören in keine Projektquelle.

## Demo aus festen Messwerten

Die Demo erfindet nichts: `demo_metrics()` liest die eingefrorenen Werte aus
`golden/expected_results.json` und assertiert sie gegen jede Neuberechnung —
weicht etwas ab, wirft die Funktion, statt alte Zahlen vorzuzeigen. Abbildungen
und Folien entstehen aus genau diesen Messwerten (Rougier et al.: Eine gute
Abbildung ist eine Aussage über Daten, die man benennen kann). Die
Abschlussdiagnose (`final_diagnosis`) prüft Evidenzregeln: zwei unabhängige
Treffer, zwei verschiedene Definitionen, mindestens vierzehn Tage Abstand —
und das Anzeigen einer Lösung disqualifiziert genau diese Instanz.

## Typische Fehlvorstellungen

- *„Grüne Tests bedeuten Produktionsreife.“* Sie bedeuten nur, dass die
  gelieferten Verträge im gelieferten Rahmen halten — mehr nicht.

## Worked Example am Projekt

Ein kompaktes Worked Example für diese Phase — direkt am Projekt
`p-rag-capstone` nachlesbar (`content/projects/rag-capstone/`, Dateien in
Klammern).

**Reproduktionsphase — Reproduktion und Dokumentation: der Doppellauf-Digest.** `repro_check()`
führt die Pipeline zweimal in zwei frischen Verzeichnissen aus und vergleicht
die Artefakt-Digests — nur „reproduzierbar: ja" mit übereinstimmenden Digests
zählt (`tests/test_w38_repro.py`). Der erste README-Entwurf behauptet
„produktionsreif und sicher gegen Injektion"; der Overclaim-Scanner markiert
beide Phrasen und verlangt Limitationen statt Werbetext.

## Capstone-Artefakte sind Work Evidence

Demo, Retrospektive, Karteninhalte und Selbstberichte dokumentieren Arbeit —
sie sind **Work Evidence, nie Mastery**. Mastery entsteht in dieser Plattform
ausschließlich aus den deterministisch geprüften Teiltests der Phasen
(≥ 2 unabhängige Treffer, ≥ 2 Definitionen, ≥ 14 Tage Abstand, keine
disqualifizierte Instanz). Der Projekt-Runner-Report trägt deshalb
`integrity: self-reported`: Er ist ein lokaler Nachweis, kein Zertifikat —
und genau diese Grenze offen zu legen ist Teil der Abschlussnote an dich
selbst.
