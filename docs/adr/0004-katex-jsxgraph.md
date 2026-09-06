# ADR-0004: KaTeX für Formeln, JSXGraph für interaktive Visualisierungen

Status: Angenommen (beide Spikes bestanden 2026-08-24).

## Entscheidung
- **KaTeX 0.18.4** (MIT) rendert alle Formeln; Fonts lokal unter `vendor/katex/dist/fonts/`. Kein MathJax in der Plattform-Shell (MathJax 4 kommt nur innerhalb der Numbas-Runtime mit).
- **JSXGraph 1.13.2** (MIT oder LGPL, MIT gewählt) für Visualisierungen mit Lernziel. Jede Interaktion ist zusätzlich über Zahlenfelder/Regler tastaturbedienbar (Spike-Beleg: spinbutton-Steuerung der Vektorspitze); Farbe nie alleiniger Informationsträger (Beschriftung + Ausgabewerte).

## Alternativen
- **MathJax überall**: doppelter Stack (Numbas bringt schon MathJax mit); KaTeX ist schneller und schlanker für statische Formeln.
- **MathLive** (MIT, 0.110.0): barrierefreie Formel-EINGABE — im Pilot nicht nötig (Numbas hat eigene Eingabe-Widgets); wiedervorgelegt ab algebraischen Freitext-Aufgaben ohne Numbas.
- **Cortex Compute Engine** (MIT): nur falls eigener symbolischer Vergleich nötig würde (vgl. ADR-0002) — nicht der Fall.
- **D3/plotly**: für die mathematischen Zwecke (Vektoren, Transformationen, Gradient) schwerer und weniger zielgerichtet als JSXGraph.

## Getesteter Integrationsweg
Spike `spikes/katex-jsxgraph-spike.html`: KaTeX-Rendering verifiziert (`.katex-html` + Math-Role im A11y-Tree, offline-Fonts geladen); JSXGraph-Board mit Vektorpfeil, Drag UND Zahlenfelder synchronisiert, `Skalarprodukt` live.

## Lizenz / Offline / Bundle / Wartung / Aufwand / Rückbau
MIT bzw. MIT-gewählt; vollständig offline; je ~1 MB nur bei Bedarf (KaTeX initial, JSXGraph lazy); beide aktiv (2026er Releases); Aufwand gering; Rückbau: Vendor-Ordner + eine Skript-Zeile.

## Barrierefreiheit
JSXGraph hat Tastatursteuerung für Elemente (seit 1.3.0, CHANGELOG); because nicht jedes Board-Element zuverlässig fokussierbar ist, gilt die Pflicht-Zahlenfeld-Kombination als garantierte Tastatur-Route. Dokumentiert als Teilverzicht auf reine JSXGraph-Tastaturbedienung.
