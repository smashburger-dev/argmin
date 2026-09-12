# Capstone-Pipeline: Regression und Evaluationsregeln

Die Capstone-Phasen entwickeln **eine** Pipeline weiter — kein neues
Miniprojekt pro Lektion. Diese Phase sichert die Messung ab: feste
Evaluation, getrennte Fehlerarten, Subgruppenberichte und ein defensives
Red-Team gegen den **eigenen** Toy-Prototyp.

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

## Typische Fehlvorstellungen

- *„Freeze bremst nur.“* Richtig: Freeze macht Messwerte vergleichbar; ohne
  Freeze optimierst du gegen ein bewegliches Ziel und nennst es Fortschritt.
- *„Ein hoher Gesamt-Recall genügt.“* Falsch: Subgruppen können bei gutem
  Mittel kollabieren — 0,75 Gesamt mit 0,0 in einer Gruppe ist ein
  fairnessberichtspflichtiger Befund.
- *„Red-Team heißt Angriffe im echten System testen.“* Hier nicht: Wir
  testen defensiv gegen den eigenen Prototyp mit Bildungsfixtures.

## Worked Example am Projekt

Ein kompaktes Worked Example für diese Phase — direkt am Projekt
`p-rag-capstone` nachlesbar (`content/projects/rag-capstone/`, Dateien in
Klammern).

**Evaluationsphase — Feste Evaluation: der Hash, der den Vergleich verweigert.** Der zweite
Eval-Lauf verbessert Recall von 0,75 auf 0,80 — aber der sha256 über das
Golden Set weicht ab: Jemand hat eine Query „korrigiert".
`verify_golden_hash` verweigert den Vergleich, bis das Set wieder dem
eingefrorenen Stand entspricht; erst dann wertet das Regelwerk aus und
entscheidet `angenommen/abgelehnt/abgebrochen`
(`golden/golden_set.json`, `tests/test_w37_eval_redteam.py`).
