---
name: pattern-detection
description: Comprehensive workflow for detecting and analyzing Nuxt 2 migration patterns (Vuex stores, mixins, Options API, RxJS, tracking calls)
---

# Pattern Detection Skill

**Purpose**: Comprehensive workflow for detecting and analyzing Nuxt 2 migration patterns in source codebases.

**Used by**: @auditor agent

**Domain**: Static code analysis, pattern matching, dependency mapping

---

## Overview

This skill enables systematic detection of Vue 2, Vuex, mixins, RxJS, and other legacy patterns that need migration to Nuxt 3/4.

## Workflow

### Step 1: Pre-Analysis Setup

```markdown
1. Verify source path configuration
2. Check .env for MIGRATION_SOURCE_PATH
3. Confirm target module (if specified)
4. Initialize analysis scope
```

### Step 2: Comprehensive Pattern Scan

```markdown
Execute: analysismcp.scan_source_patterns({ module })

This will scan for:
- Vue 2 Options API components
- Vuex stores (state, mutations, actions, getters)
- Vue mixins (data, methods, computed, lifecycle)
- RxJS Observables in API layer
- Tracking code (Mixpanel, gtag, dataLayer)
- SCSS usage in components

Output: Pattern counts and file locations
```

### Step 3: Deep Dive by Pattern Type

For each pattern type found:

#### A. Vuex Stores Analysis
```markdown
Execute: analysismcp.audit_vuex_patterns({ module })

Extract:
- File paths
- State properties
- Mutations list
- Actions list
- Getters list
- Module structure
- Namespacing

Assess complexity:
- Simple: Basic state + mutations
- Medium: Multiple actions + getters
- Complex: Nested modules, advanced patterns
```

#### B. Mixins Analysis
```markdown
Execute: analysismcp.audit_mixin_patterns({ module })

Extract:
- Data properties
- Methods
- Computed properties
- Lifecycle hooks
- Watch patterns
- Inject/provide usage

Flag for manual review:
- Complex reactive patterns
- Multiple lifecycle hooks
- Watch with deep reactivity
```

#### C. Components Analysis
```markdown
Execute: analysismcp.audit_component_patterns({ module })

Detect:
- Options API usage
- SCSS/Sass in style blocks
- Complex computed properties
- Watchers
- Lifecycle hooks
- Mixins usage

Count and categorize by complexity
```

#### D. API Layer Analysis
```markdown
Execute: analysismcp.audit_api_patterns()

Find:
- RxJS Observable usage
- Subscription patterns
- HTTP request methods
- Error handling patterns

Suggest: async/await conversions
```

#### E. Tracking Code Analysis
```markdown
Execute: analysismcp.audit_tracking_patterns({ module })

Identify:
- Analytics libraries (Mixpanel, GA, etc.)
- Event tracking calls
- Feature flags
- Custom tracking utilities

Catalog for preservation in migration
```

### Step 4: Dependency Mapping

```markdown
Analyze relationships:
1. Which components use which stores?
2. Which components use which mixins?
3. Are there circular dependencies?
4. What's the dependency tree depth?

Build dependency graph:
- Nodes: Components, stores, mixins
- Edges: Import/usage relationships
- Identify critical path items
```

### Step 5: Migration Order Recommendation

```markdown
Execute: analysismcp.suggest_migration_order()

Algorithm:
1. Identify foundational items (stores with no dependencies)
2. Map dependent items (components using stores)
3. Calculate dependency depth
4. Sort by: dependencies first → dependents later

Recommended order:
1. Vuex stores (foundational)
2. Mixins (reusable across components)
3. API layer (independent utilities)
4. Components (depend on stores + mixins)
```

### Step 6: Complexity Assessment

For each detected pattern:

```markdown
Assign complexity score:

LOW (1-3 points):
- Simple Vuex store with basic CRUD
- Basic mixin with data + methods
- Simple component with few lifecycle hooks

MEDIUM (4-6 points):
- Vuex with async actions + complex getters
- Mixin with computed + watchers
- Component with multiple mixins

HIGH (7-10 points):
- Nested Vuex modules
- Mixins with advanced reactivity
- Components with complex lifecycle management
- Custom reactive utilities

Formula:
complexity = (patterns * 0.3) + (dependencies * 0.5) + (lines_of_code * 0.2)
```

### Step 7: Risk Flagging

Flag for manual review when:

```markdown
HIGH RISK:
- Complexity score > 7
- Uses deprecated Vue 2 features
- Custom reactive plugins
- Complex $watch patterns
- Direct DOM manipulation
- Third-party library deep integrations

MEDIUM RISK:
- Complexity score 4-7
- Multiple computed properties with dependencies
- Async lifecycle hooks
- Dynamic component registration

LOW RISK:
- Complexity score < 4
- Standard Vue/Vuex patterns
- Simple data + methods
- Clear migration path
```

### Step 8: Report Generation

Compile comprehensive audit report:

```markdown
Structure:
1. Executive Summary
   - Total files scanned
   - Total patterns found
   - Breakdown by type
   - Estimated effort

2. Detailed Findings
   - Per pattern type analysis
   - File-by-file breakdown
   - Complexity scores
   - Risk flags

3. Recommendations
   - Migration order
   - Priority items
   - Manual review list
   - Estimated timeline

4. Dependency Graph
   - Visual representation (if possible)
   - Critical path items
   - Blockers

5. Next Steps
   - Immediate actions
   - Preparation tasks
   - Team assignments (if applicable)
```

## Pattern Detection Techniques

### Regex Patterns

Use patterns from `src/core/patterns.ts`:

```typescript
// Vuex Store Detection
/export\s+default\s+(?:new\s+)?Vuex\.Store\s*\(\s*\{/g

// Options API Detection
/export\s+default\s*\{[\s\S]*?(data\(\)|methods:|computed:)/g

// Mixin Usage
/mixins\s*:\s*\[([^\]]+)\]/g

// RxJS Observable
/Observable|Subject|BehaviorSubject/g

// Tracking Calls
/\$mixpanel\.track|gtag\(|dataLayer\.push/g
```

### File Scanning Strategy

```markdown
1. Use glob patterns for file discovery
2. Read file content safely (handle encoding)
3. Apply regex patterns
4. Count matches
5. Extract context (line numbers, code snippets)
6. Categorize findings
```

### Performance Optimization

```markdown
- Scan files in batches
- Use streaming for large files
- Cache file content when multiple patterns needed
- Skip binary files
- Respect .gitignore patterns
```

## Common Patterns Reference

### Vuex Store Indicators
```javascript
- export default new Vuex.Store({
- export default { namespaced: true,
- state: () => ({
- mutations: {
- actions: {
- getters: {
```

### Mixin Indicators
```javascript
- mixins: [mixinName]
- export default { // in mixins directory
- data() { return {} }
- methods: {} // in mixin
```

### Options API Indicators
```javascript
- data() { return {}}
- methods: {}
- computed: {}
- watch: {}
- mounted() {}
- created() {}
```

### RxJS Indicators
```javascript
- new Observable(
- new Subject(
- new BehaviorSubject(
- .pipe(
- .subscribe(
```

## Output Format

Return structured JSON matching auditor agent contract:

```json
{
  "patterns_found": {
    "vuex_stores": 5,
    "mixins": 3,
    "components": 12,
    "rxjs_files": 2,
    "tracking_calls": 45
  },
  "details": {
    "vuex_stores": [
      {
        "file": "path/to/store.ts",
        "complexity": "medium",
        "state_properties": [...],
        "actions": [...],
        "getters": [...]
      }
    ]
  },
  "dependencies": {
    "graph": {...},
    "critical_path": [...]
  },
  "recommendations": [...],
  "migration_order": [...]
}
```

## Best Practices

1. **Be thorough**: Don't miss edge cases
2. **Be accurate**: Count precisely
3. **Be contextual**: Extract relevant code snippets
4. **Be helpful**: Provide actionable insights
5. **Be safe**: Read-only operations always
6. **Be fast**: Optimize for large codebases
7. **Be clear**: Structure output clearly

## Error Handling

```markdown
On file read error:
- Log warning
- Skip file
- Continue scanning
- Report skipped files in summary

On pattern match error:
- Log regex that failed
- Try alternative patterns
- Record partial results
- Flag for manual review

On performance issues:
- Batch processing
- Limit file size
- Skip node_modules
- Use exclude patterns
```

## Integration Checklist

Before calling this skill:
- ✅ Source path configured
- ✅ Target module specified (optional)
- ✅ Analysis MCP tools available
- ✅ Sufficient permissions to read source

After using this skill:
- ✅ Audit results logged to audits.jsonl
- ✅ Structured output returned
- ✅ Next steps clear
- ✅ Ready for transformation phase
