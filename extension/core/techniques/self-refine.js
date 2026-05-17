// extension/core/techniques/self-refine.js

export const selfRefine = {
  name: 'Self-Refinement',
  shortName: 'Self-Refine',
  emoji: '🔄',
  bestFor: 'Code reviews, analytical auditing, essay grading, resume feedback, and document proofreading',
  paper: 'Madaan et al. 2023 — Self-Refine: Iterative Refinement with Self-Feedback',
  
  // Full mode: guides the model through an explicit generation, critique, and refinement loop
  apply(prompt) {
    return `${prompt}

To ensure the absolute highest quality and precision, please execute a Self-Refinement loop:
1. Step 1 - Draft: Produce a comprehensive initial response to the query.
2. Step 2 - Critique: Under a markdown divider, critically evaluate your own draft. Specifically check for:
   - Factual accuracy and edge cases
   - Stylistic clarity, brevity, and tone
   - Completeness (did you miss any implicit requirements?)
3. Step 3 - Refined Output: Rewrite the draft, fully integrating the feedback from your critique. Present this final, polished, and verified output as your primary response.`;
  },

  // Light mode: asks for an internal verification and correction pass before returning the final response
  applyLight(prompt) {
    return `${prompt}

Perform a rigorous self-correction and constraint-verification pass on your answer before delivering it. Ensure there are no logical gaps, factual inaccuracies, or stylistic redundancies. Present only your final, optimized response.`;
  },

  tokenMultiplier: 1.7
};
