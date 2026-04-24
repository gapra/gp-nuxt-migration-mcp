# Migration Validator Hook

**Hook Type**: SubagentStop  
**Applies To**: @auditor, @transformer, @validator agents  
**Purpose**: Validate subagent outputs before allowing completion

---

## Overview

This hook intercepts subagent outputs before they are finalized, ensuring all outputs follow structured contracts and meet quality standards.

## Hook Lifecycle

```
Subagent executes → Hook intercepts → Validates output → Allows/Rejects completion
```

## Validation Logic

### For @auditor Agent

#### Required Output Structure

```json
{
  "agent": "auditor",
  "phase": "audit",
  "action": "scan_patterns",
  "timestamp": "ISO_8601",
  "module": "string",
  "results": {
    "total_files_scanned": number,
    "patterns_found": { object }
  },
  "recommendations": [ array ],
  "migration_order": [ array ]
}
```

#### Validation Checks

```javascript
function validateAuditorOutput(output) {
  // Required fields
  const required = [
    'agent',
    'phase',
    'action',
    'timestamp',
    'results',
    'recommendations'
  ];
  
  for (const field of required) {
    if (!output[field]) {
      throw new Error(`Auditor output missing required field: ${field}`);
    }
  }
  
  // Agent must be 'auditor'
  if (output.agent !== 'auditor') {
    throw new Error(`Expected agent='auditor', got '${output.agent}'`);
  }
  
  // Phase must be 'audit'
  if (output.phase !== 'audit') {
    throw new Error(`Expected phase='audit', got '${output.phase}'`);
  }
  
  // Results must have pattern counts
  if (!output.results.patterns_found) {
    throw new Error('Auditor output must include patterns_found');
  }
  
  // Recommendations must be array
  if (!Array.isArray(output.recommendations)) {
    throw new Error('recommendations must be an array');
  }
  
  return { validated: true, agent: 'auditor' };
}
```

---

### For @transformer Agent

#### Required Output Structure

```json
{
  "agent": "transformer",
  "phase": "transform",
  "action": "propose|validate|write",
  "timestamp": "ISO_8601",
  "proposal_id": "string",
  "migration_type": "string",
  "confidence": number,
  "requires_validation": boolean
}
```

#### Validation Checks

```javascript
function validateTransformerOutput(output) {
  const required = [
    'agent',
    'phase',
    'action',
    'timestamp',
    'migration_type'
  ];
  
  for (const field of required) {
    if (!output[field]) {
      throw new Error(`Transformer output missing required field: ${field}`);
    }
  }
  
  // Agent must be 'transformer'
  if (output.agent !== 'transformer') {
    throw new Error(`Expected agent='transformer', got '${output.agent}'`);
  }
  
  // Phase must be 'transform'
  if (output.phase !== 'transform') {
    throw new Error(`Expected phase='transform', got '${output.phase}'`);
  }
  
  // Action-specific validation
  if (output.action === 'propose') {
    if (!output.proposal_id) {
      throw new Error('propose action must include proposal_id');
    }
    if (typeof output.confidence !== 'number') {
      throw new Error('propose action must include confidence score');
    }
    if (output.confidence < 0 || output.confidence > 1) {
      throw new Error('confidence must be between 0 and 1');
    }
  }
  
  if (output.action === 'validate') {
    if (!output.proposal_id) {
      throw new Error('validate action must include proposal_id');
    }
    if (typeof output.validation_result !== 'object') {
      throw new Error('validate action must include validation_result');
    }
  }
  
  if (output.action === 'write') {
    if (!output.proposal_id) {
      throw new Error('write action must include proposal_id');
    }
    if (!output.result || !output.result.status) {
      throw new Error('write action must include result with status');
    }
  }
  
  return { validated: true, agent: 'transformer' };
}
```

---

### For @validator Agent

#### Required Output Structure

```json
{
  "agent": "validator",
  "phase": "validate",
  "action": "validate_proposal",
  "timestamp": "ISO_8601",
  "proposal_id": "string",
  "validation_result": {
    "approved": boolean,
    "overall_status": "pass|fail|review",
    "can_auto_approve": boolean,
    "checks": { object }
  }
}
```

#### Validation Checks

```javascript
function validateValidatorOutput(output) {
  const required = [
    'agent',
    'phase',
    'action',
    'timestamp',
    'proposal_id',
    'validation_result'
  ];
  
  for (const field of required) {
    if (!output[field]) {
      throw new Error(`Validator output missing required field: ${field}`);
    }
  }
  
  // Agent must be 'validator'
  if (output.agent !== 'validator') {
    throw new Error(`Expected agent='validator', got '${output.agent}'`);
  }
  
  // Validation result must have required fields
  const vr = output.validation_result;
  if (typeof vr.approved !== 'boolean') {
    throw new Error('validation_result.approved must be boolean');
  }
  
  const validStatuses = ['pass', 'fail', 'review'];
  if (!validStatuses.includes(vr.overall_status)) {
    throw new Error(`overall_status must be one of: ${validStatuses.join(', ')}`);
  }
  
  if (typeof vr.can_auto_approve !== 'boolean') {
    throw new Error('validation_result.can_auto_approve must be boolean');
  }
  
  if (!vr.checks || typeof vr.checks !== 'object') {
    throw new Error('validation_result.checks must be an object');
  }
  
  return { validated: true, agent: 'validator' };
}
```

---

## Hook Implementation

### Entry Point

```javascript
/**
 * SubagentStop Hook
 * Executed when a subagent is about to complete
 * 
 * @param context - Hook context with subagent output
 * @returns Validation result (allows or rejects completion)
 */
export async function onSubagentStop(context) {
  const { output, agentName, agentType } = context;
  
  console.log(`[Hook] Validating ${agentName} output...`);
  
  try {
    // Determine validation function based on agent
    let validationResult;
    
    switch (agentName) {
      case 'auditor':
        validationResult = validateAuditorOutput(output);
        break;
        
      case 'transformer':
        validationResult = validateTransformerOutput(output);
        break;
        
      case 'validator':
        validationResult = validateValidatorOutput(output);
        break;
        
      default:
        throw new Error(`Unknown agent: ${agentName}`);
    }
    
    // Record validated action
    await recordMigrationAction(output);
    
    // Log validation success
    console.log(`[Hook] ✅ ${agentName} output validated`);
    
    return {
      allowed: true,
      validated: true,
      agent: agentName,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    // Validation failed - reject completion
    console.error(`[Hook] ❌ ${agentName} output validation failed:`, error.message);
    
    return {
      allowed: false,
      validated: false,
      agent: agentName,
      error: error.message,
      suggestion: `Please provide output matching the ${agentName} contract`,
      timestamp: new Date().toISOString()
    };
  }
}
```

---

## Recording Actions

```javascript
import {
  appendJsonl,
  AUDITS_PATH,
  GENERATIONS_PATH,
  VALIDATIONS_PATH,
  appendMigrationLog
} from '../../src/mcp_servers/common.js';

async function recordMigrationAction(output) {
  const { agent, phase, action } = output;
  
  // Determine which log file to use
  let logPath;
  let logType;
  
  if (agent === 'auditor' || phase === 'audit') {
    logPath = AUDITS_PATH;
    logType = 'AUDIT';
  } else if (agent === 'transformer' || phase === 'transform') {
    logPath = GENERATIONS_PATH;
    logType = 'GENERATE';
  } else if (agent === 'validator' || phase === 'validate') {
    logPath = VALIDATIONS_PATH;
    logType = 'VALIDATE';
  }
  
  // Append to JSONL log
  if (logPath) {
    appendJsonl(logPath, {
      agent,
      phase,
      action,
      ...output
    });
  }
  
  // Append to human-readable log
  const message = `${agent} completed ${action}`;
  appendMigrationLog(logType, message, output);
  
  console.log(`[Hook] Recorded ${action} to ${logPath}`);
}
```

---

## Error Messages

### Clear, Actionable Feedback

```javascript
const errorMessages = {
  missingField: (field, agent) => 
    `${agent} output is missing required field: '${field}'. Please include it in your response.`,
    
  wrongAgent: (expected, actual) =>
    `Expected agent='${expected}' but got '${actual}'. Please set agent field correctly.`,
    
  wrongPhase: (expected, actual) =>
    `Expected phase='${expected}' but got '${actual}'. Please set phase field correctly.`,
    
  invalidConfidence: (value) =>
    `Confidence score must be between 0 and 1, got ${value}`,
    
  invalidType: (field, expected, actual) =>
    `Field '${field}' must be ${expected}, got ${actual}`,
    
  missingProposal: () =>
    `Transformer output must include proposal_id when action is 'propose' or 'validate'`,
    
  invalidValidation: (reason) =>
    `Validator output validation_result is invalid: ${reason}`
};
```

---

## Integration with MCP Servers

The hook integrates with the MCP server infrastructure:

```typescript
// In MCP server response handlers:
import { onSubagentStop } from './.github/hooks/migration-validator.js';

// Before returning response to user:
const hookResult = await onSubagentStop({
  output: response,
  agentName: 'auditor',
  agentType: 'analysis'
});

if (!hookResult.allowed) {
  throw new Error(`Output validation failed: ${hookResult.error}`);
}

// Proceed with response
return response;
```

---

## Testing the Hook

### Test Cases

```javascript
// Test 1: Valid auditor output
const validAuditorOutput = {
  agent: 'auditor',
  phase: 'audit',
  action: 'scan_patterns',
  timestamp: new Date().toISOString(),
  module: 'deals',
  results: {
    total_files_scanned: 10,
    patterns_found: { vuex: 2, mixins: 1 }
  },
  recommendations: ['Migrate stores first']
};
// Expected: ✅ Pass

// Test 2: Missing required field
const invalidOutput = {
  agent: 'auditor',
  phase: 'audit'
  // Missing other required fields
};
// Expected: ❌ Fail with clear error

// Test 3: Wrong confidence range
const invalidConfidence = {
  agent: 'transformer',
  phase: 'transform',
  action: 'propose',
  confidence: 1.5,  // Invalid!
  // ...
};
// Expected: ❌ Fail with range error
```

---

## Benefits

1. **Consistency**: All outputs follow same structure
2. **Quality**: Rejects incomplete or malformed outputs
3. **Debuggability**: Clear error messages
4. **Auditability**: All validated actions logged
5. **Safety**: Prevents downstream errors from bad data

---

## Hook Configuration

In `.vscode/settings.json`:

```json
{
  "chat.hooks.subagentStop": ".github/hooks/migration-validator.js"
}
```

---

## Summary

The Migration Validator Hook ensures:
- ✅ All subagent outputs are properly structured
- ✅ Required fields are present
- ✅ Values are in valid ranges
- ✅ Actions are logged to appropriate files
- ✅ Clear error messages when validation fails
- ✅ Consistent quality across all agents
