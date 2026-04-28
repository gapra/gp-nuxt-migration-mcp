import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { globSync } from "glob";
import { getSourcePath, getTargetPath } from "../core/config.js";
import { analyzeDirectory, getFiles } from "../core/analyzer.js";
import {
  VUE2_OPTIONS_API_PATTERNS,
  VUEX_PATTERNS,
  SCSS_PATTERNS,
  RXJS_PATTERNS,
  VUE_MIXIN_PATTERNS,
  ASYNC_DATA_PATTERNS,
  NUXT2_PLUGIN_PATTERNS,
  TAILWIND_V3_PATTERNS,
  DEPRECATED_MODULES_PATTERNS,
  findPatterns,
} from "../core/patterns.js";
import type { MigrationReport, DeprecatedModulesReport } from "../types/index.js";

export interface AuditNuxtMigrationParams {
  module?: string;
  configPath?: string;
}

export async function auditNuxtMigration(
  params: AuditNuxtMigrationParams,
): Promise<MigrationReport> {
  const sourcePath = getSourcePath();

  if (!sourcePath) {
    throw new Error("MIGRATION_SOURCE_PATH not configured");
  }

  const includePatterns = ["**/*.vue", "**/*.js", "**/*.ts"];

  const patterns = [
    ...VUE2_OPTIONS_API_PATTERNS,
    ...VUEX_PATTERNS,
    ...SCSS_PATTERNS,
    ...RXJS_PATTERNS,
    ...VUE_MIXIN_PATTERNS,
    ...ASYNC_DATA_PATTERNS,
    ...NUXT2_PLUGIN_PATTERNS,
    ...TAILWIND_V3_PATTERNS,
  ];

  const report = analyzeDirectory(sourcePath, {
    includePatterns,
    patterns,
  });

  return report;
}

export interface AuditComponentMigrationParams {
  componentPath?: string;
}

export async function auditComponentsDirectory(
  params: AuditComponentMigrationParams,
): Promise<MigrationReport> {
  const sourcePath = getSourcePath();
  const componentPath = params.componentPath || "";

  const fullPath = join(sourcePath, "components", componentPath);

  const patterns = [
    ...VUE2_OPTIONS_API_PATTERNS,
    ...SCSS_PATTERNS,
    ...VUE_MIXIN_PATTERNS,
  ];

  return analyzeDirectory(fullPath, { patterns });
}

export async function auditDeprecatedModules(): Promise<DeprecatedModulesReport> {
  const sourcePath = getSourcePath();

  if (!sourcePath) {
    throw new Error("MIGRATION_SOURCE_PATH not configured");
  }

  let allContent = "";

  const filesToCheck = [
    join(sourcePath, "package.json"),
    join(sourcePath, "nuxt.config.js"),
    join(sourcePath, "nuxt.config.ts"),
  ];

  for (const filePath of filesToCheck) {
    if (existsSync(filePath)) {
      try {
        allContent += readFileSync(filePath, "utf-8") + "\n";
      } catch {
        // Skip unreadable files
      }
    }
  }

  const findings = findPatterns(allContent, DEPRECATED_MODULES_PATTERNS);

  const seen = new Set<string>();
  const modules: DeprecatedModulesReport["modules"] = [];

  for (const finding of findings) {
    if (!seen.has(finding.pattern)) {
      seen.add(finding.pattern);
      modules.push({
        name: finding.pattern,
        severity: finding.severity,
        replacement: finding.suggestion ?? "",
      });
    }
  }

  const criticalCount = modules.filter((m) => m.severity === "error").length;

  const recommendations: string[] = [];

  if (modules.length === 0) {
    recommendations.push("No deprecated @nuxtjs/* modules detected");
  } else {
    recommendations.push(
      `Found ${modules.length} deprecated module(s) — ${criticalCount} require immediate replacement`,
    );
    if (modules.some((m) => m.name === "nuxtjs-axios")) {
      recommendations.push(
        "Replace @nuxtjs/axios with built-in $fetch (available globally in Nuxt 3/4)",
      );
    }
    if (modules.some((m) => m.name === "nuxtjs-auth")) {
      recommendations.push(
        "Evaluate nuxt-auth-utils (simple) or sidebase/nuxt-auth (full-featured) as replacement",
      );
    }
    if (modules.some((m) => m.name === "nuxtjs-dotenv")) {
      recommendations.push(
        "Define env vars in nuxt.config.ts runtimeConfig and access via useRuntimeConfig()",
      );
    }
  }

  return {
    summary: { totalFound: modules.length, criticalCount },
    modules,
    recommendations,
  };
}

export interface GetMigrationSummaryParams {}

export async function getMigrationSummary(): Promise<{
  sourcePath: string;
  targetPath: string;
  sourceFiles: number;
  recommendedOrder: string[];
}> {
  const sourcePath = getSourcePath();
  const targetPath = getTargetPath();

  const sourceFiles = getFiles(sourcePath).length;

  return {
    sourcePath,
    targetPath,
    sourceFiles,
    recommendedOrder: [
      "1. Types/Interfaces - Define TypeScript types first",
      "2. API Layer - Create API functions",
      "3. Store (Pinia) - Create state management",
      "4. Composables - Create reusable logic",
      "5. Components - Create UI components",
      "6. Pages - Create page components",
    ],
  };
}
