import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { parse } from "dotenv";
import type { MigrationConfig } from "../types/index.js";

let cachedConfig: MigrationConfig | null = null;

export const DEFAULT_EXCLUDE_PATTERNS = [
  "node_modules",
  ".nuxt",
  ".output",
  "dist",
  ".git",
  "vendor",
];

export function loadConfig(configPath?: string): MigrationConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const defaultConfig: MigrationConfig = {
    sourcePath: process.env.MIGRATION_SOURCE_PATH || "",
    targetPath: process.cwd(),
    excludePatterns: DEFAULT_EXCLUDE_PATTERNS,
    includePatterns: ["**/*.vue", "**/*.ts", "**/*.js"],
  };

  let envSourcePath = defaultConfig.sourcePath;
  let envTargetPath = defaultConfig.targetPath;

  if (configPath && existsSync(configPath)) {
    const envContent = readFileSync(configPath, "utf-8");
    const envVars = parse(envContent);
    envSourcePath = envVars.MIGRATION_SOURCE_PATH || envSourcePath;
    envTargetPath = envVars.MIGRATION_TARGET_PATH || envTargetPath;
  } else {
    const cwd = process.cwd();
    const envPaths = [
      join(cwd, ".env"),
      join(cwd, "..", ".env"),
    ];
    
    for (const envPath of envPaths) {
      if (existsSync(envPath)) {
        try {
          const envContent = readFileSync(envPath, "utf-8");
          const envVars = parse(envContent);
          if (envVars.MIGRATION_SOURCE_PATH) {
            envSourcePath = envVars.MIGRATION_SOURCE_PATH;
            envTargetPath = envVars.MIGRATION_TARGET_PATH || envTargetPath;
            break;
          }
        } catch {
          continue;
        }
      }
    }
  }

  cachedConfig = {
    sourcePath: envSourcePath,
    targetPath: envTargetPath,
    excludePatterns: defaultConfig.excludePatterns,
    includePatterns: defaultConfig.includePatterns,
  };

  if (!cachedConfig.sourcePath) {
    throw new Error(
      "MIGRATION_SOURCE_PATH is not configured. Set it via config file or environment variable.",
    );
  }

  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}

export function getSourcePath(): string {
  const config = loadConfig();
  return config.sourcePath;
}

export function getTargetPath(): string {
  const config = loadConfig();
  return config.targetPath;
}
