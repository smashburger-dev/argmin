# Minimaler abgesicherter GenAI-Prototyp

Diese Lektion fügt zusammen, was die drei Lektionen davor getrennt geübt haben: Retrieval aus [Chunks und Index deterministisch bauen](#/lesson/l-genai-rag), deterministische Evaluation aus [Fragenkataloge einfrieren und messen](#/lesson/l-genai-eval) und defensive Kontrollen aus [Injection regelbasiert erkennen](#/lesson/l-genai-security). Das Ergebnis ist ein **minimaler Prototyp**, bewusst klein, vollständig deterministisch und mit einem Stub statt eines echten Sprachmodells. Das ist kein MVP eines Produkts, sondern ein Laboraufbau: Er beweist, dass die Kontrollen greifen, bevor irgendetwas Leistungsstarkes (und Undurchsichtiges) dazukommt.

## Das Bild dahinter: Hausbau aus geprüften Bauteilen

Stell dir ein Haus aus Bauteilen vor, die einzeln abgenommen wurden: Retrieval, Evaluation und Kontrolle sind schon geprüft; jetzt wird getestet, ob sie zusammenhalten. Die Ablation ist in diesem Bild die Sicherung, die du herausnimmst und wieder einsetzt, um zu sehen, welcher Stromkreis wofür zuständig ist.

Wo der Vergleich hinkt: Ein Haus steht still. Ein Prototyp bekommt immer neue Eingaben, darunter auch solche, die seine Regeln aushebeln wollen.
