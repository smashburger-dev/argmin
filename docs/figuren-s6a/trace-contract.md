# Erzeugte Trace-Beats: Übergabe an die Integration

S6a, Stand 18.10.2026. Noa hat die vorbereitete zentrale Expansion in dieser Session ausdrücklich S6a zugewiesen. Die vorhandene Runtime bekommt weiterhin ausschließlich gewöhnliche Beat-Arrays.

## Quelle und Kompilierung

Die `.fig.json` verwendet `kind: "beats"` und `beats: { "from": "trace" }`. Die Szene stellt `trace(model)` bereit. Das Ergebnis ist eine nicht leere Folge von Zustandseinträgen mit:

- `id`: dieselbe ID wie im zugehörigen `scene.beatIds`-Eintrag;
- `caption`: deutsche Beschriftung, nicht leer, höchstens 140 Zeichen;
- `event`: `start`, `line`, `call`, `return` oder `exception`;
- `line`: ausgeführte Codezeile ab 1; bei call/return/exception die von CPython gemeldete Ereigniszeile, beim Anfang 0;
- `scope`: Name des Aufrufrahmens oder `<module>`;
- `bindings`: Abbildung qualifizierter Namen auf Objektmarken;
- `objects`: Abbildung dieser Marken auf `{type, value}` mit Python-Typ und sichtbarer Repräsentation;
- `output`: gesamte bis dahin entstandene Ausgabe, auch die leere Zeichenkette;
- bei `return` zusätzlich `result` (Objektmarke), bei `exception` zusätzlich `exception` (Ausnahmetyp).

`expandFigureTrace` erzeugt im Compiler aus jedem Eintrag genau `{id, caption}` und validiert das expandierte Dokument gegen das vorhandene Figurenschema. Danach gelten dieselben Szenenreihenfolge-, Laufzeit-, Zahlen-, Vorhersage- und Lernertextprüfungen wie für explizite Beats. Die erzeugten Zustandsbeschriftungen gelangen über das kompilierte Dokument in die normale Lektions- und Druckdarstellung. Die Quelldatei bleibt bei `from: trace`; keine private Arraykopie in den Lektionen.

Die reine Szene stellt ihre tatsächlich verwendeten Daten selbst bereit. Die Expansion behauptet keine Python-Ausführung oder fachliche Richtigkeit. S6a prüft die festen Aufzeichnungen einmalig gegen CPython und die bestehenden Familienlöser. Eine neue dauerhafte Python-Validierung braucht weiterhin eine separate Zuweisung.

## Offene Schnittstellen

1. **Dauerhafte Trace-Prüfung:** Der Integrator muss festlegen, wie Code, Eingaben, Aufrufrahmen, sichtbare Ereignisse und normalisierte Objektidentitäten im Python-Job angeliefert werden. Der Vergleich muss Aliasgleichheit statt prozessübergreifender Speicheradressen prüfen und return/print sowie Exceptions erhalten. Die temporären S6a-Proben werden keine neue CI-Suite.
2. **Hinweis-Präfix:** Pro Fall eine explizite gesuchte Zeile, gesuchte Namen/Werte, ein erlaubter früherer Zustand und die Bedeutung des Schnittpunkts festlegen. Spätere Bindungen, Objekte, Ausgabe und Ausnahmeklassifikation müssen auch geometrisch verborgen bleiben. Bis dahin lehnen die neuen Szenen Hinweisgeometrie ab; kein Mapping in `figure-hints.json`.
3. **Direkte Auswahl und tag-after-line:** Auswahlziel, Tastaturäquivalent, Rückmeldung am Gegenstand sowie versionierter Aufgaben-/Antwortvertrag fehlen. Kein Eingriff in S4as Antworthülle.
4. **Parameter und Kurzschlussfälle:** Die veröffentlichten Szenen akzeptieren nur die geprüften festen Programme. Freie Parameter brauchen Datengrenzen, erzeugte Spuren und einen gemeinsamen Eingabevertrag. Für das Kurzschlussbeispiel gibt es derzeit keinen passenden Fall der bestehenden Trace-Familien; der CPython-Beleg ersetzt keine neue Familienregistrierung.

F2 bleibt S6b. Diese Übergabe weist keine Arbeit an deren Dateien zu und meldet die offenen Punkte nicht als abgenommen.
