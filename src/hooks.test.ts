/**
 * Tests for Migration Validator Hook
 * 
 * Tests the SubagentStop hook validation logic for all agent types
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  onSubagentStop,
  testFunctions,
} from '../.github/hooks/migration-validator';

const {
  validateAuditorOutput,
  validateTransformerOutput,
  validateValidatorOutput,
  getOutputSummary,
} = testFunctions;

// Mock file system operations
vi.mock('../src/mcp_servers/common', () => ({
  appendJsonl: vi.fn(),
  appendMigrationLog: vi.fn(),
  AUDITS_PATH: '.migration/actions/audits.jsonl',
  GENERATIONS_PATH: '.migration/actions/generations.jsonl',
  VALIDATIONS_PATH: '.migration/actions/validations.jsonl',
}));

describe('Migration Validator Hook', () => {
  describe('validateAuditorOutput', () => {
    it('should validate correct auditor output', () => {
      const validOutput = {
        agent: 'auditor',
        phase: 'audit',
        action: 'scan_patterns',
        timestamp: '2026-04-06T10:00:00Z',
        results: {
          patterns_found: {
            vuex_stores: 5,
            mixins: 3,
          },
          total_files_scanned: 120,
        },
        recommendations: ['Migrate Vuex first', 'Then convert mixins'],
      };

      expect(() => validateAuditorOutput(validOutput)).not.toThrow();
    });

    it('should reject output with missing required fields', () => {
      const invalidOutput = {
        agent: 'auditor',
        phase: 'audit',
        // Missing: action, timestamp, results, recommendations
      };

      expect(() => validateAuditorOutput(invalidOutput)).toThrow(
        /missing required field/
      );
    });

    it('should reject output with wrong agent name', () => {
      const invalidOutput = {
        agent: 'transformer',
        phase: 'audit',
        action: 'scan',
        timestamp: '2026-04-06T10:00:00Z',
        results: { patterns_found: {} },
        recommendations: [],
      };

      expect(() => validateAuditorOutput(invalidOutput)).toThrow(
        /Expected agent='auditor'/
      );
    });

    it('should reject output with wrong phase', () => {
      const invalidOutput = {
        agent: 'auditor',
        phase: 'transform',
        action: 'scan',
        timestamp: '2026-04-06T10:00:00Z',
        results: { patterns_found: {} },
        recommendations: [],
      };

      expect(() => validateAuditorOutput(invalidOutput)).toThrow(
        /Expected phase='audit'/
      );
    });

    it('should reject output without pattern results', () => {
      const invalidOutput = {
        agent: 'auditor',
        phase: 'audit',
        action: 'scan',
        timestamp: '2026-04-06T10:00:00Z',
        results: {},
        recommendations: [],
      };

      expect(() => validateAuditorOutput(invalidOutput)).toThrow(
        /must include pattern results/
      );
    });

    it('should reject output with non-array recommendations', () => {
      const invalidOutput = {
        agent: 'auditor',
        phase: 'audit',
        action: 'scan',
        timestamp: '2026-04-06T10:00:00Z',
        results: { patterns_found: { vuex: 1 } },
        recommendations: 'not an array',
      };

      expect(() => validateAuditorOutput(invalidOutput)).toThrow(
        /recommendations must be an array/
      );
    });
  });

  describe('validateTransformerOutput', () => {
    it('should validate correct propose action', () => {
      const validOutput = {
        agent: 'transformer',
        phase: 'transform',
        action: 'propose',
        migration_type: 'vuex_to_pinia',
        timestamp: '2026-04-06T10:00:00Z',
        proposal_id: 'prop_abc123',
        confidence: 0.85,
      };

      expect(() => validateTransformerOutput(validOutput)).not.toThrow();
    });

    it('should validate correct validate action', () => {
      const validOutput = {
        agent: 'transformer',
        phase: 'transform',
        action: 'validate',
        migration_type: 'vuex_to_pinia',
        timestamp: '2026-04-06T10:00:00Z',
        proposal_id: 'prop_abc123',
        validation_result: { approved: true },
      };

      expect(() => validateTransformerOutput(validOutput)).not.toThrow();
    });

    it('should validate correct write action', () => {
      const validOutput = {
        agent: 'transformer',
        phase: 'transform',
        action: 'write',
        migration_type: 'vuex_to_pinia',
        timestamp: '2026-04-06T10:00:00Z',
        proposal_id: 'prop_abc123',
        result: { status: 'success', target_path: 'stores/deals.ts' },
      };

      expect(() => validateTransformerOutput(validOutput)).not.toThrow();
    });

    it('should reject propose with confidence < 0.6', () => {
      const invalidOutput = {
        agent: 'transformer',
        phase: 'transform',
        action: 'propose',
        migration_type: 'vuex_to_pinia',
        timestamp: '2026-04-06T10:00:00Z',
        proposal_id: 'prop_abc123',
        confidence: 0.45,
      };

      expect(() => validateTransformerOutput(invalidOutput)).toThrow(
        /confidence too low/
      );
    });

    it('should reject propose with confidence > 1.0', () => {
      const invalidOutput = {
        agent: 'transformer',
        phase: 'transform',
        action: 'propose',
        migration_type: 'vuex_to_pinia',
        timestamp: '2026-04-06T10:00:00Z',
        proposal_id: 'prop_abc123',
        confidence: 1.5,
      };

      expect(() => validateTransformerOutput(invalidOutput)).toThrow(
        /confidence must be between 0 and 1/
      );
    });

    it('should reject propose without proposal_id', () => {
      const invalidOutput = {
        agent: 'transformer',
        phase: 'transform',
        action: 'propose',
        migration_type: 'vuex_to_pinia',
        timestamp: '2026-04-06T10:00:00Z',
        confidence: 0.85,
      };

      expect(() => validateTransformerOutput(invalidOutput)).toThrow(
        /must include proposal_id/
      );
    });

    it('should reject validate without validation_result', () => {
      const invalidOutput = {
        agent: 'transformer',
        phase: 'transform',
        action: 'validate',
        migration_type: 'vuex_to_pinia',
        timestamp: '2026-04-06T10:00:00Z',
        proposal_id: 'prop_abc123',
      };

      expect(() => validateTransformerOutput(invalidOutput)).toThrow(
        /must include validation_result object/
      );
    });

    it('should reject write without result status', () => {
      const invalidOutput = {
        agent: 'transformer',
        phase: 'transform',
        action: 'write',
        migration_type: 'vuex_to_pinia',
        timestamp: '2026-04-06T10:00:00Z',
        proposal_id: 'prop_abc123',
        result: {},
      };

      expect(() => validateTransformerOutput(invalidOutput)).toThrow(
        /must include result with status/
      );
    });

    it('should reject output with wrong agent', () => {
      const invalidOutput = {
        agent: 'auditor',
        phase: 'transform',
        action: 'propose',
        migration_type: 'vuex_to_pinia',
        timestamp: '2026-04-06T10:00:00Z',
      };

      expect(() => validateTransformerOutput(invalidOutput)).toThrow(
        /Expected agent='transformer'/
      );
    });

    it('should reject output with wrong phase', () => {
      const invalidOutput = {
        agent: 'transformer',
        phase: 'audit',
        action: 'propose',
        migration_type: 'vuex_to_pinia',
        timestamp: '2026-04-06T10:00:00Z',
      };

      expect(() => validateTransformerOutput(invalidOutput)).toThrow(
        /Expected phase='transform'/
      );
    });
  });

  describe('validateValidatorOutput', () => {
    it('should validate correct validator output', () => {
      const validOutput = {
        agent: 'validator',
        phase: 'validate',
        action: 'validate_proposal',
        timestamp: '2026-04-06T10:00:00Z',
        proposal_id: 'prop_abc123',
        validation_result: {
          approved: true,
          overall_status: 'pass',
          can_auto_approve: true,
          checks: {
            syntax: true,
            security: true,
            conventions: true,
          },
        },
      };

      expect(() => validateValidatorOutput(validOutput)).not.toThrow();
    });

    it('should accept all valid overall_status values', () => {
      ['pass', 'fail', 'review'].forEach((status) => {
        const output = {
          agent: 'validator',
          phase: 'validate',
          action: 'validate_proposal',
          timestamp: '2026-04-06T10:00:00Z',
          proposal_id: 'prop_abc123',
          validation_result: {
            approved: status === 'pass',
            overall_status: status,
            can_auto_approve: status === 'pass',
            checks: {},
          },
        };

        expect(() => validateValidatorOutput(output)).not.toThrow();
      });
    });

    it('should reject invalid overall_status', () => {
      const invalidOutput = {
        agent: 'validator',
        phase: 'validate',
        action: 'validate_proposal',
        timestamp: '2026-04-06T10:00:00Z',
        proposal_id: 'prop_abc123',
        validation_result: {
          approved: true,
          overall_status: 'unknown',
          can_auto_approve: true,
          checks: {},
        },
      };

      expect(() => validateValidatorOutput(invalidOutput)).toThrow(
        /overall_status must be one of/
      );
    });

    it('should reject output without proposal_id', () => {
      const invalidOutput = {
        agent: 'validator',
        phase: 'validate',
        action: 'validate_proposal',
        timestamp: '2026-04-06T10:00:00Z',
        validation_result: {
          approved: true,
          overall_status: 'pass',
          can_auto_approve: true,
          checks: {},
        },
      };

      expect(() => validateValidatorOutput(invalidOutput)).toThrow(
        /missing required field: proposal_id/
      );
    });

    it('should reject output with non-boolean approved', () => {
      const invalidOutput = {
        agent: 'validator',
        phase: 'validate',
        action: 'validate_proposal',
        timestamp: '2026-04-06T10:00:00Z',
        proposal_id: 'prop_abc123',
        validation_result: {
          approved: 'yes',
          overall_status: 'pass',
          can_auto_approve: true,
          checks: {},
        },
      };

      expect(() => validateValidatorOutput(invalidOutput)).toThrow(
        /approved must be boolean/
      );
    });

    it('should reject output without checks', () => {
      const invalidOutput = {
        agent: 'validator',
        phase: 'validate',
        action: 'validate_proposal',
        timestamp: '2026-04-06T10:00:00Z',
        proposal_id: 'prop_abc123',
        validation_result: {
          approved: true,
          overall_status: 'pass',
          can_auto_approve: true,
        },
      };

      expect(() => validateValidatorOutput(invalidOutput)).toThrow(
        /checks must be an object/
      );
    });
  });

  describe('getOutputSummary', () => {
    it('should summarize auditor output', () => {
      const output = {
        agent: 'auditor',
        results: {
          patterns_found: {
            vuex_stores: 5,
            mixins: 3,
            components: 12,
          },
        },
      };

      const summary = getOutputSummary(output);
      expect(summary).toBe('Found 20 patterns');
    });

    it('should summarize transformer propose action', () => {
      const output = {
        agent: 'transformer',
        action: 'propose',
        migration_type: 'vuex_to_pinia',
        confidence: 0.85,
      };

      const summary = getOutputSummary(output);
      expect(summary).toContain('vuex_to_pinia');
      expect(summary).toContain('0.85');
    });

    it('should summarize transformer write action', () => {
      const output = {
        agent: 'transformer',
        action: 'write',
        result: {
          target_path: 'stores/deals.ts',
        },
      };

      const summary = getOutputSummary(output);
      expect(summary).toContain('stores/deals.ts');
    });

    it('should summarize validator output', () => {
      const output = {
        agent: 'validator',
        validation_result: {
          overall_status: 'pass',
        },
      };

      const summary = getOutputSummary(output);
      expect(summary).toBe('Validation pass');
    });

    it('should return default for unknown agent', () => {
      const output = {
        agent: 'unknown',
      };

      const summary = getOutputSummary(output);
      expect(summary).toBe('Completed');
    });
  });

  describe('onSubagentStop', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should allow valid auditor output', async () => {
      const context = {
        agentName: 'auditor',
        output: {
          agent: 'auditor',
          phase: 'audit',
          action: 'scan_patterns',
          timestamp: '2026-04-06T10:00:00Z',
          results: {
            patterns_found: { vuex_stores: 5 },
          },
          recommendations: ['Migrate Vuex first'],
        },
      };

      const result = await onSubagentStop(context);

      expect(result.allowed).toBe(true);
      expect(result.validated).toBe(true);
      expect(result.agent).toBe('auditor');
      expect(result.error).toBeUndefined();
    });

    it('should allow valid transformer output', async () => {
      const context = {
        agentName: 'transformer',
        output: {
          agent: 'transformer',
          phase: 'transform',
          action: 'propose',
          migration_type: 'vuex_to_pinia',
          timestamp: '2026-04-06T10:00:00Z',
          proposal_id: 'prop_abc123',
          confidence: 0.85,
        },
      };

      const result = await onSubagentStop(context);

      expect(result.allowed).toBe(true);
      expect(result.validated).toBe(true);
      expect(result.agent).toBe('transformer');
    });

    it('should allow valid validator output', async () => {
      const context = {
        agentName: 'validator',
        output: {
          agent: 'validator',
          phase: 'validate',
          action: 'validate_proposal',
          timestamp: '2026-04-06T10:00:00Z',
          proposal_id: 'prop_abc123',
          validation_result: {
            approved: true,
            overall_status: 'pass',
            can_auto_approve: true,
            checks: {},
          },
        },
      };

      const result = await onSubagentStop(context);

      expect(result.allowed).toBe(true);
      expect(result.validated).toBe(true);
      expect(result.agent).toBe('validator');
    });

    it('should allow orchestrator output with flexible structure', async () => {
      const context = {
        agentName: 'orchestrator',
        output: {
          agent: 'orchestrator',
          status: 'completed',
          summary: 'Migration completed successfully',
        },
      };

      const result = await onSubagentStop(context);

      expect(result.allowed).toBe(true);
      expect(result.validated).toBe(true);
      expect(result.agent).toBe('orchestrator');
    });

    it('should reject invalid auditor output', async () => {
      const context = {
        agentName: 'auditor',
        output: {
          agent: 'auditor',
          // Missing required fields
        },
      };

      const result = await onSubagentStop(context);

      expect(result.allowed).toBe(false);
      expect(result.validated).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestion).toBeDefined();
    });

    it('should reject transformer with low confidence', async () => {
      const context = {
        agentName: 'transformer',
        output: {
          agent: 'transformer',
          phase: 'transform',
          action: 'propose',
          migration_type: 'vuex_to_pinia',
          timestamp: '2026-04-06T10:00:00Z',
          proposal_id: 'prop_abc123',
          confidence: 0.45, // Too low
        },
      };

      const result = await onSubagentStop(context);

      expect(result.allowed).toBe(false);
      expect(result.validated).toBe(false);
      expect(result.error).toContain('confidence too low');
    });

    it('should reject unknown agent', async () => {
      const context = {
        agentName: 'unknown',
        output: {
          some: 'data',
        },
      };

      const result = await onSubagentStop(context);

      expect(result.allowed).toBe(false);
      expect(result.validated).toBe(false);
      expect(result.error).toContain('Unknown agent');
    });

    it('should include timestamp in result', async () => {
      const context = {
        agentName: 'auditor',
        output: {
          agent: 'auditor',
          phase: 'audit',
          action: 'scan',
          timestamp: '2026-04-06T10:00:00Z',
          results: { patterns_found: { vuex: 1 } },
          recommendations: [],
        },
      };

      const result = await onSubagentStop(context);

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
