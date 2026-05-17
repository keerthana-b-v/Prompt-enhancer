// extension/core/techniques/step-back.js

export const stepBack = {
  name: 'Step-Back Abstraction',
  shortName: 'Step-Back',
  emoji: '🔍',
  bestFor: 'Factual queries, educational content, conceptual explanations, history, and physics problems',
  paper: 'Zheng et al. 2023 — Take a Step Back: Evoking Reasoning via Abstraction in Large Language Models',
  
  // Full mode: guides the model to perform a conceptual abstraction before applying it
  apply(prompt) {
    return `${prompt}

To answer this accurately, let's take a step back from the specifics of this query and structure the response as follows:
1. Core Concepts & Principles: First, identify and explain the high-level, foundational concepts, physical laws, historical patterns, or general rules that govern this topic.
2. Abstract Foundation: Elaborate on how these core principles function generally, independent of this specific problem.
3. Direct Application: Now, look back at the original query and apply these established high-level principles step-by-step to arrive at a highly accurate, grounded answer.`;
  },

  // Light mode: asks reasoning models to ground their thoughts in first-principles
  applyLight(prompt) {
    return `${prompt}

Before answering, explicitly ground your reasoning in the fundamental rules, laws, or theoretical principles that govern this domain. Show how these principles dictate the solution to the specific query.`;
  },

  tokenMultiplier: 1.5
};
