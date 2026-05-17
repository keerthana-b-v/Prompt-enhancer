// extension/core/techniques/index.js

import { cot } from './cot.js';
import { fewShot } from './few-shot.js';
import { stepBack } from './step-back.js';
import { leastToMost } from './least-to-most.js';
import { pot } from './pot.js';
import { structuredRole } from './structured-role.js';
import { selfRefine } from './self-refine.js';
import { skeleton } from './skeleton.js';

// New techniques added in V2
import { selfConsistency } from './self-consistency.js';
import { react } from './react.js';
import { treeOfThoughts } from './tree-of-thoughts.js';
import { metaPrompting } from './meta-prompting.js';
import { xmlStructured } from './xml-structured.js';
import { promptChaining } from './prompt-chaining.js';
import { instructionPrompting } from './instruction-prompting.js';
import { rolePrompting } from './role-prompting.js';
import { adversarialPrompting } from './adversarial-prompting.js';

export const TECHNIQUES = {
  cot,
  fewShot,
  stepBack,
  leastToMost,
  pot,
  structuredRole,
  selfRefine,
  skeleton,
  selfConsistency,
  react,
  treeOfThoughts,
  metaPrompting,
  xmlStructured,
  promptChaining,
  instructionPrompting,
  rolePrompting,
  adversarialPrompting
};

export function getAllTechniques() {
  return [
    cot, fewShot, stepBack, leastToMost, pot, structuredRole, selfRefine, skeleton,
    selfConsistency, react, treeOfThoughts, metaPrompting, xmlStructured,
    promptChaining, instructionPrompting, rolePrompting, adversarialPrompting
  ];
}

export {
  cot,
  fewShot,
  stepBack,
  leastToMost,
  pot,
  structuredRole,
  selfRefine,
  skeleton,
  selfConsistency,
  react,
  treeOfThoughts,
  metaPrompting,
  xmlStructured,
  promptChaining,
  instructionPrompting,
  rolePrompting,
  adversarialPrompting
};
