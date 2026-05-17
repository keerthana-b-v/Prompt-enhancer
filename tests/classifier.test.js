import { jest } from '@jest/globals';

// 1. Mock chrome global extension APIs
global.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://mock-id/${path}`,
  }
};

global.fetch = jest.fn().mockImplementation(async (_url) => {
  return {
    ok: true,
    json: async () => ({
      "0": "analysis", "1": "agentic", "2": "code",
      "3": "conversational", "4": "creative", "5": "factual",
      "6": "longform", "7": "math", "8": "planning",
      "9": "skip", "10": "structured_output"
    })
  };
});

// 2. Mock @huggingface/transformers to return appropriate labels for standard test assertions
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
      return jest.fn().mockImplementation(async (text) => {
        const textLower = text.toLowerCase();
        
        if (textLower.includes('solve') || textLower.includes('equation')) {
          return [{ label: 'math', score: 0.95 }];
        }
        if (textLower.includes('story') || textLower.includes('poem')) {
          return [{ label: 'creative', score: 0.87 }];
        }
        if (textLower.includes('write') || textLower.includes('code')) {
          return [{ label: 'code', score: 0.88 }];
        }
        if (textLower.includes('plan') || textLower.includes('roadmap')) {
          return [{ label: 'planning', score: 0.86 }];
        }
        if (textLower.includes('speed of light') || textLower.includes('what is')) {
          return [{ label: 'factual', score: 0.82 }];
        }
        if (textLower.includes('analyze') || textLower.includes('performance')) {
          return [{ label: 'analysis', score: 0.83 }];
        }
        if (textLower.includes('detailed in-depth') || textLower.includes('comprehensive')) {
          return [{ label: 'longform', score: 0.81 }];
        }
        if (textLower.includes('hi model') || textLower.includes('conversational')) {
          return [{ label: 'conversational', score: 0.78 }];
        }
        
        return [{ label: 'general', score: 0.50 }];
      });
    }),
  };
});

// Import after mocking
const { classifyPrompt, isHighConfidence } = await import('../extension/core/classifier.js');

describe('PromptSmith Classifier Engine Tests', () => {
  
  test('should classify math queries to Chain-of-Thought (cot)', async () => {
    const mathPrompt = "Solve the equation x^2 + 4x - 12 = 0 and calculate the roots.";
    const result = await classifyPrompt(mathPrompt);
    
    expect(result.label).toBe('math');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(isHighConfidence(result.confidence)).toBe(true);
  });

  test('should classify coding prompts to Program-of-Thought (pot)', async () => {
    const codePrompt = "Write a python function to scrape a list of endpoints and debug active errors.";
    const result = await classifyPrompt(codePrompt);
    
    expect(result.label).toBe('code');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(isHighConfidence(result.confidence)).toBe(true);
  });

  test('should classify planning and roadmap prompts to Least-to-Most prompting', async () => {
    const planningPrompt = "Create a detailed step-by-step project timeline and architectural roadmap for a new app.";
    const result = await classifyPrompt(planningPrompt);
    
    expect(result.label).toBe('planning');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  test('should classify factual queries to Step-Back Abstraction', async () => {
    const factualPrompt = "What is the speed of light and how does general relativity define gravity?";
    const result = await classifyPrompt(factualPrompt);
    
    expect(result.label).toBe('factual');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('should classify creative draft writing to Structured Role/Persona', async () => {
    const creativePrompt = "Write a short story about a futuristic blacksmith forging a digital neon sword.";
    const result = await classifyPrompt(creativePrompt);
    
    expect(result.label).toBe('creative');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  test('should classify auditing and reviews to Self-Refinement', async () => {
    const analysisPrompt = "Analyze this typescript file and give critical feedback on its performance bottlenecks.";
    const result = await classifyPrompt(analysisPrompt);
    
    expect(result.label).toBe('analysis');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('should classify long-form writing requests to Skeleton-of-Thought', async () => {
    const longformPrompt = "Draft a comprehensive, detailed in-depth report on clean energy transitions.";
    const result = await classifyPrompt(longformPrompt);
    
    expect(result.label).toBe('longform');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('should fallback to general on unknown queries', async () => {
    const generalPrompt = "Just some random text with no keywords.";
    const result = await classifyPrompt(generalPrompt);
    
    expect(result.label).toBe('general');
    expect(result.confidence).toBe(0.5);
    expect(isHighConfidence(result.confidence)).toBe(false);
  });

});
