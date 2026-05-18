// extension/core/techniques/self-consistency.js

export const selfConsistency = {
  name: 'Self-Consistency',
  shortName: 'SC',
  emoji: '🔄',
  bestFor: 'Math problems, logical reasoning, any task with one correct answer where multiple paths should agree',
  paper: 'Wang et al. 2022, PaLM GSM8K +17.9% improvement over CoT',
  tokenMultiplier: 3.2,

  apply(prompt) {
    return `${prompt}

Solve this three separate times using three completely different reasoning approaches. Work each attempt fully and independently before moving to the next.

Attempt 1 — solve using your first approach.
Attempt 2 — solve again using a different method.
Attempt 3 — solve once more using a third method.

After completing all three, compare the results. If they agree, state the final answer with high confidence. If any disagree, identify the error, explain the correct reasoning, and state the verified final answer clearly.`;
  },

  applyLight(prompt) {
    return `${prompt}

Solve this twice using two different methods and confirm both give the same answer.`;
  }
};
