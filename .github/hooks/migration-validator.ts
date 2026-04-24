/**
 * Migration Validator Hook - SubagentStop Implementation
 * 
 * This hook validates subagent outputs before they are finalized.
 * Ensures all outputs follow structured contracts and meet quality standards.
 */

import {
  appendJsonl,
  appendMigrationLog,
  AUDITS_PATH,
  GENERATIONS_PATH,
  VALIDATIONS_PATH,
} from '../../src/mcp_servers/common.js';

// ============================================================================
// Type Definitions
// ============================================================================

interface HookContext {
  output: any;
  agentName: string;
  agentType?: string;
  transcriptPath?: string;
}

interface HookResult {
  allowed: boolean;
  validated: boolean;
  agent: string;
  timestamp: string;
  error?: string;
  suggestion?: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

function validateAuditorOutput(output: any): void {
  const required = [
    'agent',
    'phase',
    'action',
    'timestamp',
    'results',
    'recommendations',
  ];

  for (const field of required) {
    if (!output[field]) {
      throw new Error(`Auditor output missing required field: ${field}`);
    }
  }

  if (output.agent !== 'auditor') {
    throw new Error(`Expected agent='auditor', got '${output.agent}'`);
  }

  if (output.phase !== 'audit') {
    throw new Error(`Expected phase='audit', got '${output.phase}'`);
  }

  if (!output.results.patterns_found && !output.results.total_files_scanned) {
    throw new Error('Auditor output must include pattern results');
  }

  if (!Array.isArray(output.recommendations)) {
    throw new Error('recommendations must be an array');
  }
}

function validateTransformerOutput(output: any): void {
  const required = ['agent', 'phase', 'action', 'timestamp', 'migration_type'];

  for (const field of required) {
    if (!output[field]) {
      throw new Error(`Transformer output missing required field: ${field}`);
    }
  }

  if (output.agent !== 'transformer') {
    throw new Error(`Expected agent='transformer', got '${output.agent}'`);
  }

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
      throw new Error(`confidence must be between 0 and 1, got ${output.confidence}`);
    }
    if (output.confidence < 0.6) {
      throw new Error(
        `confidence too low (${output.confidence}) - should be ≥ 0.6 for proposals`
      );
    }
  }

  if (output.action === 'validate') {
    if (!output.proposal_id) {
      throw new Error('validate action must include proposal_id');
    }
    if (!output.validation_result || typeof output.validation_result !== 'object') {
      throw new Error('validate action must include validation_result object');
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
}

function validateValidatorOutput(output: any): void {
  const required = [
    'agent',
    'phase',
    'action',
    'timestamp',
    'proposal_id',
    'validation_result',
  ];

  for (const field of required) {
    if (!output[field]) {
      throw new Error(`Validator output missing required field: ${field}`);
    }
  }

  if (output.agent !== 'validator') {
    throw new Error(`Expected agent='validator', got '${output.agent}'`);
  }

  if (output.phase !== 'validate') {
    throw new Error(`Expected phase='validate', got '${output.phase}'`);
  }

  const vr = output.validation_result;
  if (typeof vr.approved !== 'boolean') {
    throw new Error('validation_result.approved must be boolean');
  }

  const validStatuses = ['pass', 'fail', 'review'];
  if (!validStatuses.includes(vr.overall_status)) {
    throw new Error(
      `overall_status must be one of: ${validStatuses.join(', ')}, got '${vr.overall_status}'`
    );
  }

  if (typeof vr.can_auto_approve !== 'boolean') {
    throw new Error('validation_result.can_auto_approve must be boolean');
  }

  if (!vr.checks || typeof vr.checks !== 'object') {
    throw new Error('validation_result.checks must be an object');
  }
}

// ============================================================================
// Action Recording
// ============================================================================

async function recordMigrationAction(output: any): Promise<void> {
  const { agent, phase, action } = output;

  // Determine log file based on agent/phase
  let logPath: string | undefined;
  let logType: string;

  if (agent === 'auditor' || phase === 'audit') {
    logPath = AUDITS_PATH;
    logType = 'AUDIT';
  } else if (agent === 'transformer' || phase === 'transform') {
    logPath = GENERATIONS_PATH;
    logType = 'GENERATE';
  } else if (agent === 'validator' || phase === 'validate') {
    logPath = VALIDATIONS_PATH;
    logType = 'VALIDATE';
  } else {
    logPath = undefined;
    logType = 'UNKNOWN';
  }

  // Append to JSONL log
  if (logPath) {
    try {
      appendJsonl(logPath, {
        agent,
        phase,
        action,
        ...output,
      });
    } catch (error) {
      console.error(`[Hook] Failed to append to ${logPath}:`, error);
    }
  }

  // Append to human-readable migration log
  try {
    const message = `${agent} completed ${action}`;
    appendMigrationLog(logType, message, {
      agent,
      phase,
      action,
      summary: getOutputSummary(output),
    });
  } catch (error) {
    console.error('[Hook] Failed to append to migration log:', error);
  }
}

function getOutputSummary(output: any): string {
  if (output.agent === 'auditor') {
    const patterns = output.results?.patterns_found || {};
    const total =  Object.values(patterns).reduce((sum: number, val) => sum + (val as number), 0);
    return `Found ${total} patterns`;
  }
  
  if (output.agent === 'transformer') {
    if (output.action === 'propose') {
      return `Proposed ${output.migration_type} (confidence: ${output.confidence})`;
    }
    if (output.action === 'write') {
      return `Wrote ${output.result?.target_path || 'file'}`;
    }
  }
  
  if (output.agent === 'validator') {
    const status = output.validation_result?.overall_status;
    return `Validation ${status}`;
  }
  
  return 'Completed';
}

// ============================================================================
// Main Hook Function
// ============================================================================

/**
 * SubagentStop Hook - Main Entry Point
 * 
 * Validates subagent output before allowing completion
 * 
 * @param context - Hook context with subagent output
 * @returns Hook result indicating if completion is allowed
 */
export async function onSubagentStop(context: HookContext): Promise<HookResult> {
  const { output, agentName } = context;

  console.log(`[Hook] Validating ${agentName} output...`);

  try {
    // Validate based on agent type
    switch (agentName) {
      case 'auditor':
        validateAuditorOutput(output);
        break;

      case 'transformer':
        validateTransformerOutput(output);
        break;

      case 'validator':
        validateValidatorOutput(output);
        break;

      case 'orchestrator':
        // Orchestrator output is flexible, just check basic structure
        if (!output.agent && !output.status) {
          throw new Error('Orchestrator output must have agent or status field');
        }
        break;

      default:
        throw new Error(`Unknown agent: ${agentName}`);
    }

    // Record validated action
    await recordMigrationAction(output);

    // Success
    console.log(`[Hook] ✅ ${agentName} output validated`);

    return {
      allowed: true,
      validated: true,
      agent: agentName,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    // Validation failed - reject completion
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Hook] ❌ ${agentName} output validation failed:`, errorMessage);

    return {
      allowed: false,
      validated: false,
      agent: agentName,
      error: errorMessage,
      suggestion: `Please provide output matching the ${agentName} agent contract`,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Export for Testing
// ============================================================================

export const testFunctions = {
  validateAuditorOutput,
  validateTransformerOutput,
  validateValidatorOutput,
  recordMigrationAction,
  getOutputSummary,
};
