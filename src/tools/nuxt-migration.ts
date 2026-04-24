import { readFileSync } from "fs";
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
} from "../core/patterns.js";
import type { MigrationReport } from "../types/index.js";

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
