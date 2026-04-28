import { readFileSync } from "fs";
import { getFiles } from "../core/analyzer.js";
import { getSourcePath } from "../core/config.js";
import type { EsmCompatReport } from "../types/index.js";

export async function auditEsmCompatibility(): Promise<EsmCompatReport> {
  const sourcePath = getSourcePath();

  if (!sourcePath) {
    throw new Error("MIGRATION_SOURCE_PATH not configured");
  }

  const files = getFiles(sourcePath, [
    "**/*.js",
    "**/*.ts",
    "**/*.vue",
    "**/*.cjs",
    "**/*.mjs",
  ]);

  const report: EsmCompatReport = {
    summary: {
      filesWithRequire: 0,
      filesWithModuleExports: 0,
      filesWithDirname: 0,
      totalIssues: 0,
    },
    files: [],
    recommendations: [],
  };

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const issues: string[] = [];

      if (/\brequire\s*\(\s*['"]/.test(content)) {
        issues.push("Uses CommonJS require() — replace with ESM import");
        report.summary.filesWithRequire++;
      }

      if (/module\.exports\s*=/.test(content)) {
        issues.push("Uses CommonJS module.exports — replace with export default or named exports");
        report.summary.filesWithModuleExports++;
      }

      if (/__dirname/.test(content) || /__filename/.test(content)) {
        issues.push("Uses CommonJS __dirname/__filename — use import.meta.url with fileURLToPath()");
        report.summary.filesWithDirname++;
      }

      if (issues.length > 0) {
        report.files.push({
          path: file.replace(sourcePath, ""),
          issues,
        });
        report.summary.totalIssues += issues.length;
      }
    } catch {
      // Skip unreadable files
    }
  }

  if (report.summary.filesWithRequire > 0) {
    report.recommendations.push(
      `Replace require() with ESM import in ${report.summary.filesWithRequire} file(s)`,
    );
  }
  if (report.summary.filesWithModuleExports > 0) {
    report.recommendations.push(
      `Replace module.exports with ESM exports in ${report.summary.filesWithModuleExports} file(s)`,
    );
  }
  if (report.summary.filesWithDirname > 0) {
    report.recommendations.push(
      `Replace __dirname/__filename with import.meta.url + fileURLToPath() in ${report.summary.filesWithDirname} file(s)`,
    );
  }
  if (report.summary.totalIssues === 0) {
    report.recommendations.push("No CommonJS patterns found — codebase is ESM compatible");
  }

  return report;
}
