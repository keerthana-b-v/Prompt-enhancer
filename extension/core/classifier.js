import { pipeline, env } from '@huggingface/transformers';

// Set up Transformers.js environment constraints
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = chrome.runtime.getURL('models/');
env.useBrowserCache = false;

// Point ONNX Runtime to locally bundled WASM assets
env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('dist/');

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
  static task = 'text-classification';
  static model = 'promptsmith-classifier';
  static instance = null;

  static async getInstance() {
    if (this.instance === null) {
      try {
        console.log('[PromptSmith] Initializing local ONNX classifier with WebGPU...');
        this.instance = await pipeline(this.task, this.model, {
          dtype: 'q8',
          device: 'webgpu'
        });
        MODEL_LOADED = true;
        console.log('[PromptSmith] ONNX model successfully loaded via WebGPU.');
        await loadLabelMap();
      } catch (gpuError) {
        console.warn('[PromptSmith] WebGPU acceleration unavailable. Falling back to WASM...', gpuError);
        try {
          this.instance = await pipeline(this.task, this.model, {
            dtype: 'q8',
            device: 'wasm'
          });
          MODEL_LOADED = true;
          console.log('[PromptSmith] ONNX model successfully loaded via WASM.');
          await loadLabelMap();
        } catch (wasmError) {
          console.error('[PromptSmith] ONNX model loading failed completely:', wasmError);
          MODEL_LOADED = false;
          this.instance = null;
        }
      }
    }
    return this.instance;
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
    const classifier = await ClassifierSingleton.getInstance();
    if (!classifier) {
      console.warn('[PromptSmith] Classifier is offline. Bypassing and returning general label.');
      return { label: 'general', confidence: 0 };
    }
    const result = await classifier(text);
    
    if (result && result.length > 0) {
      return {
        label: result[0].label.toLowerCase().trim(),
        confidence: result[0].score
      };
    }
  } catch (error) {
    console.error('[PromptSmith] Error during prompt classification:', error);
  }
  
  // Return safe default fallback
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
