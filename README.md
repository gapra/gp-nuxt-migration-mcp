# Nuxt Migration MCP Server

MCP (Model Context Protocol) Server for Nuxt 2 to Nuxt ^3 migration analysis and automation.

## Overview

This MCP server provides tools to analyze and audit codebases for migration from Nuxt 2 (Vue 2) to Nuxt ^3 (Vue 3). It can be integrated with AI assistants like Claude, Cursor, or other MCP-compatible clients.

## Features

- **Start Migration** - One-command to auto-detect config and run full audit
- **Audit Nuxt Migration** - Detect Options API, Vuex, SCSS, RxJS, mixins patterns
- **Audit Tracking** - Find analytics/tracking calls (Mixpanel, gtag, dataLayer) and feature flags
- **Audit Vuex Stores** - Analyze Vuex stores and suggest Pinia migration
- **Audit Mixins** - Find Vue mixins and suggest composable conversion
- **Audit API Migration** - Detect RxJS usage and suggest async/await pattern
- **Audit Components** - Find components using Options API and SCSS
- **Generate Code** - Create Pinia stores, composables, components, API functions, and types in target Nuxt 4 codebase
- **Write Files** - Write custom content directly to target codebase
- **Auto-detect .env** - Automatically finds MIGRATION_SOURCE_PATH from .env file

## Installation

```bash
cd nuxt-migration-mcp
npm install
# or
pnpm install
```

## Configuration

Create a `.env` file or set environment variables:

```bash
MIGRATION_SOURCE_PATH=/path/to/your/nuxt2/project
MIGRATION_TARGET_PATH=/path/to/your/nuxt4/project
```

### Auto-detect .env

The MCP server automatically searches for `.env` files in:
1. Current working directory (`./.env`)
2. Parent directory (`../.env`)

This means you can place your `.env` file in either location and the server will automatically detect it.

## Quick Start with `start_migration`

The easiest way to start a migration is to use the `start_migration` tool. It automatically:
- Detects `MIGRATION_SOURCE_PATH` from `.env` or environment variables
- Runs a comprehensive audit of the entire codebase
- Returns results for all categories: nuxt, vuex, mixins, api, components, tracking

```json
{
  "name": "start_migration",
  "arguments": {}
}
```

You can also override paths or specify a module:

```json
{
  "name": "start_migration",
  "arguments": {
    "sourcePath": "/path/to/nuxt2",
    "targetPath": "/path/to/nuxt3",
    "module": "deals"
  }
}
```

### Using Custom Config Path

```json
{
  "name": "start_migration",
  "arguments": {
    "configPath": "/path/to/custom.env"
  }
}
```

## Harness Engineering Architecture (NEW!)

This MCP server now implements a **Harness Engineering pattern** inspired by agentic orchestration. The system is organized into three specialized MCP servers that coordinate migration workflow:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Orchestrator MCP                          │
│  • Coordinates multi-phase workflow                         │
│  • Maintains authoritative state                            │
│  • Validates proposals                                      │
│  • Manages rollback                                         │
└─────────────────────────────────────────────────────────────┘
                    ↓                    ↓
          ┌──────────────────┐  ┌──────────────────┐
          │  Analysis MCP    │  │  Generator MCP   │
          │  (Read-only)     │  │  (Read + Write)  │
          │                  │  │                  │
          │  • Audit patterns│  │  • Propose code  │
          │  • Scan source   │  │  • Validate      │
          │  • Suggest order │  │  • Write files   │
          └──────────────────┘  └──────────────────┘
```

### Three MCP Servers

#### 1. **Analysis MCP** (Read-Only)
- **Sandbox**: Enabled (read-only access)
- **Purpose**: Audit source codebase patterns
- **Tools**: `scan_source_patterns`, `audit_*_patterns`, `suggest_migration_order`
- **Access**: Public state only

#### 2. **Generator MCP** (Read + Write)
- **Sandbox**: Disabled (needs write access)
- **Purpose**: Generate and write code transformations
- **Tools**: `propose_*`, `validate_proposal`, `write_validated_proposal`
- **Flow**: Propose → Validate → Write (with backups)

#### 3. **Orchestrator MCP** (Full Control)
- **Sandbox**: Disabled (manages state)
- **Purpose**: Coordinate workflow and maintain state
- **Tools**: `start_orchestrated_migration`, `get_migration_state`, `rollback_file`
- **State**: Manages `.migration/migration_state.json`

### Orchestrated Workflow

Instead of manually chaining tools, use the orchestrated workflow:

```bash
# 1. Start orchestrated migration
Call: orchestratorMcp.start_orchestrated_migration()

# 2. Analysis phase (automated)
→ analysisMcp.scan_source_patterns()
→ analysisMcp.suggest_migration_order()

# 3. Transform phase
→ generatorMcp.propose_pinia_store()
→ generatorMcp.validate_proposal()
→ generatorMcp.write_validated_proposal()

# 4. Validation phase
→ Check confidence scores
→ Review generated code

# 5. Report phase
→ orchestratorMcp.get_migration_summary()
```

### State Management

All operations are tracked in `.migration/` directory:

```
.migration/
├── migration_state.json    # Authoritative state
├── migration_log.md        # Human-readable log
├── actions/
│   ├── audits.jsonl        # Analysis operations
│   ├── generations.jsonl   # Generator operations
│   └── validations.jsonl   # Validation results
└── backups/                # Automatic backups for rollback
```

### Safety Features

- ✅ **Proposal-based workflow**: All changes require validation before writing
- ✅ **Automatic backups**: Files backed up before overwrite
- ✅ **Rollback support**: `orchestratorMcp.rollback_file()` to undo changes
- ✅ **Confidence scoring**: Track confidence for each transformation
- ✅ **Audit trail**: Complete JSONL logs of all operations

### VS Code Integration

The `.vscode/mcp.json` configuration enables all three servers:

```json
{
  "servers": {
    "analysisMcp": { "sandboxEnabled": true },
    "generatorMcp": { "sandboxEnabled": false },
    "orchestratorMcp": { "sandboxEnabled": false }
  }
}
```

Enable GitHub Copilot agent support in `.vscode/settings.json`:

```json
{
  "chat.agentSkillsLocations": { ".github/skills": true },
  "chat.agentFilesLocations": { ".github/agents": true },
  "chat.mcp.autostart": true,
  "chat.useAgentSkills": true
}
```

### Running MCP Servers

```bash
# Build all servers
npm run build

# Run individual servers (production)
npm run mcp:analysis
npm run mcp:generator
npm run mcp:orchestrator

# Development mode (watch)
npm run mcp:dev:analysis
npm run mcp:dev:generator
npm run mcp:dev:orchestrator
```

## Usage

### Standalone

```bash
# Development
npm run dev

# Build and run
npm run build
npm start
```

### MCP Client Integration

Configure your MCP client (e.g., VS Code, Claude Desktop, Cursor) to connect to this server:

```json
{
  "mcpServers": {
    "nuxt-migration": {
      "command": "node",
      "args": ["/path/to/nuxt-migration-mcp/dist/index.js"],
      "env": {
        "MIGRATION_SOURCE_PATH": "/path/to/nuxt2/project",
        "MIGRATION_TARGET_PATH": "/path/to/nuxt4/project"
      }
    }
  }
}
```

## Workflow

The typical migration workflow:

1. **Configure paths** - Use `configure_migration` to set source (Nuxt 2) and target (Nuxt 4) paths
2. **Audit source** - Run audit tools to find migration issues in Nuxt 2 codebase
3. **Generate code** - Use generation tools to create code in Nuxt 4 target
4. **Write custom** - Use `write_file` for any custom code

### Example Workflow

#### Quick Start (Recommended)
```json
// Start full migration audit - auto-detects .env
{
  "name": "start_migration",
  "arguments": {}
}
```

#### Manual Step-by-Step
```json
// 1. Configure paths
{
  "name": "configure_migration",
  "arguments": {
    "sourcePath": "/projects/my-nuxt2-app",
    "targetPath": "/projects/my-nuxt4-app"
  }
}

// 2. Audit specific module (e.g., 'deals')
{
  "name": "audit_vuex_stores",
  "arguments": {
    "module": "deals"
  }
}

// 3. Generate Pinia store for specific module
{
  "name": "generate_pinia_store",
  "arguments": {
    "name": "deals",
    "module": "deals",
    "relativePath": "stores/deals.ts",
    "stateProperties": ["items", "isLoading"],
    "actions": ["fetchDeals", "createDeal"]
  }
}

// 4. Generate component for specific module
{
  "name": "generate_component",
  "arguments": {
    "name": "DealCard",
    "module": "deals",
    "relativePath": "components/DealCard.vue",
    "props": ["deal", "status"],
    "hasStore": true,
    "storeName": "dealsStore"
  }
}
```

## Per-Module Usage

All tools now support per-module operations:

### Audit Specific Module

```json
{
  "name": "audit_vuex_stores",
  "arguments": {
    "module": "auth"
  }
}
```

### Generate for Specific Module

```json
{
  "name": "generate_composable",
  "arguments": {
    "name": "useAuth",
    "module": "auth",
    "relativePath": "useAuth.ts",
    "returnValues": ["user", "login", "logout"]
  }
}
```

This will create the file at: `modules/auth/composables/useAuth.ts`

## Intelligent Path Mapping

The MCP now supports intelligent path mapping that follows Nuxt folder conventions:

### List Target Structure

See what folders already exist in your target codebase:

```json
{
  "name": "list_target_structure",
  "arguments": {
    "path": "components",
    "depth": 2
  }
}
```

Output:
```json
{
  "success": true,
  "structure": [
    { "name": "components", "path": "components", "type": "directory", "children": [...] },
    { "name": "stores", "path": "stores", "type": "directory", "children": [...] },
    { "name": "composables", "path": "composables", "type": "directory", "children": [...] }
  ]
}
```

### Auto-Generate from Audit

Automatically generate files following Nuxt conventions:

```json
{
  "name": "generate_from_audit",
  "arguments": {
    "module": "deals",
    "type": "all"
  }
}
```

This will scan source and map:
- `store/modules/deals.js` → `stores/deals.ts`
- `assets/mixins/useDeals.js` → `composables/useDeals.ts`
- `components/DealCard.vue` → `components/DealCard.vue`

### Generate and Write Multiple Files

```json
{
  "name": "generate_from_audit",
  "arguments": {
    "module": "deals",
    "type": "store"
  }
}
```

Then write the results:

```json
{
  "name": "write_generated_files",
  "arguments": {
    "files": [
      {
        "targetFile": "stores/deals.ts",
        "content": "import { defineStore } from 'pinia'..."
      }
    ]
  }
}
```

## Available Tools

### Audit Tools (Source - Nuxt 2)

| Tool                    | Description                                    | Module Support |
| ----------------------- | ---------------------------------------------- |----------------|
| `start_migration`       | Auto-detect config and run full audit in one command | ✅ (optional)  |
| `audit_nuxt_migration`  | Full codebase audit for all migration patterns | ✅             |
| `audit_tracking`        | Find analytics calls and feature flags         | ✅             |
| `audit_vuex_stores`     | Analyze Vuex stores for Pinia migration        | ✅             |
| `audit_mixins`          | Find mixins for composable conversion          | ✅             |
| `audit_api_migration`  | Find RxJS for async/await conversion           | ✅             |
| `audit_components`      | Analyze Vue components for Options API         | ✅             |
| `get_migration_summary` | Get migration status and recommended order     | -              |
| `configure_migration`  | Set source/target paths dynamically            | -              |

### Code Generation Tools (Target - Nuxt 4)

| Tool                    | Description                                    | Module Support |
| ----------------------- | ---------------------------------------------- |----------------|
| `generate_pinia_store`  | Generate Pinia store with state, actions, getters | ✅             |
| `generate_composable`   | Generate Vue composable with Composition API    | ✅             |
| `generate_component`    | Generate Vue component with `<script setup>`    | ✅             |
| `generate_api`          | Generate API functions with async/await         | ✅             |
| `generate_type`         | Generate TypeScript interface                  | ✅             |
| `write_file`            | Write custom content to target codebase        | ✅             |
| `list_target_structure` | List target folder structure                   | ✅             |
| `generate_from_audit`   | Auto-generate files from audit with mapping    | ✅             |
| `write_generated_files` | Write multiple generated files at once        | ✅             |

## Example Output

### Audit Output

```json
{
  "summary": {
    "totalFiles": 150,
    "totalIssues": 42,
    "bySeverity": {
      "error": 15,
      "warning": 20,
      "info": 7
    }
  },
  "recommendations": [
    "Priority: Migrate Options API components to Composition API",
    "Convert SCSS to Atomic CSS with design tokens"
  ]
}
```

### Code Generation Examples

#### Generate Pinia Store
```json
{
  "name": "generate_pinia_store",
  "arguments": {
    "name": "auth",
    "module": "auth",
    "relativePath": "stores/auth.ts",
    "stateProperties": ["user", "token", "isAuthenticated"],
    "actions": ["login", "logout", "fetchUser"],
    "getters": ["isLoggedIn", "currentUser"]
  }
}
```

#### Generate Component
```json
{
  "name": "generate_component",
  "arguments": {
    "name": "UserCard",
    "module": "users",
    "relativePath": "components/UserCard.vue",
    "props": ["user", "size"],
    "emits": ["click"],
    "hasStore": true,
    "storeName": "userStore"
  }
}
```

#### Generate Composable
```json
{
  "name": "generate_composable",
  "arguments": {
    "name": "useAuth",
    "module": "auth",
    "relativePath": "composables/useAuth.ts",
    "props": [],
    "returnValues": ["user", "isAuthenticated", "login", "logout"]
  }
}
```

#### Write Custom File with Module
```json
{
  "name": "write_file",
  "arguments": {
    "module": "deals",
    "relativePath": "utils/helper.ts",
    "content": "export function formatDate(date: Date): string { ... }"
  }
}
```

## Reusability

This MCP server is designed to be service-agnostic. To use with different projects:

1. Set `MIGRATION_SOURCE_PATH` to point to any Nuxt 2 codebase
2. The server will analyze patterns in that codebase
3. The pattern detection is generic and works with any Vue 2 → Vue 3 migration

### For Other Services/Products

Simply change the environment variable or config to point to different source codebases:

```bash
# For Project A
MIGRATION_SOURCE_PATH=/path/to/project-a

# For Project B
MIGRATION_SOURCE_PATH=/path/to/project-b
```

## Auto-Trigger Configuration

You can configure your AI client to automatically call `start_migration` when the user wants to migrate Nuxt 2 to Nuxt 3/4. This way, users can simply type natural language prompts like:

- "migrate nuxt 2 ke nuxt 4"
- "upgrade to nuxt 3"
- "migrasikan project ini ke nuxt"
- "start migration for pages/integrations/emails"

### Claude Desktop

Edit your Claude Desktop config at `~/Library/Application Support/Claude/settings.json`:

```json
{
  "mcpServers": {
    "nuxt-migration": {
      "command": "node",
      "args": ["/absolute/path/to/nuxt-migration-mcp/dist/index.js"],
      "env": {
        "MIGRATION_SOURCE_PATH": "/path/to/your/nuxt2/project"
      }
    }
  },
  "instructions": "When user wants to migrate Nuxt 2 to Nuxt 3/4 (keywords: 'migrate nuxt', 'nuxt 2 ke nuxt', 'upgrade nuxt', 'migrasi nuxt', 'start migration'), automatically call the start_migration tool from nuxt-migration MCP. Extract source/target paths from the prompt if provided, otherwise use MIGRATION_SOURCE_PATH environment variable."
}
```

### Cursor

Edit your Cursor config at `~/.cursor/settings/mcp.json` or through Cursor Settings > Features > Models > Advanced > Claude API:

```json
{
  "mcpServers": {
    "nuxt-migration": {
      "command": "node",
      "args": ["/absolute/path/to/nuxt-migration-mcp/dist/index.js"],
      "env": {
        "MIGRATION_SOURCE_PATH": "/path/to/your/nuxt2/project"
      }
    }
  }
}
```

Then add custom instructions in Cursor Settings > Features > AI Settings > Custom Instructions:

```
When user wants to migrate Nuxt 2 to Nuxt 3/4, automatically call start_migration tool from nuxt-migration MCP. Keywords: 'migrate nuxt', 'nuxt 2 ke nuxt', 'upgrade nuxt', 'migration nuxt', 'migrasi'.
```

### VS Code (with Copilot)

VS Code doesn't have native MCP support yet. Use [UVX](https://github.com/astral-sh/uvx) or the [MCP for VS Code](https://marketplace.visualstudio.com/items?itemName=wtanaka.vscode-mcp) extension.

After installing the extension, configure in VS Code settings (`settings.json`):

```json
{
  "mcpServers": {
    "nuxt-migration": {
      "command": "node",
      "args": ["/absolute/path/to/nuxt-migration-mcp/dist/index.js"],
      "env": {
        "MIGRATION_SOURCE_PATH": "/path/to/your/nuxt2/project"
      }
    }
  }
}
```

### Trigger Keywords

The AI will automatically trigger when user mentions:
- English: "migrate nuxt", "migration nuxt", "upgrade nuxt", "start migration", "nuxt 2 to nuxt 3/4"
- Indonesian: "migrate nuxt", "migrasi nuxt", "nuxt 2 ke nuxt", "upgrade nuxt", "mulai migrasi"

### Parsing Prompts

The AI will extract information from natural prompts:

| User Prompt | Extracted Parameters |
|-------------|---------------------|
| "migrate nuxt 2 to nuxt 4" | `{}` (uses .env) |
| "migrate /pages/deals" | `{ module: "deals" }` |
| "migration for pages/integrations/emails" | `{ module: "integrations/emails" }` |
| "migrate from /path/a to /path/b" | `{ sourcePath: "/path/a", targetPath: "/path/b" }` |

### Example Prompts

Here are example prompts users can type and the AI will auto-trigger:

**Basic Migration:**
```
User: "migrate nuxt 2 to nuxt 4"
User: "migration nuxt 2 ke nuxt 3"
User: "upgrade this project to nuxt 3"
User: "mulai migrasi nuxt 2 ke nuxt 4"
```

**With Specific Module:**
```
User: "migrate nuxt 2 - module deals"
User: "migration untuk pages/deals"
User: "migrasikan halaman deals ke nuxt 3"
User: "start migration for auth module"
```

**With Specific Page/Path:**
```
User: "migrate pages/integrations/emails/index.vue"
User: "migration for pages/dashboard"
User: "migrasikan file pages/products/index.vue"
User: "start migration for components/Header.vue"
```

**With Custom Paths:**
```
User: "migrate from /Users/me/old-nuxt2 to /Users/me/new-nuxt3"
User: "migration /path/to/nuxt2 -> /path/to/nuxt3"
User: "migrate nuxt 2 at /projects/web to /projects/web-v3"
```

**Combined:**
```
User: "migrate nuxt 2 to nuxt 4 for module deals, target at /nuxt3-project"
User: "migration pages/integrations/emails from /old to /new"
```

## Project Structure

```
nuxt-migration-mcp/
├── src/
│   ├── core/
│   │   ├── config.ts      # Configuration loader
│   │   ├── patterns.ts    # Pattern definitions
│   │   └── analyzer.ts   # Code analysis logic
│   ├── tools/
│   │   ├── nuxt-migration.ts
│   │   ├── tracking.ts
│   │   ├── vuex-to-pinia.ts
│   │   ├── composable-migration.ts
│   │   ├── api-migration.ts
│   │   ├── component-migration.ts
│   │   ├── generator.ts   # Code generation for target
│   │   └── directory.ts   # Directory listing & intelligent mapping
│   ├── types/
│   │   └── index.ts
│   └── index.ts          # MCP server entry
├── package.json
├── tsconfig.json
└── README.md
```

## Agent Architecture

The system implements a **multi-agent orchestration pattern** with specialized agents that coordinate through MCP servers. Agents are invoked using the `@agent` syntax in GitHub Copilot Chat.

### Available Agents

#### @orchestrator - Main Coordinator
**Purpose**: Orchestrates the complete migration workflow across all phases

**Responsibilities**:
- Spawn and coordinate subagents (@auditor, @transformer, @validator, @design-system-migrator)
- Maintain migration state in `.migration/migration_state.json`
- Validate subagent outputs against contracts
- Resolve conflicts between transformations
- Provide migration summaries and status reports

**MCP Tools**: `orchestratorMcp.*` (all orchestrator server tools)

**Workflow**:
```
1. Audit Phase → spawn @auditor
2. Transform Phase → spawn @transformer for each pattern
3. Design System Phase → spawn @design-system-migrator for UI components
4. Validate Phase → spawn @validator for proposals
5. Report Phase → generate summary
```

#### @auditor - Pattern Detection Specialist
**Purpose**: Read-only analysis of Nuxt 2 source codebase

**Responsibilities**:
- Scan source code for migration patterns
- Detect Vuex stores, mixins, Options API, RxJS usage
- Assess complexity and risk levels
- Suggest migration order
- Generate structured audit reports

**MCP Tools**: `analysisMcp.*` (all analysis server tools)

**Skills**: Uses `pattern-detection` skill for systematic scanning

**Constraints**: 
- ❌ Cannot modify any files
- ✅ Can read source codebase and state files
- ✅ Sandboxed for safety

#### @transformer - Code Generator
**Purpose**: Generate Nuxt 3/4 code from detected patterns

**Responsibilities**:
- Propose code transformations (Vuex→Pinia, Mixin→Composable, etc.)
- Assign confidence scores (0.60-1.00)
- Validate proposals before writing
- Write validated code to target codebase
- Create automatic backups

**MCP Tools**: `generatorMcp.*` (all generator server tools)

**Skills**: Uses `code-transformation` skill for transformation workflows

**Safety**:
- Requires confidence ≥ 0.60 for proposals
- All writes require validation
- Automatic file backups before overwrite

#### @validator - Quality Assurance
**Purpose**: Validate code transformation proposals

**Responsibilities**:
- Verify proposal completeness
- Check confidence thresholds (≥0.60)
- Validate file safety (no overwrites without backup)
- Check syntax correctness
- Assess security risks
- Verify TypeScript/Nuxt conventions
- Provide pass/fail/review decisions

**MCP Tools**: Limited search and read tools

**Skills**: Uses `safety-validation` skill for comprehensive checks

**Output**:
```typescript
{
  approved: boolean,
  overall_status: 'pass' | 'fail' | 'review',
  can_auto_approve: boolean,
  checks: { /* detailed results */ }
}
```

#### @design-system-migrator - Design System Specialist
**Purpose**: Migrate custom components and styling to target codebase's design system

**Responsibilities**:
- **Auto-detect** design system from target codebase (Element Plus, Vuetify, Ant Design, etc.)
- Discover custom UI components with manual styling
- Map components to detected design system equivalents
- Replace hardcoded values with design tokens
- Transform components to use design system library
- Validate design token usage and accessibility
- Ensure consistent UI/UX across migration

**Supported Design Systems**:
- Element Plus, Vuetify, Ant Design Vue, Quasar (Vue)
- Material UI, Chakra UI (React/Vue)
- Tailwind CSS (utility-class based)
- Custom Design Systems

**MCP Tools**: 
- `file/read`, `directory/list` (auto-detection)
- `generatormcp_propose_component`
- `generatormcp_validate_proposal`
- `generatormcp_write_validated_proposal`

**Skills**: Uses `design-system-migration` skill for component transformation

**Workflow**:
```
0. Auto-Detect → Identify design system from package.json + token files
1. Discover → Scan for custom components and styling
2. Map → Find design system component equivalents
3. Transform → Replace with design system components + tokens
4. Validate → Ensure functionality and a11y preserved
```

**Output**:
```typescript
{
  design_system: { name: string, package: string, version: string },
  components_migrated: ComponentMigration[],
  tokens_applied: { colors: number, spacing: number, typography: number },
  unmappable: ComponentIssue[]
}
```

### Using Agents in Copilot Chat

```
# Start orchestrated migration
@orchestrator Start a new Nuxt 2 to Nuxt 4 migration

# Audit specific module
@auditor Scan the auth module for patterns

# Generate transformation
@transformer Convert the deals Vuex store to Pinia

# Migrate to design system
@design-system-migrator Replace all button components with our design system

# Validate proposal
@validator Check proposal #abc123 for safety
```

### Agent Coordination Example

```
User → @orchestrator: "Migrate the deals module"

@orchestrator spawns @auditor:
  @auditor scans deals module → finds Vuex store, 3 mixins, 5 components
  @auditor returns structured audit report
  
@orchestrator spawns @transformer (for Vuex store):
  @transformer proposes Pinia store → confidence: 0.85
  @transformer spawns @validator
    @validator checks proposal → approved: true
  @transformer writes stores/deals.ts

@orchestrator spawns @transformer (for mixin #1):
  @transformer proposes composable → confidence: 0.92
  @transformer spawns @validator
    @validator checks proposal → approved: true
  @transformer writes composables/useDeals.ts

@orchestrator reports:
  ✅ Deals module migrated
  - 1 Pinia store created
  - 3 composables created
  - 5 components updated
```

## Skills

Skills are domain-specific workflows that agents invoke to perform complex tasks. Located in [.github/skills/](.github/skills/).

### pattern-detection

**Used By**: @auditor

**Purpose**: Systematic pattern detection in Nuxt 2 codebase

**Workflow**:
1. **Initialize Scan** - Set module scope, create audit context
2. **Source Code Discovery** - Find .vue, .js, .ts files
3. **Pattern Matching** - Apply regex patterns for Vuex, mixins, Options API, RxJS
4. **Dependency Mapping** - Track cross-file dependencies
5. **Complexity Assessment** - Score files by transformation difficulty
6. **Risk Flagging** - Identify high-risk transformations
7. **Priority Sorting** - Order by impact + risk + dependencies
8. **Structured Output** - Return JSON with counts, details, recommendations

**Pattern Catalog**:
- Vuex: `mapState`, `mapGetters`, `mapActions`, `$store.dispatch`
- Mixins: `mixins: [...]`, mixin file imports
- Options API: `export default { data(), methods: {}, computed: {} }`
- RxJS: `.pipe(`, `.subscribe(`, `Observable`, `Subject`
- Tracking: `$mixpanel`, `gtag(`, `dataLayer.push`

**Output**:
```json
{
  "patterns_found": {
    "vuex_stores": 5,
    "mixins": 12,
    "options_api": 23
  },
  "complexity_scores": { /* file-level scores */ },
  "dependencies": { /* cross-references */ },
  "recommendations": ["Migrate Vuex first...", "..."]
}
```

### code-transformation

**Used By**: @transformer

**Purpose**: Systematic code transformation workflows

**Transformations**:

#### 1. Vuex → Pinia
- Extract state, getters, actions, mutations
- Convert to Pinia `defineStore` with TypeScript
- Map `$store.dispatch` → `store.action()`
- Replace `mapGetters` → direct refs
- Confidence algorithm: Based on mutation complexity

#### 2. Mixin → Composable
- Extract mixin methods and data
- Convert to `export function use[Name]()` pattern
- Handle lifecycle hooks → watch/onMounted
- Preserve reactivity with `ref`/`reactive`
- Confidence: Lower if uses complex `this` references

#### 3. Options API → Composition API
- Convert `data()` → `ref()`/`reactive()`
- Convert `methods` → functions
- Convert `computed` → `computed()`
- Convert `mounted()` → `onMounted()`
- Handle `this.$refs` and component communication

#### 4. RxJS → async/await
- Convert `Observable.pipe()` → async functions
- Replace `.subscribe()` → await + try/catch
- Handle cancellation with AbortController
- Preserve error handling

**Quality Standards**:
- ✅ TypeScript with strict types
- ✅ Composition API with `<script setup>`
- ✅ Proper error handling
- ✅ design-system-migration

**Used By**: @design-system-migrator

**Purpose**: Migrate custom components and styling to the target design system

**Workflow**:
1. **Discover Custom Components** - Scan for components with custom styling
2. **Fetch Design System Catalog** - Get available components and specs from target design system
3. **Map Components** - Match custom components to design system equivalents
4. **Transform Components** - Replace with design system components and tokens
5. **Apply Design Tokens** - Replace hardcoded colors, spacing, typography with tokens
6. **Validate Accessibility** - Ensure WCAG 2.1 AA compliance
7. **Verify Quality** - Check component API, props mapping, functionality

**Design Tokens**:
- **Colors**: Primary, secondary, error, success, warning, neutral
- **Spacing**: xs (4px), sm (8px), md (16px), lg (24px), xl (32px)
- **Typography**: Font family, sizes, weights, line heights
- **Border Radius**: sm (4px), md (8px), lg (12px), full (9999px)
- **Shadows**: Elevation levels for depth

**Quality Standards**:
- ✅ Replace all hardcoded values with design tokens
- ✅ Maintain original functionality
- ✅ WCAG 2.1 AA accessibility (4.5:1 contrast)
- ✅ Keyboard navigation support
- ✅ Proper ARIA attributes

### Nuxt 3/4 auto-imports
- ✅ Modern ES syntax

### safety-validation

**Used By**: @validator

**Purpose**: Comprehensive validation of transformation proposals

**7-Phase Validation**:

#### Phase 1: Proposal Verification
- Check required fields (proposal_id, source_file, target_file, code)
- Verify transformation type
- Ensure confidence score exists

#### Phase 2: Confidence Check
- Minimum threshold: 0.60
- Flag < 0.70 for manual review
- Auto-approve ≥ 0.85

#### Phase 3: File Safety
- Check if target file exists
- Verify backup will be created
- Prevent accidental overwrites

#### Phase 4: Syntax Validation
- Parse TypeScript/Vue syntax
- Check for syntax errors
- Validate template syntax in .vue files

#### Phase 5: Security Assessment
- Check for hardcoded secrets
- Verify no `eval()` or dangerous patterns
- Check for XSS vulnerabilities in templates

#### Phase 6: Convention Compliance
- Verify Nuxt 3/4 conventions
- Check file naming (kebab-case)
- Validate import paths
- Ensure TypeScript usage

#### Phase 7: Risk Assessment
```typescript
risk_level = (
  file_complexity * 0.3 +
  dependency_count * 0.2 +
  (1 - confidence) * 0.5
)
// High risk if > 0.7
```

**Decision Logic**:
```typescript
if (has_errors || security_issues || confidence < 0.60) {
  return 'fail'
} else if (risk_level > 0.7 || confidence < 0.70) {
  return 'review'  // Manual approval needed
} else {
  return 'pass'    // Auto-approve
}
```

## Hooks

Hooks are event handlers that execute at specific points in the agent workflow. Located in [.github/hooks/](.github/hooks/).

### migration-validator Hook

**Event**: `SubagentStop` - Triggered when a subagent completes

**Purpose**: Validate subagent outputs before allowing completion

**Implementation**: [.github/hooks/migration-validator.ts](.github/hooks/migration-validator.ts)

**Validation by Agent Type**:

#### @auditor Output
```typescript
Required fields:
- agent: 'auditor'
- phase: 'audit'
- action: string
- timestamp: ISO string
- results: { patterns_found, ... }
- recommendations: string[]
```

#### @transformer Output
```typescript
Required fields:
- agent: 'transformer'
- phase: 'transform'
- action: 'propose' | 'validate' | 'write'
- migration_type: string
- timestamp: ISO string

For 'propose':
- proposal_id: string
- confidence: number (0.6-1.0)

For 'validate':
- validation_result: object

For 'write':
- result: { status: string }
```

#### @validator Output
```typescript
Required fields:
- agent: 'validator'
- phase: 'validate'
- proposal_id: string
- validation_result: {
    approved: boolean,
    overall_status: 'pass' | 'fail' | 'review',
    can_auto_approve: boolean,
    checks: object
  }
```

**Action Recording**:
When validation passes, the hook automatically records to:
- `.migration/actions/audits.jsonl` - For @auditor
- `.migration/actions/generations.jsonl` - For @transformer  
- `.migration/actions/validations.jsonl` - For @validator
- `.migration/migration_log.md` - Human-readable log

**Hook Result**:
```typescript
{
  allowed: true,        // Allow completion
  validated: true,      // Passed validation
  agent: 'auditor',
  timestamp: '2026-04-06T...'
}

// Or on failure:
{
  allowed: false,       // Block completion
  validated: false,
  agent: 'transformer',
  error: 'Missing proposal_id',
  suggestion: 'Please provide output matching the transformer agent contract'
}
```

**Benefits**:
- ✅ Enforces structured contracts
- ✅ Prevents incomplete outputs
- ✅ Automatic audit trail
- ✅ Type-safe validation
- ✅ Helpful error messages

## License

MIT
