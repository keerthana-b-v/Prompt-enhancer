// extension/core/techniques/react.js

export const react = {
  name: 'ReAct Prompting',
  shortName: 'ReAct',
  emoji: '⚡',
  bestFor: 'Agentic tasks, tool use, search, and multi-step actions',
  paper: 'Yao et al. 2022 — ReAct: Synergizing Reasoning and Acting in Language Models',
  tokenMultiplier: 2.4,

  apply(prompt) {
    return `${prompt}

Structure your response using alternating Thought / Action / Observation blocks:
- **Thought**: Explain your current reasoning and what needs to be solved next.
- **Action**: Specify the tool to use, search query to perform, or API parameters to run.
- **Observation**: Record the findings or results returned from the action.

Continue this cycle dynamically until the task is complete.`;
  },

  applyLight(prompt) {
    return `${prompt}

Think through each step explicitly before acting. State what you are doing, why you are doing it, and what you expect to observe.`;
  }
};
