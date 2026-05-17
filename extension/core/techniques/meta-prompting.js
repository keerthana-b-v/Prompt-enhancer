// extension/core/techniques/meta-prompting.js

export const metaPrompting = {
  name: 'Meta Prompting',
  shortName: 'Meta',
  emoji: '🧠',
  bestFor: 'Ambiguous tasks, novel problems, and tasks where the approach itself is unclear',
  paper: 'Suzgun & Kalai 2024 — Meta-Prompting: Enhancing Language Models with Self-Referential Reasoning',
  tokenMultiplier: 2.0,

  apply(prompt) {
    return `${prompt}

Before answering, first analyze and determine:
1. What type of task or problem is this?
2. What specific expert or persona would be best suited to solve this?
3. What is the optimal methodology or approach to ensure high-quality execution?

Once determined, adopt that expert persona and execute the optimal methodology to provide the final solution.`;
  },

  applyLight(prompt) {
    return `${prompt}

First, identify the best way to approach this task (methodology and perspective), then proceed with your answer.`;
  }
};
