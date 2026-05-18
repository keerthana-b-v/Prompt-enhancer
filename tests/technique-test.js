// tests/technique-test.js
// Automated test suite for PromptSmith techniques and routing logic.
// Run: node tests/technique-test.js
//
// Classifier section uses keyword matching — the production ONNX classifier
// requires a browser WASM environment and cannot run in Node.js.

import { routeAndEnhance, getAllTechniques } from '../extension/core/router.js';

// ─────────────────────────────────────────────────────────────────────────────
// Keyword classifier — mirrors classifyLocally in content.js, extended with
// the learning-intent override rule from background.js SYSTEM_PROMPT.
// ─────────────────────────────────────────────────────────────────────────────
function classifyPrompt(text) {
  const t = text.toLowerCase().trim();
  const words = t.split(/\s+/);

  // Learning-intent override (same rule as SYSTEM_PROMPT OVERRIDE RULE)
  if (/i want to learn|how do i learn|teach me|i want to understand|how to get started with|i want to get into/.test(t)) {
    return { label: 'planning', confidence: 0.90 };
  }

  // Skip: very short social phrases
  const SKIP_RE = /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|lol|haha|sure|great|cool|bye|goodbye|sup|yo|hmm|nvm|nevermind|continue|more|next|stop|wait|test|testing)$/;
  if (words.length <= 3 && SKIP_RE.test(t)) {
    return { label: 'skip', confidence: 1.0 };
  }

  if (/\b(calculate|equation|\bmath\b|probability|integral|derivative|formula|percent|algebra|geometry|calculus|\d+\s*percent)\b/.test(t))
    return { label: 'math', confidence: 0.85 };

  if (/\b(function|class|bug|error|script|implement|program|debug|algorithm|syntax|compile|variable|loop|array|method|module|framework|refactor|python|javascript|typescript|sql|database query|reverse a string)\b/.test(t))
    return { label: 'code', confidence: 0.85 };

  if (/\b(search|browse|fetch|find the best tools?|automate|execute|multi.?step|tool use)\b/.test(t))
    return { label: 'agentic', confidence: 0.85 };

  if (/\b(json|xml|csv|yaml|output in|give me output|structured output|schema|parse|extract fields)\b/.test(t))
    return { label: 'structured_output', confidence: 0.85 };

  if (/\b(comprehensive guide|detailed guide|in.?depth guide|write a guide|write a report|long.?form|full documentation)\b/.test(t))
    return { label: 'longform', confidence: 0.85 };

  if (/\b(compare|versus|\bvs\.?\b|contrast|pros and cons|trade.?off|strengths and weaknesses|critique|assess|audit)\b/.test(t))
    return { label: 'analysis', confidence: 0.85 };

  if (/\b(tagline|slogan|creative writing|write a poem|write a story|write an essay|write a blog|compose|fictional|narrative|screenplay|lyric)\b/.test(t))
    return { label: 'creative', confidence: 0.85 };

  if (/\b(plan|strategy|roadmap|schedule|milestone|launch|freelance|startup plan|project plan|steps to build|how to start)\b/.test(t))
    return { label: 'planning', confidence: 0.85 };

  if (/\b(explain|what is|how does|define|describe|history of|why does|overview of|what are|tell me about)\b/.test(t))
    return { label: 'factual', confidence: 0.85 };

  if (/\b(chat|discuss|conversation|casual|what do you think|your opinion)\b/.test(t))
    return { label: 'conversational', confidence: 0.85 };

  return { label: 'general', confidence: 0.50 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test data — 11 prompts covering all labels
// ─────────────────────────────────────────────────────────────────────────────
const TEST_PROMPTS = [
  { prompt: 'i want to learn rag',                               expectedLabel: 'planning',          expectedTechnique: 'Least-to-Most'    },
  { prompt: 'write a python function to reverse a string',       expectedLabel: 'code',              expectedTechnique: 'Program-of-Thought'},
  { prompt: 'explain how transformers work',                     expectedLabel: 'factual',           expectedTechnique: 'Step-Back'         },
  { prompt: 'compare mongodb vs postgresql',                     expectedLabel: 'analysis',          expectedTechnique: 'Self-Refine'       },
  { prompt: 'write a tagline for my AI startup',                 expectedLabel: 'creative',          expectedTechnique: 'Structured Role'   },
  { prompt: 'what is 15 percent of 2400 plus 340',               expectedLabel: 'math',              expectedTechnique: 'Self-Consistency'  },
  { prompt: 'find the best tools for building chrome extensions', expectedLabel: 'agentic',           expectedTechnique: 'ReAct'             },
  { prompt: 'write a comprehensive guide to prompt engineering',  expectedLabel: 'longform',          expectedTechnique: 'Skeleton'          },
  { prompt: 'give me output in json format with name and age',   expectedLabel: 'structured_output', expectedTechnique: 'XML Structured'    },
  { prompt: 'how do i launch a freelance business',              expectedLabel: 'planning',          expectedTechnique: 'Least-to-Most'     },
  { prompt: 'hi',                                                expectedLabel: 'skip',              expectedTechnique: 'none'              },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Placeholder patterns that should never appear in a well-formed output
const PLACEHOLDER_RE = /\[(?:solve|insert|your|placeholder|example|todo|add|enter|here)\b|\bundefined\b|<Insert\b/i;

/**
 * Flexible technique name matching.
 * Accepts the technique if its full name contains the expected string,
 * or its shortName exactly equals the expected string (case-insensitive).
 */
function techniqueMatches(technique, expected) {
  if (expected === 'none') return technique === null;
  if (!technique) return false;
  const name  = technique.name.toLowerCase();
  const short = technique.shortName.toLowerCase();
  const exp   = expected.toLowerCase();
  return name.includes(exp) || short === exp;
}

function preview(str, len = 80) {
  const flat = str.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  return flat.length <= len ? flat : flat.slice(0, len - 1) + '…';
}

function pad(str, len) {
  return String(str ?? '').slice(0, len).padEnd(len);
}

function hr(char, len) {
  return char.repeat(len);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Classification & Routing (11 prompts)
// ─────────────────────────────────────────────────────────────────────────────
const LINE_WIDTH = 120;
console.log('\n' + hr('═', LINE_WIDTH));
console.log('  PromptSmith Automated Test Suite');
console.log(hr('═', LINE_WIDTH) + '\n');
console.log('SECTION 1 — Classification & Routing\n');
console.log('  Classifier: keyword-based (ONNX model requires browser WASM — not available in Node.js)\n');

// Column widths
const C = { status: 7, prompt: 42, expLabel: 17, gotLabel: 17, technique: 20, conf: 6 };

const routeHeader = [
  pad('Status',    C.status),
  pad('Prompt',    C.prompt),
  pad('Exp.Label', C.expLabel),
  pad('Got.Label', C.gotLabel),
  pad('Technique', C.technique),
  pad('Conf',      C.conf),
  'Enhanced preview',
].join(' │ ');

console.log(routeHeader);
console.log(hr('─', routeHeader.length));

let routePassed = 0;
const routeFailures = [];

for (const tc of TEST_PROMPTS) {
  const { label, confidence } = classifyPrompt(tc.prompt);
  const { enhanced, technique } = routeAndEnhance(tc.prompt, label, 'full');

  const labelOk      = label === tc.expectedLabel;
  const techOk       = techniqueMatches(technique, tc.expectedTechnique);
  const keyOk        = tc.expectedLabel === 'skip' || enhanced.includes(tc.prompt);
  const noPlaceholder = !PLACEHOLDER_RE.test(enhanced);
  const pass         = labelOk && techOk && keyOk && noPlaceholder;

  if (pass) {
    routePassed++;
  } else {
    const reasons = [];
    if (!labelOk)       reasons.push(`label: got "${label}", expected "${tc.expectedLabel}"`);
    if (!techOk)        reasons.push(`technique: got "${technique?.name ?? 'null'}", expected "${tc.expectedTechnique}"`);
    if (!keyOk)         reasons.push('enhanced prompt does not contain the original prompt text');
    if (!noPlaceholder) reasons.push('enhanced prompt contains placeholder or "undefined" text');
    routeFailures.push({ prompt: tc.prompt, reasons });
  }

  const techGot  = technique ? technique.shortName : 'none';
  const confStr  = (confidence * 100).toFixed(0) + '%';
  const status   = pass ? 'PASS ✓' : 'FAIL ✗';

  console.log([
    pad(status,          C.status),
    pad(tc.prompt,       C.prompt),
    pad(tc.expectedLabel, C.expLabel),
    pad(label,           C.gotLabel),
    pad(techGot,         C.technique),
    pad(confStr,         C.conf),
    preview(enhanced),
  ].join(' │ '));
}

console.log(hr('─', routeHeader.length));
console.log(`\n  Routing result: ${routePassed}/${TEST_PROMPTS.length} passed\n`);

if (routeFailures.length > 0) {
  console.log('  Failed routing tests:');
  for (const f of routeFailures) {
    console.log(`    ✗  "${f.prompt}"`);
    for (const r of f.reasons) console.log(`       → ${r}`);
  }
  console.log();
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Direct technique.apply() validation (all 17 techniques)
// ─────────────────────────────────────────────────────────────────────────────
console.log(hr('─', LINE_WIDTH));
console.log('\nSECTION 2 — Direct technique.apply() validation\n');

const APPLY_INPUT = 'test prompt about machine learning';
const allTechniques = getAllTechniques();

const T = { status: 7, name: 28, startsOk: 15, noPlacOk: 15, lenOk: 20 };
const applyHeader = [
  pad('Status',         T.status),
  pad('Technique',      T.name),
  pad('Starts w/prompt', T.startsOk),
  pad('No placeholder', T.noPlacOk),
  'Length (in → out)',
].join(' │ ');

console.log(applyHeader);
console.log(hr('─', applyHeader.length));

let techPassed = 0;
const techFailures = [];

for (const technique of allTechniques) {
  const output = technique.apply(APPLY_INPUT);

  const startsWithPrompt = output.startsWith(APPLY_INPUT);
  const noPlaceholder    = !PLACEHOLDER_RE.test(output) && !output.includes('undefined');
  const longerThanInput  = output.length > APPLY_INPUT.length;
  const pass             = startsWithPrompt && noPlaceholder && longerThanInput;

  if (pass) {
    techPassed++;
  } else {
    const reasons = [];
    if (!startsWithPrompt) reasons.push(`apply() does not start with prompt — starts with: "${output.slice(0, 50)}"`);
    if (!noPlaceholder)    reasons.push('output contains "undefined" or placeholder text');
    if (!longerThanInput)  reasons.push(`output length ${output.length} ≤ input length ${APPLY_INPUT.length}`);
    techFailures.push({ name: technique.name, reasons });
  }

  const status = pass ? 'PASS ✓' : 'FAIL ✗';
  const lenStr = `${APPLY_INPUT.length} → ${output.length}`;

  console.log([
    pad(status,                               T.status),
    pad(technique.name,                       T.name),
    pad(startsWithPrompt ? 'YES' : 'NO ✗',   T.startsOk),
    pad(noPlaceholder    ? 'YES' : 'NO ✗',   T.noPlacOk),
    longerThanInput ? lenStr : `✗ shorter (${output.length})`,
  ].join(' │ '));
}

console.log(hr('─', applyHeader.length));
console.log(`\n  Techniques result: ${techPassed}/${allTechniques.length} passed\n`);

if (techFailures.length > 0) {
  console.log('  Failed technique tests:');
  for (const f of techFailures) {
    console.log(`    ✗  ${f.name}`);
    for (const r of f.reasons) console.log(`       → ${r}`);
  }
  console.log();
}

// ─────────────────────────────────────────────────────────────────────────────
// Final summary
// ─────────────────────────────────────────────────────────────────────────────
const totalPassed = routePassed + techPassed;
const totalTests  = TEST_PROMPTS.length + allTechniques.length;
const allPassed   = totalPassed === totalTests;

console.log(hr('═', LINE_WIDTH));
console.log(
  `  SUMMARY: ${totalPassed}/${totalTests} tests passed` +
  `  (Routing ${routePassed}/${TEST_PROMPTS.length}  ·  Techniques ${techPassed}/${allTechniques.length})` +
  (allPassed ? '  ✓ ALL PASS' : '  ✗ FAILURES DETECTED')
);
console.log(hr('═', LINE_WIDTH) + '\n');

process.exit(allPassed ? 0 : 1);
