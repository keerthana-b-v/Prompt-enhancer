// extension/core/router.js
// Maps (useCase × mode) → correct prompt engineering technique in PromptSmith V2

import {
  cot,
  fewShot,
  stepBack,
  leastToMost,
  pot,
  structuredRole,
  selfRefine,
  skeleton,
  selfConsistency,
  react,
  treeOfThoughts,
  metaPrompting,
  xmlStructured,
  promptChaining,
  instructionPrompting,
  rolePrompting,
  adversarialPrompting
} from './techniques/index.js';

// Mapped techniques structure matching the upgraded PromptSmith V2 schema
const TECHNIQUE_MAP = {
  math:             { primary: selfConsistency, secondary: cot },
  code:             { primary: pot,             secondary: react },
  creative:         { primary: rolePrompting,    secondary: treeOfThoughts },
  factual:          { primary: stepBack,        secondary: cot },
  planning:         { primary: leastToMost,     secondary: treeOfThoughts },
  analysis:         { primary: selfRefine,      secondary: adversarialPrompting },
  longform:         { primary: skeleton,        secondary: promptChaining },
  conversational:   { primary: instructionPrompting, secondary: rolePrompting },
  agentic:          { primary: react,           secondary: promptChaining },
  structured_output:{ primary: xmlStructured,   secondary: instructionPrompting },
  skip:             null,
  general:          { primary: metaPrompting,   secondary: instructionPrompting }
};

export function routeAndEnhance(prompt, useCase, mode) {
  if (useCase === 'skip' || !TECHNIQUE_MAP[useCase]) {
    return {
      enhanced: prompt,
      technique: null
    };
  }

  const mapping = TECHNIQUE_MAP[useCase] || TECHNIQUE_MAP['general'];
  
  if (mode === 'light') {
    const technique = mapping.secondary || mapping.primary;
    let enhanced = technique.applyLight(prompt);
    
    // Explicit Task 7 rules for reasoning models:
    // 1. REMOVE any step-by-step scaffolding and reasoning instructions
    const scaffolds = [
      /let's think step[- ]by[- ]step/gi,
      /think step[- ]by[- ]step/gi,
      /show your steps/gi,
      /solve this step[- ]by[- ]step/gi,
      /think through this/gi,
      /explain your reasoning/gi,
      /provide a reasoning path/gi,
      /explain your thought process/gi,
      /break this down into steps/gi,
      /let's break this down/gi,
      /reason step by step/gi,
      /show your working/gi
    ];
    
    for (const regex of scaffolds) {
      enhanced = enhanced.replace(regex, '');
    }
    
    // Clean whitespace
    enhanced = enhanced.replace(/\s+/g, ' ').trim();
    
    // 2. Ensure the enhanced prompt is SHORTER than or equal to original length
    if (enhanced.length > prompt.length) {
      // Append highly condensed context / role markers to the raw prompt directly
      const roleStr = technique.name && technique.name !== 'none' ? `[Role: Expert ${technique.name}] ` : '';
      const formatStr = useCase === 'structured_output' ? ' [JSON/XML format]' : '';
      
      const compressed = `${roleStr}${prompt}${formatStr}`.trim();
      if (compressed.length <= prompt.length) {
        enhanced = compressed;
      } else {
        // Fallback: strictly return original or just original with format tag truncated
        enhanced = prompt;
      }
    }
    
    return { enhanced, technique };
  }

  const technique = mapping.primary;
  const enhanced = technique.apply(prompt);
  return { enhanced, technique };
}

/**
 * Get all available techniques (for override UI dropdowns)
 * @returns {object[]}
 */
export function getAllTechniques() {
  return [
    cot,
    fewShot,
    stepBack,
    leastToMost,
    pot,
    structuredRole,
    selfRefine,
    skeleton,
    selfConsistency,
    react,
    treeOfThoughts,
    metaPrompting,
    xmlStructured,
    promptChaining,
    instructionPrompting,
    rolePrompting,
    adversarialPrompting
  ];
}
