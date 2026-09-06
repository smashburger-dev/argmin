# Checkpoint: Chunking und Retrieval-Messung

Beantworte diese drei Fragen aus dem Kopf, bevor du weitermachst — jede Antwort folgt direkt aus dem Text oben.

1. Ein Dokument hat 1000 Zeichen, Fenstergröße $s = 120$, Überlappung $o = 20$. Wie groß ist die Schrittweite, wie viele Chunks entstehen und bei welchem Index startet der letzte Chunk?
2. Warum wird das Golden Set gepinnt (Hashes auf Rohdaten und Normalisierung), statt es bei jedem Lauf neu zu bauen?
3. Recall@3 ist 1,0, aber die Antworten sind schlecht. Welche Fehlerart liegt vor — und warum zeigt Recall@k das nicht?

Kontrolliere: (1) step $= 120 - 20 = 100$; Chunks $= \lceil 1000/100 \rceil = 10$; letzter Start $= (10-1)\cdot100 = 900$; (2) gepinnte Daten + gepinnte Normalisierung machen den Indexlauf reproduzierbar — sonst misst du Datenänderungen statt Systemänderungen; (3) ein Antwortfehler (falsche Extraktion/Formatierung aus korrekt abgerufenen Passagen) — Recall@k misst nur das Retrieval, deshalb werden Retrieval- und Antwortfehler getrennt gelabelt.
