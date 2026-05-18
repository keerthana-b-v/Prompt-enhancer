// extension/core/techniques/xml-structured.js

export const xmlStructured = {
  name: 'XML Structured Prompts',
  shortName: 'XML',
  emoji: '📋',
  bestFor: 'Structured output, data extraction, API responses, and precise formatting',
  paper: 'Anthropic 2023 — Claude Prompt Engineering: Using XML tags to structure prompts and format LLM outputs',
  tokenMultiplier: 1.5,

  apply(prompt) {
    return `${prompt}

Structure your response using XML tags for maximum clarity. Organize each logical portion of your output using appropriate, matching XML tags — for example: <thought_process>, <result>, <metadata>, <reasoning>, or <summary> — to cleanly separate each section of the output.`;
  },

  applyLight(prompt) {
    return `${prompt}

Please provide your output in a clearly structured format using labeled sections or markdown headers.`;
  }
};
