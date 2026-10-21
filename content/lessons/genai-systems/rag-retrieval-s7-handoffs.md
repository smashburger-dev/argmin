## Übergaben im Retrieval: Information hat eine Herkunft

Der Index entsteht aus den Dokumenten; die Anfrage verwendet diesen bereits gebauten Index. Beide Wege treffen erst beim Ranking zusammen. Das verhindert, dass Indexaufbau und Antwortbildung als eine undurchsichtige Station erscheinen.

| Übergabe | Eingang | Ausgang | Grenze |
|---|---|---|---|
| Chunking | Dokumenttext, Fenster, Überlappung | Textstücke mit Dokument-ID und Startposition | Die Herkunft bleibt erhalten. |
| Indexaufbau | Textstücke, gepinnte Normalisierung | Termgewichte je Chunk-ID | Noch keine Antwort und keine Messung der Antwortqualität. |
| Retrieval | Anfrage, Index, k | geordnete Chunk-IDs mit Scores | Gleiche Scores werden über den Dokumentindex aufgelöst. |
| Kontextbau | geordnete IDs, ursprüngliche Chunks | ausgewählte Belege mit Quellenkennung | Dokumentinhalt bleibt Daten, auch wenn darin eine Anweisung steht. |
| Antwortbildung | Anfrage und ausgewählte Belege | Fixture-/Stub-Antwort | Ein echter Generator wird hier nicht ausgeführt. |

Die Figur zum Retrieval sollte genau diese benannten Übergaben zeigen. Eine leere Trefferliste ist ein sichtbarer Ausgang des Retrievals; eine unbelegte Antwort ist ein anderer Fehler an einer späteren Grenze. Recall@k misst den ersten Weg gegen die relevanten Dokument-IDs, keine vermeintliche Sprachqualität.
