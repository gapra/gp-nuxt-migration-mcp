import { readFileSync } from "fs";
import { join } from "path";
import { getFiles } from "../core/analyzer.js";
import { TRACKING_PATTERNS, FEATURE_FLAG_PATTERNS } from "../core/patterns.js";
import { getSourcePath } from "../core/config.js";
import type { TrackingReport, TrackingFinding } from "../types/index.js";

export interface AuditTrackingParams {
  module?: string;
}

function findTrackingInContent(
  content: string,
  filePath: string,
): TrackingFinding[] {
  const findings: TrackingFinding[] = [];
  const lines = content.split("\n");

  const allPatterns = [...TRACKING_PATTERNS, ...FEATURE_FLAG_PATTERNS];

  for (const rule of allPatterns) {
    const regex = new RegExp(rule.pattern, "g");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const matchIndex = match.index;
      const lineNumber = content.substring(0, matchIndex).split("\n").length;
      const lineContent = lines[lineNumber - 1] || "";

      const isTracking = TRACKING_PATTERNS.some((p) => p.name === rule.name);
      const libraryMatch = lineContent.match(
        /(\$mixpanel|gtag|analytics|dataLayer)/,
      );
      const library = libraryMatch ? libraryMatch[1] : "unknown";

      const eventMatch = lineContent.match(/\.track\s*\(\s*['"]([^'"]+)['"]/);
      const flagMatch = lineContent.match(/['"]([^'"]+)['"]\)/);

      findings.push({
        type: isTracking ? "analytics" : "feature-flag",
        file: filePath,
        line: lineNumber,
        library: library,
        method: rule.name,
        eventName: isTracking ? eventMatch?.[1] || undefined : undefined,
        flagKey: !isTracking ? flagMatch?.[1] || undefined : undefined,
        code: lineContent.trim().substring(0, 100),
        suggestion: rule.suggestion,
      });
    }
  }

  return findings;
}

export async function auditTracking(
  params: AuditTrackingParams = {},
): Promise<TrackingReport> {
  const sourcePath = getSourcePath();

  if (!sourcePath) {
    throw new Error("MIGRATION_SOURCE_PATH not configured");
  }

  const files = getFiles(sourcePath, ["**/*.vue", "**/*.js", "**/*.ts"]);
  const allFindings: TrackingFinding[] = [];
  const libraries = new Set<string>();

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const findings = findTrackingInContent(content, file);
      allFindings.push(...findings);

      for (const f of findings) {
        libraries.add(f.library);
      }
    } catch {
      // Skip files that can't be read
    }
  }

  const analyticsCalls = allFindings.filter(
    (f) => f.type === "analytics",
  ).length;
  const featureFlags = allFindings.filter(
    (f) => f.type === "feature-flag",
  ).length;

  const recommendations: string[] = [];

  if (analyticsCalls > 0) {
    recommendations.push(
      "Create/verify useTracking() composable exists in target codebase",
    );
    recommendations.push(
      `Map ${analyticsCalls} tracking calls during migration`,
    );
  }

  if (featureFlags > 0) {
    recommendations.push("Create/verify useFeatureFlag() composable exists");
    recommendations.push(
      `Verify ${featureFlags} feature flags exist in target environment`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("No tracking calls or feature flags found");
  }

  return {
    summary: {
      analyticsCalls,
      featureFlags,
      libraries: [...libraries],
    },
    findings: allFindings,
    recommendations,
  };
}

export async function auditTrackingInModule(
  modulePath: string,
): Promise<TrackingReport> {
  const sourcePath = getSourcePath();
  const fullPath = join(sourcePath, modulePath);

  const files = getFiles(fullPath, ["**/*.vue", "**/*.js", "**/*.ts"]);
  const allFindings: TrackingFinding[] = [];
  const libraries = new Set<string>();

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const findings = findTrackingInContent(content, file);
      allFindings.push(...findings);

      for (const f of findings) {
        libraries.add(f.library);
      }
    } catch {
      // Skip
    }
  }

  return {
    summary: {
      analyticsCalls: allFindings.filter((f) => f.type === "analytics").length,
      featureFlags: allFindings.filter((f) => f.type === "feature-flag").length,
      libraries: [...libraries],
    },
    findings: allFindings,
    recommendations: [],
  };
}
