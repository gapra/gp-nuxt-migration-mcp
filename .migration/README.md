# Nuxt Migration State Directory

This directory contains the authoritative migration state and logs for the Harness Engineering orchestrated migration workflow.

## Files

### `migration_state.json`
Authoritative JSON file containing:
- Schema version
- Migration status (not_started, in_progress, completed, failed)
- Current phase (audit, transform, validate, report)
- Configuration (source/target paths, module)
- Phase statuses with timestamps
- File migration records with confidence scores
- Last updated timestamp

**DO NOT manually edit** - managed by orchestrator MCP.

### `migration_log.md`
Public append-only log showing all migration operations with timestamps. Human-readable progress tracker.

### `actions/` Directory
Contains JSONL logs for different operation types:

- `audits.jsonl` - All audit operations from analysis MCP
- `generations.jsonl` - All code generation proposals and writes
- `validations.jsonl` - All validation results

### `backups/` Directory
Contains backup copies of files before they are overwritten by generator MCP. Used for rollback functionality.

## Usage

These files are automatically created and managed by the MCP servers:
- **Analysis MCP** writes to `actions/audits.jsonl`
- **Generator MCP** writes to `actions/generations.jsonl` and `actions/validations.jsonl`
- **Orchestrator MCP** manages `migration_state.json` and `migration_log.md`

## Safety

- All file writes create backups automatically
- Rollback available via `orchestrator_mcp.rollback_file` tool
- State is append-only for auditability
- Never delete this directory during active migration

## Schema Version

Current schema version: 1

For schema details, see the `MigrationState` interface in `src/mcp_servers/common.ts`.
