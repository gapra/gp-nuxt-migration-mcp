import type { AnalysisResult } from "../types/index.js";

export interface PatternRule {
  name: string;
  description: string;
  pattern: RegExp;
  severity: "error" | "warning" | "info";
  suggestion: string;
}

export const VUE2_OPTIONS_API_PATTERNS: PatternRule[] = [
  {
    name: "options-api",
    description: "Vue 2 Options API detected",
    pattern:
      /export\s+default\s*\{[\s\S]*?(data\(\)|methods:|computed:|mounted\(\)|created\(\))/,
    severity: "error",
    suggestion: "Migrate to Composition API with <script setup>",
  },
  {
    name: "options-api-data",
    description: "Options API data() function detected",
    pattern: /data\s*\(\s*\)\s*\{/,
    severity: "error",
    suggestion: "Use ref() or reactive() from Vue 3",
  },
  {
    name: "options-api-methods",
    description: "Options API methods detected",
    pattern: /methods\s*:\s*\{/,
    severity: "error",
    suggestion: "Move methods to regular functions in <script setup>",
  },
  {
    name: "options-api-computed",
    description: "Options API computed detected",
    pattern: /computed\s*:\s*\{/,
    severity: "warning",
    suggestion: "Use computed() from Vue 3",
  },
  {
    name: "options-api-mounted",
    description: "Options API mounted hook detected",
    pattern: /mounted\s*\(\s*\)\s*\{/,
    severity: "warning",
    suggestion: "Use onMounted() from Vue 3",
  },
];

export const VUEX_PATTERNS: PatternRule[] = [
  {
    name: "vuex-store",
    description: "Vuex store detected",
    pattern: /export\s+default\s+new\s+\(?Vuex\.Store/,
    severity: "error",
    suggestion: "Migrate to Pinia store",
  },
  {
    name: "vuex-module",
    description: "Vuex module detected",
    pattern: /namespaced\s*:\s*true/,
    severity: "error",
    suggestion: "Use Pinia with separate stores",
  },
  {
    name: "vuex-state",
    description: "Vuex state property detected",
    pattern: /state\s*:\s*\{/,
    severity: "warning",
    suggestion: "Use Pinia state (no mutations needed)",
  },
  {
    name: "vuex-mutation",
    description: "Vuex mutation detected",
    pattern: /mutations\s*:\s*\{/,
    severity: "warning",
    suggestion: "Pinia does not need mutations",
  },
  {
    name: "this-store",
    description: "Vuex this.$store usage detected",
    pattern: /this\.\$store/,
    severity: "error",
    suggestion: "Use useStore() composable in Vue 3",
  },
  {
    name: "this-dispatch",
    description: "Vuex this.$dispatch detected",
    pattern: /this\.\$dispatch/,
    severity: "error",
    suggestion: "Use store actions directly in Vue 3",
  },
];

export const SCSS_PATTERNS: PatternRule[] = [
  {
    name: "scss-import",
    description: "SCSS import detected",
    pattern: /@import\s+['"]/,
    severity: "warning",
    suggestion: "Use Atomic CSS with design tokens",
  },
  {
    name: "scoped-style",
    description: "Scoped CSS style detected",
    pattern: /<style\s+[^>]*scoped/,
    severity: "warning",
    suggestion: "Use Atomic CSS classes instead",
  },
  {
    name: "sass-mixin",
    description: "SASS mixin detected",
    pattern: /@mixin\s+\w+/,
    severity: "warning",
    suggestion: "Extract to composable or utility function",
  },
];

export const RXJS_PATTERNS: PatternRule[] = [
  {
    name: "rxjs-observable",
    description: "RxJS Observable detected",
    pattern: /import\s+.*from\s+['"]rxjs['"]/,
    severity: "warning",
    suggestion: "Use async/await instead of RxJS",
  },
  {
    name: "observable-usage",
    description: "Observable usage detected",
    pattern: /\.pipe\s*\(\s*map\(|flatMap\(|mergeMap\(/,
    severity: "warning",
    suggestion: "Use async/await with try-catch",
  },
  {
    name: "subscribe-call",
    description: "RxJS subscribe() call detected",
    pattern: /\.subscribe\s*\(/,
    severity: "warning",
    suggestion: "Use async/await pattern",
  },
];

export const VUE_MIXIN_PATTERNS: PatternRule[] = [
  {
    name: "mixins-property",
    description: "Vue mixins detected",
    pattern: /mixins\s*:\s*\[/,
    severity: "error",
    suggestion: "Create composables instead",
  },
  {
    name: "mixin-import",
    description: "Mixin import detected",
    pattern: /import\s+.*Mixin\s+from/,
    severity: "error",
    suggestion: "Convert to composable",
  },
];

export const TRACKING_PATTERNS: PatternRule[] = [
  {
    name: "mixpanel-track",
    description: "Mixpanel track call detected",
    pattern: /(\$mixpanel|window\.mixpanel)\.track\s*\(/,
    severity: "info",
    suggestion: "Use useTracking() composable",
  },
  {
    name: "mixpanel-identify",
    description: "Mixpanel identify call detected",
    pattern: /(\$mixpanel|window\.mixpanel)\.identify\s*\(/,
    severity: "info",
    suggestion: "Use useTracking() composable",
  },
  {
    name: "gtag",
    description: "Google Analytics gtag detected",
    pattern: /gtag\s*\(/,
    severity: "info",
    suggestion: "Use useTracking() composable",
  },
  {
    name: "datalayer",
    description: "Google Tag Manager dataLayer detected",
    pattern: /dataLayer\.push\s*\(/,
    severity: "info",
    suggestion: "Use useTracking() composable",
  },
  {
    name: "analytics-track",
    description: "Generic analytics.track detected",
    pattern: /analytics\.track\s*\(/,
    severity: "info",
    suggestion: "Use useTracking() composable",
  },
];

export const FEATURE_FLAG_PATTERNS: PatternRule[] = [
  {
    name: "feature-flag-enabled",
    description: "Feature flag check detected",
    pattern: /(isFeatureEnabled|useFeatureEnabled|featureFlags\.)/,
    severity: "info",
    suggestion: "Use useFeatureFlag() composable",
  },
  {
    name: "launchdarkly",
    description: "LaunchDarkly SDK detected",
    pattern: /LDClient|launchdarkly/,
    severity: "info",
    suggestion: "Verify flag exists in target environment",
  },
];

export const ANY_TYPE_PATTERNS: PatternRule[] = [
  {
    name: "any-type",
    description: 'Using "any" type detected',
    pattern: /:\s*any\s*[=;,)]/,
    severity: "warning",
    suggestion: "Use proper TypeScript types",
  },
  {
    name: "as-any",
    description: "Casting to any detected",
    pattern: /\sas\s+any\b/,
    severity: "warning",
    suggestion: "Use proper TypeScript types",
  },
];

export const ALL_PATTERNS = [
  ...VUE2_OPTIONS_API_PATTERNS,
  ...VUEX_PATTERNS,
  ...SCSS_PATTERNS,
  ...RXJS_PATTERNS,
  ...VUE_MIXIN_PATTERNS,
  ...TRACKING_PATTERNS,
  ...FEATURE_FLAG_PATTERNS,
  ...ANY_TYPE_PATTERNS,
];

export function findPatterns(
  content: string,
  rules: PatternRule[],
): Omit<AnalysisResult, "file" | "line">[] {
  const results: Omit<AnalysisResult, "file" | "line">[] = [];
  const lines = content.split("\n");

  for (const rule of rules) {
    const matches = content.matchAll(rule.pattern);
    for (const match of matches) {
      const matchIndex = match.index || 0;
      const lineNumber = content.substring(0, matchIndex).split("\n").length;

      const lineContent = lines[lineNumber - 1] || "";

      results.push({
        pattern: rule.name,
        description: rule.description,
        severity: rule.severity,
        suggestion: rule.suggestion,
        code: lineContent.trim().substring(0, 100),
      });
    }
  }

  return results;
}
