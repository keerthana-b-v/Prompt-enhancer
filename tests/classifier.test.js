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
    AutoTokenizer: {
      from_pretrained: jest.fn().mockImplementation(async () => {
        return jest.fn().mockImplementation(async (text) => {
          return { text };
        });
      })
    },
    AutoModelForSequenceClassification: {
      from_pretrained: jest.fn().mockImplementation(async () => {
        return jest.fn().mockImplementation(async (inputs) => {
          const textLower = (inputs.text || '').toLowerCase();
          
          let score = 0.5;
          let targetIndex = 11; // Undefined index in label map -> defaults to 'general'

          if (textLower.includes('solve') || textLower.includes('equation')) {
            targetIndex = 7; // math
            score = 0.95;
          } else if (textLower.includes('story') || textLower.includes('poem')) {
            targetIndex = 4; // creative
            score = 0.87;
          } else if (textLower.includes('write') || textLower.includes('code')) {
            targetIndex = 2; // code
            score = 0.88;
          } else if (textLower.includes('plan') || textLower.includes('roadmap')) {
            targetIndex = 8; // planning
            score = 0.86;
          } else if (textLower.includes('speed of light') || textLower.includes('what is')) {
            targetIndex = 5; // factual
            score = 0.82;
          } else if (textLower.includes('analyze') || textLower.includes('performance')) {
            targetIndex = 0; // analysis
            score = 0.83;
          } else if (textLower.includes('detailed in-depth') || textLower.includes('comprehensive')) {
            targetIndex = 6; // longform
            score = 0.81;
          } else if (textLower.includes('hi model') || textLower.includes('conversational')) {
            targetIndex = 3; // conversational
            score = 0.78;
          } else {
            // general
            if (textLower.includes('random')) {
              score = 0.50;
            } else {
              score = 0.55;
            }
          }

          let logits = new Array(12).fill(0);
          // To get exact softmax score S for index T, where all other 11 elements have logit 0:
          // exp(logits[T]) / (11 + exp(logits[T])) = S  =>  logits[T] = ln(11 * S / (1 - S))
          logits[targetIndex] = Math.log(11 * score / (1 - score));

          return {
            logits: {
              data: new Float32Array(logits)
            }
          };
        });
      })
    }
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
    expect(result.confidence).toBeCloseTo(0.5, 5);
    expect(isHighConfidence(result.confidence)).toBe(false);
  });

});
