// extension/core/techniques/structured-role.js

export const structuredRole = {
  name: 'Structured Role/Persona',
  shortName: 'Persona',
  emoji: '🎭',
  bestFor: 'Creative writing, emails, copywriting, roleplay, brainstorm sessions, and marketing drafts',
  paper: 'Reynolds & McDonell 2021 — Prompt Programming for Large Language Models',
  
  // Full mode: establishes a comprehensive expert persona with strict constraints and delivery criteria
  apply(prompt) {
    return `${prompt}

To deliver a top-tier response, adopt a highly structured professional persona:
1. Role: Act as a world-class, highly specialized expert and authority in the domain of this request.
2. Objective: Deliver an output that is highly detailed, engaging, accurate, and perfectly tailored to the request.
3. Tone & Style: Maintain an authoritative, clear, and professional tone. Avoid generic platitudes, empty marketing speak, or repetitive transitions. Make every sentence count.
4. Structuring Constraints: Use precise markdown headers, bullet points for lists, and key bold takeaways to ensure the response is scannable and premium.
5. Actionable Details: Provide real-world context, concrete examples, and immediately useful insights.`;
  },

  // Light mode: sets a refined, authoritative tone and style guidelines
  applyLight(prompt) {
    return `${prompt}

Adopt the persona of an expert in this topic. Provide an authoritative, high-impact, and clear response. Avoid generic introductory filler and transition phrases; address the core query immediately and structurally.`;
  },

  tokenMultiplier: 1.3
};
