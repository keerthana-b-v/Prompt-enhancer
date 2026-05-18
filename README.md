# PromptSmith ⚡
> The only prompt enhancer that applies the RIGHT prompting technique — not just a generic template.

<!-- Add demo.gif here -->

---

## Why PromptSmith

Every other prompt enhancer does this:

> Role + Task + Constraints + Output Format

PromptSmith does this:

- Detects your use case (code, planning, analysis, math, creative, factual, agentic, longform...)
- Routes to the correct technique (CoT, ReAct, Least-to-Most, Step-Back, PoT, ToT, SC...)
- Explains WHY that technique was chosen
- Shows token cost impact
- Lets you override to any other technique

---

## Techniques Supported (17)

| Technique | Best For |
|---|---|
| Chain-of-Thought | Math, logic, multi-step reasoning |
| Program-of-Thought | Code, algorithms, computation |
| Least-to-Most | Learning plans, roadmaps, complex tasks |
| Step-Back | Factual QA, knowledge-intensive questions |
| ReAct | Agentic tasks, search, tool use |
| Self-Consistency | Math with single correct answer |
| Tree of Thoughts | Complex planning, creative exploration |
| Self-Refine | Analysis, comparison, evaluation |
| Skeleton-of-Thought | Comprehensive guides, reports |
| Few-Shot | Pattern tasks, classification |
| Structured Role | Creative writing, copywriting |
| Meta Prompting | Ambiguous or novel tasks |
| XML Structured | Structured output, JSON, schemas |
| Prompt Chaining | Multi-stage workflows |
| Instruction Prompting | Conversational, simple requests |
| Role Prompting | Expert advice, persona-based |
| Adversarial Prompting | Red teaming, stress testing |

---

## Works On

- ChatGPT (chatgpt.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)

---

## Installation

### Step 1 — Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/promptsmith
cd promptsmith
```

### Step 2 — Install and build
```bash
npm install
node build.js
```

### Step 3 — Download the model
Download `promptsmith-model-v1.zip` from [Releases](../../releases)  
Unzip and copy all files into:
```
extension/models/promptsmith-classifier/
```

### Step 4 — Load in Chrome
1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click Load Unpacked
4. Select the `extension/` folder

### Step 5 — Add free API keys (optional)
Click the PromptSmith icon → Settings  
Add Groq API key (free at console.groq.com)  
Used only when local classifier confidence is low

---

## How It Works

1. You type a prompt in ChatGPT, Claude, or Gemini
2. Click ✨ Enhance
3. Local DistilBERT classifier (runs in browser via WASM) detects your use case
4. Router selects the optimal prompting technique
5. If confidence is low, Groq Llama 3.3 70B enhances with full domain awareness
6. Enhanced prompt replaces your original
7. Panel shows technique, confidence, token estimate, research citation
8. Override to any of 17 techniques with one click

---

## Tech Stack

- **Classifier:** DistilBERT fine-tuned on 7,477 prompts across 11 categories (85.6% accuracy)
- **Inference:** ONNX Runtime Web + Transformers.js running in Chrome offscreen document
- **Fallback:** Groq API (Llama 3.3 70B) — free tier
- **Extension:** Manifest V3, vanilla JS, no framework

---

## Adding a New Technique

1. Create `extension/core/techniques/your-technique.js`
2. Export an object with: `name`, `shortName`, `emoji`, `bestFor`, `paper`, `tokenMultiplier`, `apply(prompt)`, `applyLight(prompt)`
3. Import and add to `extension/core/techniques/index.js`
4. Add to `TECHNIQUE_MAP` in `extension/core/router.js`
5. Run `node build.js`

---

## Model Training

- **Dataset:** 7,477 labeled prompts across 11 categories
- **Model:** distilbert-base-uncased fine-tuned for 6 epochs
- **Accuracy:** 85.6% | F1: 0.855
- **Training notebook:** `train_classifier.ipynb` (Colab)

To retrain with new data:

```bash
python prepare_dataset.py
# Upload promptsmith_dataset_v1.csv to Colab
# Run train_classifier.ipynb
# Download promptsmith-model-v1.zip
# Replace files in models/promptsmith-classifier/
```

---

## Test Suite

```bash
node tests/technique-test.js
```

28/28 tests pass:
- 11/11 routing tests (all labels and techniques)
- 17/17 technique `apply()` validation tests

---

## Contributing

PRs welcome. See `docs/adding-techniques.md`  
Focus areas: new techniques, dataset improvements, platform support (Perplexity, Mistral, etc.)

---

## License

MIT

---

## Built By

Ruthvik — AI Automation Engineer, Bangalore  
GitHub: YOUR_GITHUB  
Twitter: YOUR_TWITTER
