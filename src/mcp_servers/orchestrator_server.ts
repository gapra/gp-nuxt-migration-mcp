#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  loadEnvConfig,
  loadMigrationState,
  saveMigrationState,
  initializeMigrationState,
  appendMigrationLog,
  MigrationState,
  MIGRATION_LOG_PATH,
  readText,
} from "./common.js";

const ORCHESTRATOR_TOOLS: Tool[] = [
  {
    name: "start_orchestrated_migration",
    description:
      "Start an orchestrated migration workflow. Main orchestrator that coordinates analysis, transformation, and validation agents.",
    inputSchema: {
      type: "object",
      properties: {
        sourcePath: {
          type: "string",
          description: "Source Nuxt 2 codebase path",
        },
        targetPath: {
          type: "string",
          description: "Target Nuxt 3/4 codebase path",
        },
        module: {
          type: "string",
          description: "Optional specific module to migrate",
        },
      },
    },
  },
  {
    name: "get_migration_state",
    description:
      "Get current migration state including phases, files, and progress.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "update_migration_phase",
    description:
      "Update the current migration phase. Used by orchestrator to track progress.",
    inputSchema: {
      type: "object",
      properties: {
        phase: {
          type: "string",
          enum: ["audit", "transform", "validate", "report"],
          description: "Phase to transition to",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "failed"],
          description: "Status of the phase",
        },
      },
      required: ["phase", "status"],
    },
  },
  {
    name: "get_migration_log",
    description:
      "Retrieve the migration log showing all operations and progress.",
    inputSchema: {
      type: "object",
      properties: {
        tail: {
          type: "number",
          description: "Number of recent entries to show (default: all)",
        },
      },
    },
  },
  {
    name: "get_migration_summary",
    description:
      "Get comprehensive migration summary with statistics and recommendations.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "rollback_file",
    description:
      "Rollback a specific migrated file to its backup version.",
    inputSchema: {
      type: "object",
      properties: {
        target_path: {
          type: "string",
          description: "Target file path to rollback",
        },
      },
      required: ["target_path"],
    },
  },
];

class OrchestratorServer {
  private server: Server;
  private config: { sourcePath: string; targetPath: string };

  constructor() {
    this.server = new Server(
      {
        name: "nuxt-migration-orchestrator",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.config = loadEnvConfig();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: ORCHESTRATOR_TOOLS,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "start_orchestrated_migration":
            return await this.startOrchestratedMigration(args);
          case "get_migration_state":
            return await this.getMigrationState();
          case "update_migration_phase":
            return await this.updateMigrationPhase(args);
          case "get_migration_log":
            return await this.getMigrationLog(args);
          case "get_migration_summary":
            return await this.getMigrationSummary();
          case "rollback_file":
            return await this.rollbackFile(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: errorMessage }, null, 2),
            },
          ],
        };
      }
    });
  }

  private async startOrchestratedMigration(args: any) {
    const sourcePath = args.sourcePath || this.config.sourcePath;
    const targetPath = args.targetPath || this.config.targetPath;
    const module = args.module;

    if (!sourcePath) {
      throw new Error(
        "Source path not configured. Provide sourcePath argument or set MIGRATION_SOURCE_PATH."
      );
    }

    // Initialize or load migration state
    let state = loadMigrationState();
    if (!state) {
      state = initializeMigrationState(sourcePath, targetPath, module);
      appendMigrationLog(
        "INIT",
        `Initialized migration: ${sourcePath} → ${targetPath}${module ? ` (module: ${module})` : ""}`
      );
    }

    // Update state to in_progress
    state.status = "in_progress";
    state.current_phase = "audit";
    state.phases.audit = {
      status: "in_progress",
      started_at: new Date().toISOString(),
    };
    saveMigrationState(state);

    appendMigrationLog(
      "START",
      "Starting orchestrated migration workflow",
      {
        source: sourcePath,
        target: targetPath,
        module: module || "all",
      }
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "started",
              current_phase: "audit",
              message:
                "Migration orchestrator started. Use @auditor agent to scan patterns.",
              state_file: MIGRATION_LOG_PATH,
              next_steps: [
                "1. Call analysis MCP tools to scan source patterns",
                "2. Review audit results and plan transformation",
                "3. Use generator MCP to propose code generations",
                "4. Validate and write approved proposals",
              ],
              config: {
                source_path: sourcePath,
                target_path: targetPath,
                module: module || "all",
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getMigrationState() {
    const state = loadMigrationState();

    if (!state) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "no_migration",
                message: "No active migration. Call start_orchestrated_migration to begin.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Calculate statistics
    const fileStats = {
      total: state.files.length,
      by_status: state.files.reduce(
        (acc, file) => {
          acc[file.status] = (acc[file.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      by_type: state.files.reduce(
        (acc, file) => {
          acc[file.migration_type] = (acc[file.migration_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ...state,
              statistics: fileStats,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async updateMigrationPhase(args: any) {
    const state = loadMigrationState();
    if (!state) {
      throw new Error("No active migration state found");
    }

    const { phase, status } = args;
    state.current_phase = phase as "audit" | "transform" | "validate" | "report";

    if (!state.phases[phase as keyof typeof state.phases]) {
      state.phases[phase as keyof typeof state.phases] = { status: "pending" };
    }

    // TypeScript needs help with the phase type
    const phaseKey = phase as keyof typeof state.phases;
    if (state.phases[phaseKey]) {
      (state.phases[phaseKey] as any).status = status;

      if (status === "in_progress") {
        (state.phases[phaseKey] as any).started_at = new Date().toISOString();
      } else if (status === "completed" || status === "failed") {
        (state.phases[phaseKey] as any).completed_at = new Date().toISOString();
      }
    }

    saveMigrationState(state);
    appendMigrationLog(
      "PHASE",
      `Phase ${phase} updated to ${status}`
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "updated",
              phase,
              phase_status: status,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getMigrationLog(args: any) {
    const log = readText(MIGRATION_LOG_PATH);

    if (!log) {
      return {
        content: [
          {
            type: "text",
            text: "No migration log available yet.",
          },
        ],
      };
    }

    let displayLog = log;
    if (args.tail && args.tail > 0) {
      const entries = log.split(/\n## \[/);
      displayLog = entries.slice(-args.tail).join("\n## [");
    }

    return {
      content: [
        {
          type: "text",
          text: displayLog,
        },
      ],
    };
  }

  private async getMigrationSummary() {
    const state = loadMigrationState();

    if (!state) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "no_migration",
                message: "No migration in progress",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const { readJsonl } = await import("./common.js");
    const { AUDITS_PATH, GENERATIONS_PATH, VALIDATIONS_PATH } = await import(
      "./common.js"
    );

    const audits = readJsonl(AUDITS_PATH);
    const generations = readJsonl(GENERATIONS_PATH);
    const validations = readJsonl(VALIDATIONS_PATH);

    const summary = {
      migration_status: state.status,
      current_phase: state.current_phase,
      config: state.config,
      phases: state.phases,
      statistics: {
        files: {
          total: state.files.length,
          by_status: state.files.reduce(
            (acc, f) => {
              acc[f.status] = (acc[f.status] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          by_type: state.files.reduce(
            (acc, f) => {
              acc[f.migration_type] = (acc[f.migration_type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
        operations: {
          audits: audits.length,
          generations: generations.length,
          validations: validations.length,
        },
      },
      recommended_next_steps: this.getRecommendedNextSteps(state),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  private getRecommendedNextSteps(state: MigrationState): string[] {
    const steps: string[] = [];

    if (state.current_phase === "audit") {
      steps.push("Review audit results from analysis MCP");
      steps.push("Plan transformation strategy");
      steps.push("Move to transform phase");
    } else if (state.current_phase === "transform") {
      steps.push("Generate code proposals using generator MCP");
      steps.push("Validate proposals before writing");
      steps.push("Move to validate phase");
    } else if (state.current_phase === "validate") {
      steps.push("Run validation checks on generated code");
      steps.push("Review confidence scores");
      steps.push("Write approved proposals");
      steps.push("Move to report phase");
    } else if (state.current_phase === "report") {
      steps.push("Generate final migration report");
      steps.push("Review all changes");
      steps.push("Complete migration");
    }

    return steps;
  }

  private async rollbackFile(args: any) {
    const state = loadMigrationState();
    if (!state) {
      throw new Error("No active migration state found");
    }

    const targetPath = args.target_path;
    const fileEntry = state.files.find((f) => f.target === targetPath);

    if (!fileEntry) {
      throw new Error(`File not found in migration state: ${targetPath}`);
    }

    if (!fileEntry.rollback_available || !fileEntry.backup_path) {
      throw new Error(`No backup available for: ${targetPath}`);
    }

    const { copyFileSync, existsSync } = await import("fs");
    
    if (!existsSync(fileEntry.backup_path)) {
      throw new Error(`Backup file not found: ${fileEntry.backup_path}`);
    }

    copyFileSync(fileEntry.backup_path, targetPath);

    appendMigrationLog(
      "ROLLBACK",
      `Rolled back file: ${targetPath}`,
      { backup_path: fileEntry.backup_path }
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "rolled_back",
              target_path: targetPath,
              restored_from: fileEntry.backup_path,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Nuxt Migration Orchestrator MCP Server running on stdio");
  }
}

const server = new OrchestratorServer();
server.run().catch(console.error);
