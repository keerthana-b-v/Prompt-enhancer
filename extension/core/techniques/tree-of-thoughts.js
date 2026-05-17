// extension/core/techniques/tree-of-thoughts.js

export const treeOfThoughts = {
  name: 'Tree of Thoughts',
  shortName: 'ToT',
  emoji: '🌳',
  bestFor: 'Complex planning, creative exploration, and problems with multiple valid approaches',
  paper: 'Yao et al. 2023 — Tree of Thoughts: Deliberate Problem Solving with Large Language Models',
  tokenMultiplier: 4.1,

  apply(prompt) {
    return `${prompt}

Generate three distinct, diverse approaches to this problem. For each approach:
1. Outline the core strategy and logical flow.
2. Evaluate its strengths, weaknesses, and potential pitfalls.
3. Compare the three approaches.

Finally, select the most promising approach, justify your selection, and develop the solution fully.`;
  },

  applyLight(prompt) {
    return `${prompt}

Please consider two or three different angles or perspectives on this before committing to one direction. Explain your selection criteria.`;
  }
};
