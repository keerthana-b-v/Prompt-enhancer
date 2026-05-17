// extension/core/techniques/pot.js

export const pot = {
  name: 'Program-of-Thought',
  shortName: 'PoT',
  emoji: '💻',
  bestFor: 'Writing code, database queries, algorithmic puzzles, complex equations, and technical error debugging',
  paper: 'Chen et al. 2022 — Program of Thought Prompting: Disentangling Computation from Reasoning for LLMs',
  
  // Full mode: directs the LLM to approach the problem programmatically with clear code representation
  apply(prompt) {
    const isWeb = /\b(react|html|css|web|frontend|ui|next|tailwind|js|javascript|ts|typescript|website|portfolio|canvas|three|component)\b/i.test(prompt);
    
    if (isWeb) {
      return `${prompt}

To ensure architectural and rendering precision, let's approach this programmatically using a Frontend Program-of-Thought (PoT) structure:
1. State & Props Initialization: Clearly define the component state hooks, properties, constants, and initial render states.
2. Component Architecture: Express the solution as a clean, modular component tree (React/HTML/JS). Use clear layout states, event listeners, and performance hooks (like lazy loading or Suspense).
3. State Flow Simulation: Dry-run the user interaction flow (e.g. clicks, cursor movement, hover events) and explain how the rendering cycle updates step-by-step.
4. Clean Code Output: Deliver the complete, production-ready, modular files with exact styling classes and functional dependencies.`;
    }

    return `${prompt}

To ensure mathematical and logical precision, let's approach this programmatically using Program-of-Thought (PoT) reasoning:
1. Variables & Initialization: Clearly define the input variables, parameters, constants, and initial states.
2. Algorithmic Logic: Express the step-by-step solution as a clean, structured programmatic algorithm or code block (in the requested language). Use comments to explain the logic, conditional flows, and data transformations.
3. Logical Execution: Simulate or dry-run the execution flow, showing how the states/variables change step-by-step.
4. Output Extraction: State the exact final returned value or computed outcome derived from this program.`;
  },

  // Light mode: asks for clean algorithmic structures, modularity, and explicit data flow representation
  applyLight(prompt) {
    return `${prompt}

Format your solution algorithmically. Clearly define the data model, inputs, state mutations, and edge-cases. Present the core logic as modular, clean, and highly structured pseudocode or functions.`;
  },

  tokenMultiplier: 1.5
};
