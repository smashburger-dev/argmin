export class StaticTutor {
  constructor(cards) {
    const ids = new Set();
    this.cards = cards.map((card) => {
      if (!card?.explanationId || ids.has(card.explanationId)) throw new Error(`Erklärung fehlt oder ist doppelt: ${card?.explanationId || '(leer)'}`);
      if (card.revealsSolution && card.helpLevel < 6) throw new Error('Eine Lösung ist nur auf Hilfestufe 6 zulässig');
      ids.add(card.explanationId);
      return { ...card };
    });
  }

  respond({ competencyIds = [], diagnosticCodes = [], helpLevel = 1 }) {
    const competencySet = new Set(competencyIds);
    const diagnosticSet = new Set(diagnosticCodes);
    const candidates = this.cards
      .filter((card) => card.helpLevel <= helpLevel)
      .filter((card) => card.competencyIds.some((id) => competencySet.has(id)))
      .filter((card) => card.diagnosticCodes.some((code) => diagnosticSet.has(code)))
      .sort((a, b) => b.helpLevel - a.helpLevel || a.explanationId.localeCompare(b.explanationId));
    const card = candidates[0];
    if (!card) {
      return {
        explanationId: null,
        advisory: true,
        revealsSolution: false,
        body: 'Prüfe den letzten sicheren Schritt und öffne bei Bedarf die zugehörige Lektion.',
        example: null,
        counterexample: null,
        steps: [],
        sourceRefs: [],
        followUpActivityIds: [],
      };
    }
    return {
      explanationId: card.explanationId,
      advisory: true,
      revealsSolution: Boolean(card.revealsSolution),
      body: card.body,
      example: card.example || null,
      counterexample: card.counterexample || null,
      steps: [...card.steps],
      sourceRefs: [...card.sourceRefs],
      followUpActivityIds: [...card.followUpActivityIds],
    };
  }
}

export function buildTutorPrompt({ task, learnerAttempt, diagnosticCodes = [], helpLevel = 1 }) {
  return [
    'Du unterstützt einen Lernenden auf Deutsch.',
    `Hilfestufe: ${helpLevel} von 6.`,
    'Gib keine vollständige Lösung, solange Hilfestufe 6 nicht ausdrücklich angefordert wurde.',
    'Du darfst den Versuch erklären, aber nicht verbindlich bewerten oder den deterministischen Grader überstimmen.',
    `Aufgabe: ${task}`,
    `Versuch des Lernenden: ${learnerAttempt}`,
    `Diagnosecodes: ${diagnosticCodes.join(', ') || 'keine'}`,
    'Antworte mit dem nächsten prüfbaren Teilschritt und nenne Unsicherheit ausdrücklich.',
  ].join('\n');
}
