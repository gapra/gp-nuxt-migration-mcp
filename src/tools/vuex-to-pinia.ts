import { readFileSync } from "fs";
import { join } from "path";
import { getFiles } from "../core/analyzer.js";
import { getSourcePath } from "../core/config.js";
import type { VuexMigrationReport, VuexStoreAnalysis } from "../types/index.js";

const VUEX_STORE_PATTERN =
  /export\s+default\s+(?:new\s+)?Vuex\.Store\s*\(\s*\{/g;
const VUEX_MODULE_PATTERN = /export\s+default\s*\{[^}]*namespaced\s*:\s*true/g;
const STATE_PATTERN = /state\s*:\s*(?:\(\)\s*=>\s*)?(?:\([^)]*\)\s*=>\s*)?\{/g;
const MUTATIONS_PATTERN = /mutations\s*:\s*\{/g;
const ACTIONS_PATTERN = /actions\s*:\s*\{/g;
const GETTERS_PATTERN = /getters\s*:\s*\{/g;

function extractStoreContent(content: string): Partial<VuexStoreAnalysis> {
  const result: Partial<VuexStoreAnalysis> = {
    suggestions: [],
  };

  const stateMatch = content.match(/state\s*:[\s\S]*?(?:,|\})/);
  if (stateMatch) {
    const stateProps = stateMatch[0].match(/(\w+)\s*:/g) || [];
    result.state = stateProps.map((p) => p.replace(":", "").trim());
  }

  const mutationsMatch = content.match(/mutations\s*:\s*\{[\s\S]*?\}/g);
  if (mutationsMatch) {
    const mutationProps = mutationsMatch[0].match(/(\w+)\s*\(/g) || [];
    result.mutations = mutationProps.map((m) => m.replace("(", "").trim());
  }

  const actionsMatch = content.match(/actions\s*:\s*\{[\s\S]*?\}/g);
  if (actionsMatch) {
    const actionProps = actionsMatch[0].match(/(\w+)\s*\(/g) || [];
    result.actions = actionProps.map((a) => a.replace("(", "").trim());
  }

  const gettersMatch = content.match(/getters\s*:\s*\{[\s\S]*?\}/g);
  if (gettersMatch) {
    const getterProps = gettersMatch[0].match(/(\w+)\s*\(/g) || [];
    result.getters = getterProps.map((g) => g.replace("(", "").trim());
  }

  if (result.state && result.state.length > 0) {
    result.suggestions?.push(
      "Convert state to Pinia state (no mutations needed)",
    );
  }
  if (result.mutations && result.mutations.length > 0) {
    result.suggestions?.push("Remove mutations - Pinia does not require them");
  }
  if (result.actions && result.actions.length > 0) {
    result.suggestions?.push("Keep actions but use async/await directly");
  }
  if (result.getters && result.getters.length > 0) {
    result.suggestions?.push("Convert getters to Pinia getters");
  }

  return result;
}

export interface AuditVuexStoresParams {
  module?: string;
}

export async function auditVuexStores(
  params?: AuditVuexStoresParams,
): Promise<VuexMigrationReport> {
  const sourcePath = getSourcePath();

  if (!sourcePath) {
    throw new Error("MIGRATION_SOURCE_PATH not configured");
  }

  let files: string[];
  
  if (params?.module) {
    const fullPath = join(sourcePath, "store", params.module);
    files = getFiles(fullPath, ["**/*.js", "**/*.ts"]);
  } else {
    files = getFiles(sourcePath, ["**/store/**/*.js", "**/store/**/*.ts"]);
  }

  const stores: VuexStoreAnalysis[] = [];
  let totalModules = 0;

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");

      const isModule = content.includes("namespaced");
      if (isModule) totalModules++;

      const storeMatch = content.match(VUEX_STORE_PATTERN);
      if (!storeMatch) continue;

      const extracted = extractStoreContent(content);

      stores.push({
        namespace: params?.module 
          ? `${params.module}/${file.replace(sourcePath, "").replace(/^\//, "")}`
          : file.replace(sourcePath, "").replace(/^\//, ""),
        state: extracted.state || [],
        mutations: extracted.mutations || [],
        actions: extracted.actions || [],
        getters: extracted.getters || [],
        suggestions: extracted.suggestions || [],
      });
    } catch {
      // Skip
    }
  }

  const recommendations: string[] = [];

  if (stores.length > 0) {
    recommendations.push(`Found ${stores.length} Vuex stores to migrate`);
    if (totalModules > 0) {
      recommendations.push(
        `${totalModules} modules need separate Pinia stores`,
      );
    }
    recommendations.push("Recommended: Create one Pinia store per module");
    recommendations.push("Remove mutations - Pinia does not require them");
    recommendations.push("Use useStore() composable for store access");
  } else {
    recommendations.push("No Vuex stores found - already migrated to Pinia?");
  }

  return {
    summary: {
      totalStores: stores.length,
      totalModules,
    },
    stores,
    recommendations,
  };
}

export async function auditVuexInModule(
  modulePath: string,
): Promise<VuexMigrationReport> {
  const sourcePath = getSourcePath();
  const fullPath = join(sourcePath, "store", modulePath);

  const files = getFiles(fullPath, ["**/*.js", "**/*.ts"]);
  const stores: VuexStoreAnalysis[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const extracted = extractStoreContent(content);

      stores.push({
        namespace: file.replace(fullPath, "").replace(/^\//, ""),
        state: extracted.state || [],
        mutations: extracted.mutations || [],
        actions: extracted.actions || [],
        getters: extracted.getters || [],
        suggestions: extracted.suggestions || [],
      });
    } catch {
      // Skip
    }
  }

  return {
    summary: {
      totalStores: stores.length,
      totalModules: stores.filter((s) => s.state.length > 0).length,
    },
    stores,
    recommendations:
      stores.length > 0 ? [`Convert ${stores.length} stores to Pinia`] : [],
  };
}
