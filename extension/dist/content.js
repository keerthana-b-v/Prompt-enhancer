(() => {
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
  var PLATFORMS = {
    "chatgpt.com": "chatgpt",
    "www.chatgpt.com": "chatgpt",
    "claude.ai": "claude",
    "gemini.google.com": "gemini"
  };
  function detectPlatform() {
    try {
      const host = window.location.hostname;
      for (const [domain, platform] of Object.entries(PLATFORMS)) {
        if (host === domain || host.endsWith("." + domain)) {
          return platform;
        }
      }
    } catch (error) {
      console.error("[PromptSmith] detectPlatform error:", error);
    }
    return "unknown";
  }
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
        console.warn(`[PromptSmith] Error querying selector ${selector}:`, e);
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

  // extension/core/techniques/few-shot.js
  var fewShot = {
    name: "Few-Shot Prompting",
    shortName: "Few-Shot",
    emoji: "\u{1F3AF}",
    bestFor: "Structured classification, consistent format outputs, tone emulation, and data transformations",
    paper: "Brown et al. 2020 \u2014 Language Models are Few-Shot Learners",
    // Full mode: provides structural slots for context mapping and formatting
    apply(prompt) {
      return `${prompt}

Before answering, generate 2 brief examples that demonstrate the exact output format, tone, and structure this task requires. Use examples that are directly relevant to the domain of the request above \u2014 not generic placeholders. Then solve the task using that same format.`;
    },
    // Light mode: targets direct adherence to constraints with minimal example overhead
    applyLight(prompt) {
      return `${prompt}

Adhere strictly to the requested formatting, structural constraints, and target schema. Maintain extreme stylistic consistency without adding conversational fluff or meta-commentary.`;
    },
    tokenMultiplier: 1.4
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
  function getAllTechniques() {
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

  // extension/content/content.js
  function classifyLocally(text) {
    const t = text.toLowerCase();
    if (/\b(code|function|class|bug|error|script|api|implement|program|debug|algorithm|syntax|compile|variable|loop|array|object|method|module|import|library|framework|test|unit test|refactor)\b/.test(t))
      return "code";
    if (/\b(math|calculate|equation|solve|probability|integral|derivative|formula|percent|sum|average|matrix|statistics|algebra|geometry|calculus)\b/.test(t))
      return "math";
    if (/\b(write|story|poem|creative|fiction|essay|blog|article|draft|compose|narrative|character|plot|scene|lyric|rhyme|screenplay)\b/.test(t))
      return "creative";
    if (/\b(plan|strategy|roadmap|schedule|timeline|project|milestone|sprint|agenda|workflow|process|steps to|how to achieve)\b/.test(t))
      return "planning";
    if (/\b(explain|what is|how does|define|describe|history of|origin|why does|overview of|what are|tell me about)\b/.test(t))
      return "factual";
    if (/\b(analyze|compare|evaluate|assess|review|critique|pros and cons|trade.?off|strengths|weaknesses|audit|examine)\b/.test(t))
      return "analysis";
    if (/\b(agent|tool use|search the web|browse|fetch|automate|run a|execute|multi.?step task)\b/.test(t))
      return "agentic";
    if (/\b(report|guide|documentation|comprehensive|detailed breakdown|in.?depth|long.?form|outline|chapter|section)\b/.test(t))
      return "longform";
    if (/\b(json|xml|csv|yaml|format|structured|parse|extract|schema|table|spreadsheet|list of)\b/.test(t))
      return "structured_output";
    if (/\b(chat|talk|discuss|conversation|opinion|feel|think about|what do you|casual)\b/.test(t))
      return "conversational";
    return "general";
  }
  var INPUT_SELECTORS = {
    chatgpt: "#prompt-textarea",
    claude: '[data-testid="composer-input"] div[contenteditable="true"]',
    gemini: ".ql-editor"
  };
  var enhanceButton = null;
  var explanationPanel = null;
  function getInputBox() {
    const platform = detectPlatform();
    const selector = INPUT_SELECTORS[platform];
    if (!selector)
      return null;
    return document.querySelector(selector);
  }
  function getPromptText() {
    const box = getInputBox();
    if (!box)
      return "";
    return box.innerText || box.value || "";
  }
  function setPromptText(text) {
    const box = getInputBox();
    if (!box)
      return;
    if (box.tagName === "TEXTAREA" || box.tagName === "INPUT") {
      box.value = text;
      box.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      while (box.firstChild) {
        box.removeChild(box.firstChild);
      }
      const p = document.createElement("p");
      p.textContent = text;
      box.appendChild(p);
      box.dispatchEvent(new Event("input", { bubbles: true }));
      const range = document.createRange();
      range.selectNodeContents(box);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  function injectEnhanceButton(box) {
    if (document.getElementById("promptsmith-btn"))
      return;
    enhanceButton = document.createElement("button");
    enhanceButton.id = "promptsmith-btn";
    const sparkle = document.createElement("span");
    sparkle.className = "ps-btn-sparkle";
    sparkle.textContent = "\u2728";
    const btnText = document.createElement("span");
    btnText.className = "ps-btn-text";
    btnText.textContent = "Enhance";
    enhanceButton.appendChild(sparkle);
    enhanceButton.appendChild(btnText);
    enhanceButton.title = "Enhance with PromptSmith";
    enhanceButton.addEventListener("click", handleEnhance);
    const parent = box.parentElement;
    if (parent) {
      parent.style.position = "relative";
      parent.appendChild(enhanceButton);
    }
  }
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
  async function handleEnhance() {
    const originalPrompt = getPromptText();
    if (!originalPrompt.trim()) {
      showToast("Please type a prompt first!");
      return;
    }
    const SKIP_PATTERNS = [
      /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|lol|haha|sure|great|cool|bye|goodbye|sup|yo|hmm|nvm|nevermind|continue|more|next|stop|wait|test|testing)$/i
    ];
    const wordCount = originalPrompt.trim().split(/\s+/).length;
    const isSkip = wordCount <= 3 && SKIP_PATTERNS.some((p) => p.test(originalPrompt.trim()));
    if (isSkip) {
      showToast("This prompt is too short to enhance.");
      return;
    }
    window.promptSmithOriginal = originalPrompt;
    enhanceButton.classList.add("loading");
    enhanceButton.disabled = true;
    enhanceButton.querySelector(".ps-btn-text").textContent = "Enhancing...";
    try {
      console.log("[PromptSmith] Sending classification request...");
      const classResponse = await chrome.runtime.sendMessage({
        type: "CLASSIFY_PROMPT",
        text: originalPrompt
      });
      let useCase = classResponse.label || "general";
      const confidence = classResponse.confidence || 0;
      let mode = getEnhancementMode();
      if (confidence === 0) {
        useCase = classifyLocally(originalPrompt);
      }
      if (confidence < 0.55 && mode === "full") {
        mode = "light";
      }
      const debugTechnique = routeAndEnhance("", useCase, mode).technique?.name || "Instruction Prompting";
      console.log(`[PromptSmith] Label: ${useCase} | Confidence: ${confidence.toFixed(2)} | Mode: ${mode} | Technique: ${debugTechnique}`);
      if (useCase === "skip") {
        showToast("This prompt does not need enhancement.");
        return;
      }
      let result;
      const storage = await chrome.storage.sync.get([
        "groqApiKey",
        "geminiApiKey",
        "openrouterApiKey",
        "tokenEfficientMode"
      ]);
      const hasApiKey = !!(storage.groqApiKey || storage.geminiApiKey || storage.openrouterApiKey);
      const isTokenEfficient = storage.tokenEfficientMode === true;
      if (hasApiKey) {
        const dummyResult = routeAndEnhance("", useCase, mode);
        const targetTechniqueName = dummyResult.technique?.name || "Instruction Prompting";
        result = await chrome.runtime.sendMessage({
          type: "ENHANCE_WITH_API",
          prompt: originalPrompt,
          useCase,
          mode,
          techniqueName: targetTechniqueName
        });
      } else {
        result = routeAndEnhance(originalPrompt, useCase, mode);
        if (isTokenEfficient) {
          result.enhanced = compressPrompt(result.enhanced);
        }
      }
      setPromptText(result.enhanced);
      showExplanationPanel(result.technique, confidence, mode, originalPrompt, result.enhanced, isTokenEfficient);
      showToast("Prompt enhanced successfully!");
    } catch (err) {
      console.error("[PromptSmith] Enhancement failed:", err);
      if (err.message && err.message.includes("Extension context invalidated")) {
        showToast("Extension reloaded \u2014 please refresh this page to reconnect PromptSmith.");
        return;
      }
      showToast("Enhancement failed. Please try again.");
    } finally {
      enhanceButton.classList.remove("loading");
      enhanceButton.disabled = false;
      enhanceButton.querySelector(".ps-btn-text").textContent = "Enhance";
    }
  }
  function showExplanationPanel(technique, confidence, mode, originalPrompt, enhancedPrompt, isTokenEfficient) {
    explanationPanel?.remove();
    explanationPanel = document.createElement("div");
    explanationPanel.id = "promptsmith-panel";
    explanationPanel.className = "ps-panel-fade-in";
    const modeLabel = mode === "light" ? "\u26A1 Light (Reasoning Model detected)" : "\u{1F525} Full";
    const confidencePct = (confidence * 100).toFixed(0);
    const getWordCount = (str) => {
      if (!str || !str.trim())
        return 0;
      return str.trim().split(/\s+/).length;
    };
    const originalWords = getWordCount(originalPrompt);
    const originalTokens = Math.round(originalWords * 1.3);
    const enhancedWords = getWordCount(enhancedPrompt);
    const enhancedTokens = Math.round(enhancedWords * 1.3);
    let diffPct = 0;
    if (originalTokens > 0) {
      diffPct = Math.round((enhancedTokens - originalTokens) / originalTokens * 100);
    }
    const diffSign = diffPct >= 0 ? "+" : "";
    const isSC = technique.shortName === "SC" || technique.name.toLowerCase().includes("consistency");
    const header = document.createElement("div");
    header.className = "ps-header";
    const headerLeft = document.createElement("div");
    headerLeft.className = "ps-header-left";
    const emoji = document.createElement("span");
    emoji.className = "ps-emoji";
    emoji.textContent = technique.emoji;
    const title = document.createElement("span");
    title.className = "ps-title";
    title.textContent = technique.name;
    headerLeft.appendChild(emoji);
    headerLeft.appendChild(title);
    const closeBtn = document.createElement("button");
    closeBtn.className = "ps-close";
    closeBtn.id = "ps-close-btn";
    closeBtn.title = "Close Panel";
    closeBtn.textContent = "\u2715";
    header.appendChild(headerLeft);
    header.appendChild(closeBtn);
    explanationPanel.appendChild(header);
    const body = document.createElement("div");
    body.className = "ps-body";
    const bestForItem = document.createElement("div");
    bestForItem.className = "ps-detail-item";
    const bestForLabel = document.createElement("span");
    bestForLabel.className = "ps-detail-label";
    bestForLabel.textContent = "\u{1F3AF} Best For: ";
    const bestForVal = document.createElement("span");
    bestForVal.className = "ps-detail-value";
    bestForVal.textContent = technique.bestFor;
    bestForItem.appendChild(bestForLabel);
    bestForItem.appendChild(bestForVal);
    body.appendChild(bestForItem);
    const modeItem = document.createElement("div");
    modeItem.className = "ps-detail-item";
    const modeLabelEl = document.createElement("span");
    modeLabelEl.className = "ps-detail-label";
    modeLabelEl.textContent = "\u26A1 Mode: ";
    const modeVal = document.createElement("span");
    modeVal.className = "ps-detail-value";
    modeVal.textContent = `${modeLabel} (Confidence: ${confidencePct}%)`;
    modeItem.appendChild(modeLabelEl);
    modeItem.appendChild(modeVal);
    body.appendChild(modeItem);
    if (technique.reason) {
      const reasonItem = document.createElement("div");
      reasonItem.className = "ps-detail-item";
      const reasonLabel = document.createElement("span");
      reasonLabel.className = "ps-detail-label";
      reasonLabel.textContent = "\u{1F4A1} AI Rationale: ";
      const reasonVal = document.createElement("span");
      reasonVal.className = "ps-detail-value";
      reasonVal.style.fontStyle = "italic";
      reasonVal.style.color = "#a78bfa";
      reasonVal.textContent = technique.reason;
      reasonItem.appendChild(reasonLabel);
      reasonItem.appendChild(reasonVal);
      body.appendChild(reasonItem);
    }
    const tokenItem = document.createElement("div");
    tokenItem.className = "ps-detail-item";
    const tokenLabel = document.createElement("span");
    tokenLabel.className = "ps-detail-label";
    tokenLabel.textContent = "\u{1F4CA} Token Estimate:";
    tokenItem.appendChild(tokenLabel);
    const tokenContainer = document.createElement("div");
    tokenContainer.style.display = "flex";
    tokenContainer.style.flexDirection = "column";
    tokenContainer.style.fontSize = "11px";
    tokenContainer.style.color = "#4b5563";
    tokenContainer.style.gap = "2px";
    const origLine = document.createElement("span");
    origLine.textContent = "Original: ~";
    const origB = document.createElement("b");
    origB.textContent = originalTokens;
    origLine.appendChild(origB);
    origLine.appendChild(document.createTextNode(" tokens"));
    const enhLine = document.createElement("span");
    enhLine.textContent = "Enhanced: ~";
    const enhB = document.createElement("b");
    enhB.textContent = enhancedTokens;
    const enhB2 = document.createElement("b");
    enhB2.textContent = ` (${diffSign}${diffPct}% change)`;
    enhLine.appendChild(enhB);
    enhLine.appendChild(document.createTextNode(" tokens"));
    enhLine.appendChild(enhB2);
    tokenContainer.appendChild(origLine);
    tokenContainer.appendChild(enhLine);
    if (isSC) {
      const scWarn = document.createElement("span");
      scWarn.style.color = "#ea580c";
      scWarn.style.fontWeight = "500";
      scWarn.style.marginTop = "3px";
      scWarn.style.display = "block";
      scWarn.textContent = "\u26A0\uFE0F Self-Consistency uses ~3x tokens";
      tokenContainer.appendChild(scWarn);
    }
    tokenItem.appendChild(tokenContainer);
    body.appendChild(tokenItem);
    if (isTokenEfficient) {
      const banner = document.createElement("div");
      banner.style.background = "#ecfdf5";
      banner.style.border = "1px solid #10b981";
      banner.style.borderRadius = "4px";
      banner.style.padding = "6px 10px";
      banner.style.margin = "8px 0";
      banner.style.fontSize = "11px";
      banner.style.color = "#065f46";
      banner.style.display = "flex";
      banner.style.alignItems = "center";
      banner.style.gap = "5px";
      const bannerText = document.createElement("span");
      bannerText.textContent = "\u26A1 Token-Efficient Mode active \u2014 prompt compressed";
      banner.appendChild(bannerText);
      body.appendChild(banner);
    }
    const paperItem = document.createElement("div");
    paperItem.className = "ps-detail-item ps-paper-section";
    paperItem.style.borderTop = "1px solid #e5e7eb";
    paperItem.style.paddingTop = "8px";
    paperItem.style.marginTop = "8px";
    const paperLabel = document.createElement("span");
    paperLabel.className = "ps-detail-label";
    paperLabel.textContent = "\u{1F4C4} Foundation: ";
    const paperVal = document.createElement("span");
    paperVal.className = "ps-detail-value ps-paper-link";
    paperVal.textContent = technique.paper;
    paperItem.appendChild(paperLabel);
    paperItem.appendChild(paperVal);
    body.appendChild(paperItem);
    explanationPanel.appendChild(body);
    const footer = document.createElement("div");
    footer.className = "ps-footer";
    const overrides = document.createElement("div");
    overrides.className = "ps-overrides-section";
    const overridesTitle = document.createElement("span");
    overridesTitle.className = "ps-override-title";
    overridesTitle.textContent = "Try different technique:";
    overrides.appendChild(overridesTitle);
    const overridesButtons = document.createElement("div");
    overridesButtons.className = "ps-override-buttons";
    const techniquesList = getAllTechniques();
    techniquesList.forEach((t) => {
      const obtn = document.createElement("button");
      obtn.className = "ps-override-btn";
      obtn.setAttribute("data-technique", t.shortName);
      obtn.title = t.name;
      obtn.textContent = `${t.emoji} ${t.shortName}`;
      overridesButtons.appendChild(obtn);
    });
    overrides.appendChild(overridesButtons);
    footer.appendChild(overrides);
    const undoBtn = document.createElement("button");
    undoBtn.className = "ps-undo";
    undoBtn.id = "ps-undo-btn";
    const undoIcon = document.createElement("span");
    undoIcon.className = "ps-undo-icon";
    undoIcon.textContent = "\u21A9";
    const undoText = document.createTextNode(" Undo and Restore");
    undoBtn.appendChild(undoIcon);
    undoBtn.appendChild(undoText);
    footer.appendChild(undoBtn);
    explanationPanel.appendChild(footer);
    document.body.appendChild(explanationPanel);
    document.getElementById("ps-close-btn").onclick = () => {
      explanationPanel.classList.add("ps-panel-fade-out");
      setTimeout(() => explanationPanel?.remove(), 250);
    };
    document.getElementById("ps-undo-btn").onclick = () => {
      setPromptText(originalPrompt);
      showToast("Restored original prompt.");
      explanationPanel.classList.add("ps-panel-fade-out");
      setTimeout(() => explanationPanel?.remove(), 250);
    };
    const overrideBtns = explanationPanel.querySelectorAll(".ps-override-btn");
    overrideBtns.forEach((btn) => {
      btn.onclick = async () => {
        const shortName = btn.getAttribute("data-technique");
        const targetTechnique = techniquesList.find((t) => t.shortName === shortName);
        if (targetTechnique) {
          showToast(`Applying ${targetTechnique.name}...`);
          btn.style.opacity = "0.5";
          btn.disabled = true;
          const original = window.promptSmithOriginal || getPromptText();
          const mode2 = getEnhancementMode();
          let enhanced = mode2 === "light" ? targetTechnique.applyLight(original) : targetTechnique.apply(original);
          const storageState = await chrome.storage.sync.get(["tokenEfficientMode"]);
          const isTokenEfficient2 = storageState.tokenEfficientMode === true;
          if (isTokenEfficient2) {
            enhanced = compressPrompt(enhanced);
          }
          setPromptText(enhanced);
          showExplanationPanel(targetTechnique, 1, mode2, original, enhanced, isTokenEfficient2);
        }
      };
    });
  }
  function showToast(msg) {
    document.getElementById("promptsmith-toast")?.remove();
    const toast = document.createElement("div");
    toast.id = "promptsmith-toast";
    toast.className = "ps-toast-fade-in";
    const icon = document.createElement("span");
    icon.className = "ps-toast-icon";
    icon.textContent = "\u26A1";
    const msgSpan = document.createElement("span");
    msgSpan.className = "ps-toast-msg";
    msgSpan.textContent = msg;
    toast.appendChild(icon);
    toast.appendChild(msgSpan);
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("ps-toast-fade-out");
      setTimeout(() => toast.remove(), 300);
    }, 3e3);
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_DOM_ENHANCEMENT_MODE") {
      sendResponse({ mode: getEnhancementMode() });
      return false;
    }
  });
  function runBoot() {
    const intervalId = setInterval(async () => {
      try {
        if (!chrome.runtime || !chrome.runtime.id) {
          clearInterval(intervalId);
          return;
        }
        const storage = await chrome.storage.sync.get("isExtensionEnabled");
        const isEnabled = storage.isExtensionEnabled !== false;
        const box = getInputBox();
        if (box && isEnabled) {
          injectEnhanceButton(box);
        } else {
          document.getElementById("promptsmith-btn")?.remove();
          enhanceButton = null;
        }
      } catch (e) {
        if (e.message && e.message.includes("Extension context invalidated")) {
          clearInterval(intervalId);
        } else {
          console.warn("[PromptSmith] Scanner bootloop error:", e);
        }
      }
    }, 1e3);
  }
  runBoot();
})();
