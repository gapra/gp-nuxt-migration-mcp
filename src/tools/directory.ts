import { readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";
import { getTargetPath, getSourcePath } from "../core/config.js";

export interface DirectoryEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: DirectoryEntry[];
}

export interface ListTargetStructureParams {
  path?: string;
  depth?: number;
  targetPath?: string;
}

export function listTargetStructure(
  params?: ListTargetStructureParams,
): { success: boolean; structure?: DirectoryEntry[]; error?: string } {
  try {
    const basePath = params?.targetPath || getTargetPath();

    if (!basePath) {
      return {
        success: false,
        error: "Target path not configured. Set MIGRATION_TARGET_PATH or use configure_migration tool.",
      };
    }

    const targetPath = params?.path ? join(basePath, params.path) : basePath;
    const depth = params?.depth || 3;

    if (!existsSync(targetPath)) {
      return {
        success: false,
        error: `Path does not exist: ${targetPath}`,
      };
    }

    const structure = readDirectory(targetPath, depth, basePath);

    return {
      success: true,
      structure,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function readDirectory(
  dirPath: string,
  depth: number,
  basePath: string,
  currentDepth: number = 0,
): DirectoryEntry[] {
  if (currentDepth >= depth) {
    return [];
  }

  const entries = readdirSync(dirPath);
  const result: DirectoryEntry[] = [];

  for (const entry of entries) {
    if (entry.startsWith(".") || entry === "node_modules") {
      continue;
    }

    const fullPath = join(dirPath, entry);
    const relativePath = relative(basePath, fullPath);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      const children = readDirectory(
        fullPath,
        depth,
        basePath,
        currentDepth + 1,
      );
      result.push({
        name: entry,
        path: relativePath,
        type: "directory",
        children: children.length > 0 ? children : undefined,
      });
    } else {
      result.push({
        name: entry,
        path: relativePath,
        type: "file",
      });
    }
  }

  return result.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === "directory" ? -1 : 1;
  });
}

export interface SourceTargetMapping {
  sourcePattern: string;
  targetPattern: string;
  type: "store" | "composable" | "component" | "api" | "type" | "page";
}

export const DEFAULT_MAPPINGS: SourceTargetMapping[] = [
  {
    sourcePattern: "store/modules/*",
    targetPattern: "stores/*.ts",
    type: "store",
  },
  {
    sourcePattern: "store/index.js",
    targetPattern: "stores/index.ts",
    type: "store",
  },
  {
    sourcePattern: "assets/mixins/*",
    targetPattern: "composables/*.ts",
    type: "composable",
  },
  {
    sourcePattern: "mixins/*",
    targetPattern: "composables/*.ts",
    type: "composable",
  },
  {
    sourcePattern: "components/**/*",
    targetPattern: "components/*.vue",
    type: "component",
  },
  {
    sourcePattern: "pages/**/*",
    targetPattern: "pages/*.vue",
    type: "page",
  },
  {
    sourcePattern: "api/*",
    targetPattern: "api/*.ts",
    type: "api",
  },
  {
    sourcePattern: "types/*",
    targetPattern: "types/*.ts",
    type: "type",
  },
];

export interface GenerateFromAuditParams {
  module?: string;
  type?: "store" | "composable" | "component" | "api" | "type" | "all";
  mapping?: SourceTargetMapping[];
  targetPath?: string;
}

export interface GeneratedFile {
  sourceFile: string;
  targetFile: string;
  type: string;
  content: string;
}

export function generateFromAudit(
  params?: GenerateFromAuditParams,
): {
  success: boolean;
  generated: GeneratedFile[];
  error?: string;
} {
  try {
    const sourcePath = getSourcePath();
    const targetPath = params?.targetPath || getTargetPath();

    if (!sourcePath) {
      return {
        success: false,
        generated: [],
        error: "Source path not configured",
      };
    }

    if (!targetPath) {
      return {
        success: false,
        generated: [],
        error: "Target path not configured",
      };
    }

    const mappings = params?.mapping || DEFAULT_MAPPINGS;
    const generated: GeneratedFile[] = [];

    for (const mapping of mappings) {
      if (params?.type && params.type !== "all" && mapping.type !== params.type) {
        continue;
      }

      if (params?.module) {
        const sourceDir = join(sourcePath, "modules", params.module);
        if (existsSync(sourceDir)) {
          const targetDir = join(targetPath, "modules", params.module);
          const files = scanForFiles(sourceDir, mapping.sourcePattern);
          
          for (const file of files) {
            const targetFile = file.source
              .replace(sourceDir, targetDir)
              .replace(/\.js$/, ".ts")
              .replace(mapping.sourcePattern, mapping.targetPattern);

            generated.push({
              sourceFile: file.source,
              targetFile,
              type: mapping.type,
              content: generateTemplate(mapping.type, file.name),
            });
          }
        }
      } else {
        const sourceDir = join(sourcePath);
        const files = scanForFiles(sourceDir, mapping.sourcePattern);

        for (const file of files) {
          const targetFile = file.source
            .replace(sourcePath, targetPath)
            .replace(/\.js$/, ".ts")
            .replace(mapping.sourcePattern, mapping.targetPattern);

          generated.push({
            sourceFile: file.source,
            targetFile,
            type: mapping.type,
            content: generateTemplate(mapping.type, file.name),
          });
        }
      }
    }

    return {
      success: true,
      generated,
    };
  } catch (error) {
    return {
      success: false,
      generated: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

interface ScannedFile {
  source: string;
  name: string;
}

function scanForFiles(basePath: string, pattern: string): ScannedFile[] {
  const results: ScannedFile[] = [];

  try {
    const patternParts = pattern.split("/");
    const wildcardIndex = patternParts.findIndex((p) => p === "*");

    if (wildcardIndex === -1) {
      const fullPath = join(basePath, pattern);
      if (existsSync(fullPath)) {
        results.push({
          source: fullPath,
          name: pattern.split("/").pop() || "",
        });
      }
    } else {
      const searchDir = join(
        basePath,
        ...patternParts.slice(0, wildcardIndex),
      );
      const filePattern = patternParts[patternParts.length - 1];

      if (existsSync(searchDir)) {
        const files = readdirSync(searchDir);
        for (const file of files) {
          if (file.match(new RegExp(filePattern.replace("*", ".*")))) {
            results.push({
              source: join(searchDir, file),
              name: file.replace(/\.js$/, ""),
            });
          }
        }
      }
    }
  } catch {
    // Skip errors
  }

  return results;
}

function generateTemplate(
  type: string,
  name: string,
): string {
  const baseName = name.replace(/\.(js|ts|vue)$/, "");

  switch (type) {
    case "store":
      return generatePiniaTemplate(baseName);
    case "composable":
      return generateComposableTemplate(baseName);
    case "component":
      return generateComponentTemplate(baseName);
    case "api":
      return generateApiTemplate(baseName);
    case "type":
      return generateTypeTemplate(baseName);
    default:
      return "";
  }
}

function generatePiniaTemplate(name: string): string {
  const storeName = name.endsWith("Store") ? name : `${name}Store`;
  return `import { defineStore } from 'pinia';

export const use${storeName} = defineStore('${name}', {
  state: () => ({
    // Add your state properties here
  }),

  getters: {
    // Add your getters here
  },

  actions: {
    // Add your actions here
  },
});
`;
}

function generateComposableTemplate(name: string): string {
  const composableName = name.startsWith("use") ? name : `use${name}`;
  return `import { ref, computed, onMounted, onUnmounted } from 'vue';

export function ${composableName}() {
  const isLoading = ref(false);

  // Add your reactive state here

  // Add your computed properties here

  // Add your methods here

  onMounted(() => {
    // Add mount logic
  });

  onUnmounted(() => {
    // Add cleanup logic
  });

  return {
    // Add your return values here
  };
}
`;
}

function generateComponentTemplate(name: string): string {
  return `<script setup lang="ts">
import { ref, computed } from 'vue';

// Add your props
const props = defineProps<{
  // Add props here
}>();

// Add your emits
const emit = defineEmits<{
  (e: 'click', value: any): void;
}>();

// Add your reactive state

// Add your computed properties

// Add your methods
</script>

<template>
  <div class="${name.toLowerCase()}">
    <!-- Add your template here -->
    <slot />
  </div>
</template>

<style scoped>
.${name.toLowerCase()} {
  /* Add your styles here */
}
</style>
`;
}

function generateApiTemplate(name: string): string {
  const upper = name.charAt(0).toUpperCase() + name.slice(1);
  const lower = name.toLowerCase();
  return `// API functions for ${name}
// Uses Nuxt 3/4 built-in $fetch (auto-imported)
export async function get${upper}() {
  return $fetch('/api/${lower}');
}

export async function create${upper}(data: any) {
  return $fetch('/api/${lower}', {
    method: 'POST',
    body: data,
  });
}

export async function update${upper}(id: string, data: any) {
  return $fetch(\`/api/${lower}/\${id}\`, {
    method: 'PUT',
    body: data,
  });
}

export async function delete${upper}(id: string) {
  return $fetch(\`/api/${lower}/\${id}\`, {
    method: 'DELETE',
  });
}
`;
}

function generateTypeTemplate(name: string): string {
  const typeName = name.endsWith("Type") ? name : `${name}Type`;
  return `export interface ${typeName} {
  id: string;
  // Add your properties here
}
`;
}
