export interface MigrationConfig {
  sourcePath: string;
  targetPath: string;
  excludePatterns?: string[];
  includePatterns?: string[];
}

export interface AnalysisResult {
  file: string;
  line: number;
  pattern: string;
  description: string;
  severity: "error" | "warning" | "info";
  suggestion?: string;
  code?: string;
}

export interface MigrationReport {
  summary: {
    totalFiles: number;
    totalIssues: number;
    bySeverity: Record<string, number>;
    byPattern: Record<string, number>;
  };
  results: AnalysisResult[];
  recommendations: string[];
}

export interface TrackingFinding {
  type: "analytics" | "feature-flag";
  file: string;
  line: number;
  library: string;
  method: string;
  eventName?: string;
  flagKey?: string;
  code: string;
  suggestion?: string;
}

export interface TrackingReport {
  summary: {
    analyticsCalls: number;
    featureFlags: number;
    libraries: string[];
  };
  findings: TrackingFinding[];
  recommendations: string[];
}

export interface VuexStoreAnalysis {
  namespace: string;
  state: string[];
  mutations: string[];
  actions: string[];
  getters: string[];
  suggestions: string[];
}

export interface VuexMigrationReport {
  summary: {
    totalStores: number;
    totalModules: number;
  };
  stores: VuexStoreAnalysis[];
  recommendations: string[];
}

export interface MixinAnalysis {
  name: string;
  file: string;
  methods: string[];
  computed: string[];
  data: string[];
  suggestions: string[];
}

export interface ComposableMigrationReport {
  summary: {
    totalMixins: number;
  };
  mixins: MixinAnalysis[];
  recommendations: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolHandler {
  (args: Record<string, unknown>): Promise<unknown>;
}

export interface Nuxt4StructureReport {
  summary: {
    hasAppDirectory: boolean;
    misplacedCount: number;
  };
  misplaced: Array<{
    currentPath: string;
    suggestedPath: string;
    type: string;
  }>;
  recommendations: string[];
}

export interface EsmCompatReport {
  summary: {
    filesWithRequire: number;
    filesWithModuleExports: number;
    filesWithDirname: number;
    totalIssues: number;
  };
  files: Array<{
    path: string;
    issues: string[];
  }>;
  recommendations: string[];
}

export interface DeprecatedModulesReport {
  summary: {
    totalFound: number;
    criticalCount: number;
  };
  modules: Array<{
    name: string;
    severity: "error" | "warning" | "info";
    replacement: string;
  }>;
  recommendations: string[];
}
