// Detects which AI model platform + tier the user is interacting with
// This determines whether we apply Full or Light technique prompts

const REASONING_MODELS = [
  'o1', 'o3', 'o4', 'o1-mini', 'o3-mini', 'o4-mini',
  'claude-opus', 'deep think', 'deepseek-r1'
];

const PLATFORMS = {
  'chatgpt.com': 'chatgpt',
  'www.chatgpt.com': 'chatgpt',
  'claude.ai': 'claude',
  'gemini.google.com': 'gemini'
};

/**
 * Detects the current platform from the window location hostname
 * @returns {string} One of: 'chatgpt', 'claude', 'gemini', 'unknown'
 */
export function detectPlatform() {
  try {
    const host = window.location.hostname;
    for (const [domain, platform] of Object.entries(PLATFORMS)) {
      if (host === domain || host.endsWith('.' + domain)) {
        return platform;
      }
    }
  } catch (error) {
    console.error('[PromptRoute] detectPlatform error:', error);
  }
  return 'unknown';
}

/**
 * Detects if the user is currently using a reasoning or thinking model
 * @returns {boolean}
 */
export function isReasoningModel() {
  const selectors = [
    '[data-testid="model-switcher-dropdown-button"]', // ChatGPT
    '.model-selector-dropdown',                       // Claude
    '.model-selector',                                // Claude Alternative
    '[aria-label*="model"]',                          // Gemini
    '[aria-label*="Model"]'                           // Gemini Case Variant
  ];

  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent.toLowerCase();
        if (REASONING_MODELS.some(m => text.includes(m))) {
          return true;
        }
      }
    } catch (e) {
      console.warn(`[PromptRoute] Error querying selector ${selector}:`, e);
    }
  }

  // Fallback body text inspection for page loading context
  try {
    const bodyText = document.body.innerText.toLowerCase();
    const modelIndicators = ['o1-mini', 'o1-preview', 'o3-mini', 'deepseek-r1', 'deep think', 'claude-opus'];
    for (const indicator of modelIndicators) {
      if (bodyText.includes(indicator)) {
        return true;
      }
    }
  } catch (e) {
    // Ignore error if body is not accessible yet
  }

  return false;
}

/**
 * Returns enhancement mode based on reasoning capability detection
 * @returns {'full' | 'light'}
 */
export function getEnhancementMode() {
  return isReasoningModel() ? 'light' : 'full';
}

/**
 * Returns exact enhancement rules based on mode matching Task 7 specifications
 * @param {'full'|'light'} mode - Mode detected
 * @returns {{mode: string, allowReasoningScaffolding: boolean, allowDecomposition: boolean, targetLengthChange: string, reason: string}}
 */
export function getEnhancementRules(mode) {
  if (mode === 'light') {
    return {
      mode: 'light',
      allowReasoningScaffolding: false,
      allowDecomposition: false,
      targetLengthChange: 'shorter or equal',
      reason: 'reasoning model detected'
    };
  }
  return {
    mode: 'full',
    allowReasoningScaffolding: true,
    allowDecomposition: true,
    targetLengthChange: 'longer',
    reason: 'standard model detected'
  };
}
