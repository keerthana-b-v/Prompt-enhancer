// extension/core/techniques/few-shot.js

export const fewShot = {
  name: 'Few-Shot Prompting',
  shortName: 'Few-Shot',
  emoji: '🎯',
  bestFor: 'Structured classification, consistent format outputs, tone emulation, and data transformations',
  paper: 'Brown et al. 2020 — Language Models are Few-Shot Learners',
  
  // Full mode: provides structural slots for context mapping and formatting
  apply(prompt) {
    return `${prompt}

Before answering, generate 2 brief examples that demonstrate the exact output format, tone, and structure this task requires. Use examples that are directly relevant to the domain of the request above — not generic placeholders. Then solve the task using that same format.`;
  },

  // Light mode: targets direct adherence to constraints with minimal example overhead
  applyLight(prompt) {
    return `${prompt}

Adhere strictly to the requested formatting, structural constraints, and target schema. Maintain extreme stylistic consistency without adding conversational fluff or meta-commentary.`;
  },

  tokenMultiplier: 1.4
};
