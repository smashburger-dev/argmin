# Welle-3-Integrationsnachweise

Geprüfter Produktcommit: `d2f1171be06031c28546b8b2942b5a35946a6b24`. [Integrationsbericht](../session-2026-10-21-figuren-integration-welle-3.md).

## Einstieg in die Bilder

| Auswahl | Mobil hell | Mobil dunkel | Desktop hell | Desktop dunkel |
|---|---|---|---|---|
| S6b | [1](contact-s6b-375-light-1.jpg) | [1](contact-s6b-375-dark-1.jpg) | [1](contact-s6b-1440-light-1.jpg) | [1](contact-s6b-1440-dark-1.jpg) |
| S7 | [1](contact-s7-375-light-1.jpg) | [1](contact-s7-375-dark-1.jpg) | [1](contact-s7-1440-light-1.jpg) | [1](contact-s7-1440-dark-1.jpg) |
| S8a | [1](contact-s8a-375-light-1.jpg) | [1](contact-s8a-375-dark-1.jpg) | [1](contact-s8a-1440-light-1.jpg) | [1](contact-s8a-1440-dark-1.jpg) |
| S8b | [1](contact-s8b-375-light-1.jpg) | [1](contact-s8b-375-dark-1.jpg) | [1](contact-s8b-1440-light-1.jpg) | [1](contact-s8b-1440-dark-1.jpg) |
| F7/F1 gemeinsam | [1](contact-shared-375-light-1.jpg) | [1](contact-shared-375-dark-1.jpg) | [1](contact-shared-1440-light-1.jpg) | [1](contact-shared-1440-dark-1.jpg) |

[contacts.json](contacts.json) listet sämtliche 60 Dev-Kontaktbögen einschließlich Folgeseiten mit 540 Vorwärts-/Vergleichsaufnahmen. [review-dev.json](review-dev.json) enthält zusätzlich 120 Rücksprünge und verweist auf die Original-PNGs in `raw/`. Der vollständige Dev-Durchlauf entstand auf `bc17db6`; die 60 gemeinsamen F7-/F1-Zustände wurden zuletzt auf `d2f1171` erneuert und ersetzen deren Bilddateien: [review-dev-shared.json](review-dev-shared.json). Die Figur-Spezifikationen sind seit dem vollständigen Durchlauf unverändert, siehe [Quellabgleich](integration-audit.json).

Der finale öffentliche Release auf `d2f1171` besitzt einen eigenen Durchlauf und eigene Bilder: [review-release.json](review-release.json), [sechs Kontaktbögen](contacts-release.json). Direkt öffnen: [S6b](contact-release-s6b-375-light-1.jpg), [S7](contact-release-s7-375-light-1.jpg), [S8a](contact-release-s8a-375-light-1.jpg), [S8b 1](contact-release-s8b-375-light-1.jpg), [S8b 2](contact-release-s8b-375-light-2.jpg), [F7/F1](contact-release-shared-375-light-1.jpg). Alle 40 Figuren wurden im Release durchlaufen; gezeigt werden die 42 End-/Vergleichszustände bei 375 px hell.

Die isolierten Figurenaufnahmen verwenden Reduced Motion und warten auf gesetzten Szenenzustand sowie SVG-Deckkraft 1. Bei hohen gemeinsamen Karten sind globale Header und Lernzielknopf für die Kartenaufnahme ausgeblendet. Figuren und Parameter bleiben unverändert. Die [Interaktions-/Dialogbögen](contacts-ui.json) zeigen 17 separate Aufnahmen mit der normalen App-Oberfläche; Glossar und Tour verwenden normale Bewegung. Alle Kontaktbögen wurden vom Integrator geöffnet und gesichtet. Es handelt sich um manuelle Review-Artefakte, nicht um neue Snapshot-Tests oder Noas gestalterische Freigabe.

## Maschinenlesbare Nachweise

- [gates.json](gates.json): finaler Neun-Schritte-Lauf auf `d2f1171`, frühere Merge-/Reparaturläufe und absolute lokale Rohlogpfade. Skips sind separat ausgewiesen. Ein `head` in einem früheren Reparaturlauf bezeichnet den damaligen HEAD; noch nicht committed Prüfanpassungen können im Arbeitsbaum gelegen haben. Der finale Produktlauf ist committed und vollständig grün.
- [integration-audit.json](integration-audit.json): chronologische Integrationscommits, Registries, Allowlist, Fragmente, 49/50 Lektionsabdeckung und Quellgleichheit.
- [interactions.json](interactions.json): Explore-Antworttrennung/-Rückkehr, ungültige Eingabe, Reload, A/B-Kameragleichheit und Glossar. Die Formelbreiten sind DOM-Beobachtungen, keine vollständige Tastaturabnahme aller Formeln.
- [painter-return.json](painter-return.json): ursprüngliche reale A–B–A-Probe vor und nach der gemeinsamen Painter-Korrektur.
- [public-interactions.json](public-interactions.json): beide öffentlichen Matrix-Einstiege und Tour bei beiden Größen/Themes auf dem finalen Release.
- [performance.json](performance.json): drei serielle bestehende Smoothie-Läufe, Mediane und Einzelproben; `perf-run-*` enthält die dazugehörigen Rohdaten und Ausgaben. Instrumentierte Scriptzeit ist von Frameintervallen und Long Frames getrennt.
- [sizes.json](sizes.json): tatsächliche Release-Chunkgrößen mit Native-Node-/zlib-Version, Hashes und Abhängigkeiten. Größenbudgets werden nicht durch ungenannte Chunk-Auslagerung als erfüllt erklärt.
- [servers-stopped.json](servers-stopped.json): abschließender realer Port-/Prozessbefund, einschließlich 4411.
- [lint-baseline.json](lint-baseline.json): vorhandener Komplexitätsbefund mit exaktem Quellvergleich gegen den Ausgangscommit.
- [independent-review.json](independent-review.json): unabhängiger Quell-, Artefakt- und Trailreview; kein verbleibender konkreter Befund, offene Abnahmen ausdrücklich ausgenommen.

Die einmaligen Aufnahmeskripte liegen lokal unter `/private/tmp/figuren-integration-*.cjs` und `/private/tmp/figuren-integration-contact.py`; sie setzen diesen Worktree und Browserabhängigkeiten voraus. Es wurden keine neuen dauerhaften Tests angelegt. Rohlogs außerhalb dieses Verzeichnisses bleiben lokale Arbeitsartefakte. Den tatsächlichen Stand für neue Familiennachläufe aus dem Integrationszweig übernehmen, nicht aus alten isolierten Familienzweigen.
