#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig, getSourcePath, getTargetPath } from "./core/config.js";
import * as tools from "./tools/index.js";
import { generateAndWrite, writeFileToTarget, generatePiniaStore, generateComposable, generateVueComponent, generateApiFunction, generateType } from "./tools/generator.js";
import { listTargetStructure, generateFromAudit } from "./tools/directory.js";
import { auditEsmCompatibility } from "./tools/esm-compat.js";
import { auditNuxt4Structure } from "./tools/nuxt4-structure.js";
import { auditDeprecatedModules } from "./tools/nuxt-migration.js";

const TOOLS = [
  {
    name: "audit_nuxt_migration",
    description:
      "Audit source codebase for Nuxt 2 to Nuxt 4 migration issues. Detects Options API, Vuex, SCSS, RxJS, mixins, and other legacy patterns.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description:
            'Optional module path to audit (e.g., "deals", "tickets")',
        },
        configPath: {
          type: "string",
          description:
            "Optional path to config file with MIGRATION_SOURCE_PATH",
        },
      },
    },
  },
  {
    name: "start_migration",
    description:
      "Start full Nuxt 2 to Nuxt 3/4 migration process. Automatically detects MIGRATION_SOURCE_PATH from .env, config file, or environment variables. Runs comprehensive audit of the entire codebase including components, stores, composables, API layer, and tracking patterns.",
    inputSchema: {
      type: "object",
      properties: {
        sourcePath: {
          type: "string",
          description: "Optional absolute path to source Nuxt 2 codebase (overrides .env/config)",
        },
        targetPath: {
          type: "string",
          description: "Optional absolute path to target Nuxt 4 codebase (overrides .env/config)",
        },
        module: {
          type: "string",
          description: "Optional specific module to migrate (e.g., 'deals', 'tickets')",
        },
        configPath: {
          type: "string",
          description: "Optional path to .env config file",
        },
      },
    },
  },
  {
    name: "audit_tracking",
    description:
      "Audit source codebase for analytics tracking calls and feature flags. Finds Mixpanel, gtag, dataLayer, and other tracking patterns.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description:
            'Optional module path to audit (e.g., "deals", "tickets")',
        },
      },
    },
  },
  {
    name: "audit_vuex_stores",
    description:
      "Audit Vuex stores and suggest migration to Pinia. Identifies state, mutations, actions, and getters to convert.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description:
            'Optional module path to audit (e.g., "deals", "auth")',
        },
      },
    },
  },
  {
    name: "audit_mixins",
    description:
      "Audit Vue mixins and suggest conversion to composables. Identifies data, methods, and computed properties to extract.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description:
            'Optional module path to audit (e.g., "deals", "auth")',
        },
      },
    },
  },
  {
    name: "audit_api_migration",
    description:
      "Audit API layer for RxJS Observables and suggest conversion to async/await pattern.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description: "Optional module path to audit",
        },
      },
    },
  },
  {
    name: "audit_components",
    description:
      "Audit Vue components for Options API and SCSS usage. Recommends Composition API and Atomic CSS migration.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description:
            'Optional module path to audit (e.g., "deals", "tickets")',
        },
      },
    },
  },
  {
    name: "get_migration_summary",
    description:
      "Get summary of migration status including source/target paths and recommended migration order.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "configure_migration",
    description: "Configure migration source and target paths.",
    inputSchema: {
      type: "object",
      properties: {
        sourcePath: {
          type: "string",
          description: "Absolute path to source Nuxt 2 codebase",
        },
        targetPath: {
          type: "string",
          description: "Absolute path to target Nuxt 4 codebase",
        },
      },
      required: ["sourcePath"],
    },
  },
  {
    name: "generate_pinia_store",
    description: "Generate a Pinia store in the target Nuxt 4 codebase. Creates a new store file with state, actions, and getters.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the store (e.g., 'user', 'auth')",
        },
        relativePath: {
          type: "string",
          description: "Relative path in target (e.g., 'stores/user.ts')",
        },
        module: {
          type: "string",
          description: "Optional module name to prefix path (e.g., 'deals', 'tickets')",
        },
        targetPath: {
          type: "string",
          description: "Optional absolute target path override",
        },
        stateProperties: {
          type: "array",
          items: { type: "string" },
          description: "Optional state properties to include",
        },
        actions: {
          type: "array",
          items: { type: "string" },
          description: "Optional actions to include",
        },
        getters: {
          type: "array",
          items: { type: "string" },
          description: "Optional getters to include",
        },
      },
      required: ["name", "relativePath"],
    },
  },
  {
    name: "generate_composable",
    description: "Generate a composable in the target Nuxt 4 codebase. Creates a new composable file with Vue 3 Composition API.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the composable (e.g., 'useAuth', 'useFetch')",
        },
        relativePath: {
          type: "string",
          description: "Relative path in target (e.g., 'composables/useAuth.ts')",
        },
        module: {
          type: "string",
          description: "Optional module name to prefix path (e.g., 'deals', 'tickets')",
        },
        targetPath: {
          type: "string",
          description: "Optional absolute target path override",
        },
        props: {
          type: "array",
          items: { type: "string" },
          description: "Optional props/refs to include",
        },
        returnValues: {
          type: "array",
          items: { type: "string" },
          description: "Optional values to return",
        },
      },
      required: ["name", "relativePath"],
    },
  },
  {
    name: "generate_component",
    description: "Generate a Vue component in the target Nuxt 4 codebase. Creates a new component with Composition API.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the component (e.g., 'UserCard', 'Button')",
        },
        relativePath: {
          type: "string",
          description: "Relative path in target (e.g., 'components/UserCard.vue')",
        },
        module: {
          type: "string",
          description: "Optional module name to prefix path (e.g., 'deals', 'tickets')",
        },
        targetPath: {
          type: "string",
          description: "Optional absolute target path override",
        },
        props: {
          type: "array",
          items: { type: "string" },
          description: "Optional props to include",
        },
        emits: {
          type: "array",
          items: { type: "string" },
          description: "Optional emits to include",
        },
        hasStore: {
          type: "boolean",
          description: "Whether component uses a Pinia store",
        },
        storeName: {
          type: "string",
          description: "Name of the store if hasStore is true",
        },
      },
      required: ["name", "relativePath"],
    },
  },
  {
    name: "generate_api",
    description: "Generate API functions in the target Nuxt 4 codebase. Creates a new API file with async/await pattern.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the API (e.g., 'user', 'products')",
        },
        relativePath: {
          type: "string",
          description: "Relative path in target (e.g., 'api/users.ts')",
        },
        module: {
          type: "string",
          description: "Optional module name to prefix path (e.g., 'deals', 'tickets')",
        },
        targetPath: {
          type: "string",
          description: "Optional absolute target path override",
        },
        methods: {
          type: "array",
          items: { type: "string" },
          description: "HTTP methods to generate (get, post, put, delete)",
        },
      },
      required: ["name", "relativePath"],
    },
  },
  {
    name: "generate_type",
    description: "Generate a TypeScript type/interface in the target Nuxt 4 codebase.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the type (e.g., 'User', 'Product')",
        },
        relativePath: {
          type: "string",
          description: "Relative path in target (e.g., 'types/User.ts')",
        },
        module: {
          type: "string",
          description: "Optional module name to prefix path (e.g., 'deals', 'tickets')",
        },
        targetPath: {
          type: "string",
          description: "Optional absolute target path override",
        },
      },
      required: ["name", "relativePath"],
    },
  },
  {
    name: "write_file",
    description: "Write any content to a file in the target Nuxt 4 codebase.",
    inputSchema: {
      type: "object",
      properties: {
        relativePath: {
          type: "string",
          description: "Relative path in target (e.g., 'composables/useAuth.ts')",
        },
        module: {
          type: "string",
          description: "Optional module name to prefix path (e.g., 'deals', 'tickets')",
        },
        targetPath: {
          type: "string",
          description: "Optional absolute target path override",
        },
        content: {
          type: "string",
          description: "File content to write",
        },
      },
      required: ["relativePath", "content"],
    },
  },
  {
    name: "list_target_structure",
    description: "List the directory structure of the target Nuxt 4 codebase. Useful for understanding existing folder structure.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Optional relative path within target (e.g., 'components', 'stores')",
        },
        depth: {
          type: "number",
          description: "Depth of directory to traverse (default: 3)",
        },
        targetPath: {
          type: "string",
          description: "Optional absolute target path override",
        },
      },
    },
  },
  {
    name: "generate_from_audit",
    description: "Auto-generate files based on audit findings with intelligent path mapping. Scans source and creates corresponding files in target following Nuxt patterns.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description: "Optional module to generate for (e.g., 'deals', 'auth')",
        },
        type: {
          type: "string",
          enum: ["store", "composable", "component", "api", "type", "all"],
          description: "Type of files to generate (default: all)",
        },
        targetPath: {
          type: "string",
          description: "Optional absolute target path override",
        },
      },
    },
  },
  {
    name: "write_generated_files",
    description: "Write multiple generated files to target. Use with generate_from_audit output.",
    inputSchema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              targetFile: { type: "string" },
              content: { type: "string" },
            },
          },
          description: "Array of files to write",
        },
        targetPath: {
          type: "string",
          description: "Optional absolute target path override",
        },
      },
      required: ["files"],
    },
  },
  {
    name: "audit_async_data",
    description:
      "Detect Nuxt 2 asyncData() and fetch() lifecycle hooks that must be converted to useAsyncData() or useFetch() in Nuxt 3/4.",
    inputSchema: {
      type: "object",
      properties: {
        module: {
          type: "string",
          description: "Optional module path to audit",
        },
      },
    },
  },
  {
    name: "audit_esm_compatibility",
    description:
      "Audit source codebase for CommonJS patterns (require, module.exports, __dirname) incompatible with Nuxt 3/4 ESM-only environment.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "audit_nuxt4_structure",
    description:
      "Audit the project directory structure for Nuxt 4 compatibility. Nuxt 4 requires source files inside an app/ subdirectory.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "audit_deprecated_modules",
    description:
      "Detect deprecated @nuxtjs/* modules in package.json and nuxt.config that are incompatible with Nuxt 3/4. Suggests modern replacements.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "generate_async_data_composable",
    description:
      "Generate a useAsyncData composable to replace Nuxt 2 asyncData() or fetch() lifecycle hooks.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Composable name (e.g., 'usePosts')",
        },
        relativePath: {
          type: "string",
          description: "Relative path in target (e.g., 'composables/usePosts.ts')",
        },
        module: {
          type: "string",
          description: "Optional module name",
        },
        targetPath: {
          type: "string",
          description: "Optional absolute target path override",
        },
        endpoint: {
          type: "string",
          description: "API endpoint to fetch from",
        },
        key: {
          type: "string",
          description: "Cache key for useAsyncData",
        },
        hasLazyLoad: {
          type: "boolean",
          description: "Whether to use lazy loading",
        },
      },
      required: ["name", "relativePath"],
    },
  },
];

class MigrationMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "@gapra/nuxt-migration-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: TOOLS };
    });

    this.server.setRequestHandler(
      CallToolRequestSchema,
      (request: any): any => {
        const toolName = request.params?.name || "";
        const args = request.params?.arguments || {};
        return this.handleToolCall(toolName, args);
      },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleToolCall(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<any> {
    try {
      switch (toolName) {
        case "start_migration": {
          const sourcePathOverride = args.sourcePath as string | undefined;
          const targetPathOverride = args.targetPath as string | undefined;
          const moduleToMigrate = args.module as string | undefined;
          const configPathArg = args.configPath as string | undefined;

          if (sourcePathOverride) {
            process.env.MIGRATION_SOURCE_PATH = sourcePathOverride;
          }
          if (targetPathOverride) {
            process.env.MIGRATION_TARGET_PATH = targetPathOverride;
          }
          if (configPathArg) {
            loadConfig(configPathArg);
          } else {
            loadConfig();
          }

          const sourcePath = getSourcePath();
          const targetPath = getTargetPath();

          const [
            nuxtReport,
            vuexReport,
            mixinsReport,
            apiReport,
            componentsReport,
            trackingReport,
            esmReport,
            structureReport,
            deprecatedReport,
          ] = await Promise.all([
            tools.auditNuxtMigration({ module: moduleToMigrate }),
            tools.auditVuexStores({ module: moduleToMigrate }),
            tools.auditMixins({ module: moduleToMigrate }),
            tools.auditApiMigration(),
            tools.auditComponentMigration(),
            tools.auditTracking({ module: moduleToMigrate }),
            auditEsmCompatibility(),
            auditNuxt4Structure(),
            auditDeprecatedModules(),
          ]);

          return {
            success: true,
            message: "Full migration audit completed",
            sourcePath,
            targetPath,
            module: moduleToMigrate || "all",
            reports: {
              nuxt: nuxtReport,
              vuex: vuexReport,
              mixins: mixinsReport,
              api: apiReport,
              components: componentsReport,
              tracking: trackingReport,
              esm: esmReport,
              structure: structureReport,
              deprecatedModules: deprecatedReport,
            },
            recommendedOrder: [
              "0. ESM Compatibility — Fix require() and module.exports first",
              "0. Directory Structure — Set up app/ directory for Nuxt 4",
              "0. Deprecated Modules — Replace @nuxtjs/* with modern alternatives",
              "1. Types/Interfaces — Define TypeScript types first",
              "2. API Layer — Create API functions (replace RxJS + @nuxtjs/axios)",
              "3. Store (Pinia) — Migrate Vuex stores",
              "4. Composables — Migrate mixins + asyncData/fetch hooks",
              "5. Plugins/Middleware — Update to defineNuxtPlugin/defineNuxtRouteMiddleware",
              "6. Components — Migrate Options API to Composition API",
              "7. Pages — Create page components",
            ],
          };
        }

        case "audit_nuxt_migration":
          return await tools.auditNuxtMigration(args as any);

        case "audit_tracking":
          return await tools.auditTracking(args as any);

        case "audit_vuex_stores":
          return await tools.auditVuexStores({ module: args.module as string | undefined });

        case "audit_mixins":
          return await tools.auditMixins({ module: args.module as string | undefined });

        case "audit_api_migration":
          return await tools.auditApiMigration();

        case "audit_components":
          return await tools.auditComponentMigration();

        case "get_migration_summary":
          return await tools.getMigrationSummary();

        case "configure_migration":
          loadConfig(args.configPath as string | undefined);
          return { success: true, message: "Configuration loaded" };

        case "generate_pinia_store":
          return generateAndWrite({
            type: "store",
            name: args.name as string,
            relativePath: args.relativePath as string,
            module: args.module as string | undefined,
            targetPath: args.targetPath as string | undefined,
            options: {
              name: args.name as string,
              stateProperties: args.stateProperties as string[],
              actions: args.actions as string[],
              getters: args.getters as string[],
            },
          });

        case "generate_composable":
          return generateAndWrite({
            type: "composable",
            name: args.name as string,
            relativePath: args.relativePath as string,
            module: args.module as string | undefined,
            targetPath: args.targetPath as string | undefined,
            options: {
              name: args.name as string,
              props: args.props as string[],
              returnValues: args.returnValues as string[],
            },
          });

        case "generate_component":
          return generateAndWrite({
            type: "component",
            name: args.name as string,
            relativePath: args.relativePath as string,
            module: args.module as string | undefined,
            targetPath: args.targetPath as string | undefined,
            options: {
              name: args.name as string,
              props: args.props as string[],
              emits: args.emits as string[],
              hasStore: args.hasStore as boolean,
              storeName: args.storeName as string,
            },
          });

        case "generate_api":
          return generateAndWrite({
            type: "api",
            name: args.name as string,
            relativePath: args.relativePath as string,
            module: args.module as string | undefined,
            targetPath: args.targetPath as string | undefined,
            options: {
              name: args.name as string,
              methods: args.methods as string[],
            },
          });

        case "generate_type":
          return generateAndWrite({
            type: "type",
            name: args.name as string,
            relativePath: args.relativePath as string,
            module: args.module as string | undefined,
            targetPath: args.targetPath as string | undefined,
          });

        case "write_file":
          return writeFileToTarget({
            relativePath: args.relativePath as string,
            content: args.content as string,
            targetPath: args.targetPath as string | undefined,
          });

        case "list_target_structure":
          return listTargetStructure({
            path: args.path as string | undefined,
            depth: args.depth as number | undefined,
            targetPath: args.targetPath as string | undefined,
          });

        case "generate_from_audit":
          return generateFromAudit({
            module: args.module as string | undefined,
            type: args.type as "store" | "composable" | "component" | "api" | "type" | "all" | undefined,
            targetPath: args.targetPath as string | undefined,
          });

        case "write_generated_files": {
          const files = args.files as Array<{ targetFile: string; content: string }>;
          const targetPath = args.targetPath as string | undefined;
          const results: Array<{ file: string; success: boolean; error?: string }> = [];
          
          for (const file of files) {
            const result = writeFileToTarget({
              relativePath: file.targetFile,
              content: file.content,
              targetPath,
            });
            results.push({
              file: file.targetFile,
              success: result.success,
              error: result.error,
            });
          }
          
          return {
            success: true,
            results,
          };
        }

        case "audit_async_data":
          return await tools.auditNuxtMigration({ module: args.module as string | undefined });

        case "audit_esm_compatibility":
          return await auditEsmCompatibility();

        case "audit_nuxt4_structure":
          return await auditNuxt4Structure();

        case "audit_deprecated_modules":
          return await auditDeprecatedModules();

        case "generate_async_data_composable":
          return generateAndWrite({
            type: "async-data",
            name: args.name as string,
            relativePath: args.relativePath as string,
            module: args.module as string | undefined,
            targetPath: args.targetPath as string | undefined,
            options: {
              name: args.name as string,
              endpoint: args.endpoint as string | undefined,
              key: args.key as string | undefined,
              hasLazyLoad: args.hasLazyLoad as boolean | undefined,
            },
          });

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Nuxt Migration MCP Server started");
  }
}

const server = new MigrationMCPServer();
server.start().catch(console.error);
