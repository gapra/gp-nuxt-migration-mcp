import { readFileSync } from "fs";
import { join } from "path";
import { getFiles } from "../core/analyzer.js";
import { getSourcePath } from "../core/config.js";
import { VUE2_OPTIONS_API_PATTERNS, SCSS_PATTERNS } from "../core/patterns.js";
import type { MigrationReport } from "../types/index.js";

export interface ComponentMigrationReport {
  summary: {
    totalComponents: number;
    optionsApiComponents: number;
    scssComponents: number;
    needsMigration: number;
  };
  components: Array<{
    path: string;
    issues: string[];
  }>;
  recommendations: string[];
}

function analyzeComponent(content: string): string[] {
  const issues: string[] = [];

  if (
    content.includes("export default {") &&
    !content.includes("<script setup")
  ) {
    if (content.match(/data\s*\(\s*\)/)) {
      issues.push("Uses Options API data() - migrate to ref/reactive");
    }
    if (content.match(/methods\s*:/)) {
      issues.push("Uses Options API methods - convert to functions");
    }
    if (content.match(/computed\s*:/)) {
      issues.push("Uses Options API computed - use computed()");
    }
    if (content.match(/mounted\s*\(\s*\)/)) {
      issues.push("Uses Options API mounted - use onMounted()");
    }
  }

  if (content.includes("<style") && content.includes("scss")) {
    issues.push("Uses SCSS - convert to Atomic CSS");
  }

  if (content.includes("scoped")) {
    issues.push("Uses scoped styles - use Atomic CSS classes");
  }

  if (content.match(/class="[^"]*:\s*/)) {
    issues.push("Uses BEM or custom CSS classes - use design tokens");
  }

  return issues;
}

export async function auditComponentMigration(): Promise<ComponentMigrationReport> {
  const sourcePath = getSourcePath();

  if (!sourcePath) {
    throw new Error("MIGRATION_SOURCE_PATH not configured");
  }

  const files = getFiles(sourcePath, ["**/*.vue"]);
  const report: ComponentMigrationReport = {
    summary: {
      totalComponents: files.length,
      optionsApiComponents: 0,
      scssComponents: 0,
      needsMigration: 0,
    },
    components: [],
    recommendations: [],
  };

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const issues = analyzeComponent(content);

      if (issues.length > 0) {
        report.components.push({
          path: file.replace(sourcePath, ""),
          issues,
        });

        if (issues.some((i) => i.includes("Options API"))) {
          report.summary.optionsApiComponents++;
        }
        if (issues.some((i) => i.includes("SCSS"))) {
          report.summary.scssComponents++;
        }
      }
    } catch {
      // Skip
    }
  }

  report.summary.needsMigration = report.components.length;

  if (report.summary.optionsApiComponents > 0) {
    report.recommendations.push(
      `${report.summary.optionsApiComponents} components use Options API - migrate to Composition API`,
    );
  }

  if (report.summary.scssComponents > 0) {
    report.recommendations.push(
      `${report.summary.scssComponents} components use SCSS - migrate to Atomic CSS`,
    );
  }

  if (report.recommendations.length === 0) {
    report.recommendations.push(
      "All components appear to be migrated to Vue 3 patterns",
    );
  }

  return report;
}

export async function auditComponentsInModule(
  modulePath: string,
): Promise<ComponentMigrationReport> {
  const sourcePath = getSourcePath();
  const fullPath = join(sourcePath, "components", modulePath);

  const files = getFiles(fullPath, ["**/*.vue"]);
  const report: ComponentMigrationReport = {
    summary: {
      totalComponents: files.length,
      optionsApiComponents: 0,
      scssComponents: 0,
      needsMigration: 0,
    },
    components: [],
    recommendations: [],
  };

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const issues = analyzeComponent(content);

      if (issues.length > 0) {
        report.components.push({
          path: file.replace(fullPath, ""),
          issues,
        });

        if (issues.some((i) => i.includes("Options API"))) {
          report.summary.optionsApiComponents++;
        }
      }
    } catch {
      // Skip
    }
  }

  report.summary.needsMigration = report.components.length;

  return report;
}
