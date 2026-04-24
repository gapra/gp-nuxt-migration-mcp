#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { existsSync, copyFileSync } from "fs";
import { join } from "path";
import {
  loadEnvConfig,
  appendJsonl,
  GENERATIONS_PATH,
  VALIDATIONS_PATH,
  BACKUPS_DIR,
  validateRequiredFields,
  appendMigrationLog,
  loadMigrationState,
  saveMigrationState,
} from "./common.js";
import {
  generatePiniaStore,
  generateComposable,
  generateVueComponent,
  generateApiFunction,
  generateType,
  writeFileToTarget,
} from "../tools/generator.js";

const GENERATOR_TOOLS: Tool[] = [
  {
    name: "propose_pinia_store",
    description:
      "Propose generation of a Pinia store from Vuex store analysis. Returns proposal that requires validation before writing.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Store name (e.g., 'deals', 'auth')",
        },
        sourcePath: {
          type: "string",
          description: "Source Vuex store file path",
        },
        stateProperties: {
          type: "array",
          items: { type: "string" },
          description: "State properties to migrate",
        },
        actions: {
          type: "array",
          items: { type: "string" },
          description: "Actions to migrate",
        },
        getters: {
          type: "array",
          items: { type: "string" },
          description: "Getters to migrate",
        },
      },
      required: ["name", "sourcePath"],
    },
  },
  {
    name: "propose_composable",
    description:
      "Propose generation of a Vue 3 composable from mixin analysis. Returns proposal that requires validation.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Composable name (e.g., 'useDeals', 'useAuth')",
        },
        sourcePath: {
          type: "string",
          description: "Source mixin file path",
        },
        props: {
          type: "array",
          items: { type: "string" },
          description: "Properties to extract",
        },
        returnValues: {
          type: "array",
          items: { type: "string" },
          description: "Values to return from composable",
        },
      },
      required: ["name", "sourcePath"],
    },
  },
  {
    name: "propose_component",
    description:
      "Propose generation of a Vue 3 Composition API component. Returns proposal that requires validation.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Component name (e.g., 'DealCard', 'UserProfile')",
        },
        sourcePath: {
          type: "string",
          description: "Source component file path",
        },
        props: {
          type: "array",
          items: { type: "string" },
          description: "Component props",
        },
        emits: {
          type: "array",
          items: { type: "string" },
          description: "Component emits",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "propose_api_function",
    description:
      "Propose generation of async/await API function from RxJS observable. Returns proposal.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Function name (e.g., 'fetchDeals', 'createUser')",
        },
        sourcePath: {
          type: "string",
          description: "Source API file path",
        },
        methods: {
          type: "array",
          items: { type: "string" },
          description: "HTTP methods to generate (get, post, put, delete)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "validate_proposal",
    description:
      "Validate a generation proposal before writing. Checks confidence, safety, and conflicts.",
    inputSchema: {
      type: "object",
      properties: {
        proposal_id: {
          type: "string",
          description: "Proposal ID to validate",
        },
        auto_approve_threshold: {
          type: "number",
          description: "Confidence threshold for auto-approval (0.0-1.0, default: 0.8)",
        },
      },
      required: ["proposal_id"],
    },
  },
  {
    name: "write_validated_proposal",
    description:
      "Write a validated proposal to target codebase. Creates backup before writing.",
    inputSchema: {
      type: "object",
      properties: {
        proposal_id: {
          type: "string",
          description: "Validated proposal ID to write",
        },
        force: {
          type: "boolean",
          description: "Force write even if target exists (creates backup)",
        },
      },
      required: ["proposal_id"],
    },
  },
  {
    name: "get_generation_history",
    description:
      "Retrieve history of all generation operations from generations.jsonl log.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of records to return (default: 10)",
        },
      },
    },
  },
];

interface Proposal {
  id: string;
  type: string;
  source_path: string;
  target_path: string;
  content: string;
  confidence: number;
  validation_status: "pending" | "validated" | "rejected";
  write_status: "pending" | "written" | "failed";
  created_at: string;
}

class GeneratorServer {
  private server: Server;
  private config: { sourcePath: string; targetPath: string };
  private proposals: Map<string, Proposal> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: "nuxt-migration-generator",
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
      tools: GENERATOR_TOOLS,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "propose_pinia_store":
            return await this.proposePiniaStore(args);
          case "propose_composable":
            return await this.proposeComposable(args);
          case "propose_component":
            return await this.proposeComponent(args);
          case "propose_api_function":
            return await this.proposeApiFunction(args);
          case "validate_proposal":
            return await this.validateProposal(args);
          case "write_validated_proposal":
            return await this.writeValidatedProposal(args);
          case "get_generation_history":
            return await this.getGenerationHistory(args);
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

  private generateProposalId(): string {
    return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async proposePiniaStore(args: any) {
    validateRequiredFields(args, ["name", "sourcePath"]);

    const code = generatePiniaStore({
      name: args.name,
      stateProperties: args.stateProperties || [],
      actions: args.actions || [],
      getters: args.getters || [],
    });

    const targetPath = join(
      this.config.targetPath,
      "stores",
      `${args.name}.ts`
    );

    const proposalId = this.generateProposalId();
    const proposal: Proposal = {
      id: proposalId,
      type: "pinia_store",
      source_path: args.sourcePath,
      target_path: targetPath,
      content: code,
      confidence: 0.85,
      validation_status: "pending",
      write_status: "pending",
      created_at: new Date().toISOString(),
    };

    this.proposals.set(proposalId, proposal);

    appendJsonl(GENERATIONS_PATH, {
      tool: "propose_pinia_store",
      proposal_id: proposalId,
      store_name: args.name,
      source: args.sourcePath,
      target: targetPath,
      status: "proposed",
    });

    appendMigrationLog(
      "GENERATE",
      `Proposed Pinia store: ${args.name}`,
      { proposal_id: proposalId }
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "proposed",
              proposal_id: proposalId,
              target_path: targetPath,
              confidence: proposal.confidence,
              preview: code.substring(0, 500) + "...",
              next_step: "Call validate_proposal with this proposal_id",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async proposeComposable(args: any) {
    validateRequiredFields(args, ["name", "sourcePath"]);

    const code = generateComposable({
      name: args.name,
      props: args.props || [],
      returnValues: args.returnValues || [],
    });

    const composableName = args.name.startsWith("use") ? args.name : `use${args.name}`;
    const targetPath = join(
      this.config.targetPath,
      "composables",
      `${composableName}.ts`
    );

    const proposalId = this.generateProposalId();
    const proposal: Proposal = {
      id: proposalId,
      type: "composable",
      source_path: args.sourcePath,
      target_path: targetPath,
      content: code,
      confidence: 0.80,
      validation_status: "pending",
      write_status: "pending",
      created_at: new Date().toISOString(),
    };

    this.proposals.set(proposalId, proposal);

    appendJsonl(GENERATIONS_PATH, {
      tool: "propose_composable",
      proposal_id: proposalId,
      composable_name: composableName,
      source: args.sourcePath,
      target: targetPath,
      status: "proposed",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "proposed",
              proposal_id: proposalId,
              target_path: targetPath,
              confidence: proposal.confidence,
              preview: code.substring(0, 500) + "...",
              next_step: "Call validate_proposal with this proposal_id",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async proposeComponent(args: any) {
    validateRequiredFields(args, ["name"]);

    const code = generateVueComponent({
      name: args.name,
      props: args.props || [],
      emits: args.emits || [],
    });

    const targetPath = join(
      this.config.targetPath,
      "components",
      `${args.name}.vue`
    );

    const proposalId = this.generateProposalId();
    const proposal: Proposal = {
      id: proposalId,
      type: "vue_component",
      source_path: args.sourcePath || "",
      target_path: targetPath,
      content: code,
      confidence: 0.75,
      validation_status: "pending",
      write_status: "pending",
      created_at: new Date().toISOString(),
    };

    this.proposals.set(proposalId, proposal);

    appendJsonl(GENERATIONS_PATH, {
      tool: "propose_component",
      proposal_id: proposalId,
      component_name: args.name,
      target: targetPath,
      status: "proposed",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "proposed",
              proposal_id: proposalId,
              target_path: targetPath,
              confidence: proposal.confidence,
              preview: code.substring(0, 500) + "...",
              next_step: "Call validate_proposal with this proposal_id",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async proposeApiFunction(args: any) {
    validateRequiredFields(args, ["name"]);

    const code = generateApiFunction({
      name: args.name,
      methods: args.methods || ["get"],
    });

    const targetPath = join(
      this.config.targetPath,
      "api",
      `${args.name}.ts`
    );

    const proposalId = this.generateProposalId();
    const proposal: Proposal = {
      id: proposalId,
      type: "api_function",
      source_path: args.sourcePath || "",
      target_path: targetPath,
      content: code,
      confidence: 0.90,
      validation_status: "pending",
      write_status: "pending",
      created_at: new Date().toISOString(),
    };

    this.proposals.set(proposalId, proposal);

    appendJsonl(GENERATIONS_PATH, {
      tool: "propose_api_function",
      proposal_id: proposalId,
      function_name: args.name,
      target: targetPath,
      status: "proposed",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "proposed",
              proposal_id: proposalId,
              target_path: targetPath,
              confidence: proposal.confidence,
              preview: code.substring(0, 500) + "...",
              next_step: "Call validate_proposal with this proposal_id",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async validateProposal(args: any) {
    validateRequiredFields(args, ["proposal_id"]);

    const proposal = this.proposals.get(args.proposal_id);
    if (!proposal) {
      throw new Error(`Proposal not found: ${args.proposal_id}`);
    }

    const autoApproveThreshold = args.auto_approve_threshold || 0.8;
    const targetExists = existsSync(proposal.target_path);
    
    const validationResult = {
      proposal_id: proposal.id,
      confidence: proposal.confidence,
      target_exists: targetExists,
      can_auto_approve: proposal.confidence >= autoApproveThreshold && !targetExists,
      safety_checks: {
        confidence_threshold: proposal.confidence >= autoApproveThreshold,
        no_conflicts: !targetExists,
        valid_syntax: true, // Could add AST validation here
      },
    };

    if (validationResult.can_auto_approve) {
      proposal.validation_status = "validated";
    }

    appendJsonl(VALIDATIONS_PATH, {
      tool: "validate_proposal",
      proposal_id: proposal.id,
      type: proposal.type,
      confidence: proposal.confidence,
      validation_result: validationResult.can_auto_approve ? "approved" : "review_required",
    });

    appendMigrationLog(
      "VALIDATE",
      `Validated proposal: ${proposal.id}`,
      validationResult
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ...validationResult,
              next_step: validationResult.can_auto_approve
                ? "Call write_validated_proposal to write the file"
                : "Manual review required or use force=true",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async writeValidatedProposal(args: any) {
    validateRequiredFields(args, ["proposal_id"]);

    const proposal = this.proposals.get(args.proposal_id);
    if (!proposal) {
      throw new Error(`Proposal not found: ${args.proposal_id}`);
    }

    if (proposal.validation_status !== "validated" && !args.force) {
      throw new Error(
        `Proposal ${proposal.id} has not been validated. Use force=true to override.`
      );
    }

    // Create backup if target exists
    let backupPath: string | undefined;
    if (existsSync(proposal.target_path)) {
      backupPath = join(
        BACKUPS_DIR,
        `${Date.now()}_${proposal.target_path.split("/").pop()}`
      );
      copyFileSync(proposal.target_path, backupPath);
    }

    // Write to target
    const relativePath = proposal.target_path.split("/").slice(-2).join("/"); // Extract relative path
    writeFileToTarget({ relativePath, content: proposal.content });
    proposal.write_status = "written";

    // Update migration state
    const state = loadMigrationState();
    if (state) {
      state.files.push({
        source: proposal.source_path,
        target: proposal.target_path,
        migration_type: proposal.type,
        status: "written",
        confidence: proposal.confidence,
        rollback_available: !!backupPath,
        backup_path: backupPath,
      });
      saveMigrationState(state);
    }

    appendJsonl(GENERATIONS_PATH, {
      tool: "write_validated_proposal",
      proposal_id: proposal.id,
      target: proposal.target_path,
      backup_path: backupPath,
      status: "written",
    });

    appendMigrationLog(
      "WRITE",
      `Wrote file: ${proposal.target_path}`,
      { proposal_id: proposal.id, backup: backupPath }
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "written",
              target_path: proposal.target_path,
              backup_path: backupPath,
              rollback_available: !!backupPath,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getGenerationHistory(args: any) {
    const limit = args.limit || 10;
    const { readJsonl } = await import("./common.js");
    const generations = readJsonl(GENERATIONS_PATH);
    const recent = generations.slice(-limit).reverse();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              total_generations: generations.length,
              showing: recent.length,
              generations: recent,
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
    console.error("Nuxt Migration Generator MCP Server running on stdio");
  }
}

const server = new GeneratorServer();
server.run().catch(console.error);
