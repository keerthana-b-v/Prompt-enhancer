// extension/core/labels.js
var id2label = {
  "0": "analysis",
  "1": "agentic",
  "2": "code",
  "3": "conversational",
  "4": "creative",
  "5": "factual",
  "6": "longform",
  "7": "math",
  "8": "planning",
  "9": "skip",
  "10": "structured_output"
};

// extension/core/model-detector.js
var REASONING_MODELS = [
  "o1",
  "o3",
  "o4",
  "o1-mini",
  "o3-mini",
  "o4-mini",
  "claude-opus",
  "deep think",
  "deepseek-r1"
];
function isReasoningModel() {
  const selectors = [
    '[data-testid="model-switcher-dropdown-button"]',
    // ChatGPT
    ".model-selector-dropdown",
    // Claude
    ".model-selector",
    // Claude Alternative
    '[aria-label*="model"]',
    // Gemini
    '[aria-label*="Model"]'
    // Gemini Case Variant
  ];
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent.toLowerCase();
        if (REASONING_MODELS.some((m) => text.includes(m))) {
          return true;
        }
      }
    } catch (e) {
      console.warn(`[PromptRoute] Error querying selector ${selector}:`, e);
    }
  }
  try {
    const bodyText = document.body.innerText.toLowerCase();
    const modelIndicators = ["o1-mini", "o1-preview", "o3-mini", "deepseek-r1", "deep think", "claude-opus"];
    for (const indicator of modelIndicators) {
      if (bodyText.includes(indicator)) {
        return true;
      }
    }
  } catch (e) {
  }
  return false;
}
function getEnhancementMode() {
  return isReasoningModel() ? "light" : "full";
}

// extension/core/techniques/cot.js
var cot = {
  name: "Chain-of-Thought",
  shortName: "CoT",
  emoji: "\u{1F517}",
  bestFor: "Math, multi-step reasoning, logic problems, and complex analytical questions",
  paper: "Wei et al. 2022 \u2014 Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
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

// extension/core/techniques/step-back.js
var stepBack = {
  name: "Step-Back Abstraction",
  shortName: "Step-Back",
  emoji: "\u{1F50D}",
  bestFor: "Factual queries, educational content, conceptual explanations, history, and physics problems",
  paper: "Zheng et al. 2023 \u2014 Take a Step Back: Evoking Reasoning via Abstraction in Large Language Models",
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

// extension/core/techniques/least-to-most.js
var leastToMost = {
  name: "Least-to-Most Prompting",
  shortName: "Least-to-Most",
  emoji: "\u{1FA9C}",
  bestFor: "Planning, strategy roadmap development, scheduling, breaking down complex multi-stage tasks, and system architecture",
  paper: "Zhou et al. 2022 \u2014 Least-to-Most Prompting Enables Complex Reasoning in Large Language Models",
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

// extension/core/techniques/pot.js
var pot = {
  name: "Program-of-Thought",
  shortName: "PoT",
  emoji: "\u{1F4BB}",
  bestFor: "Writing code, database queries, algorithmic puzzles, complex equations, and technical error debugging",
  paper: "Chen et al. 2022 \u2014 Program of Thought Prompting: Disentangling Computation from Reasoning for LLMs",
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

// extension/core/techniques/structured-role.js
var structuredRole = {
  name: "Structured Role/Persona",
  shortName: "Persona",
  emoji: "\u{1F3AD}",
  bestFor: "Creative writing, emails, copywriting, roleplay, brainstorm sessions, and marketing drafts",
  paper: "Reynolds & McDonell 2021 \u2014 Prompt Programming for Large Language Models",
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

// extension/core/techniques/self-refine.js
var selfRefine = {
  name: "Self-Refinement",
  shortName: "Self-Refine",
  emoji: "\u{1F504}",
  bestFor: "Code reviews, analytical auditing, essay grading, resume feedback, and document proofreading",
  paper: "Madaan et al. 2023 \u2014 Self-Refine: Iterative Refinement with Self-Feedback",
  // Full mode: guides the model through an explicit generation, critique, and refinement loop
  apply(prompt) {
    return `${prompt}

To ensure the absolute highest quality and precision, please execute a Self-Refinement loop:
1. Step 1 - Draft: Produce a comprehensive initial response to the query.
2. Step 2 - Critique: Under a markdown divider, critically evaluate your own draft. Specifically check for:
   - Factual accuracy and edge cases
   - Stylistic clarity, brevity, and tone
   - Completeness (did you miss any implicit requirements?)
3. Step 3 - Refined Output: Rewrite the draft, fully integrating the feedback from your critique. Present this final, polished, and verified output as your primary response.`;
  },
  // Light mode: asks for an internal verification and correction pass before returning the final response
  applyLight(prompt) {
    return `${prompt}

Perform a rigorous self-correction and constraint-verification pass on your answer before delivering it. Ensure there are no logical gaps, factual inaccuracies, or stylistic redundancies. Present only your final, optimized response.`;
  },
  tokenMultiplier: 1.7
};

// extension/core/techniques/skeleton.js
var skeleton = {
  name: "Skeleton-of-Thought",
  shortName: "Skeleton",
  emoji: "\u{1F480}",
  bestFor: "Writing long-form reports, comprehensive guides, deep-dives, book outlines, and extensive documentation",
  paper: "Ning et al. 2023 \u2014 Skeleton-of-Thought: Large Language Models Can Do Parallel Generation",
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

// extension/core/techniques/self-consistency.js
var selfConsistency = {
  name: "Self-Consistency",
  shortName: "SC",
  emoji: "\u{1F504}",
  bestFor: "Math problems, logical reasoning, any task with one correct answer where multiple paths should agree",
  paper: "Wang et al. 2022, PaLM GSM8K +17.9% improvement over CoT",
  tokenMultiplier: 3.2,
  apply(prompt) {
    return `${prompt}

Solve this three separate times using three completely different reasoning approaches. Work each attempt fully and independently before moving to the next.

Attempt 1 \u2014 solve using your first approach.
Attempt 2 \u2014 solve again using a different method.
Attempt 3 \u2014 solve once more using a third method.

After completing all three, compare the results. If they agree, state the final answer with high confidence. If any disagree, identify the error, explain the correct reasoning, and state the verified final answer clearly.`;
  },
  applyLight(prompt) {
    return `${prompt}

Solve this twice using two different methods and confirm both give the same answer.`;
  }
};

// extension/core/techniques/react.js
var react = {
  name: "ReAct Prompting",
  shortName: "ReAct",
  emoji: "\u26A1",
  bestFor: "Agentic tasks, tool use, search, and multi-step actions",
  paper: "Yao et al. 2022 \u2014 ReAct: Synergizing Reasoning and Acting in Language Models",
  tokenMultiplier: 2.4,
  apply(prompt) {
    return `${prompt}

Structure your response using alternating Thought / Action / Observation blocks:
- **Thought**: Explain your current reasoning and what needs to be solved next.
- **Action**: Specify the tool to use, search query to perform, or API parameters to run.
- **Observation**: Record the findings or results returned from the action.

Continue this cycle dynamically until the task is complete.`;
  },
  applyLight(prompt) {
    return `${prompt}

Think through each step explicitly before acting. State what you are doing, why you are doing it, and what you expect to observe.`;
  }
};

// extension/core/techniques/tree-of-thoughts.js
var treeOfThoughts = {
  name: "Tree of Thoughts",
  shortName: "ToT",
  emoji: "\u{1F333}",
  bestFor: "Complex planning, creative exploration, and problems with multiple valid approaches",
  paper: "Yao et al. 2023 \u2014 Tree of Thoughts: Deliberate Problem Solving with Large Language Models",
  tokenMultiplier: 4.1,
  apply(prompt) {
    return `${prompt}

Generate three distinct, diverse approaches to this problem. For each approach:
1. Outline the core strategy and logical flow.
2. Evaluate its strengths, weaknesses, and potential pitfalls.
3. Compare the three approaches.

Finally, select the most promising approach, justify your selection, and develop the solution fully.`;
  },
  applyLight(prompt) {
    return `${prompt}

Please consider two or three different angles or perspectives on this before committing to one direction. Explain your selection criteria.`;
  }
};

// extension/core/techniques/meta-prompting.js
var metaPrompting = {
  name: "Meta Prompting",
  shortName: "Meta",
  emoji: "\u{1F9E0}",
  bestFor: "Ambiguous tasks, novel problems, and tasks where the approach itself is unclear",
  paper: "Suzgun & Kalai 2024 \u2014 Meta-Prompting: Enhancing Language Models with Self-Referential Reasoning",
  tokenMultiplier: 2,
  apply(prompt) {
    return `${prompt}

Before answering, first analyze and determine:
1. What type of task or problem is this?
2. What specific expert or persona would be best suited to solve this?
3. What is the optimal methodology or approach to ensure high-quality execution?

Once determined, adopt that expert persona and execute the optimal methodology to provide the final solution.`;
  },
  applyLight(prompt) {
    return `${prompt}

First, identify the best way to approach this task (methodology and perspective), then proceed with your answer.`;
  }
};

// extension/core/techniques/xml-structured.js
var xmlStructured = {
  name: "XML Structured Prompts",
  shortName: "XML",
  emoji: "\u{1F4CB}",
  bestFor: "Structured output, data extraction, API responses, and precise formatting",
  paper: "Anthropic 2023 \u2014 Claude Prompt Engineering: Using XML tags to structure prompts and format LLM outputs",
  tokenMultiplier: 1.5,
  apply(prompt) {
    return `${prompt}

Structure your response using XML tags for maximum clarity. Organize each logical portion of your output using appropriate, matching XML tags \u2014 for example: <thought_process>, <result>, <metadata>, <reasoning>, or <summary> \u2014 to cleanly separate each section of the output.`;
  },
  applyLight(prompt) {
    return `${prompt}

Please provide your output in a clearly structured format using labeled sections or markdown headers.`;
  }
};

// extension/core/techniques/prompt-chaining.js
var promptChaining = {
  name: "Prompt Chaining",
  shortName: "Chain",
  emoji: "\u{1F517}",
  bestFor: "Longform content, multi-stage workflows, and complex outputs needing sequential steps",
  paper: "Wu et al. 2022 \u2014 PromptChainer: Chaining Large Language Model Prompts through Visual Programming",
  tokenMultiplier: 1.6,
  apply(prompt) {
    return `${prompt}

Please break this task into sequential, clear stages:
1. Complete **Stage 1** fully before planning or writing **Stage 2**.
2. Output each stage separately with a clear, bold header (e.g., **[STAGE 1: RESEARCH]**).
3. Do not rush or proceed to the next stage until the current stage has been thoroughly developed.`;
  },
  applyLight(prompt) {
    return `${prompt}

Please handle this request in clear, progressive sequential phases.`;
  }
};

// extension/core/techniques/instruction-prompting.js
var instructionPrompting = {
  name: "Instruction Prompting",
  shortName: "Instruct",
  emoji: "\u{1F4DD}",
  bestFor: "Conversational tasks, simple requests, and general assistance",
  paper: "Ouyang et al. 2022 \u2014 Training language models to follow instructions with human feedback (InstructGPT)",
  tokenMultiplier: 1.2,
  apply(prompt) {
    return `${prompt}

Please complete the task with maximum clarity by adhering to the following rules:
- **Format**: Present the output in a clean, legible style.
- **Length**: Be concise yet comprehensive enough to cover all requirements.
- **Audience**: Tailor the tone to be professional, direct, and helpful.`;
  },
  applyLight(prompt) {
    return `${prompt}

Please be very specific and clear about your output format and structured constraints.`;
  }
};

// extension/core/techniques/role-prompting.js
var rolePrompting = {
  name: "Role Prompting",
  shortName: "Role",
  emoji: "\u{1F3AD}",
  bestFor: "Creative tasks, expert advice, persona-based responses, and tone-specific outputs",
  paper: "Kong et al. 2023 \u2014 The Power of Role-Play: Some Persona-Based Insights into Large Language Models",
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

// extension/core/techniques/adversarial-prompting.js
var adversarialPrompting = {
  name: "Adversarial Prompting",
  shortName: "Adversarial",
  emoji: "\u{1F6E1}\uFE0F",
  bestFor: "Red teaming, stress testing ideas, finding weaknesses, and devil's advocate analysis",
  paper: "Perez et al. 2022 \u2014 Red Teaming Language Models with Language Models",
  tokenMultiplier: 1.8,
  apply(prompt) {
    return `${prompt}

Please analyze this request from a critical, highly skeptical, and adversarial "devil's advocate" perspective:
- Actively seek out and highlight hidden flaws, weak arguments, and unstated assumptions.
- Identify edge cases, safety risks, and failure modes.
- Detail exactly what could go wrong or why this approach might fail, followed by counter-strategies.`;
  },
  applyLight(prompt) {
    return `${prompt}

Please challenge this idea critically and identify potential weaknesses, pitfalls, or failure modes.`;
  }
};

// extension/core/router.js
var TECHNIQUE_MAP = {
  math: { primary: selfConsistency, secondary: cot },
  code: { primary: pot, secondary: react },
  creative: { primary: structuredRole, secondary: treeOfThoughts },
  factual: { primary: stepBack, secondary: cot },
  planning: { primary: leastToMost, secondary: treeOfThoughts },
  analysis: { primary: selfRefine, secondary: adversarialPrompting },
  longform: { primary: skeleton, secondary: promptChaining },
  conversational: { primary: instructionPrompting, secondary: rolePrompting },
  agentic: { primary: react, secondary: promptChaining },
  structured_output: { primary: xmlStructured, secondary: instructionPrompting },
  skip: null,
  general: { primary: metaPrompting, secondary: instructionPrompting }
};
function routeAndEnhance(prompt, useCase, mode) {
  if (useCase === "skip" || !TECHNIQUE_MAP[useCase]) {
    return {
      enhanced: prompt,
      technique: null
    };
  }
  const mapping = TECHNIQUE_MAP[useCase] || TECHNIQUE_MAP["general"];
  if (mode === "light") {
    const technique2 = mapping.secondary || mapping.primary;
    let enhanced2 = technique2.applyLight(prompt);
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
      enhanced2 = enhanced2.replace(regex, "");
    }
    enhanced2 = enhanced2.replace(/\s+/g, " ").trim();
    if (enhanced2.length > prompt.length) {
      const roleStr = technique2.name && technique2.name !== "none" ? `[Role: Expert ${technique2.name}] ` : "";
      const formatStr = useCase === "structured_output" ? " [JSON/XML format]" : "";
      const compressed = `${roleStr}${prompt}${formatStr}`.trim();
      if (compressed.length <= prompt.length) {
        enhanced2 = compressed;
      } else {
        enhanced2 = prompt;
      }
    }
    return { enhanced: enhanced2, technique: technique2 };
  }
  const technique = mapping.primary;
  const enhanced = technique.apply(prompt);
  return { enhanced, technique };
}

// extension/background/background.js
var SYSTEM_PROMPT = `You are an expert prompt engineer. Your job is to rewrite user prompts to get dramatically better responses from AI models.

Given a raw user prompt:

STEP 1 - Identify:
- The specific topic and domain (e.g. RAG, Python, fitness, marketing)
- The user's actual intent (learn, build, analyze, create, plan, debug)
- The complexity level (beginner, intermediate, expert)

STEP 2 - Select the best technique:
- Learning/roadmap intent \u2192 Least-to-Most
- Reasoning/math/logic \u2192 Chain-of-Thought
- Code/implementation \u2192 Program-of-Thought
- Research/search tasks \u2192 ReAct
- Creative/writing \u2192 Structured Role
- Analysis/comparison \u2192 Self-Refine
- Factual explanation \u2192 Step-Back
- Long guides/reports \u2192 Skeleton-of-Thought
- Ambiguous/novel \u2192 Meta Prompting

OVERRIDE RULE: ANY prompt containing "i want to learn", "how do i learn", "teach me", "i want to understand", "how to get started with", or "i want to get into" \u2192 ALWAYS use Least-to-Most regardless of other signals. Set label to "planning".

STEP 3 - Rewrite the prompt:
- Keep ALL specific terminology from the original prompt
- Do NOT replace domain terms with generic placeholders
- Apply the technique structure around the specific content
- Make it 3-5x more detailed than the original
- Sound like an expert in that domain wrote it

CRITICAL: If user says "i want to learn RAG" the enhanced prompt MUST mention RAG specifically throughout. Never write "the domain of this request" \u2014 always name the actual domain.

Return valid JSON only:
{
  "label": "planning",
  "technique_name": "Least-to-Most",
  "enhanced_prompt": "full enhanced prompt here",
  "reason": "one sentence why this technique"
}`;
var creatingOffscreen = null;
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ isExtensionEnabled: true }, () => {
    console.log("[PromptRoute] Service worker installed. Extension enabled by default.");
  });
  createOffscreenDocument().catch(
    (err) => console.warn("[PromptRoute] Offscreen setup on install failed:", err)
  );
});
createOffscreenDocument().catch(
  (err) => console.warn("[PromptRoute] Offscreen startup failed:", err)
);
function compressPrompt(text) {
  if (!text)
    return text;
  const fillers = [
    /\bplease\b,?\s*/gi,
    /\bcould you\b\s*/gi,
    /\bi would like you to\b\s*/gi,
    /\bin order to\b\s*/gi,
    /\bit is important that\b\s*/gi,
    /\bmake sure to\b\s*/gi,
    /\byou should\b\s*/gi,
    /\bfeel free to\b\s*/gi
  ];
  let temp = text;
  for (const regex of fillers) {
    temp = temp.replace(regex, "");
  }
  const transitions = [
    /\bfurthermore\b,?\s*/gi,
    /\badditionally\b,?\s*/gi,
    /\bmoreover\b,?\s*/gi,
    /\bin conclusion\b,?\s*/gi,
    /\bto summarize\b,?\s*/gi
  ];
  for (const regex of transitions) {
    temp = temp.replace(regex, "");
  }
  const encouragement = [
    /\btake your time\b\.?\s*/gi,
    /\bthere is no rush\b\.?\s*/gi,
    /\bdo your best\b\.?\s*/gi,
    /\bthink carefully\b\.?\s*/gi
  ];
  for (const regex of encouragement) {
    temp = temp.replace(regex, "");
  }
  let lines = temp.split("\n").map((line) => line.trim());
  let collapsedLines = [];
  let prevWasBlank = false;
  for (const line of lines) {
    if (line === "") {
      if (!prevWasBlank) {
        collapsedLines.push("");
        prevWasBlank = true;
      }
    } else {
      collapsedLines.push(line);
      prevWasBlank = false;
    }
  }
  return collapsedLines.join("\n").trim();
}
async function createOffscreenDocument() {
  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }
  const hasDoc = await chrome.offscreen.hasDocument();
  if (hasDoc)
    return;
  const offscreenUrl = chrome.runtime.getURL("offscreen.html");
  creatingOffscreen = chrome.offscreen.createDocument({
    url: offscreenUrl,
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: "ONNX classifier inference"
  });
  await creatingOffscreen;
  creatingOffscreen = null;
  console.log("[PromptRoute] Offscreen document created.");
}
async function classifyPromptWithOffscreen(text) {
  try {
    await createOffscreenDocument();
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        target: "offscreen",
        type: "CLASSIFY_PROMPT",
        text
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[PromptRoute BG] Offscreen communication error:", chrome.runtime.lastError.message);
          resolve({ label: "general", confidence: 0 });
        } else {
          resolve(response || { label: "general", confidence: 0 });
        }
      });
    });
  } catch (err) {
    console.error("[PromptRoute BG] Failed to boot offscreen classifier:", err);
    return { label: "general", confidence: 0 };
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CLASSIFY_PROMPT") {
    const textToClassify = message.text || message.prompt || "";
    classifyPromptWithOffscreen(textToClassify).then((result) => {
      sendResponse(result);
    }).catch((err) => {
      console.error("[PromptRoute BG] Classification error:", err);
      sendResponse({ label: "general", confidence: 0 });
    });
    return true;
  }
  if (message.type === "CHECK_MODEL_STATUS") {
    (async () => {
      let isAccessible = false;
      let modelSize = null;
      try {
        const url = chrome.runtime.getURL("models/promptsmith-classifier/onnx/model_quantized.onnx");
        const response = await fetch(url, { headers: { "Range": "bytes=0-0" } });
        if (response.ok) {
          isAccessible = true;
          const sizeHeader = response.headers.get("Content-Length") || response.headers.get("Content-Range");
          if (sizeHeader) {
            const match = sizeHeader.match(/\/(\d+)$/);
            const totalBytes = match ? parseInt(match[1], 10) : parseInt(sizeHeader, 10);
            modelSize = (totalBytes / (1024 * 1024)).toFixed(1);
          }
        }
      } catch (err) {
      }
      const storage = await chrome.storage.sync.get([
        "groqApiKey",
        "geminiApiKey",
        "tokenEfficientMode"
      ]);
      const labelsDetected = Object.keys(id2label).length;
      sendResponse({
        modelLoaded: isAccessible,
        modelSize: modelSize ? parseFloat(modelSize) : null,
        labelsDetected,
        groqKeySet: !!storage.groqApiKey,
        geminiKeySet: !!storage.geminiApiKey,
        tokenEfficientMode: storage.tokenEfficientMode === true
      });
    })();
    return true;
  }
  if (message.type === "GET_ENHANCEMENT_MODE") {
    if (!sender.tab) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "GET_DOM_ENHANCEMENT_MODE" }, (response) => {
            sendResponse(response || { mode: "full" });
          });
        } else {
          sendResponse({ mode: "full" });
        }
      });
    } else {
      sendResponse({ mode: getEnhancementMode() });
    }
    return true;
  }
  if (message.type === "ENHANCE_WITH_API") {
    enhanceWithFreeAPI(message).then((result) => {
      sendResponse(result);
    }).catch((err) => {
      console.error("[PromptRoute BG] API error:", err);
      sendResponse(localFallback(message));
    });
    return true;
  }
});
async function enhanceWithFreeAPI(message) {
  let result;
  try {
    result = await getAPIResponse(message);
  } catch (err) {
    console.error("[PromptRoute BG] getAPIResponse failed, falling back to local formulas:", err);
    result = localFallback(message);
  }
  const storage = await chrome.storage.sync.get(["tokenEfficientMode"]);
  if (storage.tokenEfficientMode === true) {
    result.enhanced = compressPrompt(result.enhanced);
  }
  return result;
}
async function getAPIResponse({ prompt, useCase, mode, techniqueName }) {
  const storage = await chrome.storage.sync.get([
    "groqApiKey",
    "geminiApiKey",
    "openrouterApiKey",
    "preferredProvider"
  ]);
  const provider = storage.preferredProvider || "auto";
  if (provider === "groq" && storage.groqApiKey) {
    try {
      return await callGroq(prompt, useCase, mode, techniqueName, storage.groqApiKey);
    } catch (e) {
      console.warn("[PromptRoute] Groq preferred failed:", e.message);
    }
  }
  if (provider === "gemini" && storage.geminiApiKey) {
    try {
      return await callGemini(prompt, useCase, mode, techniqueName, storage.geminiApiKey);
    } catch (e) {
      console.warn("[PromptRoute] Gemini preferred failed:", e.message);
    }
  }
  if (provider === "openrouter" && storage.openrouterApiKey) {
    try {
      return await callOpenRouter(prompt, useCase, mode, techniqueName, storage.openrouterApiKey);
    } catch (e) {
      console.warn("[PromptRoute] OpenRouter preferred failed:", e.message);
    }
  }
  if (storage.groqApiKey) {
    try {
      return await callGroq(prompt, useCase, mode, techniqueName, storage.groqApiKey);
    } catch (e) {
      console.warn("[PromptRoute] Cascade Groq failed:", e.message);
    }
  }
  if (storage.geminiApiKey) {
    try {
      return await callGemini(prompt, useCase, mode, techniqueName, storage.geminiApiKey);
    } catch (e) {
      console.warn("[PromptRoute] Cascade Gemini failed:", e.message);
    }
  }
  if (storage.openrouterApiKey) {
    try {
      return await callOpenRouter(prompt, useCase, mode, techniqueName, storage.openrouterApiKey);
    } catch (e) {
      console.warn("[PromptRoute] Cascade OpenRouter failed:", e.message);
    }
  }
  console.warn("[PromptRoute] No active API keys configured. Falling back to local rules.");
  return localFallback({ prompt, useCase, mode, techniqueName });
}
async function callGroq(prompt, useCase, mode, techniqueName, apiKey) {
  const userMessage = buildEnhancementRequest(prompt, useCase, mode, techniqueName);
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      max_tokens: 1200,
      temperature: 0.3
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const content = data.choices[0].message.content.trim();
  return parseAPIResult(content, useCase, mode, "Groq (Llama 3.3 70B)", 1.6);
}
async function callGemini(prompt, useCase, mode, techniqueName, apiKey) {
  const userMessage = buildEnhancementRequest(prompt, useCase, mode, techniqueName);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${SYSTEM_PROMPT}

${userMessage}` }]
        }],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.3 }
      })
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const content = data.candidates[0].content.parts[0].text.trim();
  return parseAPIResult(content, useCase, mode, "Google AI Studio (Gemini 2.0 Flash)", 1.5);
}
async function callOpenRouter(prompt, useCase, mode, techniqueName, apiKey) {
  const userMessage = buildEnhancementRequest(prompt, useCase, mode, techniqueName);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/promptsmith/promptsmith",
      "X-Title": "PromptRoute"
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      max_tokens: 1200,
      temperature: 0.3
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const content = data.choices[0].message.content.trim();
  return parseAPIResult(content, useCase, mode, "OpenRouter", 1.6);
}
var VALID_LABELS = /* @__PURE__ */ new Set([
  "code",
  "math",
  "creative",
  "planning",
  "factual",
  "analysis",
  "longform",
  "conversational",
  "agentic",
  "structured_output",
  "general"
]);
function parseAPIResult(content, fallbackUseCase, mode, providerName, tokenMultiplier) {
  let label = fallbackUseCase;
  let enhanced = cleanAPIOutput(content);
  let techniqueOverrideName = null;
  let techniqueReason = null;
  try {
    const jsonStr = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed.label && VALID_LABELS.has(parsed.label.trim())) {
      label = parsed.label.trim();
    }
    if (parsed.enhanced_prompt && typeof parsed.enhanced_prompt === "string") {
      enhanced = parsed.enhanced_prompt.trim();
    }
    if (parsed.technique_name && typeof parsed.technique_name === "string") {
      techniqueOverrideName = parsed.technique_name.trim();
    }
    if (parsed.reason && typeof parsed.reason === "string") {
      techniqueReason = parsed.reason.trim();
    }
  } catch (e) {
  }
  const routing = routeAndEnhance("", label, mode);
  const technique = routing.technique || {
    name: "AI-Enhanced",
    emoji: "\u{1F916}",
    bestFor: label,
    paper: `LLM-enhanced via ${providerName}`,
    tokenMultiplier
  };
  if (techniqueOverrideName) {
    technique.name = techniqueOverrideName;
  }
  if (techniqueReason) {
    technique.reason = techniqueReason;
  }
  return { enhanced, label, technique };
}
function buildEnhancementRequest(prompt, useCase, mode, techniqueName) {
  return `Use case category: ${useCase}
Target technique: ${techniqueName || "Automatic Selection"}
Enhancement mode: ${mode} (${mode === "light" ? "concise mode for reasoning models" : "full structured mode for standard models"})

Raw user prompt:
"${prompt}"

Please optimize this prompt. Incorporate the core structure of the target technique (${techniqueName || "appropriate technique"}).
If mode is "light", keep the template additions compact and do not inject rigid reasoning scaffolds (e.g. do not add chain-of-thought blocks); focus on rich background context, explicit output criteria, and clarity.
If mode is "full", explicitly apply the formal stages of the prompting strategy.`;
}
function cleanAPIOutput(text) {
  let cleaned = text;
  if (cleaned.startsWith("```") && cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "");
    cleaned = cleaned.replace(/\n```$/, "");
  }
  return cleaned.trim();
}
function localFallback({ prompt, useCase, mode, techniqueName: _techniqueName }) {
  const categoryLabel = useCase.toUpperCase();
  const modeLabel = mode === "light" ? "\u26A1 Light Mode" : "\u{1F525} Full Mode";
  const enhanced = `[Context/Domain: ${categoryLabel} - Optimized via PromptRoute ${modeLabel}]
I am working on the following task:

"${prompt}"

Please address this with the following quality criteria:
- Keep the explanation clear, step-by-step, and logically structured.
- Highlight any structural assumptions or edge-cases that apply.
- Ensure the final result is verified and immediately actionable.`;
  return {
    enhanced,
    technique: {
      name: "Structured (Local Fallback)",
      emoji: "\u{1F4CB}",
      bestFor: "General Tasks",
      paper: "Local Rule Fallback",
      tokenMultiplier: 1.3
    }
  };
}
