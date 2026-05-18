import { AutoTokenizer, AutoModelForSequenceClassification, env } from '@huggingface/transformers';

// Set up Transformers.js environment constraints
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = chrome.runtime.getURL('models/');
env.useBrowserCache = false;

// Point ONNX Runtime to locally bundled WASM assets
env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('dist/');
env.backends.onnx.wasm.numThreads = 1;

// Global handshake flags and maps
export let MODEL_LOADED = false;
export let label2id = {};
export let id2label = {
  "0": "analysis", "1": "agentic", "2": "code",
  "3": "conversational", "4": "creative", "5": "factual",
  "6": "longform", "7": "math", "8": "planning",
  "9": "skip", "10": "structured_output"
};

// Populate default label2id from default id2label
for (const [id, label] of Object.entries(id2label)) {
  label2id[label] = parseInt(id, 10);
}

/**
 * Loads dynamic label_map.json from local models directory
 */
export async function loadLabelMap() {
  try {
    const url = chrome.runtime.getURL('models/promptsmith-classifier/label_map.json');
    if (url && url.startsWith('chrome-extension://')) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      const data = await response.json();
      id2label = data;
      label2id = {};
      for (const [id, label] of Object.entries(data)) {
        label2id[label] = parseInt(id, 10);
      }
      console.log('[PromptSmith] Dynamic label_map.json loaded successfully:', id2label);
    } else {
      throw new Error(`Unsupported URL scheme: ${url}`);
    }
  } catch (error) {
    console.warn('[PromptSmith] Failed to load label_map.json dynamically. Using hardcoded fallback mapping.');
  }
}

class ClassifierSingleton {
  static modelPath = 'promptsmith-classifier';
  static tokenizer = null;
  static model = null;
  static loaded = false;

  static async getInstance() {
    if (!this.loaded) {
      try {
        console.log('[PromptSmith] Initializing local ONNX classifier via WASM...');
        this.tokenizer = await AutoTokenizer.from_pretrained(this.modelPath);
        this.model = await AutoModelForSequenceClassification.from_pretrained(this.modelPath, {
          dtype: 'q8',
          device: 'wasm'
        });
        this.loaded = true;
        MODEL_LOADED = true;
        console.log('[PromptSmith] ONNX model successfully loaded via WASM.');
        await loadLabelMap();
      } catch (err) {
        console.error('[PromptSmith] ONNX model loading failed:', err);
        MODEL_LOADED = false;
      }
    }
    return this.loaded ? { tokenizer: this.tokenizer, model: this.model } : null;
  }
}

// Pre-emptive availability check on import
(async () => {
  try {
    const url = chrome.runtime.getURL('models/promptsmith-classifier/onnx/model_quantized.onnx');
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      ClassifierSingleton.getInstance().catch(() => {});
    } else {
      MODEL_LOADED = false;
      console.warn('[PromptSmith] model_quantized.onnx not found. MODEL_LOADED flag set to false.');
    }
  } catch (err) {
    MODEL_LOADED = false;
    console.warn('[PromptSmith] Pre-emptive model check failed (likely first-run):', err);
  }
})();

/**
 * Classifies a user prompt using the local quantized ONNX model
 * @param {string} text - The raw user prompt
 * @returns {Promise<{ label: string, confidence: number }>}
 */
export async function classifyPrompt(text) {
  try {
    const components = await ClassifierSingleton.getInstance();
    if (!components) {
      console.warn('[PromptSmith] Classifier is offline. Bypassing and returning general label.');
      return { label: 'general', confidence: 0 };
    }

    const { tokenizer, model } = components;

    // Tokenize with explicit padding so input_ids are always [1, 128]
    const inputs = await tokenizer(text, {
      padding: 'max_length',
      max_length: 128,
      truncation: true,
      return_tensors: 'pt'
    });

    const outputs = await model(inputs);

    // Softmax over raw logits — outputs.logits.data is a flat Float32Array [num_labels]
    const logitsData = Array.from(outputs.logits.data);
    const maxLogit = Math.max(...logitsData);
    const expScores = logitsData.map(x => Math.exp(x - maxLogit));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const scores = expScores.map(x => x / sumExp);

    const maxScore = Math.max(...scores);
    const maxIndex = scores.indexOf(maxScore);
    const label = id2label[maxIndex];

    return {
      label: label?.toLowerCase().trim() || 'general',
      confidence: maxScore
    };
  } catch (error) {
    console.error('[PromptSmith] Error during prompt classification:', error);
  }

  return { label: 'general', confidence: 0 };
}

/**
 * Checks if the classification confidence is high enough for automated routing
 * @param {number} confidence - The classification confidence score
 * @returns {boolean}
 */
export function isHighConfidence(confidence) {
  return confidence >= 0.72;
}
