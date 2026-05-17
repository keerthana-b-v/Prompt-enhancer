// extension/core/techniques/role-prompting.js

export const rolePrompting = {
  name: 'Role Prompting',
  shortName: 'Role',
  emoji: '🎭',
  bestFor: 'Creative tasks, expert advice, persona-based responses, and tone-specific outputs',
  paper: 'Kong et al. 2023 — The Power of Role-Play: Some Persona-Based Insights into Large Language Models',
  tokenMultiplier: 1.3,

  apply(prompt) {
    return `${prompt}

Please approach and complete this task by adopting the perspective of a highly specialized and experienced domain expert. Detail your background assumptions briefly and execute the task using that specific persona's vocabulary, standards, and rigorous insights.`;
  },

  applyLight(prompt) {
    return `${prompt}

Please respond as the most relevant and qualified domain expert for this specific task.`;
  }
};
