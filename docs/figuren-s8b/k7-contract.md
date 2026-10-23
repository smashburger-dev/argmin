# K7: reine gerichtete Graphen

Frühe Übergabe für S7, 19.10.2026. Implementierung in
`assets/js/figures/kit/graph.mjs`. Keine Änderung bestehender Kit-Dateien.

`validateGraph(graph)` prüft IDs, Referenzen und endliche Positionen.
`graphPrimitives(graph, state)` liefert vorhandene Ebenen-Primitive;
`edgePoint(graph, edgeId, progress)` einen Punkt zwischen den beschnittenen
Kantenenden. Fortschritt von 0 bis 1, Ebene x nach rechts, y nach unten.

```js
const graph = {
  nodes: [
    { id: 'laden', at: [50, 18], label: 'Laden', width: 38 },
    { id: 'index', at: [50, 52], label: 'Index', width: 38 },
  ],
  edges: [{ id: 'docs', from: 'laden', to: 'index' }],
};
const prims = graphPrimitives(graph, {
  values: { laden: 'docs', index: 'Terme' },
  activeNodes: ['index'], activeEdges: ['docs'], markers: { docs: 0.5 },
});
```

Knoten haben standardmäßig Breite 23 und Höhe 20. Werte sind kurze Strings.
`singleLine: true` zentriert nur das Knotenlabel; der Wert-Key bleibt verborgen
erhalten. Kompakte Knoten können dafür eine eigene `height` setzen.
Jede Kante erzeugt dauerhaft einen Pfeil und eine Marke; fehlende Marken
haben Deckkraft null. Pro Knoten bleiben Rechteck und zwei Text-Keys stabil.
Die Szene bettet die Primitive in ihre eigene Lesefläche ein. Das Beispiel
ist kein allgemeiner Layoutalgorithmus. Knotenrechtecke dürfen sich nicht
überdecken. Längere Beschriftungen brauchen entsprechend breitere Knoten.

Fachliche Kantenrichtung und rückwärts laufende Marke sind getrennt.
Modellrechnung, topologische Aufgabenbewertung und Ereignisbehandlung sind
kein Teil von K7. Der aktuelle Vertrag umfasst ebene Graphen, keine räumlichen
Knoten. S7 kann eigene IO-Schlüssel als Kanten-IDs verwenden.

Anfrage an S2b/Integrator: Vor einer Toposort-Aufgabe fehlen die zugewiesene
kanonische Antwortform, tastaturbedienbare Reihenfolgeauswahl und der
deterministische Graderpfad. Für freie Parameter und Auswahl gelten dieselben
offenen gemeinsamen Verträge aus dem Sessionplan. Keine Familien-Ersatz-UI.
Statische Teile werden erst aufklappbar, wenn Öffnen, Schließen, Fokus und
ARIA-Zustand tatsächlich zugänglich implementiert sind. Bis dahin bleiben
sie feste Darstellungen mit vollständiger Zustands- und Druckbeschreibung.
