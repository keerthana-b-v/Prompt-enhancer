// extension/core/techniques/prompt-chaining.js

export const promptChaining = {
  name: 'Prompt Chaining',
  shortName: 'Chain',
  emoji: '🔗',
  bestFor: 'Longform content, multi-stage workflows, and complex outputs needing sequential steps',
  paper: 'Wu et al. 2022 — PromptChainer: Chaining Large Language Model Prompts through Visual Programming',
  tokenMultiplier: 1.6,

  apply(prompt) {
    return `${prompt}

Please break this task into sequential, clear stages:
1. Complete **Stage 1** fully before planning or writing **Stage 2**.
2. Output each stage separately with a clear, bold header (e.g., **[STAGE 1: RESEARCH]**).
3. Do not rush or proceed to the next stage until the current stage has been thoroughly developed.`;
  },

  applyLight(prompt) {
    return `${prompt}

Please handle this request in clear, progressive sequential phases.`;
  }
};
