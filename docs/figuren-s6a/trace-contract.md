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

Die reine Szene stellt ihre tatsächlich verwendeten Daten selbst bereit. Die Expansion behauptet keine Python-Ausführung oder fachliche Richtigkeit. Der dauerhafte Recorder-Vertrag heißt `python-trace/v1`: Er lässt nur feste, allowlistete F1-Programme und enumerierte typisierte Parameter zu; beliebiger Quelltext, Imports, Pfade und Ausdrücke werden abgelehnt. Jede Spur enthält exakt den UTF-8/LF-Quelltext samt SHA-256, Python-Version, Eingaben, begrenzten Ereignissen, stdout und normalisierten Objektverweisen. Der Recorder-Aufrufer muss einen Prozess-Timeout setzen.

Die Normalisierung `s6a-visible-events/v1` ist Teil des Schemas. Das erste Modul-`call` wird zu `start` in Zeile 0. Ein vorgemerktes Zeilenereignis wird beim nächsten CPython-Ereignis ausgegeben; dadurch bleiben Ausführungsreihenfolge und wiederholte Schleifenzeilen erhalten. Funktionsdefinitionszeilen werden unterdrückt. Bei einem Funktions-Return wird eine abweichende vorgemerkte Zeile davor ausgegeben; eine doppelte Zeile, die der Return-Zeile entspricht, entfällt. Der terminale Modul-Return wird unterdrückt, nachdem die letzte vorgemerkte Zeile ausgegeben wurde. Bei einer Ausnahme wird die vorgemerkte Zeile verworfen und das Ausnahmeereignis hält Typ und Quellzeile fest. Lokale Variablen werden in aktiven F1-Rahmen erfasst; Builtins und Recorder-Rahmen bleiben außen vor. Objekt-IDs folgen der ersten Beobachtung innerhalb genau dieser Aufzeichnung und behalten währenddessen starke Referenzen; Speicheradressen und absolute Host-Pfade werden nie serialisiert. Integer-Identität gilt nur für tatsächlich beobachtete CPython-Objekte dieser Aufzeichnung. Insbesondere werden keine allgemeine Small-Integer-Internierung und keine versionsübergreifende Identitätsregel versprochen; gleiche Werte dürfen nur dann dieselbe Marke tragen, wenn die CPython-Spur dieselbe Objektidentität beobachtet.

Die unabhängige CPython-Suite spielt jede feste Spur erneut ab, einschließlich der Dictionary-Belegspur, und vergleicht geordnete Rahmenereignisse, Namen, Aliasrelationen, Werte/Typen, stdout, Returns und Ausnahmen. Der aktuelle Bestand hat sieben Aufzeichnungen (sechs Lektion-Beispiele plus eine Dictionary-Belegspur); beide Gruppen bleiben abgedeckt.

## Offene Schnittstellen

1. **Hinweis-Präfix:** `trace-hint-prefix/v1` erlaubt nur ein geprüftes Ziel sowie die Positivprojektion `sourcePrefix` und Captions strikt vor diesem Ereignis. Der Compiler prüft Quellhash, Zielrahmen/-zeile/-ordinal, feste Nachbarparameter und exakte Feld-Allowlist. Werte, Bindungen, Ausgabe, Returns, Ausnahmetyp und Aufgaben-Auswahlmetadaten gehören nicht zur Projektion.
2. **Direkte Auswahl und tag-after-line:** Der gemeinsame `tag-after-line/v1`-Vertrag speichert einen Zustand pro geordnetem Trace-Ereignis. Aliasnamen bleiben getrennt und dürfen dieselbe Objekt-ID tragen. Die Szene stellt stabile `binding:<frameId>:<name>`-Ziele bereit; Pointer- und Tastaturzustand bleibt außerhalb der Antwort. Kandidatennamen und -objekte kommen aus einem unabhängig gepflegten Distraktorkatalog, nie aus dem richtigen Zustand.
3. **Parameter und Kurzschlussfälle:** Parameter sind auf die enumerierten Integer-Eingaben in `python-trace/v1` begrenzt; nicht unterstützte Eingaben schlagen geschlossen fehl. Der smoke-detector-Fall bewahrt den tatsächlichen Kurzschluss-`IndexError`-Pfad. Ein Browser-Interpreter kommt nicht hinzu.

F2 bleibt S6b. Diese Übergabe weist keine Arbeit an deren Dateien zu und meldet die offenen Punkte nicht als abgenommen.
