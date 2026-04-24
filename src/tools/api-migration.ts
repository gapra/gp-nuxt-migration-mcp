import { readFileSync } from "fs";
import { join } from "path";
import { getFiles } from "../core/analyzer.js";
import { getSourcePath } from "../core/config.js";
import type { MigrationReport } from "../types/index.js";
import { RXJS_PATTERNS } from "../core/patterns.js";

export interface ApiMigrationReport {
  summary: {
    filesWithRxJS: number;
    observables: number;
    subscriptions: number;
  };
  files: Array<{
    path: string;
    issues: string[];
  }>;
  recommendations: string[];
}

export async function auditApiMigration(): Promise<ApiMigrationReport> {
  const sourcePath = getSourcePath();

  if (!sourcePath) {
    throw new Error("MIGRATION_SOURCE_PATH not configured");
  }

  const files = getFiles(sourcePath, [
    "**/requests/**/*.js",
    "**/api/**/*.js",
    "**/*.service.js",
  ]);

  const report: ApiMigrationReport = {
    summary: {
      filesWithRxJS: 0,
      observables: 0,
      subscriptions: 0,
    },
    files: [],
    recommendations: [],
  };

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");

      const issues: string[] = [];

      if (content.includes(".pipe(")) {
        issues.push("Uses RxJS pipe operators");
        report.summary.observables++;
      }

      if (content.includes(".subscribe(")) {
        issues.push("Uses RxJS subscribe()");
        report.summary.subscriptions++;
      }

      if (content.includes("import") && content.includes("rxjs")) {
        issues.push("Imports from rxjs");
        report.summary.filesWithRxJS++;
      }

      if (
        content.includes("Observable") ||
        content.includes("of(") ||
        content.includes("from(")
      ) {
        issues.push("Uses Observable operators");
      }

      if (issues.length > 0) {
        report.files.push({
          path: file.replace(sourcePath, ""),
          issues,
        });
      }
    } catch {
      // Skip
    }
  }

  if (report.summary.filesWithRxJS > 0) {
    report.recommendations.push(
      `Found ${report.summary.filesWithRxJS} files using RxJS`,
    );
    report.recommendations.push("Convert Observables to async/await pattern");
    report.recommendations.push(
      "Use try-catch for error handling instead of .catch()",
    );
    report.recommendations.push("Return Promises from API functions");
  } else {
    report.recommendations.push(
      "No RxJS usage found - already migrated to async/await?",
    );
  }

  return report;
}

export async function auditApiInModule(
  modulePath: string,
): Promise<ApiMigrationReport> {
  const sourcePath = getSourcePath();
  const fullPath = join(sourcePath, "requests", modulePath);

  const files = getFiles(fullPath, ["**/*.js"]);
  const report: ApiMigrationReport = {
    summary: {
      filesWithRxJS: 0,
      observables: 0,
      subscriptions: 0,
    },
    files: [],
    recommendations: [],
  };

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");

      const issues: string[] = [];

      if (content.includes(".pipe(")) {
        issues.push("Uses pipe operators");
        report.summary.observables++;
      }

      if (content.includes(".subscribe(")) {
        issues.push("Uses subscribe()");
        report.summary.subscriptions++;
      }

      if (issues.length > 0) {
        report.files.push({
          path: file.replace(fullPath, ""),
          issues,
        });
      }
    } catch {
      // Skip
    }
  }

  return report;
}
