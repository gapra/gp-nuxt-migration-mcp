import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { getTargetPath, getSourcePath } from "../core/config.js";

export interface GeneratorOptions {
  name: string;
  path?: string;
}

export interface StoreGeneratorOptions extends GeneratorOptions {
  stateProperties?: string[];
  actions?: string[];
  getters?: string[];
}

export interface ComposableGeneratorOptions extends GeneratorOptions {
  props?: string[];
  returnValues?: string[];
}

export interface ComponentGeneratorOptions extends GeneratorOptions {
  props?: string[];
  emits?: string[];
  hasStore?: boolean;
  storeName?: string;
}

export interface ApiGeneratorOptions extends GeneratorOptions {
  methods?: string[];
}

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function generatePiniaStore(options: StoreGeneratorOptions): string {
  const { name, stateProperties = [], actions = [], getters = [] } = options;
  const storeName = name.endsWith("Store") ? name : `${name}Store`;

  let stateCode = "";
  if (stateProperties.length > 0) {
    stateCode = stateProperties
      .map((prop) => `    ${prop}: null,`)
      .join("\n");
  } else {
    stateCode = "    // Add your state properties here";
  }

  let actionsCode = "";
  if (actions.length > 0) {
    actionsCode = actions
      .map((action) => `    async ${action}() {\n      // Implement ${action}\n    },`)
      .join("\n\n");
  } else {
    actionsCode = "    // Add your actions here";
  }

  let gettersCode = "";
  if (getters.length > 0) {
    gettersCode = getters
      .map((getter) => `    ${getter}: (state) => {\n      // Implement ${getter}\n      return state.${getter};\n    },`)
      .join("\n\n");
  } else {
    gettersCode = "    // Add your getters here";
  }

  return `import { defineStore } from 'pinia';

export const use${storeName} = defineStore('${name}', {
  state: () => ({
${stateCode}
  }),

  getters: {
${gettersCode}
  },

  actions: {
${actionsCode}
  },
});
`;
}

export function generateComposable(options: ComposableGeneratorOptions): string {
  const { name, props = [], returnValues = [] } = options;
  const composableName = name.startsWith("use") ? name : `use${name}`;

  const refsCode = props
    .map((prop) => `  const ${prop} = ref<any>(/* default value */);`)
    .join("\n");

  const returnCode = returnValues.length > 0
    ? returnValues.join(", ")
    : "/* return your values */";

  return `import { ref, computed, onMounted, onUnmounted } from 'vue';

export function ${composableName}() {
${refsCode}

  // Add your logic here

  const isLoading = ref(false);

  async function fetchData() {
    isLoading.value = true;
    try {
      // Add your API call here
    } finally {
      isLoading.value = false;
    }
  }

  onMounted(() => {
    // Add mount logic
  });

  onUnmounted(() => {
    // Add cleanup logic
  });

  return {
    ${returnCode}
  };
}
`;
}

export function generateVueComponent(options: ComponentGeneratorOptions): string {
  const { name, props = [], emits = [], hasStore = false, storeName } = options;
  const componentName = name.endsWith(".vue") ? name : `${name}.vue`;
  const componentNameOnly = componentName.replace(".vue", "");

  const propsCode = props.length > 0
    ? props.map((p) => `    ${p}: { required: false, default: null },`).join("\n")
    : "    // Add props here";

  const emitsCode = emits.length > 0
    ? emits.map((e) => `    '${e}'`).join(",\n")
    : "    // Add emits here";

  const storeImport = hasStore && storeName
    ? `import { use${storeName.replace("Store", "")}Store } from '@/stores/${storeName}';`
    : "";

  const storeSetup = hasStore && storeName
    ? `  const store = use${storeName.replace("Store", "")}Store();`
    : "";

  return `<script setup lang="ts">
import { ref, computed${hasStore ? ", onMounted" : "" } from 'vue';
${storeImport}

interface Props {
${propsCode}
}

const props = withDefaults(defineProps<Props>(), {
  // Add defaults here
});

const emit = defineEmits<{
${emitsCode}
}>();

${storeSetup}
const isLoading = ref(false);
const error = ref<string | null>(null);

// Add your reactive state here

// Add your computed properties here

// Add your methods here

function handleClick() {
  emit('click');
}
</script>

<template>
  <div class="${componentNameOnly.toLowerCase()}">
    <!-- Add your template here -->
    <slot />
  </div>
</template>

<style scoped>
.${componentNameOnly.toLowerCase()} {
  /* Add your styles here */
}
</style>
`;
}

export function generateApiFunction(options: ApiGeneratorOptions): string {
  const { name, methods = ["get", "post", "put", "delete"] } = options;
  const apiName = name.endsWith("Api") ? name : `${name}Api`;

  const methodsCode = methods
    .map((method) => {
      const methodUpper = method.toUpperCase();
      return `export async function ${method}${apiName}(data?: any) {
  const response = await fetch('/api/${name.toLowerCase()}', {
    method: '${methodUpper}',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.json();
}`;
    })
    .join("\n\n");

  return `// API functions for ${name}
${methodsCode}
`;
}

export function generateType(options: GeneratorOptions): string {
  const { name } = options;
  const typeName = name.endsWith("Type") ? name : `${name}Type`;

  return `export interface ${typeName} {
  id: string;
  // Add your properties here
}
`;
}

export interface WriteFileOptions {
  targetPath?: string;
  relativePath: string;
  module?: string;
  content: string;
}

export function writeFileToTarget(options: WriteFileOptions): { success: boolean; filePath: string; error?: string } {
  try {
    const basePath = options.targetPath || getTargetPath();
    
    if (!basePath) {
      return {
        success: false,
        filePath: "",
        error: "Target path not configured. Set MIGRATION_TARGET_PATH or use configure_migration tool."
      };
    }

    const modulePrefix = options.module ? `${options.module}/` : "";
    const fullRelativePath = modulePrefix + options.relativePath;
    const fullPath = join(basePath, fullRelativePath);
    const dir = dirname(fullPath);
    
    ensureDir(dir);
    writeFileSync(fullPath, options.content, "utf-8");
    
    return {
      success: true,
      filePath: fullPath
    };
  } catch (error) {
    return {
      success: false,
      filePath: "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export interface GenerateAndWriteOptions {
  type: "store" | "composable" | "component" | "api" | "type";
  name: string;
  relativePath: string;
  module?: string;
  targetPath?: string;
  options?: StoreGeneratorOptions | ComposableGeneratorOptions | ComponentGeneratorOptions | ApiGeneratorOptions;
}

export function generateAndWrite(options: GenerateAndWriteOptions): { success: boolean; filePath: string; content: string; error?: string } {
  const { type, name, relativePath, module, targetPath } = options;
  
  let content = "";
  
  switch (type) {
    case "store":
      content = generatePiniaStore(options.options as StoreGeneratorOptions || { name });
      break;
    case "composable":
      content = generateComposable(options.options as ComposableGeneratorOptions || { name });
      break;
    case "component":
      content = generateVueComponent(options.options as ComponentGeneratorOptions || { name });
      break;
    case "api":
      content = generateApiFunction(options.options as ApiGeneratorOptions || { name });
      break;
    case "type":
      content = generateType({ name });
      break;
  }

  const fullRelativePath = getFileExtension(type, relativePath, name);
  
  const modulePrefix = module ? `${module}/` : "";
  const finalRelativePath = fullRelativePath.includes("/") 
    ? `${modulePrefix}${fullRelativePath}`
    : fullRelativePath;

  const result = writeFileToTarget({
    relativePath: finalRelativePath,
    content,
    targetPath
  });

  return {
    ...result,
    content
  };
}

function getFileExtension(type: string, relativePath: string, name: string): string {
  if (relativePath.includes("/")) {
    return relativePath;
  }
  
  switch (type) {
    case "component":
      return relativePath.endsWith(".vue") ? relativePath : `${relativePath}.vue`;
    case "store":
      return relativePath.endsWith(".ts") ? relativePath : `${relativePath}.ts`;
    case "composable":
      return relativePath.endsWith(".ts") ? relativePath : `${relativePath}.ts`;
    case "api":
      return relativePath.endsWith(".ts") ? relativePath : `${relativePath}.ts`;
    case "type":
      return relativePath.endsWith(".ts") ? relativePath : `${relativePath}.ts`;
    default:
      return relativePath;
  }
}
