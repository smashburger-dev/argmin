# Figuren – Integration Welle 3, 21.10.2026

S2b, S6b, S7, S8a und S8b sind auf `feature/figuren` integriert. Geprüfter Produktcommit: `d2f1171be06031c28546b8b2942b5a35946a6b24`. Das vollständige Gate auf Port 4400 ist grün. Alle temporären Server sind danach beendet; Ports 4400–4411 sind frei. Es wurde nichts gepusht.

Arbeitsverzeichnis: `/Users/no8/.windsurf/worktrees/argmin/argmin-figuren`. Die vorhandene Änderung an `docs/session-2026-10-16-figuren-recherche.md` bleibt unberührt und uncommitted. Der primäre Checkout und die Familienzweige bleiben erhalten. Der abschließende Dokumentationscommit enthält ausschließlich Bericht, Prüfartefakte und die aktualisierte Zuständigkeitsliste.

## Reihenfolge und gemeinsame Verträge

| Schritt | Integrationscommit | Ergebnis |
|---|---|---|
| S2b | `7c30e7a45a96f551d05ca8b8085896e3ce6da7aa` | Gemeinsame Verträge zuerst integriert |
| Gemeinsame Verbraucher | `8172c3e82599d5aad2ae1e5291905dd9c480451f` | Compiler, 2240 Node-Prüfungen, Typecheck am konkreten Commit grün |
| S6b | `4582be981ffceab71b8e5320532f83630a52817b` | Danach bestehende Prüfannahmen in `a18e849` angepasst; Node/Typecheck grün |
| S7 | `7c3a07f652a5561f47d4c5eb79839f8a3cc7da6c` | Bestehende Inhaltsprüfung in `61835ff` angepasst; Node/Typecheck grün |
| S8a | `9c0d9ef6c75725102694ca7b55bfec4972f1d960` | Node/Typecheck grün |
| S8b | `2947c6695f68362a119f2edb551834098f1e7cfe` | Node/Typecheck grün |
| Familienfragmente | `31fa9a2b4d3621a6770d49cc826ae53068bd9bf0` | Alle drei Übergaben unter eindeutigem Lektionsbesitz eingebunden |

S2b und S6b mergten ohne Konflikt. S7, S8a und S8b hatten ausschließlich Konflikte in `assets/js/figures/scenes/index.mjs`, `src/figures/registry.ts` und `tools/build_public.mjs`. Diese wurden als additive, alphabetische Vereinigungen gelöst. Andere Konflikte traten nicht auf. Die spätere Entfernung eines ausdrücklich stillgelegten öffentlichen Allowlist-Eintrags gehört zur gesonderten Verbraucherkorrektur `d2f1171`.

Die gemeinsame Verbraucherkorrektur behebt eine reale A–B–A-Rückkehr: Der Painter darf einen unveränderten Item-Cache erst verwenden, wenn dieses Item zuletzt in dieselbe DOM-Gruppe gemalt wurde. Die Browserprobe stellte A vor der Korrektur nicht wieder her, danach schon. F7 benennt Lernrate η sowie A: Ridge/B: Lasso ausdrücklich; die Szenenbeschriftung unterscheidet Ridge und Lasso. Die gemeinsamen Runtime-, Painter-, Engine-, Schema- und Compilerquellen sind seit dem geprüften Vertrag `8172c3e` unverändert. [Quellabgleich und Reihenfolge](figuren-integration-welle-3/integration-audit.json).

Die vorhandenen Inhaltsprüfungen erkennen `.fig.json` und prüfen die gesamte über mehrere Prosa-Blöcke verteilte Lektion. Die vorhandene mobile Matrixprüfung verwendet die integrierte Matrixlektion. Es wurden keine neuen dauerhaften Tests oder Snapshot-Baselines angelegt.

## Eindeutiger Besitz der Fragmente

- **S7:** S8as Beispiel zu systematisch fehlenden großen Umsätzen steht in `l-data-cleaning`, nach der ursprünglichen Fehlwerte-Erklärung und vor dem Sentinel-Abschnitt. Die ursprüngliche S7-Prosa bleibt erhalten; die übergebene Figur ist bytegleich eingebunden. Die Lektion enthält jetzt zwei Beat-Figuren.
- **S8b:** S7s RAG- und Freeze-Prosa stehen bytegleich in den S8b-Lektionen neben deren K7-Darstellungen. Es gibt keine zweite konkurrierende Einbindung.

Die neue Integrationsübersicht zählt **58 öffentliche Figur-Spezifikationen in 49 von 50 Lektionen**: 47 Beats, eine Explore-, eine Compare- und neun Inline-Figuren. `l-ml-svm-pca` bleibt der sichtbare S5b-Nachlauf. Beide Registries enthalten dieselben 53 Szenen; die Allowlist enthält 399 Einträge ohne Duplikate oder fehlende Release-Dateien. Alte Visualisierungsquellen wurden nicht gelöscht.

## Abschlussgate und behobene Befunde

[gates.json](figuren-integration-welle-3/gates.json) enthält Befehle, Zeiträume, Produktcommit, Ergebnisse und die lokalen Rohlogpfade. Der abschließende Lauf prüft exakt `d2f1171`:

| Prüfung | Ergebnis |
|---|---|
| Compiler, Inhaltsvalidierung, Coverage, Typecheck | grün |
| Öffentlicher Release einschließlich Lizenz-/Leak-Prüfungen und Build-Validierung | grün |
| Node | 2240 bestanden, 0 Fehler, 0 Skips |
| Project-Runner | 19 bestanden, ein Skip, kein Fehler |
| Chromium Dev auf 4400 | 96 bestanden, 26 bedingte Skips |
| Chromium Release auf 4400 | 95 bestanden, 27 bedingte Skips |

Das volle Gate reproduzierte zu schwachen Textkontrast während der Glossar- und Tour-Einblendung. `bc1ef8f` und `bc17db6` behalten die kurze Bewegung bei voller Textdeckkraft. Die vorhandenen Dialogprüfungen und anschließend das komplette Gate bestanden.

Der unabhängige Review fand einen noch öffentlich beworbenen Einstieg zur stillgelegten `column-picture`-Route. `d2f1171` führt Werkzeug und Lektionsprosa zur tatsächlichen Matrixlektion und beschreibt deren feste Beispiele zutreffend. Die alte Quelle bleibt erhalten, ihr Release-Allowlist-Eintrag entfällt. Beide Links wurden im öffentlichen Browserbuild angeklickt und zeigten die reale Figur. [Interaktionsnachweis](figuren-integration-welle-3/public-interactions.json).

Der fokussierte Lint-Lauf meldet die bereits vor der Integration vorhandene Komplexität 36 von `validateAgainstSchema` in der bestehenden Transformer-Inhaltsprüfung. Der Funktionskörper ist gegenüber dem Ausgangscommit bytegleich. Keine Unterdrückung oder sachfremde Umstrukturierung. Bekannte Warnungen zur fehlenden vendorten Pyodide-Source-Map und zu KaTeX-Eurozeichen bleiben unverändert.

## Tatsächliche Sicht- und Interaktionsprüfung

Die Auswahl umfasst alle 37 Figur-Spezifikationen der vier Familienlieferungen einschließlich des ergänzten Fehlwerte-Fragments sowie drei gemeinsame F7-/F1-Verbraucher. Aufgenommen wurden 660 Dev-Zustände: 540 Vorwärts-/A/B-Aufnahmen und 120 Rücksprünge, jeweils bei 375 und 1440 px, hell und dunkel. Alle 60 Kontaktbögen wurden geöffnet und gesichtet. Der finale öffentliche Release wurde für dieselben 40 Spezifikationen vollständig durchlaufen; 42 End-/A/B-Zustände auf sechs weiteren Kontaktbögen wurden ebenfalls gesichtet. Keine leeren Figuren, abgebrochenen Szenen oder Browser-Exceptions in diesen Läufen.

Der vollständige Dev-Durchlauf stammt von `bc17db6`; die drei gemeinsamen Verbraucher wurden auf `d2f1171` erneut aufgenommen. Der Release-Durchlauf stammt vollständig von `d2f1171`. Der Quellabgleich belegt unveränderte Figur-Spezifikationen seit dem vollständigen Dev-Durchlauf. [Bilderverzeichnis und Aufnahmegrenzen](figuren-integration-welle-3/README.md).

Die einmaligen Browserproben bestätigen getrennte Explore-Antworten je Parametersatz, Rückkehr von Antwort und Urteil, Ablehnung ungültiger Schritte ohne Bildänderung, Wiederherstellung des übernommenen Werts nach Reload sowie Ridge–Lasso–Ridge bei gleicher Kamera. Glossar und Tour wurden zusätzlich bei normaler Bewegung in beiden Größen und Themes aufgenommen. [Interaktionen](figuren-integration-welle-3/interactions.json), [Dialoge und öffentlicher Einstieg](figuren-integration-welle-3/public-interactions.json).

Der erste Aufnahmetreiber überschrieb die Viewport-Metadaten mit der Kartenbreite; seine Rücksprung-Zuordnung schlug dadurch fehl. Der Treiber wurde korrigiert und der vollständige Durchlauf wiederholt. Bei hohen Karten wurden die überlagernden globalen Header-/Lernziel-Bedienelemente ausschließlich für die isolierte Kartenaufnahme vorübergehend ausgeblendet; die Figur blieb unverändert. Die separaten Interaktionsbilder zeigen die unverdeckte App-Oberfläche einschließlich dieser Elemente. Das ist keine gestalterische Abnahme durch Noa.

## Gemessene Grenzen und nächste Zuständigkeit

Vorhandene opt-in Smoothie-Performanceprüfung, Chromium, CPU-Drosselung 4×, ein Worker, drei serielle Läufe ohne konkurrierenden Build oder Browserlauf. Angegeben ist der Median dreier Laufmediane der instrumentierten Build-/Sortier-/Paint-Scriptzeit, keine gesamte Browser-Framezeit und kein Nachweis für jede Familienszene. Die Prüfung sichert Messproben und höchstens einen Tick pro Frame; sie erzwingt die folgenden Budgets nicht. [Rohwerte und Streuung](figuren-integration-welle-3/performance.json).

| Viewport | Beats | Drag | Board |
|---|---:|---:|---:|
| 1440 px | 5,4 ms | 10,1 ms | 10,0 ms |
| 375 px | 4,8 ms | 9,2 ms | 9,1 ms |

Beat-Mindestziel unter 6 ms erfüllt; bevorzugtes Ziel unter 4 ms und Drag/Board unter 8 ms bleiben offen. Kein relativer Geschwindigkeitsgewinn wird behauptet. Native Node gzip misst den Runtime-JS-Chunk mit **11682 B**, dessen CSS mit 1558 B und das Shared-Kit mit 6761 B; größter Szenenchunk 9481 B. Das Runtime-Ziel unter 10000 B ist verfehlt. Transitive Abhängigkeiten, Laufzeit und Hashes sind separat ausgewiesen: [sizes.json](figuren-integration-welle-3/sizes.json).

Die verbindliche Zuordnung steht im [Sessionplan](figuren-sessionplan.md#anfragen-aus-welle-3-und-nächste-zuständigkeit): S2c übernimmt gemeinsame Verträge und Budgets; S6b die F2-Auswahl-/Explore-Verbraucher; S7 Schwellen-/Pipeline-Bedienungen; S8a Histogramm-/Baum-Bedienungen; S8b Topologie und zugängliche Belegkarten. Kein neuer Chat wurde automatisch gestartet.

**S5b bleibt offen:** PCA, K-Means und sichere F3-/F4-Hinweisadapter. **F7 bleibt offen:** sichere Hinweise, `pick-learning-rate`, mobile Familienabnahme und Noas Freigabe. **F1 bleibt offen:** Namens-/Objektauswahl, sichere Hinweise, `tag-after-line`, freie Parameter, Kurzschluss und implementierter CPython-/Präfixvertrag. Integrierte Darstellungen ersetzen diese Abnahmen nicht.

## Attention

Reviewmodell angefordert: `gpt-5.6-sol`; tatsächliches Laufzeitmodell unabhängig nicht nachweisbar. Der [unabhängige Quell-, Artefakt- und Trailreview](figuren-integration-welle-3/independent-review.json) meldet nach `d2f1171` keinen verbleibenden konkreten Befund. Zu beachten bleiben die oben ausgewiesenen Familien-/Budgetabnahmen und die bedingten Test-Skips.

Das lokale, nicht committed Entscheidungsprotokoll liegt unter `/private/tmp/figuren-integration-welle-3/decisions.tsv`. Seine ersten drei Zeitstempel sind ausdrücklich als rekonstruierte Reihenfolgeanker gekennzeichnet; Messzeiten stammen aus den Prüfartefakten. Der anfängliche Serverbefund ist nur im Sitzungsausgang erhalten. Der abschließende Zustand ist dauerhaft belegt: [servers-stopped.json](figuren-integration-welle-3/servers-stopped.json).
