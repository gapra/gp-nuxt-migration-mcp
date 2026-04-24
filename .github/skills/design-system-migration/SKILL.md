---
name: design-system-migration
description: Systematic workflow for migrating custom components and styling to target codebase's design system with auto-detection and token-based theming
---

# Design System Migration Skill

**Purpose**: Migrate custom UI components and manual styling to detected design system in target codebase

**Used by**: @design-system-migrator agent

**Domain**: Design systems, UI/UX consistency, design tokens, component libraries

---

## Overview

This skill enables systematic transformation of custom-styled components into design system components with token-based theming. It **auto-detects** the design system used in the target codebase (Material UI, Ant Design, Element Plus, Vuetify, Chakra UI, Quasar, etc.) and adapts the migration strategy accordingly.

## Core Principle

**Auto-Detect → Discover → Map → Transform → Validate**

```
0. AUTO-DETECT: Identify design system from target codebase
1. DISCOVER: Identify custom components and styling
2. MAP: Find design system component equivalents
3. TRANSFORM: Replace with design system components and tokens
4. VALIDATE: Ensure functionality and accessibility preserved
```

---

## Workflow 0: Design System Auto-Detection

### Step 1: Read Target Codebase Dependencies

```typescript
// Read package.json from target codebase
const packageJsonPath = 'package.json';
const packageJson = JSON.parse(await readFile(packageJsonPath));
const allDeps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies
};
```

### Step 2: Detect Design System Library

```typescript
const designSystemDetectors = {
  'element-plus': {
    name: 'Element Plus',
    framework: 'Vue 3',
    componentPrefix: 'El',
    example: 'ElButton, ElInput, ElCard'
  },
  'vuetify': {
    name: 'Vuetify',
    framework: 'Vue 2/3',
    componentPrefix: 'V',
    example: 'VBtn, VTextField, VCard'
  },
  'ant-design-vue': {
    name: 'Ant Design Vue',
    framework: 'Vue 3',
    componentPrefix: 'A',
    example: 'AButton, AInput, ACard'
  },
  '@mui/material': {
    name: 'Material UI',
    framework: 'React',
    componentPrefix: 'Mui',
    example: 'Button, TextField, Card'
  },
  '@chakra-ui/vue': {
    name: 'Chakra UI',
    framework: 'Vue 3',
    componentPrefix: 'C',
    example: 'CButton, CInput, CBox'
  },
  'quasar': {
    name: 'Quasar',
    framework: 'Vue 3',
    componentPrefix: 'Q',
    example: 'QBtn, QInput, QCard'
  },
  'tailwindcss': {
    name: 'Tailwind CSS',
    framework: 'Agnostic',
    componentPrefix: null,       // utility-class based, no component prefix
    approach: 'utility-classes', // classes applied directly to HTML elements
    example: 'bg-primary text-white px-4 py-2 rounded-lg'
  }
};

// Detect which design system is installed
function detectDesignSystem(dependencies) {
  for (const [pkg, info] of Object.entries(designSystemDetectors)) {
    if (dependencies[pkg]) {
      return {
        package: pkg,
        version: dependencies[pkg],
        ...info
      };
    }
  }
  
  return null; // No design system detected
}

const dsInfo = detectDesignSystem(allDeps);
/*
Example output:
{
  package: 'element-plus',
  version: '^2.4.0',
  name: 'Element Plus',
  framework: 'Vue 3',
  componentPrefix: 'El',
  example: 'ElButton, ElInput, ElCard'
}
*/
```

### Step 3: Scan for Design Token Files

```typescript
const commonTokenLocations = [
  'src/styles/tokens.ts',
  'src/styles/tokens.js',
  'src/theme/tokens.ts',
  'src/theme/index.ts',
  'src/theme/variables.ts',
  'src/assets/styles/variables.scss',
  'src/assets/styles/_variables.scss',
  'tailwind.config.js',
  'tailwind.config.ts',
  'tokens.json',
  'theme.config.ts'
];

// Try to find token files
const tokenFiles = [];
for (const path of commonTokenLocations) {
  if (await fileExists(path)) {
    tokenFiles.push(path);
  }
}

// Parse token file
const tokens = await parseTokenFile(tokenFiles[0]);
```

### Step 4: Build Component Catalog

```typescript
// Scan for existing component imports in target codebase
const componentImports = await scanImports(dsInfo.package);

/*
Example for Element Plus:
import { ElButton, ElInput } from 'element-plus'
import { ElCard } from 'element-plus'

Extracted catalog:
[
  { name: 'ElButton', from: 'element-plus' },
  { name: 'ElInput', from: 'element-plus' },
  { name: 'ElCard', from: 'element-plus' }
]
*/

// Read type definitions for API specs
const typeDefPath = `node_modules/${dsInfo.package}/dist/*.d.ts`;
const componentAPIs = await parseTypeDefinitions(typeDefPath);
```

---

## Workflow 1: Component Migration

### Step 1: Discover Custom Components

**Scan for Custom UI Components**:
```typescript
// Find .vue files with custom styling
const customComponents = await findComponents({
  patterns: [
    '*.vue with <style>',
    'components with className',
    'inline style attributes'
  ]
});

// Categorize by type
const categories = {
  buttons: [], // Click targets
  inputs: [],  // Form controls
  cards: [],   // Content containers
  modals: [],  // Overlays
  layouts: [], // Page structure
  feedback: [] // Alerts, toasts, notifications
};
```

**Extract Component Metadata**:
```typescript
interface CustomComponent {
  path: string;
  name: string;
  type: 'button' | 'input' | 'card' | 'modal' | 'layout' | 'feedback';
  props: Prop[];
  styling: {
    colors: string[];      // Hardcoded colors
    spacing: string[];     // Manual spacing
    typography: string[];  // Font properties
    borders: string[];     // Border styles
    shadows: string[];     // Box shadows
  };
  complexity: 'low' | 'medium' | 'high';
}
```

### Step 2: Fetch Design System Component Catalog

**Read from Target Codebase**:
```typescript
// Based on detected design system, scan for components
const dsInfo = detectDesignSystem(); // from Workflow 0

// Method 1: Parse type definitions
const typeDefPath = `node_modules/${dsInfo.package}/dist/index.d.ts`;
const componentTypes = await parseTypeDefinitions(typeDefPath);

// Method 2: Scan existing usage
const usedComponents = await grepSearch({
  pattern: `import.*from '${dsInfo.package}'`,
  files: 'target/**/*.vue'
});

// Method 3: Read documentation (if available)
const docsPath = `node_modules/${dsInfo.package}/README.md`;
const componentList = await extractComponentsFromDocs(docsPath);

// Build unified catalog
const catalog = buildCatalog({
  types: componentTypes,
  usage: usedComponents,
  docs: componentList
});

// Special case: Tailwind CSS — no component imports, detect via class usage
// Instead of component catalog, read tailwind.config.js for custom tokens
if (dsInfo?.name === 'Tailwind CSS') {
  const tailwindConfig = await readFile('tailwind.config.js');
  const customTokens = parseTailwindTheme(tailwindConfig);
  // Strategy: replace inline styles/SCSS with Tailwind utility classes
}
```

**Get Component Specifications**:
```typescript
// For Element Plus example
const buttonSpec = await getComponentSpec('ElButton', dsInfo);

/*
Example response (parsed from types):
{
  name: 'ElButton',
  props: {
    type: {
      type: 'string',
      default: 'default',
      values: ['default', 'primary', 'success', 'warning', 'danger', 'info']
    },
    size: {
      type: 'string',
      default: 'default',
      values: ['large', 'default', 'small']
    },
    disabled: { type: 'boolean', default: false },
    loading: { type: 'boolean', default: false },
    icon: { type: 'string | Component' }
  },
  events: ['click'],
  slots: ['default', 'icon']
}
*/

// For Vuetify example
const btnSpec = await getComponentSpec('VBtn', dsInfo);
/*
{
  name: 'VBtn',
  props: {
    color: { type: 'string', default: undefined },
    variant: { values: ['elevated', 'flat', 'tonal', 'outlined', 'text', 'plain'] },
    size: { values: ['x-small', 'small', 'default', 'large', 'x-large'] },
    disabled: { type: 'boolean' },
    loading: { type: 'boolean' }
  }
}
*/
```

### Step 3: Map Custom to Design System

**Component Mapping Algorithm**:
```typescript
function mapToDesignSystemComponent(customComponent, dsInfo) {
  // 1. Match by semantic purpose
  const purposeMatch = matchByPurpose(customComponent, dsInfo);
  
  // 2. Match by visual characteristics
  const visualMatch = matchByVisualProperties(customComponent.styling, dsInfo);
  
  // 3. Match by behavior
  const behaviorMatch = matchByInteraction(customComponent, dsInfo);
  
  // 4. Calculate confidence
  const confidence = calculateMappingConfidence([
    purpose Match,
    visualMatch,
    behaviorMatch
  ]);
  
  return {
    dsComponent: purposeMatch.component,
    variantMapping: visualMatch.variant,
    propMapping: mapProps(customComponent.props, purposeMatch.props),
    confidence
  };
}
```

**Example Mappings for Different Design Systems**:
```typescript
// Element Plus
const elementPlusMappings = {
  CustomButton: {
    component: 'ElButton',
    variantMap: {
      'btn-primary': 'primary',
      'btn-secondary': 'default',
      'btn-danger': 'danger',
      'btn-ghost': 'text'
    },
    sizeMap: {
      small: 'small',
      medium: 'default',
      large: 'large'
    }
  }
};

// Vuetify
const vuetifyMappings = {
  CustomButton: {
    component: 'VBtn',
    variantMap: {
      'btn-primary': { color: 'primary', variant: 'elevated' },
      'btn-secondary': { color: 'secondary', variant: 'elevated' },
      'btn-ghost': { variant: 'text' }
    },
    sizeMap: {
      small: 'small',
      medium: 'default',
      large: 'large'
    }
  }
};

// Ant Design Vue
const antDesignMappings = {
  CustomButton: {
    component: 'AButton',
    variantMap: {
      'btn-primary': 'primary',
      'btn-secondary': 'default',
      'btn-danger': 'danger',
      'btn-ghost': 'ghost'
    },
    sizeMap: {
      small: 'small',
      medium: 'middle',
      large: 'large'
    }
  }
};

// Select appropriate mapping based on detected design system
const mappings = selectMappingStrategy(dsInfo);
```

### Step 4: Transform Component

**Transformation Template** (adapts based on detected design system):
```vue
<!-- BEFORE: CustomButton.vue -->
<template>
  <button 
    :class="buttonClasses"
    :disabled="disabled"
    @click="handleClick"
  >
    <span v-if="loading" class="spinner"></span>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium'
});

const emit = defineEmits<{ click: [] }>();

const buttonClasses = computed(() => ({
  'btn': true,
  [`btn-${props.variant}`]: true,
  [`btn-${props.size}`]: true
}));
</script>

<style scoped>
.btn {
  padding: 12px 24px;
  border-radius: 8px;
  background: #007bff;
  color: white;
}
</style>

<!-- AFTER: Element Plus Example -->
<template>
  <ElButton
    :type="elementVariant"
    :size="elementSize"
    :disabled="disabled"
    :loading="loading"
    @click="handleClick"
  >
    <slot />
  </ElButton>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElButton } from 'element-plus';

// Same props interface - maintain API compatibility
const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium'
});

const emit = defineEmits<{ click: [] }>();

// Map to Element Plus props
const elementVariant = computed(() => {
  const map = {
    primary: 'primary',
    secondary: 'default',
    outline: 'text'
  };
  return map[props.variant] || 'default';
});

const elementSize = computed(() => {
  const map = {
    small: 'small',
    medium: 'default',
    large: 'large'
  };
  return map[props.size] || 'default';
});

const handleClick = () => emit('click');
</script>

<!-- No custom styles - design system handles it -->

<!-- AFTER: Vuetify Example -->
<template>
  <VBtn
    :color="vuetifyColor"
    :variant="vuetifyVariant"
    :size="vuetifySize"
    :disabled="disabled"
    :loading="loading"
    @click="handleClick"
  >
    <slot />
  </VBtn>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VBtn } from 'vuetify/components';

const vuetifyColor = computed(() => {
  const map = {
    primary: 'primary',
    secondary: 'secondary',
    outline: undefined
  };
  return map[props.variant];
});

const vuetifyVariant = computed(() => {
  const map = {
    primary: 'elevated',
    secondary: 'elevated',
    outline: 'outlined'
  };
  return map[props.variant] || 'elevated';
});

const vuetifySize = computed(() => {
  const map = {
    small: 'small',
    medium: 'default',
    large: 'large'
  };
  return map[props.size] || 'default';
});
</script>

<!-- AFTER: Ant Design Vue Example -->
<template>
  <AButton
    :type="antType"
    :size="antSize"
    :disabled="disabled"
    :loading="loading"
    @click="handleClick"
  >
    <slot />
  </AButton>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Button as AButton } from 'ant-design-vue';

const antType = computed(() => {
  const map = {
    primary: 'primary',
    secondary: 'default',
    outline: 'ghost'
  };
  return map[props.variant] || 'default';
});

const antSize = computed(() => {
  const map = {
    small: 'small',
    medium: 'middle',
    large: 'large'
  };
  return map[props.size] || 'middle';
});
</script>
```

### Step 5: Confidence Scoring

```typescript
function calculateComponentMigrationConfidence(
  customComponent: CustomComponent,
  dsComponent: DSComponent
): number {
  let confidence = 0.90; // Base confidence
  
  // Reduce for complexity
  if (customComponent.complexity === 'high') confidence -= 0.15;
  if (customComponent.complexity === 'medium') confidence -= 0.05;
  
  // Reduce for prop mismatches
  const unmappableProps = findUnmappableProps(
    customComponent.props,
    dsComponent.props
  );
  confidence -= unmappableProps.length * 0.05;
  
  // Reduce for custom styling that can't be replicated
  if (hasCustomAnimations(customComponent)) confidence -= 0.10;
  if (hasComplexLayouts(customComponent)) confidence -= 0.08;
  
  // Reduce if slots don't match
  if (!slotsCompatible(customComponent, dsComponent)) confidence -= 0.10;
  
  // Increase for perfect matches
  if (isExactMatch(customComponent, dsComponent)) confidence = 0.95;
  
  return Math.max(0.60, confidence);
}
```

---

## Workflow 2: Design Token Migration

### Step 1: Fetch Design Tokens

```typescript
// Auto-detect token format and location
const dsInfo = detectDesignSystem(); // from Workflow 0

// Method 1: CSS Variables (most common)
const cssVars = await scanCSSVariables('src/styles/*.css');
/*
Example:
:root {
  --color-primary: #007bff;
  --spacing-md: 16px;
  --font-size-base: 16px;
}
*/

// Method 2: SCSS Variables
const scssVars = await parseSCSSVariables('src/styles/_variables.scss');
/*
Example:
$color-primary: #007bff;
$spacing-md: 16px;
$font-size-base: 16px;
*/

// Method 3: JavaScript/TypeScript Objects
const jsTokens = await parseJSTokens('src/theme/tokens.ts');
/*
Example:
export const tokens = {
  colors: { primary: '#007bff' },
  spacing: { md: '16px' },
  typography: { fontSize: { base: '16px' } }
};
*/

// Method 4: Tailwind Config
const tailwindTokens = await parseTailwindConfig('tailwind.config.js');
/*
Example:
module.exports = {
  theme: {
    extend: {
      colors: { primary: '#007bff' },
      spacing: { md: '1rem' }
    }
  }
};
*/

// Method 5: Design System's Built-in Tokens (if available)
const builtInTokens = await getDesignSystemTokens(dsInfo);
/*
Element Plus example:
import { ElConfigProvider } from 'element-plus'
// Token access via CSS variables: var(--el-color-primary)

Vuetify example:
import { useTheme } from 'vuetify'
const theme = useTheme()
// Token access: theme.current.value.colors.primary
*/

// Unify token structure
const tokens = unifyTokenStructure({
  css: cssVars,
  scss: scssVars,
  js: jsTokens,
  tailwind: tailwindTokens,
  builtIn: built InTokens
});

/*
Unified structure:
{
  colors: {
    primary: { value: '#007bff', var: '--color-primary' or '--el-color-primary' },
    secondary: { value: '#6c757d', var: '--color-secondary' },
    error: { value: '#dc3545', var: '--color-error' }
  },
  spacing: {
    xs: { value: '4px', var: '--spacing-xs' },
    sm: { value: '8px', var: '--spacing-sm' },
    md: { value: '16px', var: '--spacing-md' }
  },
  typography: {
    fontSize: {
      sm: { value: '14px', var: '--font-size-sm' },
      base: { value: '16px', var: '--font-size-base' }
    }
  }
}
*/
```

### Step 2: Extract Hardcoded Values

**Scan Component Styling**:
```typescript
function extractHardcodedValues(component: string): HardcodedValues {
  return {
    colors: extractColors(component),      // #007bff, rgb(255, 0, 0)
    spacing: extractSpacing(component),    // margin: 16px
    typography: extractTypography(component), // font-size: 14px
    shadows: extractShadows(component),    // box-shadow: ...
    radii: extractBorderRadius(component)  // border-radius: 8px
  };
}

// Example extraction
const hardcoded = {
  colors: [
    { value: '#007bff', usage: 'background-color', line: 45 },
    { value: '#ffffff', usage: 'color', line: 46 },
    { value: 'rgba(0, 0, 0, 0.1)', usage: 'box-shadow', line: 52 }
  ],
  spacing: [
    { value: '16px', usage: 'padding', line: 48 },
    { value: '24px', usage: 'margin', line: 49 }
  ]
};
```

### Step 3: Map to Design Tokens

**Color Mapping**:
```typescript
function mapColorToToken(hardcodedColor: string, tokens: DesignTokens): TokenMatch {
  // Exact match
  const exactMatch = findExactColorMatch(hardcodedColor, tokens.colors);
  if (exactMatch) {
    return { token: exactMatch, confidence: 1.0 };
  }
  
  // Closest match by color distance
  const closestMatch = findClosestColor(hardcodedColor, tokens.colors);
  const distance = calculateColorDistance(hardcodedColor, closestMatch.value);
  const confidence = 1.0 - (distance / 100); // Normalize
  
  return {
    token: closestMatch.path, // 'colors.primary.base'
    confidence: Math.max(0.7, confidence)
  };
}

// Example mappings
const colorMappings = {
  '#007bff': 'colors.primary.base',
  '#ffffff': 'colors.neutral.white',
  'rgb(220, 53, 69)': 'colors.error.base',
  'rgba(0, 0, 0, 0.1)': 'colors.neutral.900 with opacity'
};
```

**Spacing Mapping**:
```typescript
function mapSpacingToToken(hardcodedValue: string, tokens: DesignTokens): TokenMatch {
  const pxValue = parsePxValue(hardcodedValue); // "16px" → 16
  
  // Find closest spacing token
  const spacingTokens = tokens.spacing;
  const closest = Object.entries(spacingTokens)
    .map(([key, value]) => ({
      key,
      value: parsePxValue(value),
      diff: Math.abs(pxValue - parsePxValue(value))
    }))
    .sort((a, b) => a.diff - b.diff)[0];
  
  // Exact match = high confidence
  const confidence = closest.diff === 0 ? 1.0 : 0.85;
  
  return {
    token: `spacing.${closest.key}`,
    confidence
  };
}

// Example mappings
const spacingMappings = {
  '4px': 'spacing.xs',
  '8px': 'spacing.sm',
  '16px': 'spacing.md',
  '24px': 'spacing.lg',
  '32px': 'spacing.xl'
};
```

### Step 4: Replace with Token References

**CSS Variable Approach** (most common):
```vue
<!-- BEFORE: Hardcoded values -->
<style scoped>
.custom-card {
  background: #ffffff;
  color: #1a1a1a;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  font-weight: 600;
}
</style>

<!-- AFTER: Generic CSS variable tokens -->
<style scoped>
.custom-card {
  background: var(--color-neutral-white);
  color: var(--color-neutral-900);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
</style>

<!-- OR: Element Plus tokens -->
<style scoped>
.custom-card {
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  padding: var(--el-spacing-medium) var(--el-spacing-large);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-light);
  font-size: var(--el-font-size-base);
}
</style>

<!-- OR: Vuetify theme (via composable) -->
<script setup>
import { useTheme } from 'vuetify';
const theme = useTheme();

const cardStyles = computed(() => ({
  background: theme.current.value.colors.surface,
  color: theme.current.value.colors.onSurface,
  padding: '16px 24px' // Vuetify uses utility classes primarily
}));
</script>

<!-- OR: Tailwind utilities (if using Tailwind) -->
<div class="bg-white text-gray-900 p-4 px-6 rounded-lg shadow-md text-sm font-semibold">
  Content
</div>
```

---

## Workflow 3: Accessibility Validation

### Step 1: Check WCAG Compliance

```typescript
function validateAccessibility(component: Component): A11yIssues {
  const issues: A11yIssue[] = [];
  
  // Color contrast
  const contrastIssues = checkColorContrast(component);
  if (contrastIssues.length > 0) {
    issues.push(...contrastIssues);
  }
  
  // ARIA attributes
  if (!hasRequiredARIA(component)) {
    issues.push({
      severity: 'error',
      message: 'Missing required ARIA attributes',
      fix: 'Add aria-label or aria-labelledby'
    });
  }
  
  // Keyboard navigation
  if (!isKeyboardAccessible(component)) {
    issues.push({
      severity: 'error',
      message: 'Component not keyboard accessible',
      fix: 'Add tabindex and keyboard event handlers'
    });
  }
  
  // Focus indicators
  if (!hasFocusIndicator(component)) {
    issues.push({
      severity: 'warning',
      message: 'No visible focus indicator',
      fix: 'Add :focus-visible styles'
    });
  }
  
  return issues;
}
```

### Step 2: Ensure Design System Component Handles A11y

```typescript
// Design system components are pre-built with accessibility
// Verify they're used correctly

function verifyDSA11y(component: Component, dsSpec: DSSpec): boolean {
  // Check required props for a11y
  if (dsSpec.accessibility.ariaLabel === 'required') {
    if (!component.props.ariaLabel && !component.props['aria-label']) {
      return false; // Missing required a11y prop
    }
  }
  
  // Check role is correct
  if (dsSpec.accessibility.role) {
    // Design system handles role internally, just verify usage is semantic
  }
  
  return true;
}
```

---

## Quality Checklist

Before proposing design system migration:

```markdown
✅ Design system component exists for this use case
✅ All custom props mappable to design system component props
✅ Design tokens used (no hardcoded values)
✅ Color contrast meets WCAG 2.1 AA (4.5:1 text, 3:1 UI)
✅ Component is keyboard accessible
✅ ARIA attributes present where required
✅ Focus indicators visible
✅ Responsive behavior preserved
✅ Animation/transitions smooth
✅ Original functionality intact
✅ No visual regressions
```

---

## Common Patterns

Component mappings adapt based on detected design system:

### Pattern 1: Button Migration
```
Custom → Element Plus:
- CustomButton → ElButton (type: primary|success|warning|danger)
- PrimaryButton → ElButton type="primary"
- DangerButton → ElButton type="danger"
- LinkButton → ElButton type="text" link

Custom → Vuetify:
- CustomButton → VBtn (color: primary|secondary, variant: elevated|outlined)
- PrimaryButton → VBtn color="primary"
- DangerButton → VBtn color="error"
- LinkButton → VBtn variant="plain"

Custom → Ant Design Vue:
- CustomButton → AButton (type: primary|default|dashed|text|link)
- PrimaryButton → AButton type="primary"
- DangerButton → AButton danger
- LinkButton → AButton type="link"

Custom → Tailwind CSS (utility classes, no component swap):
- CustomButton → <button class="bg-primary text-white px-4 py-2 rounded font-semibold hover:bg-primary/90">
- PrimaryButton → class="bg-blue-600 text-white ..."
- DangerButton → class="bg-red-600 text-white ..."
- LinkButton → class="text-blue-600 underline hover:text-blue-800"
```

### Pattern 2: Form Controls
```
Custom → Design System (generic mapping):
- TextInput → {DS}Input type="text"
- EmailInput → {DS}Input type="email"  
- NumberInput → {DS}Input type="number"
- TextArea → {DS}Textarea
- Select → {DS}Select
- Checkbox → {DS}Checkbox
- Radio → {DS}Radio

Examples:
Element Plus: ElInput, ElSelect, ElCheckbox
Vuetify: VTextField, VSelect, VCheckbox
Ant Design: AInput, ASelect, ACheckbox
Tailwind CSS: <input class="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
```

### Pattern 3: Feedback Components
```
Custom → Design System:
- SuccessAlert → {DS}Alert variant/type="success"
- ErrorAlert → {DS}Alert variant/type="error"
- WarningAlert → {DS}Alert variant/type="warning"
- InfoAlert → {DS}Alert variant/type="info"
- Toast → {DS}Toast or {DS}Message
- Notification → {DS}Notification

Element Plus: ElAlert, ElMessage, ElNotification
Vuetify: VAlert, VSnackbar
Ant Design: AAlert, AMessage, ANotification
Tailwind CSS: <div class="bg-green-100 text-green-800 border border-green-300 rounded p-4"> (success)
              <div class="bg-red-100 text-red-800 border border-red-300 rounded p-4"> (error)
```

### Pattern 4: Layout Components
```
Custom → Design System:
- Container → {DS}Container or {DS}Layout
- Grid → {DS}Row + {DS}Col or {DS}Grid
- Stack → {DS}Space or {DS}Stack
- Card → {DS}Card
- Modal → {DS}Modal or {DS}Dialog
- Drawer → {DS}Drawer

Element Plus: ElContainer, ElRow/ElCol, ElCard, ElDialog, ElDrawer
Vuetify: VContainer, VRow/VCol, VCard, VDialog, VNavigationDrawer
Ant Design: ALayout, ARow/ACol, ACard, AModal, ADrawer
Tailwind CSS: <div class="container mx-auto">, <div class="grid grid-cols-12 gap-4">,
              <div class="bg-white rounded-lg shadow-md p-6">, <div class="fixed inset-0 z-50">
```

---

## Unmappable Components

When no design system equivalent exists:

```typescript
function handleUnmappableComponent(component, dsInfo) {
  return {
    status: 'partial_migration',
    action: 'tokenize_only',
    plan: {
      keepCustomComponent: true,
      applyDesignTokens: true,
      documentGap: true,
      steps: [
        'Replace hardcoded colors with design system tokens',
        'Replace spacing with spacing scale',
        'Use typography tokens',
        `Document as candidate for future ${dsInfo.name} component`,
        'Request from design system team if high priority'
      ]
    },
    confidence: 0.75 // Can still improve with tokens
  };
}
```

---

## Output Format

```json
{
  "agent": "design-system-migrator",
  "phase": "transform",
  "action": "migrate_to_design_system",
  "timestamp": "2026-04-06T10:00:00Z",
  "migration_type": "component",
  
  "design_system": {
    "name": "Element Plus",
    "package": "element-plus",
    "version": "2.4.0",
    "componentPrefix": "El"
  },
  
  "proposal_id": "prop_ds_abc123",
  "confidence": 0.92,
  
  "transformation": {
    "source_component": "CustomButton.vue",
    "target_component": "DSButton.vue",
    "ds_component_used": "ElButton",
    
    "mappings": {
      "type": {
        "primary": "primary",
        "secondary": "default",
        "outline": "text"
      },
      "size": {
        "small": "small",
        "medium": "default",
        "large": "large"
      }
    },
    
    "tokens_replaced": [
      {
        "type": "color",
        "from": "#007bff",
        "to": "var(--el-color-primary)"
      },
      {
        "type": "spacing",
        "from": "16px",
        "to": "var(--el-spacing-medium)"
      }
    ],
    
    "accessibility_checks": {
      "color_contrast": "pass",
      "aria_labels": "pass",
      "keyboard_navigation": "pass",
      "focus_indicators": "pass"
    }
  },
  
  "unmappable_props": [],
  "warnings": [],
  
  "next_step": "validate_with_validator"
}
```

---

## Best Practices

1. **Auto-Detect First**: Always detect design system before starting migration
2. **Component First**: Migrate to design system components before tokenizing
3. **Token Everything**: Replace all hardcoded values with design system tokens
4. **Preserve Functionality**: Ensure behavior doesn't change
5. **Test Accessibility**: Validate a11y before and after
6. **Batch Migrations**: Migrate similar components together
7. **Document Gaps**: Track missing design system components
8. **Gradual Rollout**: Migrate incrementally, test thoroughly
9. **Monitor Regressions**: Check visual and functional consistency
10. **Adapt to Design System**: Follow the design system's conventions and patterns
