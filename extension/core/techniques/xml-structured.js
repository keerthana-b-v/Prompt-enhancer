// extension/core/techniques/xml-structured.js

export const xmlStructured = {
  name: 'XML Structured Prompts',
  shortName: 'XML',
  emoji: '📋',
  bestFor: 'Structured output, data extraction, API responses, and precise formatting',
  paper: 'Anthropic 2023 — Claude Prompt Engineering: Using XML tags to structure prompts and format LLM outputs',
  tokenMultiplier: 1.5,

  apply(prompt) {
    return `Wrap the task context in XML tags for absolute clarity:

<task_context>
  <prompt>${prompt}</prompt>
  <formatting_instruction>
    Please organize and partition your response strictly using appropriate, matching XML tags (e.g., <thought_process>, <result>, <metadata>) to separate each logical portion of the output.
  </formatting_instruction>
</task_context>`;
  },

  applyLight(prompt) {
    return `${prompt}

Please provide your output in a clearly structured format using labeled sections or markdown headers.`;
  }
};
