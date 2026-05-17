// extension/core/techniques/least-to-most.js

export const leastToMost = {
  name: 'Least-to-Most Prompting',
  shortName: 'Least-to-Most',
  emoji: '🪜',
  bestFor: 'Planning, strategy roadmap development, scheduling, breaking down complex multi-stage tasks, and system architecture',
  paper: 'Zhou et al. 2022 — Least-to-Most Prompting Enables Complex Reasoning in Large Language Models',
  
  // Full mode: forces decomposition and sequential progress
  apply(prompt) {
    return `${prompt}

To ensure complete coverage and logical execution, let's solve this using a Least-to-Most decomposition approach:
1. Deconstruct: First, break down this complex problem into a sequence of smaller, progressive sub-problems or architectural layers (from the simplest foundations to the most complex details). List these sub-problems.
2. Step-by-Step Resolution: Begin by solving the simplest, foundational sub-problems.
3. Cumulative Integration: Use the solutions and insights gained from the preceding steps to address and resolve the next, more advanced sub-problems. Continue this build-up until the entire prompt is thoroughly completed.`;
  },

  // Light mode: asks reasoning models to sketch a modular plan and solve progressively
  applyLight(prompt) {
    return `${prompt}

Decompose this task into sequential sub-tasks. Address them step-by-step, showing how the completion of each sub-task feeds directly into the next phase of the solution.`;
  },

  tokenMultiplier: 1.6
};
