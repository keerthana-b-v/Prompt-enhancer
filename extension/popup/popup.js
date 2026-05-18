// PromptRoute Popup UI Settings & Onboarding Engine
// Manages master switches, key entries, and live tab diagnostics

document.addEventListener('DOMContentLoaded', async () => {
  // Select DOM Elements
  const groqKeyInput = document.getElementById('groq-key');
  const geminiKeyInput = document.getElementById('gemini-key');
  const openrouterKeyInput = document.getElementById('openrouter-key');
  const providerSelect = document.getElementById('provider-select');
  const tokenEfficientToggle = document.getElementById('token-efficient-toggle');
  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');

  const extensionToggle = document.getElementById('extension-toggle');
  
  const diagStatus = document.getElementById('diag-status');
  const diagMode = document.getElementById('diag-mode');
  const diagProvider = document.getElementById('diag-provider');

  // Onboarding screens elements
  const onboardingScreen = document.getElementById('onboarding-screen');
  const settingsScreen = document.getElementById('settings-screen');
  const obCopiedBtn = document.getElementById('ob-copied-btn');
  const obSkipBtn = document.getElementById('ob-skip-btn');
  const obFinishBtn = document.getElementById('ob-finish-btn');
  const obGroqKey = document.getElementById('ob-groq-key');
  const obGeminiKey = document.getElementById('ob-gemini-key');
  const resetOnboardingLink = document.getElementById('reset-onboarding-link');

  // 1. Load Saved Settings from Secure Storage
  const settings = await chrome.storage.sync.get([
    'isExtensionEnabled',
    'groqApiKey',
    'geminiApiKey',
    'openrouterApiKey',
    'preferredProvider',
    'tokenEfficientMode',
    'onboardingComplete'
  ]);

  // Handle Onboarding Routing
  const onboardingComplete = settings.onboardingComplete === true;
  if (!onboardingComplete) {
    onboardingScreen.style.display = 'block';
    settingsScreen.style.display = 'none';
  } else {
    onboardingScreen.style.display = 'none';
    settingsScreen.style.display = 'block';
  }

  // Set default checkbox states
  const isEnabled = settings.isExtensionEnabled !== false;
  extensionToggle.checked = isEnabled;
  updateStatusUI(isEnabled);

  tokenEfficientToggle.checked = settings.tokenEfficientMode === true;

  // Populate input values
  if (settings.groqApiKey) groqKeyInput.value = settings.groqApiKey;
  if (settings.geminiApiKey) geminiKeyInput.value = settings.geminiApiKey;
  if (settings.openrouterApiKey) openrouterKeyInput.value = settings.openrouterApiKey;
  if (settings.preferredProvider) providerSelect.value = settings.preferredProvider;

  // Run Diagnostics
  updateDiagnostics(settings);
  queryActiveTabMode();
  triggerStatusDiagnostics();

  // 2. Bind Toggle Switch changes
  extensionToggle.addEventListener('change', async () => {
    const nextState = extensionToggle.checked;
    await chrome.storage.sync.set({ isExtensionEnabled: nextState });
    updateStatusUI(nextState);
    
    // Notify active tabs about configuration shifts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'STATE_CHANGED', enabled: nextState }, () => {
            if (chrome.runtime.lastError) {
              // Ignore silent tab runtime errors
            }
          });
        }
      });
    });
  });

  // Token-Efficient Mode Toggle Listener
  tokenEfficientToggle.addEventListener('change', async () => {
    await chrome.storage.sync.set({ tokenEfficientMode: tokenEfficientToggle.checked });
  });

  // Onboarding Step Buttons Action Bindings
  obCopiedBtn.addEventListener('click', () => {
    obCopiedBtn.textContent = '✓ Setup Path Verified!';
    obCopiedBtn.style.background = '#059669';
    setTimeout(() => {
      obCopiedBtn.textContent = '✓ I have copied the files';
      obCopiedBtn.style.background = '#10b981';
    }, 1500);
  });

  obSkipBtn.addEventListener('click', async () => {
    await chrome.storage.sync.set({ onboardingComplete: true });
    onboardingScreen.style.display = 'none';
    settingsScreen.style.display = 'block';
    triggerStatusDiagnostics();
  });

  obFinishBtn.addEventListener('click', async () => {
    const groqKey = obGroqKey.value.trim();
    const geminiKey = obGeminiKey.value.trim();

    await chrome.storage.sync.set({
      groqApiKey: groqKey,
      geminiApiKey: geminiKey,
      onboardingComplete: true
    });

    if (groqKey) groqKeyInput.value = groqKey;
    if (geminiKey) geminiKeyInput.value = geminiKey;

    onboardingScreen.style.display = 'none';
    settingsScreen.style.display = 'block';

    updateDiagnostics({
      groqApiKey: groqKey,
      geminiApiKey: geminiKey,
      openrouterApiKey: openrouterKeyInput.value.trim(),
      preferredProvider: providerSelect.value
    });
    triggerStatusDiagnostics();
  });

  resetOnboardingLink.addEventListener('click', async (e) => {
    e.preventDefault();
    await chrome.storage.sync.set({ onboardingComplete: false });
    onboardingScreen.style.display = 'block';
    settingsScreen.style.display = 'none';
  });

  // 3. Password visibility masks
  const toggleButtons = document.querySelectorAll('.ps-toggle-btn');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🙈';
        } else {
          input.type = 'password';
          btn.textContent = '👁️';
        }
      }
    });
  });

  // 4. Save Settings Button Listener
  saveBtn.addEventListener('click', async () => {
    const groqKey = groqKeyInput.value.trim();
    const geminiKey = geminiKeyInput.value.trim();
    const openrouterKey = openrouterKeyInput.value.trim();
    const provider = providerSelect.value;
    const isTokenEfficient = tokenEfficientToggle.checked;

    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';

    try {
      await chrome.storage.sync.set({
        groqApiKey: groqKey,
        geminiApiKey: geminiKey,
        openrouterApiKey: openrouterKey,
        preferredProvider: provider,
        tokenEfficientMode: isTokenEfficient
      });

      saveStatus.textContent = '✓ Settings saved successfully!';
      saveStatus.className = 'ps-status-msg success';

      updateDiagnostics({
        groqApiKey: groqKey,
        geminiApiKey: geminiKey,
        openrouterApiKey: openrouterKey,
        preferredProvider: provider
      });
      triggerStatusDiagnostics();

    } catch (e) {
      console.error('[PromptRoute] Save settings failure:', e);
      saveStatus.textContent = '✗ Failed to save settings.';
      saveStatus.className = 'ps-status-msg error';
    } finally {
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span class="ps-btn-icon">💾</span> Save Settings';
        saveStatus.textContent = '';
        saveStatus.className = 'ps-status-msg';
      }, 2000);
    }
  });

  // UI helpers
  function updateStatusUI(enabled) {
    if (enabled) {
      diagStatus.textContent = '● Enabled';
      diagStatus.style.color = '#10b981';
      diagStatus.className = 'ps-diag-value active';
    } else {
      diagStatus.textContent = '○ Disabled';
      diagStatus.style.color = '#ef4444';
      diagStatus.className = 'ps-diag-value';
    }
  }

  function updateDiagnostics(data) {
    const keysCount = [data.groqApiKey, data.geminiApiKey, data.openrouterApiKey].filter(Boolean).length;
    const provider = data.preferredProvider || 'auto';

    if (provider === 'local') {
      diagProvider.textContent = 'Local Offline';
      diagProvider.style.color = '#9ca3af';
    } else if (keysCount === 0) {
      diagProvider.textContent = 'Offline (No Keys)';
      diagProvider.style.color = '#ef4444';
    } else {
      if (provider === 'groq' && data.groqApiKey) {
        diagProvider.textContent = 'Groq Engine';
        diagProvider.style.color = '#22d3ee';
      } else if (provider === 'gemini' && data.geminiApiKey) {
        diagProvider.textContent = 'Gemini Engine';
        diagProvider.style.color = '#22d3ee';
      } else if (provider === 'openrouter' && data.openrouterApiKey) {
        diagProvider.textContent = 'OpenRouter';
        diagProvider.style.color = '#22d3ee';
      } else {
        const activeName = data.groqApiKey ? 'Groq' : (data.geminiApiKey ? 'Gemini' : 'OpenRouter');
        diagProvider.textContent = `Auto (${activeName})`;
        diagProvider.style.color = '#c084fc';
      }
    }
  }

  function queryActiveTabMode() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_DOM_ENHANCEMENT_MODE' }, (response) => {
          if (chrome.runtime.lastError) {
            diagMode.textContent = 'N/A';
            diagMode.style.color = '#6b7280';
            return;
          }
          if (response && response.mode) {
            diagMode.textContent = response.mode === 'light' ? '⚡ Light' : '🔥 Full';
            diagMode.style.color = response.mode === 'light' ? '#22d3ee' : '#c084fc';
          } else {
            diagMode.textContent = 'N/A';
            diagMode.style.color = '#6b7280';
          }
        });
      } else {
        diagMode.textContent = 'N/A';
        diagMode.style.color = '#6b7280';
      }
    });
  }

  function triggerStatusDiagnostics() {
    chrome.runtime.sendMessage({ type: 'CHECK_MODEL_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[PromptRoute] Background service worker did not answer check_status.');
        const modelStatusEl = document.getElementById('diag-model-status');
        if (modelStatusEl) {
          modelStatusEl.textContent = '○ Checking...';
          modelStatusEl.style.color = '#9ca3af';
        }
        return;
      }
      
      if (response) {
        const modelStatusEl = document.getElementById('diag-model-status');
        const groqCheck = document.getElementById('groq-check');
        const geminiCheck = document.getElementById('gemini-check');
        
        if (groqCheck) groqCheck.style.display = response.groqKeySet ? 'inline' : 'none';
        if (geminiCheck) geminiCheck.style.display = response.geminiKeySet ? 'inline' : 'none';
        
        if (modelStatusEl) {
          if (response.modelLoaded) {
            modelStatusEl.innerHTML = `● Loaded (${response.labelsDetected} classes)`;
            modelStatusEl.style.color = '#10b981';
          } else {
            modelStatusEl.innerHTML = `○ Not Found <button id="install-model-btn" style="padding: 2px 6px; font-size: 9px; margin-left: 5px; cursor: pointer; border-radius: 4px; border: 1px solid #d1d5db; background: #f3f4f6;" type="button">Install</button>`;
            modelStatusEl.style.color = '#ea580c';
            
            const btn = document.getElementById('install-model-btn');
            if (btn) {
              btn.addEventListener('click', () => {
                const panel = document.getElementById('model-install-panel');
                if (panel) panel.style.display = 'block';
              });
            }
          }
        }
      }
    });
  }

  // Bind close panel button
  const closeInstallPanel = document.getElementById('close-install-panel');
  if (closeInstallPanel) {
    closeInstallPanel.addEventListener('click', () => {
      const panel = document.getElementById('model-install-panel');
      if (panel) panel.style.display = 'none';
    });
  }
});
