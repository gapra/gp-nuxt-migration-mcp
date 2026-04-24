---
name: code-transformation
description: Systematic workflow for transforming Nuxt 2 code patterns to modern Nuxt 3/4 equivalents (Vuex→Pinia, Mixin→Composable, Options API→Composition API, RxJS→async/await)
---

# Code Transformation Skill

**Purpose**: Systematic workflow for transforming Nuxt 2 code patterns to modern Nuxt 3/4 equivalents.

**Used by**: @transformer agent

**Domain**: Code generation, refactoring, modernization

---

## Overview

This skill enables safe, validated transformation of legacy Vue 2 / Nuxt 2 patterns into modern Vue 3 / Nuxt 3/4 code following best practices.

## Core Principle

**Propose → Validate → Write**: Never skip steps!

```
1. PROPOSE: Generate transformation with confidence score
2. VALIDATE: Run safety and quality checks
3. WRITE: Create file with automatic backup
```

## Transformation Workflows

### Workflow 1: Vuex → Pinia Store

#### Step 1: Analyze Source
```markdown
Input: Audit results for Vuex store

Extract:
- State properties and types
- Mutation names and logic
- Action names (sync/async)
- Getter names and computations
- Module structure
- Namespacing
```

#### Step 2: Map to Pinia Patterns
```markdown
Vuex Pattern → Pinia Equivalent:

STATE:
Vuex: state: () => ({ items: [] })
Pinia: state: () => ({ items: [] })
✓ Same pattern

MUTATIONS:
Vuex: mutations: { SET_ITEMS(state, items) { state.items = items } }
Pinia: Direct state modification in actions
Transform: Remove mutations, update state directly in actions

ACTIONS:
Vuex: actions: { async fetchItems({ commit }) { commit('SET_ITEMS', data) } }
Pinia: actions: { async fetchItems() { this.items = data } }
Transform: Replace commit with direct this.property

GETTERS:
Vuex: getters: { filteredItems: state => state.items.filter(...) }
Pinia: getters: { filteredItems: (state) => state.items.filter(...) }
✓ Same pattern

MODULES:
Vuex: Nested modules with namespaced: true
Pinia: Separate store files
Transform: Split into individual stores
```

#### Step 3: Generate Code
```typescript
import { defineStore } from 'pinia';

export const use[StoreName]Store = defineStore('[storeName]', {
  state: () => ({
    // Migrated state properties
    items: [] as ItemType[],
    loading: false,
    error: null as string | null
  }),

  getters: {
    // Migrated getters (usually unchanged)
    filteredItems: (state) => state.items.filter(...)
  },

  actions: {
    // Migrated actions (mutations collapsed)
    async fetchItems() {
      this.loading = true;
      this.error = null;
      try {
        const data = await api.fetchItems();
        this.items = data; // Direct state mutation
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    }
  }
});
```

#### Step 4: Confidence Scoring
```markdown
High confidence (0.85-0.95):
- Standard Vuex patterns
- Simple CRUD operations
- No complex async chains
- Clear state/mutations/actions

Medium confidence (0.75-0.84):
- Nested modules
- Complex async actions
- Multiple getters with dependencies

Low confidence (< 0.75):
- Custom plugins
- Dynamic module registration
- Advanced reactive patterns
→ Flag for manual review
```

#### Step 5: Propose
```markdown
Call: generatormcp.propose_pinia_store({
  name: "storeName",
  sourcePath: "store/original.ts",
  stateProperties: ["items", "loading", "error"],
  actions: ["fetchItems", "createItem"],
  getters: ["filteredItems", "itemById"]
})

Return: proposal_id
```

---

### Workflow 2: Mixin → Composable

#### Step 1: Analyze Mixin
```markdown
Extract from mixin:
- data() properties → ref/reactive
- methods → functions
- computed → computed()
- watch → watch()
- lifecycle hooks → onMounted, onUnmounted, etc.
- inject → inject()
```

#### Step 2: Transform Patterns
```markdown
REACTIVE DATA:
Mixin: data() { return { count: 0 } }
Composable: const count = ref(0)

METHODS:
Mixin: methods: { increment() { this.count++ } }
Composable: const increment = () => count.value++

COMPUTED:
Mixin: computed: { double() { return this.count * 2 } }
Composable: const double = computed(() => count.value * 2)

LIFECYCLE:
Mixin: mounted() { this.init() }
Composable: onMounted(() => init())

WATCH:
Mixin: watch: { count(val) { console.log(val) } }
Composable: watch(count, (val) => console.log(val))
```

#### Step 3: Generate Composable
```typescript
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

export function use[FeatureName]() {
  // Refs for reactive data
  const count = ref(0);
  const data = ref<DataType[]>([]);

  // Computed properties
  const double = computed(() => count.value * 2);

  // Methods
  const increment = () => {
    count.value++;
  };

  const fetchData = async () => {
    // Async logic
  };

  // Watchers
  watch(count, (newVal) => {
    console.log('Count changed:', newVal);
  });

  // Lifecycle
  onMounted(() => {
    fetchData();
  });

  onUnmounted(() => {
    // Cleanup
  });

  // Return public API
  return {
    count,
    data,
    double,
    increment,
    fetchData
  };
}
```

#### Step 4: Confidence Scoring
```markdown
High (0.80-0.90):
- Simple data + methods
- No complex reactivity
- Clear API surface

Medium (0.70-0.79):
- Multiple computed with dependencies
- Watchers
- Inject/provide

Low (< 0.70):
- Advanced reactive manipulation
- Multiple lifecycle hooks
- Complex this bindings
```

---

### Workflow 3: Options API → Composition API

#### Step 1: Component Analysis
```markdown
Extract:
- Props definition
- Emits
- data() properties
- computed properties
- methods
- watch
- lifecycle hooks
- refs usage
```

#### Step 2: Script Setup Transform
```vue
<!-- FROM: Options API -->
<script>
export default {
  props: {
    modelValue: String,
    disabled: Boolean
  },
  emits: ['update:modelValue', 'submit'],
  data() {
    return {
      localValue: this.modelValue,
      loading: false
    };
  },
  computed: {
    isValid() {
      return this.localValue.length > 0;
    }
  },
  methods: {
    handleSubmit() {
      this.$emit('submit', this.localValue);
    }
  },
  watch: {
    modelValue(val) {
      this.localValue = val;
    }
  },
  mounted() {
    // Init logic
  }
}
</script>

<!-- TO: Composition API -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

// Props
const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
}>();

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string];
  'submit': [value: string];
}>();

// Reactive state
const localValue = ref(props.modelValue);
const loading = ref(false);

// Computed
const isValid = computed(() => localValue.value.length > 0);

// Methods
const handleSubmit = () => {
  emit('submit', localValue.value);
};

// Watchers
watch(() => props.modelValue, (val) => {
  localValue.value = val;
});

// Lifecycle
onMounted(() => {
  // Init logic
});
</script>
```

#### Step 3: Confidence Scoring
```markdown
High (0.75-0.85):
- Simple component structure
- Clear props/emits
- Standard lifecycle

Medium (0.65-0.74):
- Complex computed chains
- Multiple watchers
- Dynamic refs

Low (< 0.65):
- $refs manipulation
- Direct DOM access
- Custom directives
```

---

### Workflow 4: RxJS → async/await

#### Step 1: Identify Observable Patterns
```markdown
Detect:
- Observable creation
- pipe() operators
- subscribe() calls
- Subject usage
- Error handling
```

#### Step 2: Transform to Promises
```typescript
// FROM: RxJS
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export function getDeals(): Observable<Deal[]> {
  return httpClient.get('/api/deals').pipe(
    map(response => response.data),
    catchError(err => throwError(err))
  );
}

// Usage:
getDeals().subscribe(
  deals => console.log(deals),
  err => console.error(err)
);

// TO: async/await
export async function getDeals(): Promise<Deal[]> {
  try {
    const response = await httpClient.get('/api/deals');
    return response.data;
  } catch (err) {
    console.error('Failed to fetch deals:', err);
    throw err;
  }
}

// Usage:
try {
  const deals = await getDeals();
  console.log(deals);
} catch (err) {
  console.error(err);
}
```

#### Step 3: Confidence Scoring
```markdown
High (0.85-0.95):
- Simple HTTP calls
- Basic map/filter
- Standard error handling

Medium (0.75-0.84):
- Multiple pipe operators
- combineLatest, merge
- Conditional streams

Low (< 0.75):
- Custom operators
- Complex subscription management
- Hot vs cold observable logic
```

---

## Quality Checklist

Before proposing transformation:

```markdown
✅ Code follows TypeScript best practices
✅ Proper type annotations present
✅ Error handling included
✅ Follows Nuxt 3/4 conventions
✅ Import paths correct
✅ No unused imports
✅ Reactive patterns sound
✅ Proper cleanup (unsubscribe, unmount)
✅ Comments for complex logic
✅ Consistent naming conventions
```

## Safety Measures

```markdown
1. Never overwrite without backup
2. Always validate before writing
3. Check confidence threshold
4. Verify target path availability
5. Log all transformations
6. Maintain rollback points
```

## Common Pitfalls & Solutions

### Pitfall 1: Direct `this` References
```javascript
// Wrong in composable:
const fetchData = () => {
  this.loading = true; // this is undefined!
};

// Correct:
const fetchData = () => {
  loading.value = true;
};
```

### Pitfall 2: Forgetting `.value`
```javascript
// Wrong:
if (isLoading) { ... } // ref comparison

// Correct:
if (isLoading.value) { ... }
```

### Pitfall 3: Reactive vs Ref
```javascript
// Use ref for primitives:
const count = ref(0);

// Use reactive for objects:
const state = reactive({ count: 0, name: '' });
```

## Validation Integration

After proposing:

```markdown
1. Return proposal_id
2. @validator checks:
   - Confidence ≥ 0.80
   - No file conflicts
   - Valid syntax
   - Quality standards met
3. On approval: Write with backup
4. On rejection: Log reasons, suggest manual review
```

## Error Recovery

```markdown
If transformation fails:
1. Don't write partial code
2. Log error details
3. Return to previous state
4. Provide manual implementation guide
5. Flag for human review
```

## Best Practices

1. **Start simple**: Handle basic patterns first
2. **Incremental**: Transform one pattern type at a time
3. **Validated**: Never skip validation
4. **Documented**: Comment complex transformations
5. **Reversible**: Always maintain backups
6. **Testable**: Generate code that can be tested

## Output Format

Always return proposal following transformer agent contract:

```json
{
  "proposal_id": "prop_...",
  "migration_type": "vuex_to_pinia",
  "confidence": 0.85,
  "code_preview": "...",
  "requires_validation": true,
  "next_step": "validate_proposal"
}
```
