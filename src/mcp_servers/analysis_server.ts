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
  appendJsonl,
  AUDITS_PATH,
  validateRequiredFields,
  appendMigrationLog,
} from "./common.js";
import { auditNuxtMigration } from "../tools/nuxt-migration.js";
import { auditVuexStores } from "../tools/vuex-to-pinia.js";
import { auditMixins } from "../tools/composable-migration.js";
import { auditApiMigration } from "../tools/api-migration.js";
import { auditComponentsInModule } from "../tools/component-migration.js";
import { auditTracking } from "../tools/tracking.js";

const ANALYSIS_TOOLS: Tool[] = [
  {
    name: "scan_source_patterns",
    description:
      "Scan source codebase for all migration patterns. Read-only operation that detects Vue 2, Vuex, mixins, RxJS, and tracking patterns.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description: 'Optional module path to scan (e.g., "deals", "tickets")',
        },
        sourcePath: {
          type: "string",
          description: "Optional source path override",
        },
      },
    },
  },
  {
    name: "audit_vuex_patterns",
    description:
      "Audit Vuex store patterns specifically. Identifies state, mutations, actions, and getters.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description: 'Optional module to audit (e.g., "deals", "auth")',
        },
      },
    },
  },
  {
    name: "audit_mixin_patterns",
    description:
      "Audit Vue mixin patterns. Identifies data, methods, computed properties, and lifecycle hooks.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description: 'Optional module to audit (e.g., "deals", "shared")',
        },
      },
    },
  },
  {
    name: "audit_api_patterns",
    description:
      "Audit API layer patterns. Detects RxJS Observables and suggests async/await conversions.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description: "Optional module to audit",
        },
      },
    },
  },
  {
    name: "audit_component_patterns",
    description:
      "Audit Vue component patterns. Detects Options API and SCSS usage.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description: 'Optional module to audit (e.g., "deals", "tickets")',
        },
      },
    },
  },
  {
    name: "audit_tracking_patterns",
    description:
      "Audit tracking and analytics patterns. Finds Mixpanel, gtag, dataLayer, and feature flags.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description: 'Optional module to audit (e.g., "deals")',
        },
      },
    },
  },
  {
    name: "suggest_migration_order",
    description:
      "Analyze dependencies and suggest optimal migration order based on detected patterns.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_audit_history",
    description:
      "Retrieve history of all audit operations from audits.jsonl log.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of audit records to return (default: 10)",
        },
      },
    },
  },
];

class AnalysisServer {
  private server: Server;
  private config: { sourcePath: string; targetPath: string };

  constructor() {
    this.server = new Server(
      {
        name: "nuxt-migration-analysis",
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
      tools: ANALYSIS_TOOLS,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "scan_source_patterns":
            return await this.scanSourcePatterns(args);
          case "audit_vuex_patterns":
            return await this.auditVuexPatterns(args);
          case "audit_mixin_patterns":
            return await this.auditMixinPatterns(args);
          case "audit_api_patterns":
            return await this.auditApiPatterns(args);
          case "audit_component_patterns":
            return await this.auditComponentPatterns(args);
          case "audit_tracking_patterns":
            return await this.auditTrackingPatterns(args);
          case "suggest_migration_order":
            return await this.suggestMigrationOrder();
          case "get_audit_history":
            return await this.getAuditHistory(args);
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

  private async scanSourcePatterns(args: any) {
    const sourcePath = args.sourcePath || this.config.sourcePath;
    const module = args.module;

    const results = {
      nuxt: await auditNuxtMigration(module),
      vuex: await auditVuexStores({ module }),
      mixins: await auditMixins({ module }),
      api: await auditApiMigration(),
      components: module ? await auditComponentsInModule(module) : { summary: { optionsApiComponents: 0, scssComponents: 0 }, files: [], recommendations: [] },
      tracking: await auditTracking({ module }),
    };

    // Record audit in JSONL
    appendJsonl(AUDITS_PATH, {
      tool: "scan_source_patterns",
      module: module || "all",
      source_path: sourcePath,
      pattern_counts: {
        nuxt: results.nuxt.summary.totalIssues,
        vuex: results.vuex.summary.totalStores,
        mixins: results.mixins.summary.totalMixins,
        api: results.api.summary.filesWithRxJS,
        components: results.components.summary.optionsApiComponents,
        tracking: results.tracking.summary.analyticsCalls,
      },
    });

    // Log to migration log
    appendMigrationLog(
      "AUDIT",
      `Scanned source patterns${module ? ` for module: ${module}` : ""}`,
      {
        total_patterns: 
          results.nuxt.summary.totalIssues +
          results.vuex.summary.totalStores +
          results.mixins.summary.totalMixins +
          results.api.summary.filesWithRxJS +
          results.components.summary.optionsApiComponents +
          results.tracking.summary.analyticsCalls,
      }
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async auditVuexPatterns(args: any) {
    const result = await auditVuexStores({ module: args.module });
    
    appendJsonl(AUDITS_PATH, {
      tool: "audit_vuex_patterns",
      module: args.module || "all",
      stores_found: result.summary.totalStores,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  private async auditMixinPatterns(args: any) {
    const result = await auditMixins({ module: args.module });
    
    appendJsonl(AUDITS_PATH, {
      tool: "audit_mixin_patterns",
      module: args.module || "all",
      mixins_found: result.summary.totalMixins,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  private async auditApiPatterns(args: any) {
    const result = await auditApiMigration();
    
    appendJsonl(AUDITS_PATH, {
      tool: "audit_api_patterns",
      module: args.module || "all",
      api_issues: result.summary.filesWithRxJS,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  private async auditComponentPatterns(args: any) {
    const result = args.module ? await auditComponentsInModule(args.module) : { summary: { optionsApiComponents: 0, scssComponents: 0 }, files: [], recommendations: [] };
    
    appendJsonl(AUDITS_PATH, {
      tool: "audit_component_patterns",
      module: args.module || "all",
      components_found: result.summary.optionsApiComponents,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  private async auditTrackingPatterns(args: any) {
    const result = await auditTracking({ module: args.module });
    
    appendJsonl(AUDITS_PATH, {
      tool: "audit_tracking_patterns",
      module: args.module || "all",
      tracking_calls: result.summary.analyticsCalls,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  private async suggestMigrationOrder() {
    // Scan all patterns first
    const patterns = {
      vuex: await auditVuexStores(),
      mixins: await auditMixins(),
      api: await auditApiMigration(),
      components: { summary: { optionsApiComponents: 0 }, files: [], recommendations: [] },
    };

    const order = [];
    const dependencies: Record<string, string[]> = {};

    // Vuex stores should be migrated first (foundational)
    if (patterns.vuex.summary.totalStores > 0) {
      order.push("vuex_to_pinia");
      dependencies.vuex_to_pinia = [];
    }

    // Mixins next (can be reused in components)
    if (patterns.mixins.summary.totalMixins > 0) {
      order.push("mixins_to_composables");
      dependencies.mixins_to_composables = order.includes("vuex_to_pinia")
        ? ["vuex_to_pinia"]
        : [];
    }

    // API layer
    if (patterns.api.summary.filesWithRxJS > 0) {
      order.push("api_modernization");
      dependencies.api_modernization = [];
    }

    // Components last (depend on stores and composables)
    if (patterns.components.summary.optionsApiComponents > 0) {
      order.push("component_migration");
      dependencies.component_migration = order.filter(
        (item) => item !== "component_migration"
      );
    }

    const result = {
      recommended_order: order,
      dependencies,
      reasoning: {
        vuex_to_pinia: "Migrate stores first as they provide foundational state management",
        mixins_to_composables: "Convert mixins to composables for reuse in components",
        api_modernization: "Update API layer to async/await pattern",
        component_migration: "Migrate components last as they depend on stores and composables",
      },
      pattern_summary: {
        vuex: patterns.vuex.summary.totalStores,
        mixins: patterns.mixins.summary.totalMixins,
        api: patterns.api.summary.filesWithRxJS,
        components: patterns.components.summary.optionsApiComponents,
      },
    };

    appendJsonl(AUDITS_PATH, {
      tool: "suggest_migration_order",
      order,
      total_migration_items: order.length,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  private async getAuditHistory(args: any) {
    const limit = args.limit || 10;
    const { readJsonl } = await import("./common.js");
    const audits = readJsonl(AUDITS_PATH);
    const recent = audits.slice(-limit).reverse();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              total_audits: audits.length,
              showing: recent.length,
              audits: recent,
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
    console.error("Nuxt Migration Analysis MCP Server running on stdio");
  }
}

const server = new AnalysisServer();
server.run().catch(console.error);
