# Reproduzierbare Capstone-Pipeline

Die Capstone-Phasen entwickeln **eine** Pipeline weiter — kein neues
Miniprojekt pro Lektion. Der Stoff ist die Pipeline selbst: ein eingefrorener
Datenfluss über den Kern des GenAI-Prototyps (`src/w30_core.py`, byte-identisch und per
sha256 gepinnt), eine config-getriebene Hauptfunktion, eine feste Evaluation,
ein defensives Red-Team gegen den **eigenen** Toy-Prototyp und am Ende
Artefakte, die ein Dritter nachvollziehen kann. Wilson et al. nennen das
Niveau „good enough“: Setup, Software, Tests und Fehlerbehandlung — nicht
Perfektionsstreben. Die Turing Way ergänzt den Blick des Gegenübers: Was braucht
jemand, der dein Ergebnis ohne dich neu erzeugen soll?

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

## Pipeline-Stages mit IO-Verträgen

Die Pipeline ist ein gerichteter Graph aus Stages. Jede Stage deklariert,
welche **Ausgaben anderer Stages** sie konsumiert und welche Schlüssel sie
selbst erzeugt; Schlüssel ohne erzeugende Stage sind externe Dateien. Daraus
lässt sich die Reihenfolge topologisch sortieren — und ein Zyklus ist ein
Designfehler, der beim Sortieren sichtbar wird statt zur Laufzeit. Der
Integrationsvertrag steckt in den IO-Schlüsseln: Wer `rankings` verbraucht,
weiß, welche Form zu erwarten ist. Fehlerzustände sind Teil des Vertrags:
Eine Stage antwortet immer mit einem Sentinel-Status (`ok`, `fehler`,
`timeout`) — niemals mit `None`, einem Ersatzwert oder einem stillen
Fallback. Timeouts messen wir mit einer **virtuellen Uhr**
(`call_with_timeout(fn, budget, clock)`): Die Uhr ist ein Parameter, es gibt
kein `sleep`, und die Tests steuern die Zeit von Hand.

## Feste Evaluation: einfrieren, nicht nachjustieren

Die Evaluation steht vor der Optimierung fest: acht Queries über dem
ungeänderten Korpus des GenAI-Prototyps, davon die vier Queries des GenAI-Prototyps wörtlich als Teilmenge,
Subgruppen-Labels an jeder Query, Schwellen und Capstone-Baseline in der
Konfiguration. Gemessen wird beides getrennt: **Retrievalfehler** (kein
Dokument gefunden, `retrieval_status: leer`) sind andere Fehler als
**Antwortfehler** (blockiert oder kein Treffer auf der Antwortebene). Wer
beides in einen Topf wirft, kann die Ursache nicht mehr benennen. Die
Subgruppen-Recalls (hier: versand 1,0, garantie 1,0, recht 0,5, rabatt 0,5)
zeigen, wo der lexikalische Retriever systematisch versagt — zwei Queries
treffen bewusst nicht, und genau die gehören in die Regressionstabelle, nicht
unter den Teppich.

## Defensives Red-Team gegen den eigenen Prototyp

Das Red-Team richtet sich **nur gegen den eigenen Toy-Prototyp**: die
gelieferten Fixtures mit der Domäne `example.invalid`, Regelphrasen aus dem GenAI-Prototyp,
Least-Privilege-Policy. Anfrage **und** bestes Dokument werden geprüft — die
klassische Route steckt im Dokument. Benign-Fälle ohne Regelphrase dürfen
nicht blockiert werden, sonst misst der Detektor seine Scheingenauigkeit.
Verbotene Aktionen (`mail`, `hook`, `export` mit falschem Argument) werden
abgelehnt, Unbekanntes ebenfalls. Aus allem zusammen ergibt das Regelwerk ein
Verdict: **angenommen**, **abgelehnt** (Schwelle oder Erwartung verfehlt)
oder **abgebrochen** (die Pipeline selbst lief nicht sauber). Ein Verdict ist
eine Tabelle, kein Gefühl.

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

- *„Freeze bremst nur.“* Richtig: Freeze macht Messwerte vergleichbar; ohne
  Freeze optimierst du gegen ein bewegliches Ziel und nennst es Fortschritt.
- *„Ein hoher Gesamt-Recall genügt.“* Falsch: Subgruppen können bei gutem
  Mittel kollabieren — 0,75 Gesamt mit 0,0 in einer Gruppe ist ein
  fairnessberichtspflichtiger Befund.
- *„Stiller Fallback ist Robustheit.“* Das Gegenteil: Ein Ersatzwert
  versteckt den Fehler; der Sentinel zeigt ihn.
- *„Grüne Tests bedeuten Produktionsreife.“* Sie bedeuten nur, dass die
  gelieferten Verträge im gelieferten Rahmen halten — mehr nicht.
- *„Red-Team heißt Angriffe im echten System testen.“* Hier nicht: Wir
  testen defensiv gegen den eigenen Prototyp mit Bildungsfixtures.

## Capstone-Artefakte sind Work Evidence

Demo, Retrospektive, Karteninhalte und Selbstberichte dokumentieren Arbeit —
sie sind **Work Evidence, nie Mastery**. Mastery entsteht in dieser Plattform
ausschließlich aus den deterministisch geprüften Teiltests der Phasen
(≥ 2 unabhängige Treffer, ≥ 2 Definitionen, ≥ 14 Tage Abstand, keine
disqualifizierte Instanz). Der Projekt-Runner-Report trägt deshalb
`integrity: self-reported`: Er ist ein lokaler Nachweis, kein Zertifikat —
und genau diese Grenze offen zu legen ist Teil der Abschlussnote an dich
selbst.


## Phasen-Worked-Examples (Capstone-Phasen)

Diese Lektion bündelt die fünf Capstone-Phasen. Damit jede Phase beim
Einstieg ein frisches Beispiel hat, hier ein kompaktes Worked Example je
Phase — jeweils direkt am Projekt `p-rag-capstone` nachlesbar
(`content/projects/rag-capstone/`, Dateien in Klammern).

**Integrationsphase — Hauptfunktion und Integration: virtuelle Uhr statt sleep.** Der Stub
`langsam()` soll nach 200 virtuellen Millisekunden fertig sein, das Budget
liegt bei 120. `call_with_timeout(fn, 120, clock)` zieht eine injizierte Uhr
und liefert den Zustand `"timeout:retrieval"` statt still `NO_HIT`
(`src/pipeline.py`, `_StageAbbruch`). Der Test `test_w36_pipeline.py`
erzwingt denselben Abbruch ohne eine einzige reale Wartezeit — Zeitverhalten
ist damit deterministisch prüfbar.

**Evaluationsphase — Feste Evaluation: der Hash, der den Vergleich verweigert.** Der zweite
Eval-Lauf verbessert Recall von 0,75 auf 0,80 — aber der sha256 über das
Golden Set weicht ab: Jemand hat eine Query „korrigiert".
`verify_golden_hash` verweigert den Vergleich, bis das Set wieder dem
eingefrorenen Stand entspricht; erst dann wertet das Regelwerk aus und
entscheidet `angenommen/abgelehnt/abgebrochen`
(`golden/golden_set.json`, `tests/test_w37_eval_redteam.py`).

**Reproduktionsphase — Reproduktion und Dokumentation: der Doppellauf-Digest.** `repro_check()`
führt die Pipeline zweimal in zwei frischen Verzeichnissen aus und vergleicht
die Artefakt-Digests — nur „reproduzierbar: ja" mit übereinstimmenden Digests
zählt (`tests/test_w38_repro.py`). Der erste README-Entwurf behauptet
„produktionsreif und sicher gegen Injektion"; der Overclaim-Scanner markiert
beide Phrasen und verlangt Limitationen statt Werbetext.

**Abschlussphase — Demo und Diagnose aus eingefrorenen Messwerten.** `demo_metrics()`
liest Recall 0,75 → 0,80, Kosten und Subgruppenwerte ausschließlich aus den
eingefrorenen Berichten — ein Assert gegen das Manifest verhindert heimliche
Neuberechnung mit anderen Seeds. `final_diagnosis(events)` listet am Ende,
welche Kompetenzen `retained` sind und wo ein Wiederholungstag fehlt
(`tests/test_w39_artifacts.py`, `solution/pipeline.py`).
