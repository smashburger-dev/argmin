# Checkpoint: Fine-Tuning

Selbsttest:

1. Warum hat $BA$ die Form $d_{\text{out}}\times d_{\text{in}}$, und was passt nicht, wenn du $AB$ rechnest?
2. $d_{\text{in}} = d_{\text{out}} = 256$, $r = 8$: wie viele Parameter trainiert LoRA, wie viele Full FT — und welchen Bruchteil sind das?
3. Was genau muss in einem Head-only-Experiment eingefroren sein, und mit welchem Test weist du es nach?
4. Warum ist „Rang 4 war besser“ ohne festgehaltenen Seed und festgelegte Metrik keine Aussage?

Vertiefung: eine Einstiegsaufgabe fürs Zählen, [LoRA-Arithmetik exakt: Implementiere lora_delta(A, B, alpha, r) und …](#/family/formula-lora-delta-apply/lora-delta-apply/0/core) für die Arithmetik, [Toy-Head-Only-Feinabstimmung: Implementiere head_only_ft(X, Y, W1, W2_init, lr, …](#/family/optimize-gradient-update-rule/head-only-finetune/0/stretch) und [Final Boss LoRA-Training am Toy-Modell: Implementiere lora_fit(h, Y, W, A_init, …](#/family/optimize-gradient-update-rule/lora-fit-toy/0/challenge) für die laufenden Experimente am Toy-MLP.
