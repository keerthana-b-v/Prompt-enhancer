// PromptSmith Background Service Worker
// Handles ONNX model inference, API routing, and extension lifecycle events

import { id2label } from '../core/labels.js';
import { getEnhancementMode } from '../core/model-detector.js';
import { routeAndEnhance } from '../core/router.js';

const SYSTEM_PROMPT = `You are an expert prompt engineer. Your job is to rewrite user prompts to get dramatically better responses from AI models.

Given a raw user prompt:

STEP 1 - Identify:
- The specific topic and domain (e.g. RAG, Python, fitness, marketing)
- The user's actual intent (learn, build, analyze, create, plan, debug)
- The complexity level (beginner, intermediate, expert)

STEP 2 - Select the best technique:
- Learning/roadmap intent → Least-to-Most
- Reasoning/math/logic → Chain-of-Thought
- Code/implementation → Program-of-Thought
- Research/search tasks → ReAct
- Creative/writing → Structured Role
- Analysis/comparison → Self-Refine
- Factual explanation → Step-Back
- Long guides/reports → Skeleton-of-Thought
- Ambiguous/novel → Meta Prompting

OVERRIDE RULE: ANY prompt containing "i want to learn", "how do i learn", "teach me", "i want to understand", "how to get started with", or "i want to get into" → ALWAYS use Least-to-Most regardless of other signals. Set label to "planning".

STEP 3 - Rewrite the prompt:
- Keep ALL specific terminology from the original prompt
- Do NOT replace domain terms with generic placeholders
- Apply the technique structure around the specific content
- Make it 3-5x more detailed than the original
- Sound like an expert in that domain wrote it

CRITICAL: If user says "i want to learn RAG" the enhanced prompt MUST mention RAG specifically throughout. Never write "the domain of this request" — always name the actual domain.

Return valid JSON only:
{
  "label": "planning",
  "technique_name": "Least-to-Most",
  "enhanced_prompt": "full enhanced prompt here",
  "reason": "one sentence why this technique"
}`;

let creatingOffscreen = null;

// Initialize extension settings on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ isExtensionEnabled: true }, () => {
    console.log('[PromptSmith] Service worker installed. Extension enabled by default.');
  });
  createOffscreenDocument().catch(err =>
    console.warn('[PromptSmith] Offscreen setup on install failed:', err)
  );
});

// Also create eagerly on every service worker startup so it shows in Inspect views
createOffscreenDocument().catch(err =>
  console.warn('[PromptSmith] Offscreen startup failed:', err)
);

/**
 * Compresses enhanced prompts to reduce token usage when Token-Efficient mode is active
 * @param {string} text - Enhanced prompt text
 * @returns {string} Compressed prompt
 */
function compressPrompt(text) {
  if (!text) return text;
  
  // 1. Remove filler phrases
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
    temp = temp.replace(regex, '');
  }
  
  // 2. Remove redundant transition words
  const transitions = [
    /\bfurthermore\b,?\s*/gi,
    /\badditionally\b,?\s*/gi,
    /\bmoreover\b,?\s*/gi,
    /\bin conclusion\b,?\s*/gi,
    /\bto summarize\b,?\s*/gi
  ];
  for (const regex of transitions) {
    temp = temp.replace(regex, '');
  }
  
  // 3. Remove empty encouragement lines
  const encouragement = [
    /\btake your time\b\.?\s*/gi,
    /\bthere is no rush\b\.?\s*/gi,
    /\bdo your best\b\.?\s*/gi,
    /\bthink carefully\b\.?\s*/gi
  ];
  for (const regex of encouragement) {
    temp = temp.replace(regex, '');
  }
  
  // 4. Trim each line of leading and trailing whitespace
  let lines = temp.split('\n').map(line => line.trim());
  
  // 5. Collapse multiple blank lines to single blank line
  let collapsedLines = [];
  let prevWasBlank = false;
  for (const line of lines) {
    if (line === '') {
      if (!prevWasBlank) {
        collapsedLines.push('');
        prevWasBlank = true;
      }
    } else {
      collapsedLines.push(line);
      prevWasBlank = false;
    }
  }
  
  return collapsedLines.join('\n').trim();
}

/**
 * Creates and keeps alive a hidden offscreen document for heavy ML tasks
 */
async function createOffscreenDocument() {
  // Avoid race conditions if multiple calls fire at the same time
  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  const hasDoc = await chrome.offscreen.hasDocument();
  if (hasDoc) return;

  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  creatingOffscreen = chrome.offscreen.createDocument({
    url: offscreenUrl,
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: 'ONNX classifier inference'
  });
  await creatingOffscreen;
  creatingOffscreen = null;
  console.log('[PromptSmith] Offscreen document created.');
}

/**
 * Routes prompt text to the offscreen document for local classification
 */
async function classifyPromptWithOffscreen(text) {
  try {
    await createOffscreenDocument();
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'CLASSIFY_PROMPT',
        text: text
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[PromptSmith BG] Offscreen communication error:', chrome.runtime.lastError.message);
          resolve({ label: 'general', confidence: 0 });
        } else {
          resolve(response || { label: 'general', confidence: 0 });
        }
      });
    });
  } catch (err) {
    console.error('[PromptSmith BG] Failed to boot offscreen classifier:', err);
    return { label: 'general', confidence: 0 };
  }
}

// Main background message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CLASSIFY_PROMPT') {
    const textToClassify = message.text || message.prompt || '';
    classifyPromptWithOffscreen(textToClassify)
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        console.error('[PromptSmith BG] Classification error:', err);
        sendResponse({ label: 'general', confidence: 0 });
      });
    return true; // Keep channel open for async response
  }

  if (message.type === 'CHECK_MODEL_STATUS') {
    (async () => {
      let isAccessible = false;
      let modelSize = null;
      try {
        const url = chrome.runtime.getURL('models/promptsmith-classifier/onnx/model_quantized.onnx');
        const response = await fetch(url, { headers: { 'Range': 'bytes=0-0' } });
        if (response.ok) {
          isAccessible = true;
          // Local Range requests can return Content-Length, Content-Range, or direct headers
          const sizeHeader = response.headers.get('Content-Length') || response.headers.get('Content-Range');
          if (sizeHeader) {
            const match = sizeHeader.match(/\/(\d+)$/);
            const totalBytes = match ? parseInt(match[1], 10) : parseInt(sizeHeader, 10);
            modelSize = (totalBytes / (1024 * 1024)).toFixed(1);
          }
        }
      } catch (err) {
        // Ignore file fetch error if not found
      }
      
      const storage = await chrome.storage.sync.get([
        'groqApiKey',
        'geminiApiKey',
        'tokenEfficientMode'
      ]);
      
      const labelsDetected = Object.keys(id2label).length;
      
      sendResponse({
        modelLoaded: isAccessible,
        modelSize: modelSize ? parseFloat(modelSize) : null,
        labelsDetected: labelsDetected,
        groqKeySet: !!storage.groqApiKey,
        geminiKeySet: !!storage.geminiApiKey,
        tokenEfficientMode: storage.tokenEfficientMode === true
      });
    })();
    return true; // Keep channel open
  }

  if (message.type === 'GET_ENHANCEMENT_MODE') {
    if (!sender.tab) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_DOM_ENHANCEMENT_MODE' }, (response) => {
            sendResponse(response || { mode: 'full' });
          });
        } else {
          sendResponse({ mode: 'full' });
        }
      });
    } else {
      sendResponse({ mode: getEnhancementMode() });
    }
    return true; // Keep channel open
  }

  if (message.type === 'ENHANCE_WITH_API') {
    enhanceWithFreeAPI(message)
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        console.error('[PromptSmith BG] API error:', err);
        sendResponse(localFallback(message));
      });
    return true; // Keep channel open
  }
});

async function enhanceWithFreeAPI(message) {
  let result;
  try {
    result = await getAPIResponse(message);
  } catch (err) {
    console.error('[PromptSmith BG] getAPIResponse failed, falling back to local formulas:', err);
    result = localFallback(message);
  }
  
  const storage = await chrome.storage.sync.get(['tokenEfficientMode']);
  if (storage.tokenEfficientMode === true) {
    result.enhanced = compressPrompt(result.enhanced);
  }
  
  return result;
}

async function getAPIResponse({ prompt, useCase, mode, techniqueName }) {
  const storage = await chrome.storage.sync.get([
    'groqApiKey',
    'geminiApiKey',
    'openrouterApiKey',
    'preferredProvider'
  ]);

  const provider = storage.preferredProvider || 'auto';

  // 1. Preferred provider routing
  if (provider === 'groq' && storage.groqApiKey) {
    try { return await callGroq(prompt, useCase, mode, techniqueName, storage.groqApiKey); } catch (e) { console.warn('[PromptSmith] Groq preferred failed:', e.message); }
  }

  if (provider === 'gemini' && storage.geminiApiKey) {
    try { return await callGemini(prompt, useCase, mode, techniqueName, storage.geminiApiKey); } catch (e) { console.warn('[PromptSmith] Gemini preferred failed:', e.message); }
  }

  if (provider === 'openrouter' && storage.openrouterApiKey) {
    try { return await callOpenRouter(prompt, useCase, mode, techniqueName, storage.openrouterApiKey); } catch (e) { console.warn('[PromptSmith] OpenRouter preferred failed:', e.message); }
  }

  // 2. Cascade fallback routing
  if (storage.groqApiKey) {
    try { return await callGroq(prompt, useCase, mode, techniqueName, storage.groqApiKey); } catch (e) { console.warn('[PromptSmith] Cascade Groq failed:', e.message); }
  }

  if (storage.geminiApiKey) {
    try { return await callGemini(prompt, useCase, mode, techniqueName, storage.geminiApiKey); } catch (e) { console.warn('[PromptSmith] Cascade Gemini failed:', e.message); }
  }

  if (storage.openrouterApiKey) {
    try { return await callOpenRouter(prompt, useCase, mode, techniqueName, storage.openrouterApiKey); } catch (e) { console.warn('[PromptSmith] Cascade OpenRouter failed:', e.message); }
  }

  // 3. Fail safe fallback to local template-based injection
  console.warn('[PromptSmith] No active API keys configured. Falling back to local rules.');
  return localFallback({ prompt, useCase, mode, techniqueName });
}

async function callGroq(prompt, useCase, mode, techniqueName, apiKey) {
  const userMessage = buildEnhancementRequest(prompt, useCase, mode, techniqueName);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
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
  return parseAPIResult(content, useCase, mode, 'Groq (Llama 3.3 70B)', 1.6);
}

async function callGemini(prompt, useCase, mode, techniqueName, apiKey) {
  const userMessage = buildEnhancementRequest(prompt, useCase, mode, techniqueName);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${userMessage}` }]
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
  return parseAPIResult(content, useCase, mode, 'Google AI Studio (Gemini 2.0 Flash)', 1.5);
}

async function callOpenRouter(prompt, useCase, mode, techniqueName, apiKey) {
  const userMessage = buildEnhancementRequest(prompt, useCase, mode, techniqueName);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/promptsmith/promptsmith',
      'X-Title': 'PromptSmith'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
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
  return parseAPIResult(content, useCase, mode, 'OpenRouter', 1.6);
}

const VALID_LABELS = new Set([
  'code','math','creative','planning','factual','analysis',
  'longform','conversational','agentic','structured_output','general'
]);

function parseAPIResult(content, fallbackUseCase, mode, providerName, tokenMultiplier) {
  let label = fallbackUseCase;
  let enhanced = cleanAPIOutput(content);
  let techniqueOverrideName = null;
  let techniqueReason = null;

  try {
    const jsonStr = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed.label && VALID_LABELS.has(parsed.label.trim())) {
      label = parsed.label.trim();
    }
    if (parsed.enhanced_prompt && typeof parsed.enhanced_prompt === 'string') {
      enhanced = parsed.enhanced_prompt.trim();
    }
    if (parsed.technique_name && typeof parsed.technique_name === 'string') {
      techniqueOverrideName = parsed.technique_name.trim();
    }
    if (parsed.reason && typeof parsed.reason === 'string') {
      techniqueReason = parsed.reason.trim();
    }
  } catch (e) {
    // Groq returned plain text instead of JSON — use content as-is
  }

  const routing = routeAndEnhance('', label, mode);
  const technique = routing.technique || {
    name: 'AI-Enhanced',
    emoji: '🤖',
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
Target technique: ${techniqueName || 'Automatic Selection'}
Enhancement mode: ${mode} (${mode === 'light' ? 'concise mode for reasoning models' : 'full structured mode for standard models'})

Raw user prompt:
"${prompt}"

Please optimize this prompt. Incorporate the core structure of the target technique (${techniqueName || 'appropriate technique'}).
If mode is "light", keep the template additions compact and do not inject rigid reasoning scaffolds (e.g. do not add chain-of-thought blocks); focus on rich background context, explicit output criteria, and clarity.
If mode is "full", explicitly apply the formal stages of the prompting strategy.`;
}

function cleanAPIOutput(text) {
  let cleaned = text;
  if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '');
    cleaned = cleaned.replace(/\n```$/, '');
  }
  return cleaned.trim();
}

function localFallback({ prompt, useCase, mode, techniqueName: _techniqueName }) {
  const categoryLabel = useCase.toUpperCase();
  const modeLabel = mode === 'light' ? '⚡ Light Mode' : '🔥 Full Mode';
  
  const enhanced = `[Context/Domain: ${categoryLabel} - Optimized via PromptSmith ${modeLabel}]
I am working on the following task:

"${prompt}"

Please address this with the following quality criteria:
- Keep the explanation clear, step-by-step, and logically structured.
- Highlight any structural assumptions or edge-cases that apply.
- Ensure the final result is verified and immediately actionable.`;

  return {
    enhanced,
    technique: { 
      name: 'Structured (Local Fallback)', 
      emoji: '📋', 
      bestFor: 'General Tasks', 
      paper: 'Local Rule Fallback', 
      tokenMultiplier: 1.3 
    }
  };
}
