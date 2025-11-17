# Prompt Adaptation Guide: Claude SDK → DeepAgents

**Date:** 2025-11-12
**Purpose:** Detailed guide for adapting Dragonfly prompts from Claude SDK to DeepAgents
**Status:** Reference Document

---

## Overview

This guide documents the specific changes needed to adapt Dragonfly agent prompts from Claude Agent SDK to DeepAgentsJS.

---

## Source Files

### Claude SDK Prompts

```
/Users/sam/Documents/GitHub/dtclaudecode/
├── src/lib/agents/prompts/
│   ├── dragonfly-global-context.md (21KB - shared context)
│   ├── dragonfly-ai.md (49KB - orchestrator)
│   ├── 01-stakeholder-analysis/
│   │   └── 01-stakeholder-analysis.md
│   ├── 02-risk-analysis/
│   │   ├── 01-pestle-analysis.md (34KB)
│   │   ├── 02-swot-analysis.md (21KB)
│   │   └── ...
│   └── ...
└── dragonfly/Resources/prompt-operational-instructions/
    ├── dragonfly-ai-operational-instructions/
    │   ├── agent-delegation.md (17KB)
    │   ├── file-path-conventions.md
    │   ├── project-context-format.md
    │   ├── tool-usage.md
    │   └── workspace-navigation.md
    └── lens-operational-instructions/
        ├── background-documents.md
        ├── evidence-protocol.md
        ├── file-saving-protocol.md (3KB - CRITICAL)
        ├── report-structure.md
        └── success-criteria.md
```

---

## Prompt Structure Pattern

### Claude SDK Structure

```markdown
<!-- Lens agent prompt file -->
---
name: dragonfly-swot-analysis
description: Systematic SWOT evaluation...
category: dragonfly
subcategory: strategic-positioning
tools: Read, Write, WebFetch, WebSearch, TodoWrite, Bash
model: inherit
---

# SWOT Analysis

Note: Load this file together with `_shared/GLOBAL_DRAGONFLY_CONTEXT.md`

<role-definition>
[Lens-specific role and methodology]
</role-definition>

<context-assessment>
[Tier guidance, required context]
</context-assessment>

<framework-methodology>
[How to conduct this analysis]
</framework-methodology>

<evidence-standards>
[Evidence requirements]
</evidence-standards>

<report-structure>
[Output format]
</report-structure>
```

**At Runtime:** Global context is prepended, operational instructions are injected, `{WORKSPACE_PATH}` is replaced.

### DeepAgents Target Structure

```markdown
<!-- Combined prompt file -->
<!-- PART 1: Global Context (prepended) -->
# Dragonfly Global Context
[Three pillars, core capabilities, quality standards...]

<!-- PART 2: Operational Instructions (adapted) -->
## Tool Usage for DeepAgents
[Tool name mappings, file-saving protocol...]

<!-- PART 3: Lens-Specific Prompt -->
# SWOT Analysis Lens

<role-definition>
[Same as Claude SDK]
</role-definition>

[Rest of lens prompt with adapted tool names and paths]
```

**Key Differences:**
- Single combined file (no runtime composition needed)
- Explicit tool name mappings
- Simplified path handling (no `{WORKSPACE_PATH}` placeholder)

---

## Required Adaptations

### 1. Tool Name Changes

| Claude SDK | DeepAgents | Status | Notes |
|------------|-----------|--------|-------|
| `Task` | `task` | ✅ Ready | Sub-agent invocation |
| `Write` | `write_file` | ✅ Ready | Create/overwrite files |
| `Read` | `read_file` | ✅ Ready | Read file contents |
| `Glob` | `glob` | ✅ Ready | Pattern-based file search |
| `Grep` | `grep` | ✅ Ready | Content search |
| `TodoWrite` | `write_todos` | ✅ Ready | Task list management |
| `WebFetch` | ❌ Missing | ⚠️ Skip for Phase 1 | External data fetch |
| `WebSearch` | ❌ Missing | ⚠️ Skip for Phase 1 | Web search |
| `Bash` | ❌ Missing | ⚠️ Skip for Phase 1 | Shell commands |

### 2. File Path Simplification

**Claude SDK Version:**
```markdown
## File Saving Protocol

**Your workspace location:** `{WORKSPACE_PATH}`

**File path format:**
```
{WORKSPACE_PATH}/outputs/[framework-slug]-[topic-slug]-YYYY-MM-DD.md
```

**Example:**
```
{WORKSPACE_PATH}/outputs/swot-tesla-2025-11-12.md
```

**Tool usage:**
```
Tool: Write
file_path: {WORKSPACE_PATH}/outputs/swot-tesla-2025-11-12.md
content: [Your report here]
```
```

**DeepAgents Version:**
```markdown
## File Saving Protocol

**Your workspace location:** Current working directory (handled automatically)

**File path format:**
```
outputs/[framework-slug]-[topic-slug]-YYYY-MM-DD.md
```

**Example:**
```
outputs/swot-tesla-2025-11-12.md
```

**Tool usage:**
```
Tool: write_file
file_path: outputs/swot-tesla-2025-11-12.md
content: [Your report here]
```

**Important:** Always use relative paths from workspace root. The `outputs/` directory is your working area.
```

### 3. Task Tool Invocation

**Claude SDK Version:**
```markdown
## Delegating to Lens Agents

Use the **Task tool** to invoke specialized lens agents:

```
Tool: Task
subagent_type: dragonfly-swot-analysis
description: "SWOT analysis for Tesla competitive positioning"
prompt: |
  Conduct comprehensive SWOT analysis for Tesla...

  Context:
  - Industry: Electric vehicles
  - Competitors: BYD, NIO, traditional OEMs
  - Time horizon: 18-month plan

  Expected Output:
  - 8-10 findings per SWOT quadrant
  - Quantified claims where possible
  - Strategic recommendations
model: sonnet  # Optional
```
```

**DeepAgents Version:**
```markdown
## Delegating to Lens Agents

Use the **task tool** to invoke specialized lens agents:

```
Tool: task
subagent_type: dragonfly-swot
description: "SWOT analysis for Tesla competitive positioning"
prompt: |
  Conduct comprehensive SWOT analysis for Tesla...

  Context:
  - Industry: Electric vehicles
  - Competitors: BYD, NIO, traditional OEMs
  - Time horizon: 18-month plan

  Expected Output:
  - 8-10 findings per SWOT quadrant
  - Quantified claims where possible
  - Strategic recommendations
```

**Note:** Agent names use simplified format (e.g., `dragonfly-swot` instead of `dragonfly-swot-analysis`). Model selection is configured at agent creation, not per-invocation.
```

### 4. Reading Past Artifacts

**Claude SDK Version:**
```markdown
## Accessing Past Analyses

Use the **Read tool** to access previous lens reports:

```
Tool: Read
file_path: {WORKSPACE_PATH}/artifacts/swot-tesla-2025-11-10.md
```

**Available directories:**
- `{WORKSPACE_PATH}/outputs/` - Current session artifacts (read-write)
- `{WORKSPACE_PATH}/artifacts/` - Past artifacts from all sessions (read-only)
- `{WORKSPACE_PATH}/files/` - Uploaded documents (read-only)
```

**DeepAgents Version:**
```markdown
## Accessing Past Analyses

Use the **read_file tool** to access previous lens reports:

```
Tool: read_file
file_path: outputs/swot-tesla-2025-11-10.md
```

**Available directories:**
- `outputs/` - All artifacts (read-write)

**Note:** For initial testing, all artifacts are in the `outputs/` directory. In production, you may have separate `artifacts/` and `files/` directories.
```

### 5. Removing Web Research Instructions

**Claude SDK Version:**
```markdown
## Evidence Gathering

Use multiple tools to gather evidence:

1. **WebSearch** - Find current market data, news, trends
   ```
   Tool: WebSearch
   query: "electric vehicle market share 2024"
   ```

2. **WebFetch** - Deep-dive on specific sources
   ```
   Tool: WebFetch
   url: "https://www.iea.org/reports/global-ev-outlook-2024"
   prompt: "Extract key findings on EV adoption rates"
   ```

3. **Read** - Access uploaded documents
   ```
   Tool: Read
   file_path: {WORKSPACE_PATH}/files/market-report.md
   ```
```

**DeepAgents Version (Phase 1 - No Web Tools):**
```markdown
## Evidence Gathering

**Note:** For this test implementation, web research tools are not available. Use provided context and uploaded documents only.

**Available tools:**

1. **read_file** - Access uploaded documents or past analyses
   ```
   Tool: read_file
   file_path: outputs/previous-analysis.md
   ```

2. **glob** - Find relevant files by pattern
   ```
   Tool: glob
   pattern: outputs/swot-*.md
   ```

3. **grep** - Search file contents
   ```
   Tool: grep
   pattern: "market share"
   path: outputs/
   ```

**For comprehensive analyses:** Request user provide relevant data in the initial prompt or via uploaded documents.
```

---

## Step-by-Step Adaptation Process

### For Orchestrator (dragonfly-ai)

**Step 1: Combine source files**
```bash
# Pseudo-code for manual combination
GLOBAL_CONTEXT = read('dragonfly-global-context.md')
ORCHESTRATOR = read('dragonfly-ai.md')
OPERATIONAL = read('dragonfly-ai-operational-instructions/*.md')

COMBINED = GLOBAL_CONTEXT + "\n\n---\n\n" + OPERATIONAL + "\n\n---\n\n" + ORCHESTRATOR
```

**Step 2: Adapt tool names**
- Find/replace: `Tool: Task` → `Tool: task`
- Find/replace: `Tool: Write` → `Tool: write_file`
- Find/replace: `Tool: Read` → `Tool: read_file`

**Step 3: Simplify paths**
- Find/replace: `{WORKSPACE_PATH}/outputs/` → `outputs/`
- Find/replace: `{WORKSPACE_PATH}/artifacts/` → `outputs/` (for Phase 1)
- Remove references to `additionalDirectories`

**Step 4: Update agent catalog**
```markdown
<!-- Claude SDK version -->
Available agents: dragonfly-swot-analysis, dragonfly-pestle-analysis, ...

<!-- DeepAgents version -->
Available agents: dragonfly-swot, dragonfly-pestle, dragonfly-stakeholder
(Limited set for Phase 1 testing)
```

**Step 5: Remove web tool instructions**
- Remove WebFetch usage examples
- Remove WebSearch usage examples
- Remove Bash usage examples

**Step 6: Add DeepAgents-specific guidance**
```markdown
## Important Notes for DeepAgents Implementation

**Tool Naming:**
- Use lowercase tool names: `task`, `write_file`, `read_file`
- No WebFetch, WebSearch, or Bash tools available in this test

**File Paths:**
- Use relative paths: `outputs/filename.md`
- All artifacts go to `outputs/` directory

**Agent Registry:**
- Available sub-agents: dragonfly-swot, dragonfly-pestle, dragonfly-stakeholder
- Use exact names in `subagent_type` field
```

---

### For Lens Agents (SWOT, PESTLE, Stakeholder)

**Step 1: Combine source files**
```bash
GLOBAL_CONTEXT = read('dragonfly-global-context.md')
LENS_PROMPT = read('02-risk-analysis/02-swot-analysis.md')
LENS_OPERATIONAL = read('lens-operational-instructions/*.md')

COMBINED = GLOBAL_CONTEXT + "\n\n---\n\n" + LENS_OPERATIONAL + "\n\n---\n\n" + LENS_PROMPT
```

**Step 2: Adapt tool names**
Same as orchestrator (Task → task, Write → write_file, etc.)

**Step 3: Simplify file-saving protocol**
```markdown
<!-- Replace entire "File Saving Protocol" section with: -->

## File Saving Protocol

**CRITICAL:** You MUST save your analysis to a file for it to be visible.

**Required format:**
```
outputs/[framework-slug]-[topic-slug]-YYYY-MM-DD.md
```

**Examples:**
- `outputs/swot-tesla-competitive-position-2025-11-12.md`
- `outputs/pestle-ev-market-australia-2025-11-12.md`
- `outputs/stakeholder-healthcare-reform-2025-11-12.md`

**Tool usage:**
```
Tool: write_file
file_path: outputs/swot-tesla-2025-11-12.md
content: |
  # SWOT Analysis: Tesla Competitive Position

  ## Executive Summary
  [Your analysis here...]
```

**Path requirements:**
- ✅ Must start with `outputs/`
- ✅ Must end with `.md`
- ✅ Use lowercase with hyphens
- ❌ No spaces in filename
- ❌ No absolute paths (e.g., `/tmp/...`)
```

**Step 4: Remove/adapt web research sections**
```markdown
<!-- If section says "Use WebSearch to gather..." -->
<!-- Replace with: -->

## Evidence Gathering

**Note:** Web research tools are not available in this test. Base your analysis on:
1. Context provided in the user's prompt
2. Past analyses you can read from `outputs/` directory
3. Any uploaded documents mentioned by user

If insufficient information is available, acknowledge limitations and work with what you have.
```

**Step 5: Update artifact reading instructions**
```markdown
<!-- Claude SDK version -->
Use Read tool to access past analyses from `artifacts/` directory:
```
Tool: Read
file_path: {WORKSPACE_PATH}/artifacts/swot-tesla-2025-11-10.md
```

<!-- DeepAgents version -->
Use read_file tool to access past analyses from `outputs/` directory:
```
Tool: read_file
file_path: outputs/swot-tesla-2025-11-10.md
```

You can also use glob to find relevant past analyses:
```
Tool: glob
pattern: outputs/swot-*.md
```
```

---

## Testing the Adapted Prompts

### Validation Checklist

Before running tests, verify each adapted prompt has:

**Orchestrator:**
- ✅ Global context prepended
- ✅ Operational instructions included
- ✅ Tool names updated (Task → task, etc.)
- ✅ Agent catalog lists correct sub-agent names
- ✅ File paths use relative format
- ✅ No references to web tools
- ✅ Clear guidance on available sub-agents

**Lens Agents:**
- ✅ Global context prepended
- ✅ Lens operational instructions included
- ✅ Tool names updated
- ✅ File-saving protocol uses `outputs/` and `write_file`
- ✅ Artifact reading uses `outputs/` and `read_file`
- ✅ No references to web tools (or marked as unavailable)
- ✅ Evidence gathering adapted for no-web scenario

### Manual Testing

**Test 1: Orchestrator recognizes available agents**
```typescript
const prompt = `List all available lens agents you can invoke.`;
// Expect: Lists dragonfly-swot, dragonfly-pestle, dragonfly-stakeholder
```

**Test 2: Orchestrator delegates correctly**
```typescript
const prompt = `Run a SWOT analysis on Tesla.`;
// Expect: Uses task tool with subagent_type: "dragonfly-swot"
```

**Test 3: Lens saves artifact**
```typescript
const prompt = `Conduct SWOT analysis on Tesla's competitive position.`;
// Expect: Creates outputs/swot-tesla-2025-11-12.md
```

**Test 4: Lens reads past artifact**
```typescript
// After SWOT completes
const prompt = `Run PESTLE analysis that references the SWOT findings.`;
// Expect: PESTLE uses read_file on outputs/swot-tesla-2025-11-12.md
```

---

## Common Adaptation Mistakes

### ❌ Mistake 1: Leaving `{WORKSPACE_PATH}` placeholder

**Wrong:**
```markdown
Tool: write_file
file_path: {WORKSPACE_PATH}/outputs/swot-tesla.md
```

**Right:**
```markdown
Tool: write_file
file_path: outputs/swot-tesla.md
```

### ❌ Mistake 2: Using capitalized tool names

**Wrong:**
```markdown
Tool: Write
file_path: outputs/swot-tesla.md
```

**Right:**
```markdown
Tool: write_file
file_path: outputs/swot-tesla.md
```

### ❌ Mistake 3: Referencing unavailable agents

**Wrong:**
```markdown
Available agents: dragonfly-swot-analysis, dragonfly-pestle-analysis, ...
(Lists all 68 agents)
```

**Right:**
```markdown
Available agents for Phase 1 testing:
- dragonfly-swot
- dragonfly-pestle
- dragonfly-stakeholder

(Additional agents will be added in later phases)
```

### ❌ Mistake 4: Keeping web tool instructions without adaptation

**Wrong:**
```markdown
Use WebSearch to find market data:
Tool: WebSearch
query: "EV market share 2024"
```

**Right:**
```markdown
**Note:** WebSearch is not available in this test. Base analysis on:
- Context provided in prompt
- Past analyses in outputs/ directory
- Uploaded documents (if mentioned by user)

If web research is critical, request user provide relevant data.
```

### ❌ Mistake 5: Not combining global context

**Wrong:**
```markdown
<!-- Just the lens prompt, no global context -->
# SWOT Analysis

You are a SWOT analysis expert...
```

**Right:**
```markdown
<!-- Global context first -->
# Dragonfly Global Context

[Three pillars, core capabilities...]

---

<!-- Then lens prompt -->
# SWOT Analysis

You are a SWOT analysis expert...
```

---

## Helper Functions (Optional)

For programmatic prompt combination:

```typescript
// examples/dragonfly-test/prompt-builder.ts

import fs from 'fs';
import path from 'path';

export interface PromptSources {
  globalContext: string;
  operationalInstructions: string[];
  lensPrompt: string;
}

export function combinePrompts(sources: PromptSources): string {
  const parts = [
    sources.globalContext,
    ...sources.operationalInstructions,
    sources.lensPrompt,
  ];

  return parts.join('\n\n---\n\n');
}

export function adaptToolNames(prompt: string): string {
  return prompt
    .replace(/Tool: Task\b/g, 'Tool: task')
    .replace(/Tool: Write\b/g, 'Tool: write_file')
    .replace(/Tool: Read\b/g, 'Tool: read_file')
    .replace(/Tool: Glob\b/g, 'Tool: glob')
    .replace(/Tool: Grep\b/g, 'Tool: grep')
    .replace(/Tool: TodoWrite\b/g, 'Tool: write_todos');
}

export function simplifyPaths(prompt: string): string {
  return prompt
    .replace(/\{WORKSPACE_PATH\}\/outputs\//g, 'outputs/')
    .replace(/\{WORKSPACE_PATH\}\/artifacts\//g, 'outputs/')
    .replace(/\{WORKSPACE_PATH\}\/files\//g, 'outputs/')
    .replace(/\{WORKSPACE_PATH\}/g, '.');
}

export function removeWebToolReferences(prompt: string): string {
  // Add clear notes that web tools are unavailable
  const webToolNote = `
## ⚠️ Web Tools Unavailable

**Note:** WebFetch, WebSearch, and Bash tools are not available in this DeepAgents test.

For evidence gathering:
- Use context provided in user prompt
- Read past analyses with read_file tool
- Request user provide relevant documents/data

If web research is critical for your analysis, acknowledge this limitation and work with available information.

---

`;

  return webToolNote + prompt;
}

export function buildDeepAgentsPrompt(sources: PromptSources): string {
  let prompt = combinePrompts(sources);
  prompt = adaptToolNames(prompt);
  prompt = simplifyPaths(prompt);
  prompt = removeWebToolReferences(prompt);
  return prompt;
}
```

**Usage:**
```typescript
import { buildDeepAgentsPrompt } from './prompt-builder';

const swotPrompt = buildDeepAgentsPrompt({
  globalContext: fs.readFileSync('./prompts/global-context.md', 'utf-8'),
  operationalInstructions: [
    fs.readFileSync('./prompts/lens-operational-instructions.md', 'utf-8'),
  ],
  lensPrompt: fs.readFileSync('./prompts/swot-lens.md', 'utf-8'),
});

// swotPrompt is now ready for DeepAgents
```

---

## Summary

**Key adaptations required:**
1. ✅ Combine global context + operational instructions + lens prompt
2. ✅ Update tool names (Task → task, Write → write_file, etc.)
3. ✅ Simplify file paths (remove `{WORKSPACE_PATH}`)
4. ✅ Remove/adapt web tool instructions
5. ✅ Update agent catalog to match available sub-agents

**Quick checklist for each prompt:**
- [ ] Global context prepended?
- [ ] Tool names lowercase?
- [ ] File paths relative?
- [ ] Web tools removed/adapted?
- [ ] Agent names match subagent config?
- [ ] File-saving protocol clear?

---

**Next Step:** Use this guide when creating prompts for Phase 1 testing in `examples/dragonfly-test/prompts/`
