// extension/core/techniques/cot.js

export const cot = {
  name: 'Chain-of-Thought',
  shortName: 'CoT',
  emoji: '🔗',
  bestFor: 'Math, multi-step reasoning, logic problems, and complex analytical questions',
  paper: 'Wei et al. 2022 — Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
  
  // Full mode: for standard models (GPT-4o, Claude Sonnet without thinking, Gemini Flash, etc.)
  apply(prompt) {
    return `${prompt}

Think through this step-by-step:
1. First, identify exactly what is being asked and the key constraints.
2. Break the problem into smaller, logical sub-problems or steps.
3. Solve each sub-problem in sequence, explaining your work and reasoning clearly.
4. Double-check your logic and calculations at each step to catch potential errors early.
5. Summarize the final findings and arrive at a verified, clear answer.`;
  },

  // Light mode: for reasoning models (o1, o3-mini, Claude with active thinking, DeepSeek-R1)
  // We don't add rigid step-by-step instructions since these models have internal CoT;
  // instead, we prompt them to verify their findings, show final work, and avoid shortcut assumptions.
  applyLight(prompt) {
    return `${prompt}

Please show your work clearly, highlight the key milestones in your reasoning process, and double-check your final answer for accuracy.`;
  },

  // Token cost estimate multiplier
  tokenMultiplier: 1.8
};
