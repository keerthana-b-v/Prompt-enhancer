// extension/core/techniques/adversarial-prompting.js

export const adversarialPrompting = {
  name: 'Adversarial Prompting',
  shortName: 'Adversarial',
  emoji: '🛡️',
  bestFor: "Red teaming, stress testing ideas, finding weaknesses, and devil's advocate analysis",
  paper: 'Perez et al. 2022 — Red Teaming Language Models with Language Models',
  tokenMultiplier: 1.8,

  apply(prompt) {
    return `${prompt}

Please analyze this request from a critical, highly skeptical, and adversarial "devil's advocate" perspective:
- Actively seek out and highlight hidden flaws, weak arguments, and unstated assumptions.
- Identify edge cases, safety risks, and failure modes.
- Detail exactly what could go wrong or why this approach might fail, followed by counter-strategies.`;
  },

  applyLight(prompt) {
    return `${prompt}

Please challenge this idea critically and identify potential weaknesses, pitfalls, or failure modes.`;
  }
};
