import { classifyPrompt } from '../core/classifier.js';

console.log('[PromptRoute Offscreen] Running local ONNX WebGPU/WASM model inside offscreen context.');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'CLASSIFY_PROMPT') {
    const promptText = message.text || '';
    classifyPrompt(promptText)
      .then((result) => {
        console.log('[PromptRoute] Classification:', result);
        sendResponse({ label: result.label, confidence: result.confidence });
      })
      .catch((err) => {
        console.error('[PromptRoute Offscreen] ONNX classifier error:', err);
        sendResponse({ label: 'general', confidence: 0 });
      });
    return true; // Keep message channel open for async sendResponse
  }
});
