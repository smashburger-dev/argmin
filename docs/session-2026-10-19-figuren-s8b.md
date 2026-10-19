# Figuren Welle 3 · S8b · 19.10.2026

## Stand und Basis

Arbeitsort: `/Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s8b`, normaler
Git-Worktree auf `feature/figuren-s8b`. Ausgangspunkt ist der lokal geprüfte
finale Welle-2-Integrationscommit
`1e017b749f0269ae738c967602225764b28f2688` auf `feature/figuren`.
Der neue Baum war vor der Arbeit sauber. `npm ci` verwendete die vorhandene
Lockdatei. Das Basis-Gate für Compiler, Inhalt, Typecheck und Coverage war grün.
Kein Push und kein Merge in `feature/figuren`.

Produktstand der Umsetzung: `7a6adbb`. Die frühen reinen Verträge stehen seit
`f7eee4d` bereit. Der kleine
[K7-Vertrag](figuren-s8b/k7-contract.md) ist die Übergabe an S7 und der
Anfragepunkt für S2b/Integrator. Keine bestehende Kit-Datei wurde geändert.
Engine, Painter, Runtime, CSS, Schemas, Compiler und IndexedDB blieben unverändert.
Registry und Public-Allowlist wurden additiv erweitert.

## Gelieferter Umfang und Lernentscheidungen

15 Figurenspezifikationen in 13 öffentlichen Lektionen:

| Lektion | Darstellung |
|---|---|
| `l-dl-autograd` | Vorwärtswerte und addierte Rückwärtsgradienten aus demselben DAG |
| `l-foundations-git` | Arbeitsdatei, Index, Commit und Merge-Abstammung |
| `l-tf-tokenizer` | Gelernte BPE-Paarwahl, Wortgrenzen und Verschmelzung |
| `l-genai-rag` | Überlappende Chunkfenster und fester Retrieval-Informationsfluss |
| `l-capstone-freeze` | Topologische Abhängigkeiten vor Ausführung |
| `l-foundations-learning` | Festes Fehlerjournal und feste Review-Zeitachse |
| `l-tf-papers` | Claim, Beleg, absoluter und relativer Unterschied |
| `l-research-question` | Vorab-Regel und nachträglicher Goal-Shift |
| `l-research-cards` | Gemeinsamer Projektbezug dreier Karten |
| `l-capstone-acceptance` | Kriterien, Befunde, Mängel und getrennte Mastery |
| `l-capstone-regression` | Retrieval- und Antwortfehler unterscheiden |
| `l-capstone-repro` | Gleiche kanonische Fixture-Bytes, gleiche echte Digests |
| `l-capstone-baseline` | Echter SHA-256-Siegelring mit Byteänderung |

Sechs Vorgänge verwenden Beats. Die neun statischen Darstellungen verwenden
die vorhandene Inline-Art mit einer festen Pose. Eine Karte benötigt keine
künstliche zeitliche Zerlegung. Der Hashwechsel hat dagegen einen erklärten
zeitlichen Zweck. Alle Szenen sind flach, ohne Orbit oder Bodenschatten.
Die feste Toposort-Darstellung akzeptiert keine Lernereingaben, solange der
gemeinsame Aufgabenvertrag fehlt.

Die kleinen Beispielräume sind bewusst fest gepinnt. Bereich, Zweck,
Kamerawahl und Grenzen stehen in den [Asset-Karten](figuren-s8b/assets.md).
Längere Begriffe bleiben vollständig in SVG-/Druckbeschreibung und Lektüre.
Die Inline-Bühne ist tatsächlich nur 160 px hoch; ihre Kamera wurde dafür
angepasst. Kartenwerte stehen innerhalb einer breiten Lesefläche mit Abstand
zur linken Begriffsspalte. Die 64 Hex-Zeichen drehen sich mit den vier Seiten
des Siegelrings. Die Leserichtung beginnt oben links und läuft im Uhrzeigersinn.

## Fachliche Gegenproben

Einmalige ausführbare Gegenproben außerhalb des Repositorys; keine neue
dauerhafte Testsuite. Die Ergebnisse stehen in
[model-checks.json](figuren-s8b/model-checks.json).

- Autograd: bei x=2 Werte a=6, b=4, L=10; lokale Ableitungen 3 und 4,
  upstream jeweils 1, am gemeinsamen Eingang Summe 7. Vier numerische
  Eingaben, wiederholter Operand x·x und negativer upstream wurden geprüft.
  Autoritäten: `optimize-backprop-path-sum`, `classify-backprop-path-rule`.
  Vorwärts- und Rückwärtsrechnung verwenden denselben gerichteten Graphen.
- Git: `diff`, `diff --staged`, Merge in den aktuellen Zweig sowie Commit
  des vorgemerkten Index gegen `classify-git-operation`. Die spätere
  Arbeitsänderung v3 bleibt nach Commit des Index v2 uncommitted.
- Toposort: drei DAGs gegen `trace-toposort-dependency-order`; Zyklen und
  unbekannte Vorgänger werden abgelehnt. Im Bild stehen gold vor punkte/regel
  und beide vor bericht. Andere gültige Ordnungen bleiben fachlich gültig.
- BPE: fünf Apply- und sechs Learn-Fälle gegen die unveränderten
  `referenceSolver` aus `transform-bpe-merge-apply` und
  `optimize-bpe-merge-learn`, tatsächlich in CPython ausgeführt. Enthalten:
  Links-nach-rechts ohne überlappende Ersetzung, lexikografische Gleichstände,
  Wortendmarker, frühes Ende und Wortgrenzen. Sichtbare Mergefolge: l+o,
  lo+w, low+Endmarker.
- Chunking: 98 Kombinationen gegen `trace-chunk-window-loop`. Bei Länge 10,
  Größe 4 und Überlappung 1 entstehen Starts 0/3/6/9 und abcd/defg/ghij/j.
  Das Restfenster zählt. Die alten Checkpoint-Felder sind tiefengleich erhalten;
  nur die Zuordnung zum passenden Beat kam hinzu.
- SHA-256: 13 tatsächliche Node-Fälle gegen `node:crypto.createHash`, darunter
  leerer Text, Unicode, Block-/Padding-Grenzen und alle Bytewerte. Für a→b
  unterscheiden sich 126 von 256 Bits. Der Digest wird berechnet; die
  Animation behauptet keine zusätzlichen Zwischenhashes und keine mathematische
  Kollisionsfreiheit. Keine fremde Kryptobibliothek oder CDN-Abhängigkeit.
- K7: abgeschnittene Kantenenden, stabile Schlüssel und DOM-freier Vertrag.

Alle alten `.viz.json` und JSXGraph-Dateien bleiben erhalten. Der alte
`chunk-overlap`-Verweis ist zusätzlich im lokalen S8b-Archiv dokumentiert.
Dieses Archiv ist nicht public allowlisted und zählt nicht als weitere Lektion.

## S7-Übergabe und offene Integration

Die beiden Prosa-Fragmente aus S7-Commit
`b4d31c3d0b0dc8c8ab96b5c3f3b2681f05d7187d` sind bytegleich übernommen und
in den ausschließlich von S8b geschriebenen Lektionen eingebunden:

- `docs/figuren-s7/s7-l-genai-rag-fragment.md` wurde
  `content/lessons/genai-systems/rag-retrieval-s7-handoffs.md`.
- `docs/figuren-s7/s7-l-capstone-freeze-fragment.md` wurde
  `content/lessons/research/capstone-freeze-s7-handoffs.md`.

Das sind eigenständig eingecheckte Inhalte. Es gibt keine Laufzeitabhängigkeit
auf den S7-Zweig. Die Glossare stehen weiterhin nach den ergänzten Beispielen;
die vorhandenen Stilprüfungen bestehen. Die funktionale Integration von S7s
Pipeline-Szenen bleibt beim Integrator offen. Doppelte IO-/Abhängigkeitsbilder
nach dieser Integration redaktionell prüfen; die übernommene Prosa ist schon fertig.

Konkrete gemeinsame Anfragen an S2b/Integrator bleiben offen:

1. Versionierte kanonische Antwort und deterministischer Graderpfad für
   Toposort mit gleichwertigen gültigen Ordnungen sowie tastaturbedienbare
   Reihenfolgeauswahl.
2. Zugewiesener Vertrag für direkte Auswahl und freie Zahlenparameter,
   einschließlich Antworterhalt und Rückmeldung. Keine Familien-Ersatz-Runtime.
3. Zugänglicher Öffnen-/Schließen-/Fokus-/ARIA-Vertrag, bevor statische Teile
   aufklappbar werden. Bis dahin feste vollständige Darstellungen.

Ein späterer Verbraucherabschluss mit solchen APIs benötigt zuerst einen
konkret geprüften gemeinsamen Integrationscommit.

## Bestand aller 50 Lektionen

Die [Abdeckungsübersicht](figuren-s8b/coverage.md) stammt aus dem kompilierten
öffentlichen Katalog, mit konkreten Blockreferenzen je Lektion: 29 Lektionen
mit Werkbank-Figur, zehn weitere ausschließlich mit bestehender JSXGraph-
Darstellung und elf derzeit ohne Figur. Die elf Ausnahmen sind offene
Familienintegrationen, keine Behauptung fertiger öffentlicher Abdeckung:

`l-data-cleaning`, `l-ml-baseline`, `l-ml-ensembles`, `l-ml-error-analysis`,
`l-ml-repro`, `l-foundations-files-errors`, `l-genai-prototype`,
`l-genai-security`, `l-capstone-runner`, `l-responsible-ai`, `l-tf-inference`.

Ihre Zuständigkeiten stehen einzeln in der Tabelle. Bestehende Inhalte von
F1/F2/F3/F4/F7/F12 wurden nicht fremd bearbeitet. Archivlektionen sind ausgeschlossen.

## Browser, Bilder und Messungen

136 abgeschlossene Zustände bei 375/1440 px, hell/dunkel, SVG-Deckkraft 1 und
`data-settled=true`. Alle 15 Kontaktbögen sowie erforderliche mobile Einzelbilder
wurden geöffnet und betrachtet. Zurück/Weiter, Pfeiltasten, Von vorn und
entscheidende Zwischenzustände wurden tatsächlich durchlaufen. Enge Zustände
wurden zusätzlich über transformierte Textrechtecke geprüft.

Die [Galerie](figuren-s8b/review/contact.html) enthält alle regulären Bilder;
`review/contact-<name>.png` jeweils die vier Schlusszustände einer Darstellung.
Besonders geprüft: verzweigte Rückwärtsaddition, Git-Merge, BPE-Endmarker,
letztes Chunkfenster, lange Kartenwerte und gedrehte Hex-Zeichen.

[SVG-Messwerte](figuren-s8b/review/measurements.json): mindestens 14,08 px,
mindestens 5,64:1 tatsächlicher Text-/Trägerkontrast bei voller Deckkraft,
keine Textrechteck-Überlappungen. Zwischen Begriff und Wert bleiben auf den
mobilen Karten mindestens 19,57 px. Die gemeinsame HTML-Readout-Zeile ist laut
unverändertem CSS weiterhin 0,8125 rem = 13 px. Dieser schon in Welle 2
gemeldete gemeinsame Typografiebefund bleibt ausdrücklich bei S2b offen.

[Zusätzliche Bedienung](figuren-s8b/ui-checks.json): alle 15 Darstellungen bei
375×812 px mit Reduced Motion, Forced Colors, vollständigem Drucktext und
echten vertikalen Touch-Zügen. Die Kamera bleibt flach. Der Chunk-Checkpoint
wurde mit 4 beantwortet, als richtig beurteilt und nach Zurück/Weiter erhalten.
Diese Probe verwendet die vorhandene gemeinsame Bewertung.

[Frames](figuren-s8b/frame-measurements.json): vierfache CPU-Drosselung,
drei aufeinanderfolgende Läufe je Breite, Median der Mediane. Gemessen wird
der jeweils letzte Übergang der sechs zeitlichen Szenen; größte Medianzeit
1,10 ms, damit unter dem Beatziel 4 ms. Statische Inline-Bilder haben keinen
laufenden Beat-/Drag-Framepfad und werden nicht mit erfundenen Nullzeiten
als Animation gemeldet. Kamera-/Drag-Szenarien entfallen bei diesen flachen,
fest gepinnten Darstellungen. Bekannte Smoothie-Befunde bleiben gemeinsame Arbeit.

[Chunkgrößen](figuren-s8b/chunks.json): eigene Szenen und ausgelagerte Modelle
separat, keine versteckten verschobenen Bytes. Eigene Szenen liegen zwischen
930 und 2427 B gzip. Der Runtime-Quelltext bleibt unverändert; der finale
Chunk mit aktualisierten Importdateinamen misst 10028 B gzip und überschreitet
das gemeinsame 10000-B-Budget um 28 B. Welle 2 hatte 10027 B. Der Shared-Kit-
Chunk enthält auch K7 und misst 6798 B statt der 5975 B aus Welle 2.

## Abschluss-Gates

| Prüfung | Endgültiges Ergebnis |
|---|---|
| Compiler / Inhaltsvalidierung | gültig, 50 Lektionen / 290 Aktivitäten |
| `node --test tests/` | 2240 bestanden, 0 Fehler, 0 übersprungen |
| Typecheck einschließlich Coverage | bestanden |
| Release / Public-/Leakprüfung | bestanden, 1002 Dateien, 29,8 MB; JS 123,4 KiB gzip, CSS 13,2 KiB gzip |
| Lizenz-/Noticeprüfung | bestehende Node-Prüfungen und Public-Build mit gepinnten, gehashten Notices bestanden |
| Chromium Dev, strikt 4410 | 96 bestanden, 26 bestehende Skips, keine Fehler |
| Chromium Release, strikt 4410 | 95 bestanden, 27 bestehende Skips, keine Fehler |
| Project-Runner / CPython | 20 Prüfungen, davon 19 bestanden und eine bestehende übersprungen |
| Shrink Complexity | 17 eigene/geänderte Szenen-, Objekt-, K7- und Registry-Dateien grün; beide zuletzt geänderten Szenen erneut grün |

Die Chromium-Skips stammen aus vorhandenen Bedingungen: Opt-in-Messungen/
Kontaktbögen, WebKit-/iPhone-Szenarien, nur Dev bzw. nur Preview vorhandene
Pfade und ein frischer Pyodide-Vertragsbeleg für unveränderte Definitionen und
Worker-Laufzeit. Der frühere Dev-Lauf ohne diesen frischen Beleg hatte
97 bestandene und 25 übersprungene Prüfungen. Kein Skip wurde hinzugefügt.

Auf Noas ausdrücklichen Auftrag wurden ausschließlich die beiden bestehenden
Endungsprüfungen in `lesson_content_genai.test.mjs` und
`lesson_content_transformer.test.mjs` um den bereits gültigen `.fig.json`-
Blocktyp ergänzt. Keine neuen Tests, Testdateien oder Snapshot-Assertions.

Der letzte Typecheck-Start wurde zunächst durch ein Nutzungslimit der
automatischen Freigabeprüfung verhindert. Nach Noas Fortsetzungsauftrag lief
derselbe Freigabeweg erfolgreich; der abschließende Typecheck ist bestanden.

Alle eigenen Server sind beendet; Port 4410 wurde nach dem Release-Lauf als
frei geprüft. Die verbleibende Abnahme betrifft die oben benannten gemeinsamen
Verträge, S7-Pipeline-Integration und elf fremdbesessenen Lektionen. Es wird
keine Vollständigkeit aller 50 öffentlichen Figuren behauptet.
