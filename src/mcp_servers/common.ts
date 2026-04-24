import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "fs";
import { join, dirname } from "path";
import { parse } from "dotenv";

// Path constants
const ROOT = process.cwd();
export const STATE_DIR = join(ROOT, ".migration");
export const MIGRATION_STATE_PATH = join(STATE_DIR, "migration_state.json");
export const MIGRATION_LOG_PATH = join(STATE_DIR, "migration_log.md");
export const ACTION_DIR = join(STATE_DIR, "actions");
export const AUDITS_PATH = join(ACTION_DIR, "audits.jsonl");
export const GENERATIONS_PATH = join(ACTION_DIR, "generations.jsonl");
export const VALIDATIONS_PATH = join(ACTION_DIR, "validations.jsonl");
export const BACKUPS_DIR = join(STATE_DIR, "backups");

// Ensure directories exist
export function ensureStateDirectories(): void {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  if (!existsSync(ACTION_DIR)) {
    mkdirSync(ACTION_DIR, { recursive: true });
  }
  if (!existsSync(BACKUPS_DIR)) {
    mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

// Read text file safely
export function readText(path: string): string {
  if (!existsSync(path)) {
    return "";
  }
  return readFileSync(path, "utf-8");
}

// Write text file
export function writeText(path: string, content: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, content, "utf-8");
}

// Append to JSONL file
export function appendJsonl(path: string, record: Record<string, any>): void {
  ensureStateDirectories();
  const timestamp = new Date().toISOString();
  const entry = {
    recorded_at: timestamp,
    ...record,
  };
  const line = JSON.stringify(entry) + "\n";
  appendFileSync(path, line, "utf-8");
}

// Read JSONL file
export function readJsonl(path: string): Array<Record<string, any>> {
  if (!existsSync(path)) {
    return [];
  }
  const content = readFileSync(path, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((item): item is Record<string, any> => item !== null);
}

// Migration state management
export interface MigrationState {
  schema_version: number;
  status: "not_started" | "in_progress" | "completed" | "failed";
  current_phase: "audit" | "transform" | "validate" | "report" | null;
  config: {
    source_path: string;
    target_path: string;
    module?: string;
  };
  phases: {
    audit?: PhaseStatus;
    transform?: PhaseStatus;
    validate?: PhaseStatus;
    report?: PhaseStatus;
  };
  files: MigrationFile[];
  last_updated_at: string;
}

export interface PhaseStatus {
  status: "pending" | "in_progress" | "completed" | "failed";
  started_at?: string;
  completed_at?: string;
  error?: string;
}

export interface MigrationFile {
  source: string;
  target: string;
  migration_type: string;
  status: "pending" | "generated" | "validated" | "written" | "failed";
  confidence?: number;
  rollback_available: boolean;
  backup_path?: string;
  error?: string;
}

// Load migration state
export function loadMigrationState(): MigrationState | null {
  if (!existsSync(MIGRATION_STATE_PATH)) {
    return null;
  }
  try {
    const content = readFileSync(MIGRATION_STATE_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Save migration state
export function saveMigrationState(state: MigrationState): void {
  ensureStateDirectories();
  state.last_updated_at = new Date().toISOString();
  writeFileSync(MIGRATION_STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

// Initialize new migration state
export function initializeMigrationState(
  sourcePath: string,
  targetPath: string,
  module?: string
): MigrationState {
  const state: MigrationState = {
    schema_version: 1,
    status: "not_started",
    current_phase: null,
    config: {
      source_path: sourcePath,
      target_path: targetPath,
      module,
    },
    phases: {},
    files: [],
    last_updated_at: new Date().toISOString(),
  };
  saveMigrationState(state);
  return state;
}

// Append to migration log
export function appendMigrationLog(
  phase: string,
  message: string,
  details?: any
): void {
  ensureStateDirectories();
  const timestamp = new Date().toISOString();
  const entry = `\n## [${timestamp}] ${phase}\n\n${message}\n`;
  
  if (details) {
    const detailsStr = typeof details === "string" 
      ? details 
      : "```json\n" + JSON.stringify(details, null, 2) + "\n```\n";
    appendFileSync(MIGRATION_LOG_PATH, entry + "\n" + detailsStr + "\n", "utf-8");
  } else {
    appendFileSync(MIGRATION_LOG_PATH, entry, "utf-8");
  }
}

// Validation utilities
export function validateRequiredFields(
  obj: Record<string, any>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (!obj[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

export function requireNonEmpty(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return trimmed;
}

// Configuration loading with .env support
export function loadEnvConfig(): { sourcePath: string; targetPath: string } {
  const cwd = process.cwd();
  const envPaths = [join(cwd, ".env"), join(cwd, "..", ".env")];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      try {
        const envContent = readFileSync(envPath, "utf-8");
        const envVars = parse(envContent);
        if (envVars.MIGRATION_SOURCE_PATH) {
          return {
            sourcePath: envVars.MIGRATION_SOURCE_PATH,
            targetPath: envVars.MIGRATION_TARGET_PATH || cwd,
          };
        }
      } catch {
        continue;
      }
    }
  }

  // Fallback to environment variables
  return {
    sourcePath: process.env.MIGRATION_SOURCE_PATH || "",
    targetPath: process.env.MIGRATION_TARGET_PATH || cwd,
  };
}
