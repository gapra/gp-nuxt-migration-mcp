import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { globSync } from "glob";
import type {
  MigrationConfig,
  AnalysisResult,
  MigrationReport,
} from "../types/index.js";
import { findPatterns, ALL_PATTERNS } from "./patterns.js";
import { DEFAULT_EXCLUDE_PATTERNS } from "./config.js";

export interface AnalyzerOptions {
  path?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  patterns?: typeof ALL_PATTERNS;
}

export function getFiles(
  basePath: string,
  includePatterns: string[] = ["**/*.vue", "**/*.ts", "**/*.js"],
  excludePatterns: string[] = DEFAULT_EXCLUDE_PATTERNS,
): string[] {
  const files: string[] = [];

  const excludePattern =
    excludePatterns.length > 0
      ? `!${join(basePath, `{${excludePatterns.join(",")}}`)}`
      : null;

  const patterns = includePatterns.map((p) => join(basePath, p));

  for (const pattern of patterns) {
    try {
      const matched = globSync(pattern, {
        ignore: excludePattern ? [excludePattern] : undefined,
        absolute: true,
      });
      files.push(...matched);
    } catch {
      // Skip invalid patterns
    }
  }

  return [...new Set(files)];
}

export function analyzeFile(
  filePath: string,
  patterns = ALL_PATTERNS,
): AnalysisResult[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const findings = findPatterns(content, patterns);

    return findings.map((finding) => ({
      ...finding,
      file: filePath,
      line: 1,
    }));
  } catch {
    return [];
  }
}

export function analyzeDirectory(
  basePath: string,
  options: AnalyzerOptions = {},
): MigrationReport {
  const {
    includePatterns = ["**/*.vue", "**/*.ts", "**/*.js"],
    excludePatterns = DEFAULT_EXCLUDE_PATTERNS,
    patterns = ALL_PATTERNS,
  } = options;

  const files = getFiles(basePath, includePatterns, excludePatterns);
  const results: AnalysisResult[] = [];

  for (const file of files) {
    const findings = analyzeFile(file, patterns);
    results.push(...findings);
  }

  const bySeverity: Record<string, number> = {};
  const byPattern: Record<string, number> = {};

  for (const result of results) {
    bySeverity[result.severity] = (bySeverity[result.severity] || 0) + 1;
    byPattern[result.pattern] = (byPattern[result.pattern] || 0) + 1;
  }

  const recommendations = generateRecommendations(results);

  return {
    summary: {
      totalFiles: files.length,
      totalIssues: results.length,
      bySeverity,
      byPattern,
    },
    results,
    recommendations,
  };
}

function generateRecommendations(results: AnalysisResult[]): string[] {
  const recs: string[] = [];
  const patternCounts: Record<string, number> = {};

  for (const result of results) {
    patternCounts[result.pattern] = (patternCounts[result.pattern] || 0) + 1;
  }

  if (patternCounts["options-api"] || patternCounts["options-api-data"]) {
    recs.push(
      "Priority: Migrate Options API components to Composition API with <script setup>",
    );
  }

  if (patternCounts["vuex-store"] || patternCounts["vuex-state"]) {
    recs.push("Priority: Convert Vuex stores to Pinia stores");
  }

  if (patternCounts["mixins-property"]) {
    recs.push("Priority: Convert Vue mixins to Vue 3 composables");
  }

  if (patternCounts["scss-import"]) {
    recs.push("Convert SCSS to Atomic CSS with design tokens");
  }

  if (patternCounts["rxjs-observable"]) {
    recs.push("Convert RxJS Observables to async/await pattern");
  }

  if (patternCounts["any-type"]) {
    recs.push("Fix TypeScript any types with proper type definitions");
  }

  if (recs.length === 0) {
    recs.push("Code appears to be already migrated to Nuxt 4 patterns");
  }

  return recs;
}

export function readFileContent(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}
