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

export const ASYNC_DATA_PATTERNS: PatternRule[] = [
  {
    name: "async-data-hook",
    description: "Nuxt 2 asyncData() lifecycle hook detected",
    pattern: /asyncData\s*\(\s*(?:context|ctx)?\s*\)/,
    severity: "error",
    suggestion: "Replace with useAsyncData() or useFetch() in Nuxt 3/4",
  },
  {
    name: "fetch-hook",
    description: "Nuxt 2 fetch() lifecycle hook detected",
    pattern: /(?:^|\s)fetch\s*\(\s*\)\s*\{/m,
    severity: "error",
    suggestion: "Replace with useFetch() or useAsyncData() in Nuxt 3/4",
  },
  {
    name: "fetch-state",
    description: "Nuxt 2 $fetchState usage detected",
    pattern: /this\.\$fetchState/,
    severity: "error",
    suggestion: "Use useFetch() composable which returns { pending, error, refresh }",
  },
];

export const ESM_COMPAT_PATTERNS: PatternRule[] = [
  {
    name: "require-call",
    description: "CommonJS require() call detected",
    pattern: /\brequire\s*\(\s*['"]/,
    severity: "error",
    suggestion: "Use ESM import statements instead of require()",
  },
  {
    name: "module-exports",
    description: "CommonJS module.exports detected",
    pattern: /module\.exports\s*=/,
    severity: "error",
    suggestion: "Use ESM export default or named exports",
  },
  {
    name: "dirname-usage",
    description: "CommonJS __dirname detected",
    pattern: /__dirname/,
    severity: "warning",
    suggestion: "Use import.meta.url with fileURLToPath() for ESM equivalent",
  },
];

export const NUXT2_PLUGIN_PATTERNS: PatternRule[] = [
  {
    name: "nuxt2-plugin-inject",
    description: "Nuxt 2 plugin with inject pattern detected",
    pattern: /export\s+default\s*\(\s*\{[^}]*\}\s*,\s*inject\s*\)/,
    severity: "error",
    suggestion: "Use defineNuxtPlugin((nuxtApp) => { nuxtApp.provide(...) })",
  },
  {
    name: "nuxt2-plugin-context",
    description: "Nuxt 2 plugin with context argument detected",
    pattern: /export\s+default\s*\(\s*(?:context|ctx)\s*[,)]/,
    severity: "error",
    suggestion: "Use defineNuxtPlugin((nuxtApp) => { ... }) with useNuxtApp()",
  },
  {
    name: "nuxt2-route-middleware",
    description: "Nuxt 2 route middleware signature detected",
    pattern: /export\s+default\s+function\s*\(\s*\{[^}]*\}\s*\)/,
    severity: "warning",
    suggestion: "Use defineNuxtRouteMiddleware((to, from) => { ... })",
  },
];

export const TAILWIND_V3_PATTERNS: PatternRule[] = [
  {
    name: "tailwind-base-directive",
    description: "Tailwind CSS v3 @tailwind base directive detected",
    pattern: /@tailwind\s+base/,
    severity: "warning",
    suggestion: "Replace @tailwind base/components/utilities with @import 'tailwindcss'",
  },
  {
    name: "tailwind-utilities-directive",
    description: "Tailwind CSS v3 @tailwind utilities directive detected",
    pattern: /@tailwind\s+utilities/,
    severity: "warning",
    suggestion: "Replace with single @import 'tailwindcss'",
  },
  {
    name: "tailwind-config-exports",
    description: "Tailwind CSS v3 config file pattern detected",
    pattern: /module\.exports\s*=\s*\{[\s\S]*?content\s*:/,
    severity: "info",
    suggestion: "Tailwind v4 uses CSS config — tailwind.config.js is no longer needed",
  },
];

export const DEPRECATED_MODULES_PATTERNS: PatternRule[] = [
  {
    name: "nuxtjs-axios",
    description: "@nuxtjs/axios is deprecated in Nuxt 3/4",
    pattern: /@nuxtjs\/axios/,
    severity: "error",
    suggestion: "Replace with built-in $fetch or ofetch",
  },
  {
    name: "nuxtjs-auth",
    description: "@nuxtjs/auth is incompatible with Nuxt 3/4",
    pattern: /@nuxtjs\/auth(?:-next)?/,
    severity: "error",
    suggestion: "Replace with nuxt-auth-utils or sidebase/nuxt-auth",
  },
  {
    name: "nuxtjs-dotenv",
    description: "@nuxtjs/dotenv not needed in Nuxt 3/4",
    pattern: /@nuxtjs\/dotenv/,
    severity: "warning",
    suggestion: "Use built-in runtimeConfig in nuxt.config.ts",
  },
  {
    name: "nuxtjs-composition-api",
    description: "@nuxtjs/composition-api not needed in Vue 3",
    pattern: /@nuxtjs\/composition-api/,
    severity: "error",
    suggestion: "Composition API is built-in in Vue 3 — remove this package",
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
  ...ASYNC_DATA_PATTERNS,
  ...ESM_COMPAT_PATTERNS,
  ...NUXT2_PLUGIN_PATTERNS,
  ...TAILWIND_V3_PATTERNS,
  ...DEPRECATED_MODULES_PATTERNS,
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
