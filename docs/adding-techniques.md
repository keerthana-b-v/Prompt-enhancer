# Adding New Prompting Techniques to PromptRoute

Thank you for contributing to PromptRoute! We've made our system highly modular so that adding a new prompting technique (e.g., *Reflexion*, *ReAct*, or *Active Prompting*) is extremely simple.

Here is the step-by-step guide to adding a new prompting technique to our core library.

---

## 🛠️ Step 1: Create the Technique Module

Add a new JavaScript file under `extension/core/techniques/` (e.g., `reflexion.js`).

Every technique module must implement and export a single plain JavaScript object with the following interface:

```javascript
// extension/core/techniques/reflexion.js

export const reflexion = {
  // Formal, readable name of the technique
  name: 'Reflexion Prompting',
  
  // 3-4 character abbreviation for buttons and badges
  shortName: 'Reflex',
  
  // Single emoji representing the cognitive action
  emoji: '🧠',
  
  // Summary sentence for our UI explanation panel
  bestFor: 'Complex decision making, code correction, and agentic error auditing',
  
  // Academic foundation / citation paper for details
  paper: 'Shinn et al. 2023 — Reflexion: Language Agents with Systematic Self-Reflection',
  
  /**
   * Full Mode: For standard models (e.g., GPT-4o, Gemini Flash).
   * Should inject a robust structural scaffolding for the LLM to execute.
   * @param {string} prompt - The raw user prompt
   * @returns {string} The enhanced, structured prompt
   */
  apply(prompt) {
    return `${prompt}

[Reflexion Instructions...]
Define your action, evaluate your mistakes, and reflect on the optimal path.`;
  },

  /**
   * Light Mode: For native reasoning/thinking models (e.g., OpenAI o3, DeepSeek R1).
   * Focus on semantic clarity and rich context rather than rigid formatting blocks.
   * @param {string} prompt - The raw user prompt
   * @returns {string} The enhanced, lightweight prompt
   */
  applyLight(prompt) {
    return `${prompt}

Please reflect critically on your intermediate steps and output a highly verified solution.`;
  },

  // Token multiplier estimate. For example, 1.5 means the final output 
  // is expected to consume roughly 1.5x the original prompt size.
  tokenMultiplier: 1.5
};
```

---

## 📂 Step 2: Register in Techniques Index

Open `extension/core/techniques/index.js` and register your new module:

```javascript
// extension/core/techniques/index.js

import { cot } from './cot.js';
// ...
import { reflexion } from './reflexion.js'; // 1. Import your technique

export {
  cot,
  // ...
  reflexion // 2. Export it
};
```

---

## 🚦 Step 3: Update the Router

Open `extension/core/router.js` and link your technique to appropriate use-cases or the manual selection UI:

1. Import your new technique from `./techniques/index.js`.
2. Add your technique to the `TECHNIQUE_MAP` if you want it to trigger automatically for a specific use case classification (e.g., `analysis: reflexion`).
3. Add your technique to the array in `getAllTechniques()` so that it populates the interactive override buttons on the explanation panel.

---

## 🧪 Step 4: Run Tests

Add a new test inside `tests/classifier.test.js` or run npm test to ensure all modules load and behave correctly:

```bash
npm run build
npm run test
npm run lint
```

Once all tests pass, load your unpacked extension folder inside Chrome, test the new button injection and UI overlay, and open your Pull Request!
