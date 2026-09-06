# Checkpoint: Prüfbar geplante Forschungsfrage

Beantworte diese drei Fragen aus dem Kopf, bevor du weitermachst — jede Antwort folgt direkt aus dem Text oben.

1. Eine Frage lautet „Macht RAG die Antworten besser?“. Welche zwei unbestimmten Größen machen sie unbeantwortbar — und wie sieht eine geprüfte Version aus?
2. Was gehört ins Protokoll VOR dem ersten Messlauf, und warum reicht es nicht, das Protokoll während der Läufe zu notieren?
3. Du verbesserst nach drei Läufen die Retrieval-Schnittstelle UND die Gewichte. Warum ist das ein Goal-Shift, auch wenn die Forschungsfrage gleich bleibt?

Kontrolliere: (1) „besser“ (welche Metrik, auf welchem Golden Set?) und „RAG“ (welche Variante, welche Baseline?) sind unbestimmt — geprüft ist z. B. „erhöht RAG mit fixem top-k=3 den Recall@3 auf dem gepinnten Golden Set um mindestens X gegenüber der Bag-of-Words-Baseline?“; (2) Frage, UV/DV, Erfolgskriterium und Stopbedingungen festpinnen — ein Protokoll, das erst während der Läufe entsteht, passt sich unbemerkt den Ergebnissen an; (3) zwei gleichzeitige Änderungen vermischen zwei Wirkungen — der Vergleich gilt nicht mehr der ursprünglichen Frage, sondern einem neuen System; immer eine Änderung pro Lauf.
