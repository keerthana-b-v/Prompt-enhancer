// PromptSmith Content Script
// Injected into chatgpt.com, claude.ai, gemini.google.com

import { detectPlatform, getEnhancementMode } from '../core/model-detector.js';
import { routeAndEnhance, getAllTechniques } from '../core/router.js';

// Keyword-based fallback classifier used when ONNX confidence is 0
function classifyLocally(text) {
  const t = text.toLowerCase();
  if (/\b(code|function|class|bug|error|script|api|implement|program|debug|algorithm|syntax|compile|variable|loop|array|object|method|module|import|library|framework|test|unit test|refactor)\b/.test(t)) return 'code';
  if (/\b(math|calculate|equation|solve|probability|integral|derivative|formula|percent|sum|average|matrix|statistics|algebra|geometry|calculus)\b/.test(t)) return 'math';
  if (/\b(write|story|poem|creative|fiction|essay|blog|article|draft|compose|narrative|character|plot|scene|lyric|rhyme|screenplay)\b/.test(t)) return 'creative';
  if (/\b(plan|strategy|roadmap|schedule|timeline|project|milestone|sprint|agenda|workflow|process|steps to|how to achieve)\b/.test(t)) return 'planning';
  if (/\b(explain|what is|how does|define|describe|history of|origin|why does|overview of|what are|tell me about)\b/.test(t)) return 'factual';
  if (/\b(analyze|compare|evaluate|assess|review|critique|pros and cons|trade.?off|strengths|weaknesses|audit|examine)\b/.test(t)) return 'analysis';
  if (/\b(agent|tool use|search the web|browse|fetch|automate|run a|execute|multi.?step task)\b/.test(t)) return 'agentic';
  if (/\b(report|guide|documentation|comprehensive|detailed breakdown|in.?depth|long.?form|outline|chapter|section)\b/.test(t)) return 'longform';
  if (/\b(json|xml|csv|yaml|format|structured|parse|extract|schema|table|spreadsheet|list of)\b/.test(t)) return 'structured_output';
  if (/\b(chat|talk|discuss|conversation|opinion|feel|think about|what do you|casual)\b/.test(t)) return 'conversational';
  return 'general';
}

// Platform-specific input box selectors
const INPUT_SELECTORS = {
  chatgpt: '#prompt-textarea',
  claude:  '[data-testid="composer-input"] div[contenteditable="true"]',
  gemini:  '.ql-editor'
};

let enhanceButton = null;
let explanationPanel = null;

function getInputBox() {
  const platform = detectPlatform();
  const selector = INPUT_SELECTORS[platform];
  if (!selector) return null;
  return document.querySelector(selector);
}

function getPromptText() {
  const box = getInputBox();
  if (!box) return '';
  return box.innerText || box.value || '';
}

function setPromptText(text) {
  const box = getInputBox();
  if (!box) return;
  
  if (box.tagName === 'TEXTAREA' || box.tagName === 'INPUT') {
    box.value = text;
    box.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // For rich text contenteditable, replace HTML safely
    while (box.firstChild) {
      box.removeChild(box.firstChild);
    }
    const p = document.createElement('p');
    p.textContent = text;
    box.appendChild(p);
    box.dispatchEvent(new Event('input', { bubbles: true }));

    // Move text cursor to the very end of the input box
    const range = document.createRange();
    range.selectNodeContents(box);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function injectEnhanceButton(box) {
  if (document.getElementById('promptsmith-btn')) return;

  enhanceButton = document.createElement('button');
  enhanceButton.id = 'promptsmith-btn';
  
  const sparkle = document.createElement('span');
  sparkle.className = 'ps-btn-sparkle';
  sparkle.textContent = '✨';
  
  const btnText = document.createElement('span');
  btnText.className = 'ps-btn-text';
  btnText.textContent = 'Enhance';
  
  enhanceButton.appendChild(sparkle);
  enhanceButton.appendChild(btnText);

  enhanceButton.title = 'Enhance with PromptSmith';
  enhanceButton.addEventListener('click', handleEnhance);

  const parent = box.parentElement;
  if (parent) {
    parent.style.position = 'relative';
    parent.appendChild(enhanceButton);
  }
}

function compressPrompt(text) {
  if (!text) return text;
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
  const encouragement = [
    /\btake your time\b\.?\s*/gi,
    /\bthere is no rush\b\.?\s*/gi,
    /\bdo your best\b\.?\s*/gi,
    /\bthink carefully\b\.?\s*/gi
  ];
  for (const regex of encouragement) {
    temp = temp.replace(regex, '');
  }
  let lines = temp.split('\n').map(line => line.trim());
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

async function handleEnhance() {
  const rawPrompt = getPromptText();
  if (!rawPrompt.trim()) {
    showToast('Please type a prompt first!');
    return;
  }

  const SKIP_PATTERNS = [
    /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|lol|haha|sure|great|cool|bye|goodbye|sup|yo|hmm|nvm|nevermind|continue|more|next|stop|wait|test|testing)$/i
  ];
  const wordCount = rawPrompt.trim().split(/\s+/).length;
  const isSkip = wordCount <= 3 && SKIP_PATTERNS.some(p => p.test(rawPrompt.trim()));
  if (isSkip) {
    showToast('This prompt is too short to enhance.');
    return;
  }

  // Update button loading UI
  enhanceButton.classList.add('loading');
  enhanceButton.disabled = true;
  enhanceButton.querySelector('.ps-btn-text').textContent = 'Enhancing...';

  try {
    // 1. Offload ONNX classification task to background service worker
    console.log('[PromptSmith] Sending classification request...');
    const classResponse = await chrome.runtime.sendMessage({
      type: 'CLASSIFY_PROMPT',
      text: rawPrompt
    });

    let useCase = classResponse.label || 'general';
    const confidence = classResponse.confidence || 0;
    let mode = getEnhancementMode();

    // When ONNX classifier is not loaded (confidence=0), fall back to keyword classification
    // so routing produces the correct technique instead of always defaulting to general
    if (confidence === 0) {
      useCase = classifyLocally(rawPrompt);
    }

    // Low confidence: downgrade to light mode to avoid complex scaffolding on uncertain prompts
    if (confidence < 0.55 && mode === 'full') {
      mode = 'light';
    }

    // Resolve which technique the router will select for this label+mode
    const debugTechnique = routeAndEnhance('', useCase, mode).technique?.name || 'Instruction Prompting';
    console.log(`[PromptSmith] Label: ${useCase} | Confidence: ${confidence.toFixed(2)} | Mode: ${mode} | Technique: ${debugTechnique}`);

    if (useCase === 'skip') {
      showToast('This prompt does not need enhancement.');
      return;
    }

    let result;

    // 2. Query storage for configured free API keys
    const storage = await chrome.storage.sync.get([
      'groqApiKey',
      'geminiApiKey',
      'openrouterApiKey',
      'tokenEfficientMode'
    ]);
    const hasApiKey = !!(storage.groqApiKey || storage.geminiApiKey || storage.openrouterApiKey);
    const isTokenEfficient = storage.tokenEfficientMode === true;

    if (hasApiKey) {
      // Find mapped technique name for API context
      const dummyResult = routeAndEnhance('', useCase, mode);
      const targetTechniqueName = dummyResult.technique?.name || 'Instruction Prompting';

      // Call API enhancement cascade in background worker
      result = await chrome.runtime.sendMessage({
        type: 'ENHANCE_WITH_API',
        prompt: rawPrompt,
        useCase,
        mode,
        techniqueName: targetTechniqueName
      });
    } else {
      // Fallback to offline-first local technique mapping
      result = routeAndEnhance(rawPrompt, useCase, mode);
      if (isTokenEfficient) {
        result.enhanced = compressPrompt(result.enhanced);
      }
    }

    setPromptText(result.enhanced);
    showExplanationPanel(result.technique, confidence, mode, rawPrompt, result.enhanced, isTokenEfficient);
    showToast('Prompt enhanced successfully!');

  } catch (err) {
    console.error('[PromptSmith] Enhancement failed:', err);
    if (err.message && err.message.includes('Extension context invalidated')) {
      showToast('Extension reloaded — please refresh this page to reconnect PromptSmith.');
      return;
    }
    showToast('Enhancement failed. Please try again.');
  } finally {
    enhanceButton.classList.remove('loading');
    enhanceButton.disabled = false;
    enhanceButton.querySelector('.ps-btn-text').textContent = 'Enhance';
  }
}

function showExplanationPanel(technique, confidence, mode, originalPrompt, enhancedPrompt, isTokenEfficient) {
  explanationPanel?.remove();

  explanationPanel = document.createElement('div');
  explanationPanel.id = 'promptsmith-panel';
  explanationPanel.className = 'ps-panel-fade-in';

  const modeLabel = mode === 'light' ? '⚡ Light (Reasoning Model detected)' : '🔥 Full';
  const confidencePct = (confidence * 100).toFixed(0);

  const getWordCount = (str) => {
    if (!str || !str.trim()) return 0;
    return str.trim().split(/\s+/).length;
  };
  
  const originalWords = getWordCount(originalPrompt);
  const originalTokens = Math.round(originalWords * 1.3);
  const enhancedWords = getWordCount(enhancedPrompt);
  const enhancedTokens = Math.round(enhancedWords * 1.3);
  
  let diffPct = 0;
  if (originalTokens > 0) {
    diffPct = Math.round(((enhancedTokens - originalTokens) / originalTokens) * 100);
  }
  const diffSign = diffPct >= 0 ? '+' : '';
  const isSC = technique.shortName === 'SC' || technique.name.toLowerCase().includes('consistency');

  // Header
  const header = document.createElement('div');
  header.className = 'ps-header';
  
  const headerLeft = document.createElement('div');
  headerLeft.className = 'ps-header-left';
  
  const emoji = document.createElement('span');
  emoji.className = 'ps-emoji';
  emoji.textContent = technique.emoji;
  
  const title = document.createElement('span');
  title.className = 'ps-title';
  title.textContent = technique.name;
  
  headerLeft.appendChild(emoji);
  headerLeft.appendChild(title);
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ps-close';
  closeBtn.id = 'ps-close-btn';
  closeBtn.title = 'Close Panel';
  closeBtn.textContent = '✕';
  
  header.appendChild(headerLeft);
  header.appendChild(closeBtn);
  explanationPanel.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'ps-body';
  
  // Best For
  const bestForItem = document.createElement('div');
  bestForItem.className = 'ps-detail-item';
  const bestForLabel = document.createElement('span');
  bestForLabel.className = 'ps-detail-label';
  bestForLabel.textContent = '🎯 Best For: ';
  const bestForVal = document.createElement('span');
  bestForVal.className = 'ps-detail-value';
  bestForVal.textContent = technique.bestFor;
  bestForItem.appendChild(bestForLabel);
  bestForItem.appendChild(bestForVal);
  body.appendChild(bestForItem);

  // Mode
  const modeItem = document.createElement('div');
  modeItem.className = 'ps-detail-item';
  const modeLabelEl = document.createElement('span');
  modeLabelEl.className = 'ps-detail-label';
  modeLabelEl.textContent = '⚡ Mode: ';
  const modeVal = document.createElement('span');
  modeVal.className = 'ps-detail-value';
  modeVal.textContent = `${modeLabel} (Confidence: ${confidencePct}%)`;
  modeItem.appendChild(modeLabelEl);
  modeItem.appendChild(modeVal);
  body.appendChild(modeItem);

  // Token Estimate
  const tokenItem = document.createElement('div');
  tokenItem.className = 'ps-detail-item';
  const tokenLabel = document.createElement('span');
  tokenLabel.className = 'ps-detail-label';
  tokenLabel.textContent = '📊 Token Estimate:';
  tokenItem.appendChild(tokenLabel);
  
  const tokenContainer = document.createElement('div');
  tokenContainer.style.display = 'flex';
  tokenContainer.style.flexDirection = 'column';
  tokenContainer.style.fontSize = '11px';
  tokenContainer.style.color = '#4b5563';
  tokenContainer.style.gap = '2px';
  
  const origLine = document.createElement('span');
  origLine.textContent = 'Original: ~';
  const origB = document.createElement('b');
  origB.textContent = originalTokens;
  origLine.appendChild(origB);
  origLine.appendChild(document.createTextNode(' tokens'));
  
  const enhLine = document.createElement('span');
  enhLine.textContent = 'Enhanced: ~';
  const enhB = document.createElement('b');
  enhB.textContent = enhancedTokens;
  const enhB2 = document.createElement('b');
  enhB2.textContent = ` (${diffSign}${diffPct}% change)`;
  
  enhLine.appendChild(enhB);
  enhLine.appendChild(document.createTextNode(' tokens'));
  enhLine.appendChild(enhB2);
  
  tokenContainer.appendChild(origLine);
  tokenContainer.appendChild(enhLine);
  
  if (isSC) {
    const scWarn = document.createElement('span');
    scWarn.style.color = '#ea580c';
    scWarn.style.fontWeight = '500';
    scWarn.style.marginTop = '3px';
    scWarn.style.display = 'block';
    scWarn.textContent = '⚠️ Self-Consistency uses ~3x tokens';
    tokenContainer.appendChild(scWarn);
  }
  tokenItem.appendChild(tokenContainer);
  body.appendChild(tokenItem);

  // Token-Efficient Banner
  if (isTokenEfficient) {
    const banner = document.createElement('div');
    banner.style.background = '#ecfdf5';
    banner.style.border = '1px solid #10b981';
    banner.style.borderRadius = '4px';
    banner.style.padding = '6px 10px';
    banner.style.margin = '8px 0';
    banner.style.fontSize = '11px';
    banner.style.color = '#065f46';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.gap = '5px';
    
    const bannerText = document.createElement('span');
    bannerText.textContent = '⚡ Token-Efficient Mode active — prompt compressed';
    banner.appendChild(bannerText);
    body.appendChild(banner);
  }

  // Foundation
  const paperItem = document.createElement('div');
  paperItem.className = 'ps-detail-item ps-paper-section';
  paperItem.style.borderTop = '1px solid #e5e7eb';
  paperItem.style.paddingTop = '8px';
  paperItem.style.marginTop = '8px';
  
  const paperLabel = document.createElement('span');
  paperLabel.className = 'ps-detail-label';
  paperLabel.textContent = '📄 Foundation: ';
  
  const paperVal = document.createElement('span');
  paperVal.className = 'ps-detail-value ps-paper-link';
  paperVal.textContent = technique.paper;
  
  paperItem.appendChild(paperLabel);
  paperItem.appendChild(paperVal);
  body.appendChild(paperItem);
  
  explanationPanel.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'ps-footer';
  
  const overrides = document.createElement('div');
  overrides.className = 'ps-overrides-section';
  
  const overridesTitle = document.createElement('span');
  overridesTitle.className = 'ps-override-title';
  overridesTitle.textContent = 'Try different technique:';
  overrides.appendChild(overridesTitle);
  
  const overridesButtons = document.createElement('div');
  overridesButtons.className = 'ps-override-buttons';
  
  const techniquesList = getAllTechniques();
  techniquesList.forEach(t => {
    const obtn = document.createElement('button');
    obtn.className = 'ps-override-btn';
    obtn.setAttribute('data-technique', t.shortName);
    obtn.title = t.name;
    obtn.textContent = `${t.emoji} ${t.shortName}`;
    overridesButtons.appendChild(obtn);
  });
  
  overrides.appendChild(overridesButtons);
  footer.appendChild(overrides);
  
  const undoBtn = document.createElement('button');
  undoBtn.className = 'ps-undo';
  undoBtn.id = 'ps-undo-btn';
  
  const undoIcon = document.createElement('span');
  undoIcon.className = 'ps-undo-icon';
  undoIcon.textContent = '↩';
  
  const undoText = document.createTextNode(' Undo and Restore');
  undoBtn.appendChild(undoIcon);
  undoBtn.appendChild(undoText);
  
  footer.appendChild(undoBtn);
  explanationPanel.appendChild(footer);

  document.body.appendChild(explanationPanel);

  // Wire event handlers
  document.getElementById('ps-close-btn').onclick = () => {
    explanationPanel.classList.add('ps-panel-fade-out');
    setTimeout(() => explanationPanel?.remove(), 250);
  };

  document.getElementById('ps-undo-btn').onclick = () => {
    setPromptText(originalPrompt);
    showToast('Restored original prompt.');
    explanationPanel.classList.add('ps-panel-fade-out');
    setTimeout(() => explanationPanel?.remove(), 250);
  };

  // Wire individual override buttons
  const overrideBtns = explanationPanel.querySelectorAll('.ps-override-btn');
  overrideBtns.forEach(btn => {
    btn.onclick = async () => {
      const shortName = btn.getAttribute('data-technique');
      const targetTechnique = techniquesList.find(t => t.shortName === shortName);

      if (targetTechnique) {
        showToast(`Applying ${targetTechnique.name}...`);
        
        btn.style.opacity = '0.5';
        btn.disabled = true;

        const mode = getEnhancementMode();
        let enhanced = mode === 'light' 
          ? targetTechnique.applyLight(originalPrompt)
          : targetTechnique.apply(originalPrompt);

        const storageState = await chrome.storage.sync.get(['tokenEfficientMode']);
        const isTokenEfficient = storageState.tokenEfficientMode === true;
        if (isTokenEfficient) {
          enhanced = compressPrompt(enhanced);
        }

        setPromptText(enhanced);
        showExplanationPanel(targetTechnique, 1.0, mode, originalPrompt, enhanced, isTokenEfficient);
      }
    };
  });
}

function showToast(msg) {
  document.getElementById('promptsmith-toast')?.remove();

  const toast = document.createElement('div');
  toast.id = 'promptsmith-toast';
  toast.className = 'ps-toast-fade-in';
  
  const icon = document.createElement('span');
  icon.className = 'ps-toast-icon';
  icon.textContent = '⚡';
  
  const msgSpan = document.createElement('span');
  msgSpan.className = 'ps-toast-msg';
  msgSpan.textContent = msg;
  
  toast.appendChild(icon);
  toast.appendChild(msgSpan);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('ps-toast-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Runtime messaging listener for background/popup context communications
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DOM_ENHANCEMENT_MODE') {
    sendResponse({ mode: getEnhancementMode() });
    return false;
  }
});

// Continuous scanner bootloop
function runBoot() {
  const intervalId = setInterval(async () => {
    try {
      if (!chrome.runtime || !chrome.runtime.id) {
        clearInterval(intervalId);
        return;
      }
      const storage = await chrome.storage.sync.get('isExtensionEnabled');
      const isEnabled = storage.isExtensionEnabled !== false;
      
      const box = getInputBox();
      if (box && isEnabled) {
        injectEnhanceButton(box);
      } else {
        document.getElementById('promptsmith-btn')?.remove();
        enhanceButton = null;
      }
    } catch (e) {
      if (e.message && e.message.includes('Extension context invalidated')) {
        clearInterval(intervalId);
      } else {
        console.warn('[PromptSmith] Scanner bootloop error:', e);
      }
    }
  }, 1000);
}

runBoot();
