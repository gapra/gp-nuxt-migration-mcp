import { existsSync } from "fs";
import { join } from "path";
import { getSourcePath } from "../core/config.js";
import type { Nuxt4StructureReport } from "../types/index.js";

const NUXT4_APP_DIRS = [
  "components",
  "pages",
  "composables",
  "layouts",
  "middleware",
  "plugins",
  "assets",
] as const;

export async function auditNuxt4Structure(): Promise<Nuxt4StructureReport> {
  const sourcePath = getSourcePath();

  if (!sourcePath) {
    throw new Error("MIGRATION_SOURCE_PATH not configured");
  }

  const hasAppDir = existsSync(join(sourcePath, "app"));
  const misplaced: Nuxt4StructureReport["misplaced"] = [];

  for (const dir of NUXT4_APP_DIRS) {
    const dirPath = join(sourcePath, dir);
    if (existsSync(dirPath) && !hasAppDir) {
      misplaced.push({
        currentPath: dir,
        suggestedPath: `app/${dir}`,
        type: dir,
      });
    }
  }

  const recommendations: string[] = [];

  if (!hasAppDir && misplaced.length > 0) {
    recommendations.push(
      "Create app/ directory and move all Nuxt source directories into it",
    );
    recommendations.push(
      `Directories to move: ${misplaced.map((d) => d.currentPath).join(", ")}`,
    );
    recommendations.push(
      "Update nuxt.config.ts: set srcDir: 'app' or use Nuxt 4 compat mode",
    );
    recommendations.push(
      "Keep server/, public/, and nuxt.config.ts at the project root",
    );
  } else if (hasAppDir) {
    recommendations.push(
      "app/ directory already exists — project may already follow Nuxt 4 structure",
    );
  } else {
    recommendations.push(
      "No standard Nuxt source directories detected at root level",
    );
  }

  return {
    summary: {
      hasAppDirectory: hasAppDir,
      misplacedCount: misplaced.length,
    },
    misplaced,
    recommendations,
  };
}
