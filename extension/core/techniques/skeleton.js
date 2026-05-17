// extension/core/techniques/skeleton.js

export const skeleton = {
  name: 'Skeleton-of-Thought',
  shortName: 'Skeleton',
  emoji: '💀',
  bestFor: 'Writing long-form reports, comprehensive guides, deep-dives, book outlines, and extensive documentation',
  paper: 'Ning et al. 2023 — Skeleton-of-Thought: Large Language Models Can Do Parallel Generation',
  
  // Full mode: directs the model to draft an outline first, then expand it comprehensively
  apply(prompt) {
    return `${prompt}

To provide an exhaustive, structured, and deep-dive response, let's build this from the skeleton up:
1. Outline (Skeleton): First, create a detailed outline of the entire response, showing all main headings, sub-points, and structural sections needed to cover this topic comprehensively.
2. Systematic Expansion: Flesh out each section of the outline one by one. Provide in-depth analysis, comprehensive explanations, domain-specific terminology, and real-world examples. Ensure each section is rich and thoroughly developed.
3. Cohesive Assembly: Merge these expanded sections seamlessly under clear, professional markdown headers to form a complete, polished, and unified report.`;
  },

  // Light mode: asks for a clear structural framework followed by quick, systematic details
  applyLight(prompt) {
    return `${prompt}

Provide your response within a highly structured framework. Start with a brief, high-level outline of the points you will cover, then expand on each point with density, focus, and technical precision.`;
  },

  tokenMultiplier: 1.6
};
