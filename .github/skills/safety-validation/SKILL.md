---
name: safety-validation
description: Comprehensive safety and quality validation workflow with 7-phase checks (confidence, file safety, syntax, security, conventions, risk assessment)
---

# Safety Validation Skill

**Purpose**: Comprehensive safety and quality validation workflow for code transformation proposals.

**Used by**: @validator agent

**Domain**: Static analysis, quality assurance, risk assessment

---

## Overview

This skill provides systematic validation of transformation proposals to ensure safety, correctness, and quality before code is written to the target codebase.

## Validation Philosophy

```markdown
"Validate everything, trust nothing, approve carefully"

- Every proposal must pass ALL safety checks
- Confidence threshold is non-negotiable
- File safety is paramount
- Quality is as important as correctness
```

## Comprehensive Validation Workflow

### Phase 1: Proposal Verification

#### Step 1: Load Proposal
```markdown
Input: proposal_id

Verify:
1. Proposal exists in generator MCP
2. Proposal has required fields:
   - migration_type
   - source path
   - target path
   - confidence score
   - generated code
3. Proposal is in valid state (not already written)
```

#### Step 2: Metadata Validation
```markdown
Check:
✅ proposal_id format valid
✅ timestamp present
✅ migration_type recognized
✅ source/target paths absolute
✅ confidence value 0.0-1.0
```

---

### Phase 2: Confidence Threshold Check

#### Algorithm

```markdown
PASS Criteria:
- confidence ≥ 0.80 (auto-approval threshold)
- OR user explicitly approved
- OR force flag set (with warning)

REVIEW Criteria:
- 0.70 ≤ confidence < 0.80
- Flag for manual review
- Provide specific reasons

FAIL Criteria:
- confidence < 0.70
- Reject auto-approval
- Require manual implementation
```

#### Output

```json
{
  "check": "confidence_threshold",
  "status": "pass|review|fail",
  "threshold": 0.80,
  "actual": confidence_value,
  "message": "Specific feedback",
  "auto_approve_eligible": boolean
}
```

---

### Phase 3: File Safety Checks

#### Check 1: Target Path Validation

```markdown
Verify:
1. Target path is absolute
2. Target path is within target directory
3. Target path has valid extension (.ts, .vue, .js)
4. Target directory structure is sane

Red flags:
❌ Path traversal attempts (../)
❌ System directories (/etc, /usr, etc.)
❌ Outside target codebase
```

#### Check 2: File Conflict Detection

```markdown
Scenarios:

A. Target file does NOT exist:
✅ PASS - Safe to write
   message: "No conflicts, safe to create"

B. Target file exists AND backup available:
⚠️ WARN - Proceed with caution
   message: "File exists, backup will be created"
   action: Show diff if possible

C. Target file exists AND recent modifications:
⚠️ WARN - High risk
   message: "File recently modified, review recommended"
   action: Display modification timestamp
   
D. Target file exists AND no backup possible:
❌ FAIL - Cannot proceed
   message: "Cannot create backup, manual merge required"
```

#### Check 3: Backup Verification

```markdown
Verify backup strategy:
1. Backup directory exists or can be created
2. Backup path doesn't conflict
3. Sufficient disk space (if checkable)
4. Backup will contain full content

Backup naming: .migration/backups/{timestamp}_{filename}
```

---

### Phase 4: Code Quality Validation

#### Check 1: Syntax Validation

```markdown
TypeScript/JavaScript:
1. Use TypeScript compiler to parse
2. Check for syntax errors
3. Validate import statements
4. Check for undefined references

PASS: No syntax errors
WARN: Linting issues (non-critical)
FAIL: Parse errors, undefined vars

Tools:
- TSC (TypeScript Compiler)
- ESLint (if available)
- Basic regex for common errors
```

#### Check 2: Vue SFC Validation

```markdown
For .vue files:
1. Verify <template> syntax
2. Check <script setup> or <script>
3. Validate <style> if present
4. Ensure proper structure

PASS: Valid SFC structure
FAIL: Malformed template, missing sections
```

#### Check 3: Import Path Validation

```markdown
Check all import statements:
1. Verify relative paths resolve
2. Check package imports exist in package.json
3. Validate import syntax
4. Flag missing dependencies

Example checks:
- import { defineStore } from 'pinia' → verify pinia in deps
- import MyComponent from '../components/MyComponent.vue'
  → verify file exists (if possible)
```

#### Check 4: Type Safety

```markdown
For TypeScript:
1. Check type annotations present
2. Verify no 'any' types (warn if found)
3. Check interface/type definitions
4. Validate function signatures

PASS: Proper types throughout
WARN: Some 'any' types
FAIL: Type errors from compiler
```

---

### Phase 5: Security Checks

#### Check 1: Secret Detection

```markdown
Scan for:
❌ API keys: /api[_-]?key.*['"][a-zA-Z0-9]{20,}/i
❌ Tokens: /token.*['"][a-zA-Z0-9]{20,}/i
❌ Passwords: /password.*['"]/i
❌ Database strings: /mongodb:\/\/|postgres:\/\//i

If found:
- FAIL validation
- Flag security issue
- Require removal
```

#### Check 2: Injection Vulnerabilities

```markdown
Check for:
❌ SQL injection: Direct string concat in queries
❌ XSS potential: Unescaped user input in templates
❌ eval() usage: eval( or new Function(
❌ innerHTML: Direct innerHTML assignments

If found:
- WARN or FAIL based on severity
- Suggest safe alternatives
```

#### Check 3: Dependency Safety

```markdown
Verify:
1. No known vulnerable packages
2. Peer dependencies satisfied
3. No circular dependencies
4. Compatible versions
```

---

### Phase 6: Nuxt 3/4 Conventions

#### Check 1: File Location

```markdown
Verify file in correct directory:
✅ Stores: stores/ or store/
✅ Composables: composables/
✅ Components: components/
✅ API: server/api/ or api/
✅ Utils: utils/

WARN: Non-standard location
```

#### Check 2: Naming Conventions

```markdown
Stores:
✅ use[Name]Store.ts or [name].ts
❌ [Name]Store.ts, store-[name].ts

Composables:
✅ use[Name].ts
❌ [Name]Composable.ts, [name].ts

Components:
✅ PascalCase.vue
✅ kebab-case.vue (warn: prefer PascalCase)
❌ snake_case.vue
```

#### Check 3: Pattern Compliance

```markdown
Pinia store:
✅ Uses defineStore
✅ Has state, actions, getters
✅ Proper export

Composable:
✅ Starts with 'use'
✅ Returns object with public API
✅ Uses ref/reactive correctly

Component:
✅ Uses <script setup> or standard setup()
✅ Proper props/emits definition
✅ Composition API patterns
```

---

### Phase 7: Risk Assessment

#### Risk Level Calculation

```markdown
LOW RISK (score 0-3):
- Confidence ≥ 0.85
- No file conflicts
- Valid syntax
- No security issues
- Standard patterns
→ Auto-approve eligible

MEDIUM RISK (score 4-6):
- 0.70 ≤ Confidence < 0.85
- File exists with backup
- Minor linting warnings
- Moderate complexity
→ Manual review recommended

HIGH RISK (score 7-10):
- Confidence < 0.70
- File conflicts without resolution
- Syntax errors
- Security concerns
- Complex custom patterns
→ Reject auto-approval, require manual review

Risk Formula:
risk_score = 
  (10 - confidence*10) * 0.4 +
  (file_conflicts ? 3 : 0) +
  (syntax_errors * 2) +
  (security_issues * 3) +
  (complexity_issues * 1)
```

---

## Validation Decision Matrix

```markdown
┌──────────────┬─────────┬──────────┬──────────┬────────────┐
│   Scenario   │ Conf.   │ Conflicts│ Syntax   │ Decision   │
├──────────────┼─────────┼──────────┼──────────┼────────────┤
│   Ideal      │  ≥0.85  │   None   │  Valid   │  APPROVE   │
│   Good       │  ≥0.80  │   None   │  Valid   │  APPROVE   │
│   Acceptable │  ≥0.80  │  Backup  │  Valid   │  APPROVE   │
│   Risky      │  0.70+  │  Backup  │  Valid   │  REVIEW    │
│   Unsafe     │  <0.70  │   Any    │  Valid   │  REJECT    │
│   Broken     │   Any   │   Any    │  Errors  │  REJECT    │
│   Insecure   │   Any   │   Any    │  Any     │  REJECT    │
└──────────────┴─────────┴──────────┴──────────┴────────────┘
```

---

## Output Contract

### Approved Validation

```json
{
  "agent": "validator",
  "phase": "validate",
  "action": "validate_proposal",
  "proposal_id": "prop_xyz",
  "validation_result": {
    "approved": true,
    "overall_status": "pass",
    "risk_level": "low",
    "can_auto_approve": true,
    "checks": {
      "confidence_threshold": { "status": "pass", /* details */ },
      "file_safety": { "status": "pass", /* details */ },
      "syntax": { "status": "pass", /* details */ },
      "security": { "status": "pass", /* details */ },
      "conventions": { "status": "pass", /* details */ }
    }
  },
  "next_step": "write_validated_proposal"
}
```

### Rejected Validation

```json
{
  "agent": "validator",
  "phase": "validate",
  "action": "validate_proposal",
  "proposal_id": "prop_xyz",
  "validation_result": {
    "approved": false,
    "overall_status": "fail",
    "risk_level": "high",
    "can_auto_approve": false,
    "checks": {
      "confidence_threshold": { "status": "fail", "reason": "..." },
      "syntax": { "status": "fail", "errors": [...] }
    }
  },
  "failure_reasons": ["...", "..."],
  "recommendations": ["...", "..."],
  "next_step": "Manual review required"
}
```

---

## Error Handling

### On Validation Failure

```markdown
1. Document ALL failure reasons
2. Provide specific line numbers if applicable
3. Suggest concrete fixes
4. Offer alternative approaches
5. Log to validations.jsonl
6. Return structured rejection
```

### On Partial Pass

```markdown
If some checks pass, some fail:
1. List passed checks
2. List failed checks with details
3. Calculate overall risk
4. Provide remediation steps
5. Allow user override (with warnings)
```

---

## Best Practices

### Before Validation

```markdown
✅ Ensure proposal is complete
✅ Verify tools are available
✅ Check target environment
```

### During Validation

```markdown
✅ Run ALL checks (don't short-circuit)
✅ Collect ALL issues before failing
✅ Provide detailed feedback
✅ Be objective and consistent
```

### After Validation

```markdown
✅ Log comprehensive results
✅ Update proposal status
✅ Provide clear next steps
✅ Return structured output
```

## Integration Checklist

```markdown
Before calling this skill:
✅ Proposal ID available
✅ Generator MCP accessible
✅ Validation tools ready

After using this skill:
✅ Results logged to validations.jsonl
✅ Proposal status updated
✅ Decision clear (approve/review/reject)
✅ Next steps provided
```
