# Agent Tools and Capabilities Reference

**Purpose:** Document all tools available to Dragonfly agents and their usage patterns
**Date:** 2025-11-12
**Audience:** Reference for recreating agent tooling in DeepAgents or other frameworks

---

## Table of Contents

1. [Tool Inventory](#tool-inventory)
2. [Tool Usage by Agent Type](#tool-usage-by-agent-type)
3. [Tool Execution Patterns](#tool-execution-patterns)
4. [Custom Tool Implementations](#custom-tool-implementations)
5. [Tool Security & Sandboxing](#tool-security--sandboxing)

---

## Tool Inventory

### Core SDK Tools

**These tools are provided by the Claude Agent SDK:**

#### 1. Read Tool
**Purpose:** Read file contents from workspace or additional directories

**Input:**
```typescript
{
  file_path: string;  // Absolute path to file
  offset?: number;    // Line offset to start reading
  limit?: number;     // Max lines to read
}
```

**Output:**
```typescript
{
  content: string;    // File contents with line numbers
}
```

**Usage by agents:**
- Read past artifacts for context (`artifacts/swot-analysis.md`)
- Read uploaded files (`files/{fileId}.md`)
- Read project summary (`project.md`)
- Read artifact catalog (`artifacts/index.md`)

**Example:**
```
Tool: Read
file_path: /tmp/dragonfly-projects/proj-123/artifacts/swot-tesla-2025-11-10.md
```

---

#### 2. Write Tool
**Purpose:** Create or overwrite files in workspace

**Input:**
```typescript
{
  file_path: string;  // Absolute path to file
  content: string;    // File contents
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Critical for artifact generation:**
- Path MUST include `/outputs/` or `/artifacts/`
- Filename MUST end with `.md`
- Triggers artifact detection hook

**Example:**
```
Tool: Write
file_path: /tmp/dragonfly-projects/proj-123/sessions/sess-456/outputs/swot-tesla-2025-11-12.md
content: |
  # SWOT Analysis: Tesla Competitive Positioning

  ## Executive Summary
  ...
```

---

#### 3. Glob Tool
**Purpose:** Find files matching glob patterns

**Input:**
```typescript
{
  pattern: string;    // Glob pattern (e.g., "*.md", "artifacts/**/*.md")
  path?: string;      // Directory to search (defaults to cwd)
}
```

**Output:**
```typescript
{
  files: string[];    // Array of matching file paths
}
```

**Usage by agents:**
- Find all SWOT analyses: `artifacts/swot-*.md`
- Find all artifacts from November: `artifacts/*-2025-11-*.md`
- List all available reports: `artifacts/*.md`

**Example:**
```
Tool: Glob
pattern: artifacts/swot-*.md
```

---

#### 4. Grep Tool
**Purpose:** Search file contents using regex patterns

**Input:**
```typescript
{
  pattern: string;           // Regex pattern
  path?: string;             // File or directory to search
  glob?: string;             // Glob pattern to filter files
  output_mode?: string;      // "content" | "files_with_matches" | "count"
  multiline?: boolean;       // Enable multiline matching
  "-i"?: boolean;            // Case insensitive
  "-n"?: boolean;            // Show line numbers
  "-A"?: number;             // Lines of context after match
  "-B"?: number;             // Lines of context before match
  "-C"?: number;             // Lines of context around match
}
```

**Output:**
```typescript
{
  matches: string[];  // Matching lines or file paths
}
```

**Usage by agents:**
- Search for mentions of "Tesla" in past analyses
- Find artifacts discussing "regulatory challenges"
- Identify which reports reference stakeholder analysis

**Example:**
```
Tool: Grep
pattern: "regulatory challenges"
path: artifacts/
glob: "*.md"
output_mode: "files_with_matches"
```

---

#### 5. WebFetch Tool
**Purpose:** Fetch web pages and convert to markdown

**Input:**
```typescript
{
  url: string;     // URL to fetch
  prompt: string;  // What to extract from page
}
```

**Output:**
```typescript
{
  content: string;  // Extracted content in markdown
}
```

**Usage by agents:**
- Fetch company websites for competitive analysis
- Get regulatory information from government sites
- Research industry trends from news articles

**Example:**
```
Tool: WebFetch
url: "https://www.tesla.com/investor-relations"
prompt: "Extract key financial metrics and strategic priorities"
```

---

#### 6. WebSearch Tool
**Purpose:** Search the web and return results

**Input:**
```typescript
{
  query: string;              // Search query
  allowed_domains?: string[]; // Only include these domains
  blocked_domains?: string[]; // Never include these domains
}
```

**Output:**
```typescript
{
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}
```

**Usage by agents:**
- Research current market conditions for PESTLE analysis
- Find expert opinions for stakeholder analysis
- Get recent news for trend identification

**Example:**
```
Tool: WebSearch
query: "electric vehicle market share 2025"
```

---

#### 7. Bash Tool
**Purpose:** Execute shell commands

**Input:**
```typescript
{
  command: string;               // Command to execute
  timeout?: number;              // Max execution time (ms)
  run_in_background?: boolean;   // Run without waiting
}
```

**Output:**
```typescript
{
  stdout: string;
  stderr: string;
  exit_code: number;
}
```

**Usage by agents:**
- List files: `ls -la artifacts/`
- Count words: `wc -w outputs/swot-tesla.md`
- Search files: `find artifacts/ -name "*.md"`

**Example:**
```
Tool: Bash
command: "ls -la artifacts/"
```

**Security note:** Sandboxed to workspace directory

---

#### 8. Task Tool
**Purpose:** Invoke sub-agents

**Input:**
```typescript
{
  subagent_type: string;    // Agent ID to invoke
  description: string;       // Short task description
  prompt: string;            // Detailed instructions
  model?: string;            // Override model (optional)
}
```

**Output:**
```typescript
{
  result: string;  // Sub-agent's final response
}
```

**Critical for orchestration:**
- Orchestrator delegates to specialized lenses
- Enables multi-lens workflows
- Sub-agent runs completely before returning

**Example:**
```
Tool: Task
subagent_type: dragonfly-swot-analysis
description: "SWOT analysis for Tesla competitive positioning"
prompt: "Conduct comprehensive SWOT analysis for Tesla focusing on EV market competition, battery technology advantages, regulatory environment, and Chinese competitors like BYD and NIO"
```

---

#### 9. TodoWrite Tool
**Purpose:** Create task lists for planning

**Input:**
```typescript
{
  todos: Array<{
    content: string;       // Task description
    status: string;        // "pending" | "in_progress" | "completed"
    activeForm: string;    // Present continuous form
  }>;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Usage by agents:**
- Orchestrator plans multi-lens analysis journey
- Complex lenses break down multi-step workflows
- Track progress through analysis phases

**Example:**
```
Tool: TodoWrite
todos: [
  {
    content: "Conduct stakeholder mapping",
    status: "completed",
    activeForm: "Conducting stakeholder mapping"
  },
  {
    content: "Run PESTLE analysis for regulatory environment",
    status: "in_progress",
    activeForm: "Running PESTLE analysis"
  },
  {
    content: "Synthesize stakeholder and regulatory insights",
    status: "pending",
    activeForm: "Synthesizing insights"
  }
]
```

---

### MCP Tools (Model Context Protocol)

**Additional tools available via MCP servers:**

#### Playwright Tools
- `mcp__playwright__browser_navigate` - Navigate to URL
- `mcp__playwright__browser_snapshot` - Capture page accessibility tree
- `mcp__playwright__browser_click` - Click elements
- `mcp__playwright__browser_type` - Type text into forms

**Not currently used by lens agents** (available for future extensions)

#### Chrome DevTools Tools
- `mcp__chrome-devtools__take_snapshot` - Text snapshot via a11y tree
- `mcp__chrome-devtools__click` - Click elements
- `mcp__chrome-devtools__fill` - Fill form fields

**Not currently used by lens agents** (available for future extensions)

---

## Tool Usage by Agent Type

### Orchestrator Agent (dragonfly-ai)

**Tools:**
```typescript
tools: ['Read', 'Write', 'WebFetch', 'WebSearch', 'TodoWrite', 'Bash', 'Glob', 'Grep', 'Task']
```

**Primary patterns:**

1. **Read project context:**
```
Read: project.md               → Understand project goals
Read: artifacts/index.md       → See past analyses
Glob: artifacts/*.md           → List available reports
```

2. **Plan analysis journey:**
```
TodoWrite: Create multi-step plan
Task: Invoke lens 1 (stakeholder analysis)
Task: Invoke lens 2 (PESTLE analysis)
Task: Invoke lens 3 (synthesis)
```

3. **Research context:**
```
WebSearch: "electric vehicle market trends 2025"
WebFetch: https://www.iea.org/reports/global-ev-outlook-2025
```

4. **Synthesize insights:**
```
Read: artifacts/swot-tesla-2025-11-12.md
Read: artifacts/pestle-ev-market-2025-11-12.md
Write: outputs/synthesis-competitive-positioning-2025-11-12.md
```

---

### Analysis Lens Agents (SWOT, PESTLE, etc.)

**Tools:**
```typescript
tools: ['Read', 'Write', 'WebFetch', 'WebSearch', 'TodoWrite', 'Grep', 'Glob']
```

**Primary patterns:**

1. **Research and gather evidence:**
```
WebSearch: "Tesla battery technology advantages"
WebFetch: https://www.tesla.com/investor-relations
Read: files/{uploaded-industry-report}.md
```

2. **Review past analyses:**
```
Grep: pattern="regulatory challenges" path="artifacts/"
Read: artifacts/stakeholder-analysis-2025-11-10.md
```

3. **Conduct structured analysis:**
```
TodoWrite: Plan analysis phases
# Phase 1: Gather evidence
# Phase 2: Analyze strengths
# Phase 3: Analyze weaknesses
# ...
```

4. **Create artifact:**
```
Write: outputs/swot-tesla-2025-11-12.md
# Triggers artifact detection hook
# Generates summaries
# Updates catalog
```

---

### Workflow Orchestrator Agents

**Tools:**
```typescript
tools: ['Read', 'Write', 'WebFetch', 'WebSearch', 'TodoWrite', 'Bash', 'Task']
```

**Example:** Risk Workflow Orchestrator

**Pattern:**
```
1. Understand context
   Read: project.md
   Read: artifacts/index.md

2. Plan workflow
   TodoWrite:
     - Risk identification (PESTLE)
     - Risk analysis (SWOT, Pre-Mortem)
     - Risk mitigation (Risk Mitigation lens)

3. Execute sequence
   Task: dragonfly-pestle-analysis
   Task: dragonfly-swot-analysis
   Task: dragonfly-pre-mortem-analysis
   Task: dragonfly-risk-mitigation-resilience

4. Synthesize
   Read: All 4 artifacts
   Write: outputs/risk-assessment-synthesis-2025-11-12.md
```

---

## Tool Execution Patterns

### Pattern 1: Evidence-Gathering Workflow

**Used by:** PESTLE, Stakeholder Analysis, Competitive Intelligence

```
1. WebSearch: Broad research on topic
   → "electric vehicle regulatory environment 2025"

2. WebFetch: Deep-dive on specific sources
   → https://www.iea.org/reports/global-ev-outlook-2025
   → https://www.tesla.com/investor-relations

3. Read: Review uploaded context files
   → files/{industry-report}.md
   → files/{market-analysis}.md

4. Grep: Search past analyses for relevant insights
   → pattern="regulatory" path="artifacts/"

5. Write: Create evidence-based artifact
   → outputs/pestle-ev-market-2025-11-12.md
```

---

### Pattern 2: Multi-Lens Orchestration

**Used by:** Orchestrator, Workflow Orchestrators

```
1. Read: Understand project context
   → project.md
   → artifacts/index.md

2. TodoWrite: Plan analysis journey
   → 3-lens workflow: Stakeholder → PESTLE → SWOT

3. Task: Invoke lens 1
   → dragonfly-stakeholder-analysis
   → Wait for completion
   → Artifact: stakeholder-map-2025-11-12.md

4. Task: Invoke lens 2 (with context)
   → dragonfly-pestle-analysis
   → Prompt includes: "Consider stakeholder insights from previous analysis"
   → Artifact: pestle-analysis-2025-11-12.md

5. Task: Invoke lens 3 (with full context)
   → dragonfly-swot-analysis
   → Prompt includes: "Integrate stakeholder and PESTLE findings"
   → Artifact: swot-analysis-2025-11-12.md

6. Read: All three artifacts for synthesis
   → artifacts/stakeholder-map-2025-11-12.md
   → artifacts/pestle-analysis-2025-11-12.md
   → artifacts/swot-analysis-2025-11-12.md

7. Write: Integrated synthesis
   → outputs/strategic-assessment-synthesis-2025-11-12.md
```

---

### Pattern 3: Iterative Refinement

**Used by:** Deep Research, Complex Analysis

```
1. WebSearch: Initial broad research
   → "autonomous vehicle regulatory landscape"

2. Grep: Check if topic already covered
   → pattern="autonomous" path="artifacts/"

3. Read: Review existing coverage
   → artifacts/pestle-ev-market-2025-11-10.md

4. TodoWrite: Plan research phases
   → Phase 1: Federal regulations
   → Phase 2: State-level variations
   → Phase 3: International comparison

5. WebFetch × 3: Deep-dive each phase
   → NHTSA regulations
   → California DMV autonomous vehicle rules
   → EU autonomous driving framework

6. Write: Comprehensive research artifact
   → outputs/autonomous-vehicle-regulations-2025-11-12.md
```

---

### Pattern 4: Cascade Context Building

**Used by:** Sequential multi-lens workflows

```
Lens 1: Stakeholder Analysis
  Write: outputs/stakeholder-map.md
  → Artifact detected
  → Copied to artifacts/stakeholder-map.md
  → Catalog updated

Lens 2: PESTLE Analysis
  Read: artifacts/stakeholder-map.md  ← Uses Lens 1 output
  Write: outputs/pestle-analysis.md
  → Artifact detected
  → Copied to artifacts/pestle-analysis.md

Lens 3: Pre-Mortem
  Read: artifacts/stakeholder-map.md     ← Uses Lens 1 output
  Read: artifacts/pestle-analysis.md     ← Uses Lens 2 output
  Write: outputs/pre-mortem-analysis.md
  → Artifact detected
  → Uses both previous artifacts as context
```

**Key insight:** Each lens can reference all previous artifacts via Read tool

---

## Custom Tool Implementations

### Tool Execution Tracking

**HookManager tracks every tool call:**

```typescript
// PreToolUse hook
handlePreToolUse(event, toolUseID, options) {
  // 1. Record start time
  this.toolStartTimes.set(toolUseID, Date.now());

  // 2. Extract parameters
  const sanitizedInput = this.sanitizeParams(event.tool_input);

  // 3. Format for display
  const inputSummary = formatToolInput(event.tool_name, sanitizedInput);
  // "Writing 1250 words to swot-tesla-2025-11-12.md"

  // 4. Emit real-time event
  this.emitSSE({
    type: 'tool_start',
    tool: event.tool_name,
    agent: this.getCurrentAgent(),
    inputSummary,
  });
}

// PostToolUse hook
handlePostToolUse(event, toolUseID, options) {
  // 1. Calculate duration
  const duration = Date.now() - this.toolStartTimes.get(toolUseID);

  // 2. Format output
  const outputSummary = formatToolOutput(event.tool_name, event.tool_result);
  // "File created successfully"

  // 3. Detect artifacts
  if (event.tool_name === 'Write' && isArtifact(event.tool_input.file_path)) {
    await this.detectArtifact(event);
  }

  // 4. Emit completion event
  this.emitSSE({
    type: 'tool_complete',
    tool: event.tool_name,
    duration,
    outputSummary,
  });
}
```

---

### Tool Input/Output Formatters

**Human-readable summaries for UI:**

```typescript
// src/lib/tool-formatters.ts

export function formatToolInput(toolName: string, input: any): string {
  const formatters: Record<string, (input: any) => string> = {
    Write: (i) => {
      const words = i.content?.split(/\s+/).length || 0;
      const filename = basename(i.file_path);
      return `Writing ${words.toLocaleString()} words to ${filename}`;
    },

    Read: (i) => `Reading ${basename(i.file_path)}`,

    Grep: (i) => `Searching for "${i.pattern}" in ${i.path || 'workspace'}`,

    Glob: (i) => `Finding files matching "${i.pattern}"`,

    WebFetch: (i) => `Fetching ${new URL(i.url).hostname}`,

    WebSearch: (i) => `Searching for "${i.query}"`,

    Task: (i) => `Invoking ${i.subagent_type} sub-agent`,

    Bash: (i) => `Running: ${i.command.substring(0, 50)}${i.command.length > 50 ? '...' : ''}`,

    TodoWrite: (i) => {
      const pending = i.todos?.filter((t: any) => t.status === 'pending').length || 0;
      return `Managing ${i.todos?.length || 0} tasks (${pending} pending)`;
    },
  };

  return formatters[toolName]?.(input) || `Using ${toolName} tool`;
}

export function formatToolOutput(toolName: string, output: any): string {
  const formatters: Record<string, (output: any) => string> = {
    Write: () => 'File created successfully',

    Read: (o) => {
      const lines = o.content?.split('\n').length || 0;
      return `Read ${lines.toLocaleString()} lines`;
    },

    Grep: (o) => {
      const matches = o.matches?.length || 0;
      return `Found ${matches} match${matches !== 1 ? 'es' : ''}`;
    },

    Glob: (o) => {
      const files = o.files?.length || 0;
      return `Found ${files} file${files !== 1 ? 's' : ''}`;
    },

    WebFetch: (o) => {
      const words = o.content?.split(/\s+/).length || 0;
      return `Fetched ${words.toLocaleString()} words`;
    },

    WebSearch: (o) => {
      const results = o.results?.length || 0;
      return `Found ${results} result${results !== 1 ? 's' : ''}`;
    },

    Task: (o) => {
      const words = o.result?.split(/\s+/).length || 0;
      return `Sub-agent completed (${words.toLocaleString()} word response)`;
    },

    Bash: (o) => {
      const lines = o.stdout?.split('\n').length || 0;
      return o.exit_code === 0
        ? `Command succeeded (${lines} lines output)`
        : `Command failed (exit code ${o.exit_code})`;
    },

    TodoWrite: () => 'Tasks updated',
  };

  return formatters[toolName]?.(output) || 'Tool completed';
}
```

---

### MCP Tool Identity Detection

**Distinguish SDK tools from MCP tools:**

```typescript
// src/lib/tool-formatters.ts

export function getToolIdentity(toolName: string): {
  displayName: string;
  isMcp: boolean;
  mcpServer?: string;
} {
  // MCP tools start with "mcp__"
  if (toolName.startsWith('mcp__')) {
    const parts = toolName.split('__');
    const server = parts[1];  // e.g., "playwright", "chrome-devtools"
    const method = parts[2];  // e.g., "browser_navigate", "take_snapshot"

    return {
      displayName: `${method.replace(/_/g, ' ')} (${server})`,
      isMcp: true,
      mcpServer: server,
    };
  }

  // SDK tools
  return {
    displayName: toolName,
    isMcp: false,
  };
}
```

---

## Tool Security & Sandboxing

### Workspace Isolation

**Tools are sandboxed to agent's workspace:**

```typescript
// SDK configuration
const sdkOptions = {
  cwd: '/tmp/dragonfly-projects/proj-123/sessions/sess-456/',
  additionalDirectories: [
    '/tmp/dragonfly-projects/proj-123/artifacts/',  // Read-only
    '/tmp/dragonfly-projects/proj-123/files/',      // Read-only
  ],
};
```

**Restrictions:**

1. **Read tool:**
   - Can read files in `cwd` (read-write)
   - Can read files in `additionalDirectories` (read-only)
   - Cannot read files outside these directories

2. **Write tool:**
   - Can only write to `cwd`
   - Cannot write to `additionalDirectories` (read-only)
   - Cannot write outside workspace

3. **Bash tool:**
   - Commands executed with `cwd` as working directory
   - No access to files outside workspace
   - Standard Unix permissions apply

### Artifact Path Validation

**HookManager validates artifact paths:**

```typescript
private async detectArtifact(event: PostToolUseEvent) {
  const filePath = event.tool_input?.file_path;

  // Must be markdown
  if (!filePath.endsWith('.md')) return;

  // Must be in outputs or artifacts
  if (!filePath.includes('/outputs/') && !filePath.includes('/artifacts/')) {
    return;
  }

  // Exclude special files
  if (filePath.endsWith('/index.md') || filePath.endsWith('/project.md')) {
    return;
  }

  // Valid artifact - proceed with detection
  await this.processArtifact(event);
}
```

### Sensitive Data Sanitization

**Tool parameters sanitized before logging/SSE:**

```typescript
private sanitizeParams(params: any): any {
  // Remove circular references and DOM elements
  const sanitized = sanitizeForJSON(params);

  // Truncate large content
  if (sanitized.content && typeof sanitized.content === 'string') {
    if (sanitized.content.length > 200) {
      sanitized.content = `${sanitized.content.substring(0, 200)}... (${sanitized.content.length} chars)`;
    }
  }

  // Remove sensitive fields
  delete sanitized.apiKey;
  delete sanitized.password;
  delete sanitized.token;

  return sanitized;
}
```

---

## Tool Usage Statistics

**From production usage:**

### Orchestrator (dragonfly-ai)
- **Task** - 95% (delegation to lenses)
- **Read** - 80% (project context, past artifacts)
- **TodoWrite** - 60% (planning multi-lens journeys)
- **Write** - 40% (synthesis artifacts)
- **WebSearch** - 20% (context research)

### Analysis Lenses (SWOT, PESTLE, etc.)
- **Write** - 100% (all lenses create artifacts)
- **Read** - 70% (reference past analyses)
- **WebFetch** - 50% (evidence gathering)
- **WebSearch** - 40% (current data)
- **Grep** - 30% (search past artifacts)
- **TodoWrite** - 20% (complex analysis planning)

### Workflow Orchestrators
- **Task** - 100% (sequential lens invocation)
- **Read** - 90% (context + all sub-artifacts)
- **Write** - 80% (synthesis artifacts)
- **TodoWrite** - 70% (workflow planning)

---

## Key Insights for Migration

### 1. Tool Allowlists Matter

**Each agent has specific tools:**
- Orchestrator needs Task for delegation
- All lenses need Write for artifacts
- Not all lenses need WebFetch/WebSearch
- Workflow orchestrators need Task + Read + Write

### 2. Hook-Based Artifact Detection

**No explicit "create artifact" API:**
- Agents just use Write tool
- System detects by path pattern
- Automatic enrichment and cataloging
- Decouples lens logic from artifact system

### 3. Tool Execution Order

**Tools are synchronous:**
- Agent waits for tool to complete
- Task tool waits for entire sub-agent execution
- No parallel tool execution within single agent
- But orchestrator can invoke multiple sub-agents

### 4. Context via Read Tool

**Agents read their own context:**
- No "context injection" beyond user message
- Agents explicitly Read past artifacts
- Enables selective context loading
- Reduces token usage

### 5. Tool Output is Structured

**Not just text:**
- Read returns `{ content: string }`
- Glob returns `{ files: string[] }`
- WebSearch returns `{ results: Array<{...}> }`
- Agents can parse and process tool outputs

---

## Summary

### Tool Categories

1. **File Operations** - Read, Write, Glob, Grep
2. **Web Access** - WebFetch, WebSearch
3. **System** - Bash
4. **Orchestration** - Task, TodoWrite
5. **MCP Extensions** - Playwright, Chrome DevTools (available but unused)

### Critical Patterns

1. **Artifact Generation** - Write to /outputs/*.md
2. **Multi-Lens Delegation** - Task tool with subagent_type
3. **Context Reading** - Read past artifacts from additionalDirectories
4. **Evidence Gathering** - WebSearch + WebFetch for research
5. **Planning** - TodoWrite for complex multi-step workflows

### Security Boundaries

1. **Workspace sandboxing** - Tools restricted to cwd + additionalDirectories
2. **Read-only context** - Past artifacts cannot be modified
3. **Path validation** - Artifacts must match specific patterns
4. **Sanitization** - Tool params cleaned before logging/SSE

---

**End of tool reference. This provides complete documentation of tool usage patterns for recreating the agent tooling layer.**
