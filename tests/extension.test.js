import { jest } from '@jest/globals';

// 1. Mock chrome global extension APIs
global.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://mock-id/${path}`,
  }
};

// 2. Mock @huggingface/transformers
jest.unstable_mockModule('@huggingface/transformers', () => {
  return {
    env: {
      allowRemoteModels: false,
      localModelPath: '',
      backends: {
        onnx: {
          wasm: {
            wasmPaths: ''
          }
        }
      }
    },
    pipeline: jest.fn().mockImplementation(async (_task, _model, _options) => {
      // Mock classifier pipeline that parses text context
      return jest.fn().mockImplementation(async (text) => {
        const textLower = text.toLowerCase();
        if (textLower.includes('solve') || textLower.includes('math')) {
          return [{ label: 'math', score: 0.95 }];
        }
        if (textLower.includes('write') || textLower.includes('code') || textLower.includes('javascript')) {
          return [{ label: 'code', score: 0.88 }];
        }
        return [{ label: 'general', score: 0.55 }];
      });
    }),
  };
});

// Import modules after applying mocks
const { classifyPrompt, isHighConfidence } = await import('../extension/core/classifier.js');
const { detectPlatform } = await import('../extension/core/model-detector.js');
const { routeAndEnhance } = await import('../extension/core/router.js');

describe('PromptSmith Extension Integration Tests', () => {
  
  beforeEach(() => {
    // Reset window and document mocks before each test
    global.window = {
      location: {
        hostname: 'localhost'
      }
    };
    global.document = {
      querySelector: jest.fn().mockReturnValue(null),
      body: {
        innerText: ''
      }
    };
  });

  // Test Case 1: Classify math prompts correctly
  test('should classify math prompt to math and achieve high confidence', async () => {
    const prompt = 'Solve the equation x^2 + 5 = 30';
    const result = await classifyPrompt(prompt);
    
    expect(result.label).toBe('math');
    expect(result.confidence).toBe(0.95);
    expect(isHighConfidence(result.confidence)).toBe(true);
  });

  // Test Case 2: Classify coding prompts to code and route to PoT
  test('should classify javascript prompt to code and suggest pot', async () => {
    const prompt = 'Write a javascript function that validates an email';
    const result = await classifyPrompt(prompt);
    
    expect(result.label).toBe('code');
    expect(result.confidence).toBe(0.88);
    expect(isHighConfidence(result.confidence)).toBe(true);
  });

  // Test Case 3: Detect platforms correctly from hostname
  test('should detect chatgpt platform from hostname URL', () => {
    global.window.location.hostname = 'chatgpt.com';
    expect(detectPlatform()).toBe('chatgpt');

    global.window.location.hostname = 'subdomain.claude.ai';
    expect(detectPlatform()).toBe('claude');

    global.window.location.hostname = 'gemini.google.com';
    expect(detectPlatform()).toBe('gemini');

    global.window.location.hostname = 'example.com';
    expect(detectPlatform()).toBe('unknown');
  });

  // Test Case 4: Route output modes correctly (light vs full)
  test('should route and apply appropriate enhancement template based on mode', () => {
    const prompt = 'Solve algebra';
    
    // Test FULL Mode (standard model)
    const fullResult = routeAndEnhance(prompt, 'math', 'full');
    expect(fullResult.technique.shortName).toBe('SC');
    expect(fullResult.enhanced).toContain('Solve this three separate times using three completely different');

    // Test LIGHT Mode (reasoning model)
    // Note: If the enhanced prompt length exceeds original prompt length, Task 7 rules prune it.
    // We expect the prompt to fallback to the raw original prompt to ensure zero bloat.
    const longPrompt = 'Determine the roots of x^2 - 4x + 4 = 0 using the quadratic formula and verify the discriminant value.';
    const lightResult = routeAndEnhance(longPrompt, 'math', 'light');
    expect(lightResult.technique.shortName).toBe('CoT');
    expect(lightResult.enhanced).toBe(longPrompt);
    expect(lightResult.enhanced).not.toContain('Think through this step-by-step:');
  });

});
