import { readFileSync } from "fs";
import { join } from "path";
import { getFiles } from "../core/analyzer.js";
import { getSourcePath } from "../core/config.js";
import type {
  ComposableMigrationReport,
  MixinAnalysis,
} from "../types/index.js";

const MIXIN_DEF_PATTERN = /mixins\s*:\s*\[([^\]]+)\]/g;
const MIXIN_IMPORT_PATTERN = /import\s+.*Mixin\s+from\s+['"]([^'"]+)['"]/g;
const OPTIONS_API_PATTERN =
  /export\s+default\s*\{[\s\S]*?(data\(\)|methods:|computed:)/g;

function extractMixinDetails(
  content: string,
  filePath: string,
): Partial<MixinAnalysis> {
  const result: Partial<MixinAnalysis> = {
    suggestions: [],
  };

  const dataMatch = content.match(/data\s*\(\s*\)\s*\{[\s\S]*?\}/g);
  if (dataMatch) {
    const props = dataMatch[0].match(/(\w+)\s*:/g) || [];
    result.data = props.map((p) => p.replace(":", "").trim());
  }

  const methodsMatch = content.match(/methods\s*:\s*\{[\s\S]*?\}/g);
  if (methodsMatch) {
    const methodProps = methodsMatch[0].match(/(\w+)\s*\(/g) || [];
    result.methods = methodProps.map((m) => m.replace("(", "").trim());
  }

  const computedMatch = content.match(/computed\s*:\s*\{[\s\S]*?\}/g);
  if (computedMatch) {
    const computedProps = computedMatch[0].match(/(\w+)\s*\(/g) || [];
    result.computed = computedProps.map((c) => c.replace("(", "").trim());
  }

  const isGlobalMixin =
    filePath.includes("mixins") && !filePath.includes("components");

  if (result.data && result.data.length > 0) {
    result.suggestions?.push(
      "Convert data to ref() or reactive() in composable",
    );
  }
  if (result.methods && result.methods.length > 0) {
    result.suggestions?.push(
      "Export methods as regular functions from composable",
    );
  }
  if (result.computed && result.computed.length > 0) {
    result.suggestions?.push("Convert computed to computed() from Vue 3");
  }
  if (isGlobalMixin) {
    result.suggestions?.push("Global mixin - consider moving to composable");
  }

  return result;
}

export interface AuditMixinsParams {
  module?: string;
}

export async function auditMixins(
  params?: AuditMixinsParams,
): Promise<ComposableMigrationReport> {
  const sourcePath = getSourcePath();

  if (!sourcePath) {
    throw new Error("MIGRATION_SOURCE_PATH not configured");
  }

  let files: string[];
  let searchBase = sourcePath;
  
  if (params?.module) {
    searchBase = join(sourcePath, "modules", params.module);
    files = getFiles(searchBase, [
      "**/assets/mixins/**/*.js",
      "**/mixins/**/*.js",
      "**/components/**/*Mixin.js",
    ]);
  } else {
    files = getFiles(sourcePath, [
      "**/assets/mixins/**/*.js",
      "**/mixins/**/*.js",
      "**/components/**/*Mixin.js",
    ]);
  }

  const mixins: MixinAnalysis[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const extracted = extractMixinDetails(content, file);

      const fileName = params?.module
        ? `${params.module}/${file.replace(searchBase, "").replace(/^\//, "")}`
        : file.replace(sourcePath, "").replace(/^\//, "");

      mixins.push({
        name: fileName,
        file: file,
        data: extracted.data || [],
        methods: extracted.methods || [],
        computed: extracted.computed || [],
        suggestions: extracted.suggestions || [],
      });
    } catch {
      // Skip
    }
  }

  const componentsWithMixins = getFiles(searchBase, ["**/*.vue"]);
  let componentsUsingMixins = 0;

  for (const file of componentsWithMixins) {
    try {
      const content = readFileSync(file, "utf-8");
      if (content.includes("mixins:")) {
        componentsUsingMixins++;
      }
    } catch {
      // Skip
    }
  }

  const recommendations: string[] = [];

  if (mixins.length > 0) {
    recommendations.push(
      `Found ${mixins.length} mixin files to convert to composables`,
    );
    if (componentsUsingMixins > 0) {
      recommendations.push(
        `${componentsUsingMixins} components using mixins need updates`,
      );
    }
    recommendations.push(
      "Create composables in composables/[domain]/ directory",
    );
    recommendations.push("Use Composition API with <script setup>");
  } else {
    recommendations.push("No mixins found - already migrated to composables?");
  }

  return {
    summary: {
      totalMixins: mixins.length,
    },
    mixins,
    recommendations,
  };
}

export async function auditMixinsInModule(
  modulePath: string,
): Promise<ComposableMigrationReport> {
  const sourcePath = getSourcePath();
  const fullPath = join(sourcePath, "assets", "mixins", modulePath);

  const files = getFiles(fullPath, ["**/*.js"]);
  const mixins: MixinAnalysis[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const extracted = extractMixinDetails(content, file);

      mixins.push({
        name: file.replace(fullPath, ""),
        file: file,
        data: extracted.data || [],
        methods: extracted.methods || [],
        computed: extracted.computed || [],
        suggestions: extracted.suggestions || [],
      });
    } catch {
      // Skip
    }
  }

  return {
    summary: {
      totalMixins: mixins.length,
    },
    mixins,
    recommendations:
      mixins.length > 0
        ? [`Convert ${mixins.length} mixins to composables`]
        : [],
  };
}
