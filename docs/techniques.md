# PromptRoute Prompting Techniques Wiki

Welcome to the community wiki for prompting techniques integrated into PromptRoute. This document outlines the technical papers, ideal use cases, operational mechanics, token overheads, and practical examples for each supported technique.

---

## Table of Techniques

| Emoji | Technique | Short Name | Target Use Case | Foundation Paper | Token Multiplier |
|---|---|---|---|---|---|
| 🔗 | Chain-of-Thought | `CoT` | Math, Logic, Multi-step reasoning | Wei et al. (2022) | ~1.8× |
| 💻 | Program-of-Thought | `PoT` | Coding, Equations, State tracking | Chen et al. (2022) | ~1.5× |
| 🪜 | Least-to-Most | `Least-to-Most` | Complex plans, roadmaps, scheduling | Zhou et al. (2022) | ~1.6× |
| 🔍 | Step-Back Abstraction | `Step-Back` | Factual topics, conceptual grounding | Zheng et al. (2023) | ~1.5× |
| 🎭 | Structured Persona | `Persona` | Creative writing, emails, copywriting | Reynolds & McDonell (2021) | ~1.3× |
| 🔄 | Self-Refinement | `Self-Refine` | Auditing, code reviews, grades, feedback | Madaan et al. (2023) | ~1.7× |
| 💀 | Skeleton-of-Thought | `Skeleton` | Long-form books, detailed reports | Ning et al. (2023) | ~1.6× |
| 🎯 | Few-Shot Prompting | `Few-Shot` | Tone matching, fixed formatting | Brown et al. (2020) | ~1.4× |

---

## Deep Dives & Mechanics

### 1. Chain-of-Thought (CoT)
- **Paper:** *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models* (Wei et al., 2022)
- **How it works:** Instructs standard models to break problems down step-by-step.
- **Reasoning Models (Light mode):** Swaps to encouraging verification and showing steps clearly, since reasoning models (o1, R1) have internal CoT loops.
- **Example:**
  - *Before:* "How many legs do 3 ducks and 4 spiders have altogether?"
  - *After (Enhanced):* Includes a step-by-step breakdown instruction: 1. Identify counts, 2. Resolve duck legs, 3. Resolve spider legs, 4. Sum and verify.

### 2. Program-of-Thought (PoT)
- **Paper:** *Program of Thought Prompting: Disentangling Computation from Reasoning for Large Language Models* (Chen et al., 2022)
- **How it works:** Translates math or logic into clear algorithms or executable Python scripts. This leverages the LLM's programming syntax capability to reduce calculation errors.
- **Example:**
  - *Before:* "Calculate the compounding interest on $5000 at 5% annually for 12 years."
  - *After (Enhanced):* Formulates the calculation as a structured Python script initializing `principal = 5000`, `rate = 0.05`, and running a simulated interest accumulation loop.

### 3. Least-to-Most Prompting
- **Paper:** *Least-to-Most Prompting Enables Complex Reasoning in Large Language Models* (Zhou et al., 2022)
- **How it works:** Deconstructs a complex, multi-layered problem into a list of simpler sub-tasks, then solves the easiest one first, using its answer as context to solve the next.
- **Example:**
  - *Before:* "Make a strategy to migrate our database to AWS."
  - *After (Enhanced):* Orders the task starting from 1. Assessment of size/schema, 2. Backup and validation, 3. Staging and networking, 4. Syncing data, 5. Cutover and checking.

### 4. Step-Back Abstraction
- **Paper:** *Take a Step Back: Evoking Reasoning via Abstraction in Large Language Models* (Zheng et al., 2023)
- **How it works:** Prompts the model to identify the core high-level theoretical concepts or laws that apply first, explain them, and then apply those foundational concepts to solve the specific target problem.
- **Example:**
  - *Before:* "Will a gold coin dissolve in hydrochloric acid?"
  - *After (Enhanced):* Forces the model to step back and outline the reactivity series of metals and acid-metal interactions before resolving gold specifically.

### 5. Structured Role/Persona
- **Paper:** *Prompt Programming for Large Language Models* (Reynolds & McDonell, 2021)
- **How it works:** Configures a highly specific expert persona, target audience, structural constraints, and delivery criteria to raise output quality.
- **Example:**
  - *Before:* "Write an email announcing our new extension."
  - *After (Enhanced):* Adopts a world-class tech copywriter role, setting clear rules to avoid marketing buzzwords and outline immediate reader value.

### 6. Self-Refinement
- **Paper:** *Self-Refine: Iterative Refinement with Self-Feedback* (Madaan et al., 2023)
- **How it works:** Prompts the model to output a draft, write a detailed critique evaluating its own constraints, and then output a refined final version.
- **Example:**
  - *Before:* "Review this JavaScript for performance bugs."
  - *After (Enhanced):* Formulates a three-stage sequence: 1. Initial review draft, 2. Constraints and accuracy critique checklist, 3. Polished, optimized feedback summary.

### 7. Skeleton-of-Thought
- **Paper:** *Skeleton-of-Thought: Large Language Models Can Do Parallel Generation* (Ning et al., 2023)
- **How it works:** Prompts the model to write a highly detailed skeletal outline first, and then methodically expand on each section with rich details and concrete facts.
- **Example:**
  - *Before:* "Write a guide to Docker basics."
  - *After (Enhanced):* Asks the model to define a comprehensive skeletal index of container fundamentals, then systematically write deep chapters for each index point.

### 8. Few-Shot Prompting
- **Paper:** *Language Models are Few-Shot Learners* (Brown et al., 2020)
- **How it works:** Supplies the model with structural placeholders to feed exemplary input-output pairs. This demonstrates the target format and tone cleanly.
