// extension/core/techniques/instruction-prompting.js

export const instructionPrompting = {
  name: 'Instruction Prompting',
  shortName: 'Instruct',
  emoji: '📝',
  bestFor: 'Conversational tasks, simple requests, and general assistance',
  paper: 'Ouyang et al. 2022 — Training language models to follow instructions with human feedback (InstructGPT)',
  tokenMultiplier: 1.2,

  apply(prompt) {
    return `${prompt}

Please complete the task with maximum clarity by adhering to the following rules:
- **Format**: Present the output in a clean, legible style.
- **Length**: Be concise yet comprehensive enough to cover all requirements.
- **Audience**: Tailor the tone to be professional, direct, and helpful.`;
  },

  applyLight(prompt) {
    return `${prompt}

Please be very specific and clear about your output format and structured constraints.`;
  }
};
