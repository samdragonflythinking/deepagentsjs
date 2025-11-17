# Dragonfly Multi-Agent Architecture - Comprehensive Overview

**Purpose:** Document the complete multi-agent architecture of Dragonfly Web Prototype for potential migration to DeepAgents
**Date:** 2025-11-12
**Audience:** Technical reference for rebuilding this system with alternative agent frameworks

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Agent Architecture](#agent-architecture)
3. [Orchestration Patterns](#orchestration-patterns)
4. [Artifact Generation System](#artifact-generation-system)
5. [Workspace & Context Management](#workspace--context-management)
6. [Hook System & Telemetry](#hook-system--telemetry)
7. [Key Implementation Details](#key-implementation-details)

---

## System Overview

### What We Built

Dragonfly is a **multi-agent strategic analysis platform** that enables users to analyze complex challenges through 61+ specialized analytical frameworks ("lenses"). Each lens is an AI agent specialized in a specific strategic methodology (SWOT, PESTLE, Porter's Five Forces, etc.).

### Core Architecture

```
User Request
    ↓
API Route (/api/analysis/start)
    ↓
Agent Runner (SDK wrapper)
    ↓
Primary Agent (dragonfly-ai orchestrator)
    ├── Analyzes request
    ├── Recommends appropriate lenses
    └── Invokes specialized lens agents via Task tool
        ↓
Lens Agents (dragonfly-swot, dragonfly-pestle, etc.)
    ├── Conduct analysis
    ├── Create markdown reports via Write tool
    └── Return to orchestrator
        ↓
Hook System (HookManager)
    ├── Detects Write tool usage
    ├── Captures artifacts
    ├── Generates summaries
    └── Emits SSE events
        ↓
Database & Browser
    ├── PostgreSQL (artifacts, sessions, messages)
    └── Real-time UI updates (SSE)
```

### Technology Stack

- **Next.js 16.0.0** (App Router, React 19, TypeScript)
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`)
- **PostgreSQL 15** (sessions, messages, artifacts)
- **Server-Sent Events (SSE)** for real-time streaming
- **Tailwind CSS v4** for UI

---

## Agent Architecture

### Agent Definition Pattern

Unlike traditional config-file approaches, Dragonfly uses a **hybrid pattern**:

1. **Prompts** (pure markdown) - Define agent behavior
2. **TypeScript registry** - Configure tools, models, metadata
3. **Runtime assembly** - SDK dynamically loads and registers all agents

### File Structure

```
src/lib/agents/
├── lenses.ts                    # Agent registry (TypeScript)
└── prompts/
    ├── dragonfly-global-context.md  # Shared context for all agents
    ├── dragonfly-ai.md              # Orchestrator prompt
    ├── 01-stakeholder-analysis/
    │   ├── 01-stakeholder-analysis.md
    │   ├── 02-expert-perspectives.md
    │   └── ...
    ├── 02-risk-analysis/
    │   ├── 01-pestle-analysis.md
    │   ├── 02-swot-analysis.md
    │   └── ...
    └── ... (9 total categories, 61+ lenses)
```

### Agent Registry Example

```typescript
// src/lib/agents/lenses.ts

export const DRAGONFLY_LENSES: Record<string, LensAgentDefinition> = {
  'dragonfly-ai': {
    description: 'Dragonfly AI - Strategic intelligence orchestrator',
    prompt: loadPrompt('dragonfly-ai.md'),
    tools: ['Read', 'Write', 'WebFetch', 'WebSearch', 'TodoWrite', 'Bash', 'Glob', 'Grep', 'Task'],
    model: 'haiku',
    displayName: 'Dragonfly Navigator',
    category: 'meta-agents',
    tagline: 'The central orchestrator for strategic inquiry',
    // ... UI metadata
  },

  'dragonfly-swot-analysis': {
    description: 'Strategic SWOT analysis expert - V2',
    prompt: loadPrompt('02-risk-analysis/02-swot-analysis.md'),
    tools: ['Read', 'Write', 'WebFetch', 'TodoWrite', 'WebSearch', 'Bash'],
    model: 'inherit',
    displayName: 'SWOT Analysis',
    category: 'risk-analysis',
    // ... UI metadata
  },

  // ... 59 more lens agents
};
```

### Prompt Structure

**Global Context (prepended to all lenses):**

```markdown
<!-- src/lib/agents/prompts/dragonfly-global-context.md -->

# Dragonfly Global Context

All Dragonfly lens agents share this foundational context...

## Evidence-Driven Intelligence
Every strategic claim must trace back to verifiable evidence...

## Compound Vision
Complex challenges require multiple perspectives...

## Adaptive Precision
Depth and scope must match stakes and timeline...
```

**Lens-Specific Prompt Example:**

```markdown
<!-- src/lib/agents/prompts/02-risk-analysis/02-swot-analysis.md -->

# SWOT Analysis Expert

You are a strategic analysis expert specializing in SWOT framework.

## Your Task
Conduct comprehensive SWOT analysis identifying:
- Strengths (internal capabilities)
- Weaknesses (internal limitations)
- Opportunities (external factors to leverage)
- Threats (external challenges)

## Report Structure
[Template for the report]

## CRITICAL: File Saving Instructions

**Your workspace location:** `{WORKSPACE_PATH}`

**IMPORTANT - You MUST save your analysis to a file:**

1. Use an absolute path
2. Save to the outputs folder - Path MUST include `/outputs/`
3. Use markdown format - Filename ends with `.md`

**Correct file path format:**
{WORKSPACE_PATH}/outputs/swot-[topic-slug]-[date].md

Example:
{WORKSPACE_PATH}/outputs/swot-tesla-market-analysis-2025-11-12.md
```

### Runtime Workspace Path Injection

**Problem:** Prompts need to work across different environments/sessions
**Solution:** Template placeholder replacement at runtime

```typescript
// src/lib/sdk/agent-runner.ts

const workspace = '/tmp/dragonfly-sessions/abc123';
const promptWithWorkspace = lensAgent.prompt.replace(
  /{WORKSPACE_PATH}/g,
  workspace
);

// Result: Agent receives concrete path instructions
// "{WORKSPACE_PATH}/outputs/swot-..." → "/tmp/dragonfly-sessions/abc123/outputs/swot-..."
```

### Agent Registration Strategy

**Key insight:** All agents are registered upfront, even if only one is invoked.

```typescript
// src/lib/sdk/write-workspace-agents.ts

// Write ALL sub-agents to workspace/.claude/agents/*.md
await writeWorkspaceAgents(workspace, lensId);

// This creates:
// /tmp/dragonfly-sessions/{sessionId}/.claude/agents/
//   ├── dragonfly-swot-analysis.md
//   ├── dragonfly-pestle-analysis.md
//   ├── dragonfly-stakeholder-analysis.md
//   └── ... (all 61 agents)
```

**Why:**
- Enables orchestrator to invoke ANY lens dynamically via Task tool
- Supports multi-lens analysis journeys
- Allows cascading delegation (lens → lens → lens)
- Prevents "agent not found" errors

---

## Orchestration Patterns

### Pattern 1: Orchestrator-Driven Delegation

**Flow:**

```
User: "Analyze Tesla's competitive position"
    ↓
dragonfly-ai (orchestrator)
    ├── Analyzes request nature
    ├── Recommends: Porter's Five Forces + SWOT
    ├── Asks user for approval
    └── User: "Yes, run both"
        ↓
Task tool: dragonfly-porters-five-forces
    ├── Sub-agent conducts analysis
    ├── Saves artifact → /outputs/porters-five-forces-tesla-2025-11-12.md
    └── Returns summary to orchestrator
        ↓
Task tool: dragonfly-swot-analysis
    ├── Sub-agent conducts analysis
    ├── Saves artifact → /outputs/swot-tesla-2025-11-12.md
    └── Returns summary to orchestrator
        ↓
dragonfly-ai
    └── Synthesizes insights from both analyses
```

### Pattern 2: Direct Lens Invocation

**Flow:**

```
User explicitly requests lens: "Run SWOT analysis on drone delivery"
    ↓
API starts dragonfly-swot-analysis directly (bypasses orchestrator)
    ↓
SWOT agent
    ├── Conducts analysis
    ├── Saves artifact
    └── Returns to user
```

### Pattern 3: Multi-Lens Sequential Workflow

**Flow:**

```
dragonfly-ai (orchestrator)
    ├── Lens 1: stakeholder-analysis
    │   └── Artifact: stakeholder-map-2025-11-12.md
    ├── Lens 2: pestle-analysis (reads stakeholder artifact via Read tool)
    │   └── Artifact: pestle-analysis-2025-11-12.md
    ├── Lens 3: pre-mortem-analysis (reads both previous artifacts)
    │   └── Artifact: pre-mortem-2025-11-12.md
    └── Synthesis: Integrates all three perspectives
```

### Task Tool Mechanics

**What the orchestrator does:**

```
Tool: Task
subagent_type: dragonfly-swot-analysis
description: "SWOT analysis for Tesla competitive positioning"
prompt: "Conduct comprehensive SWOT analysis for Tesla focusing on EV market competition, battery technology advantages, regulatory environment, and Chinese competitors"
```

**What the SDK does:**

1. Looks up `dragonfly-swot-analysis` in workspace agents
2. Starts new agent instance with SWOT prompt
3. Runs agent completely (with its own tools)
4. Returns final output to calling agent
5. Orchestrator receives summary for synthesis

**Critical:** Sub-agents inherit workspace directory but get their OWN:
- System prompt (from lens-specific .md file)
- Tool allowlist (from registry)
- Model preference (haiku/sonnet/opus)

---

## Artifact Generation System

### What is an Artifact?

**Definition:** A strategic analysis report generated by a lens agent

**Requirements:**
- Must be markdown (.md)
- Must be in `/outputs/` or `/artifacts/` directory
- Contains structured analysis following lens template
- Saved via Write tool

### Artifact Contract

**Lens agent responsibilities:**

1. Receive analysis task from orchestrator (or user)
2. Conduct analysis using specialized framework
3. Create markdown report following template
4. Save file to `{WORKSPACE_PATH}/outputs/[filename].md` using Write tool

**Example Write tool usage:**

```
Tool: Write
file_path: /tmp/dragonfly-sessions/abc123/outputs/swot-tesla-2025-11-12.md
content: |
  # SWOT Analysis: Tesla Competitive Positioning

  ## Executive Summary
  [Analysis here...]

  ## Strengths
  - Battery technology leadership
  - Vertical integration manufacturing
  ...
```

### Artifact Detection Hook

**The system automatically detects artifacts via PostToolUse hook:**

```typescript
// src/lib/sdk/hook-manager.ts (line 277-418)

async handlePostToolUse(event, toolUseID, options) {
  // 1. Check if Write tool was used
  if (event.tool_name === 'Write') {
    const filePath = event.tool_input?.file_path;
    const content = event.tool_input?.content;

    // 2. Artifact contract check
    const isArtifact =
      filePath &&
      content &&
      filePath.endsWith('.md') &&
      (filePath.includes('/outputs/') || filePath.includes('/artifacts/')) &&
      !filePath.endsWith('/index.md') &&  // Exclude catalog
      !filePath.endsWith('/project.md');   // Exclude summary

    if (isArtifact) {
      // 3. Get current agent from stack (proper attribution)
      const currentAgent = this.agentStack[this.agentStack.length - 1];

      // 4. Extract title from content or filename
      const title = extractTitleFromContent(content) || extractTitleFromFilename(filePath);
      const wordCount = calculateWordCount(content);

      // 5. Generate AI summaries (short/long/key findings)
      const summaries = await generateArtifactSummary(content, title, currentAgent);

      // 6. Save to PostgreSQL
      const artifact = await createArtifact({
        session_id: this.sessionId,
        lens_type: currentAgent,  // ✅ Attribution to actual sub-agent
        title,
        content,
        word_count: wordCount,
        summary_short: summaries.summary_short,
        summary_long: summaries.summary_long,
        key_findings: summaries.key_findings,
      });

      // 7. Add YAML frontmatter to file
      await this.addYamlFrontmatter(filePath, content, artifact, summaries);

      // 8. Update artifacts/index.md catalog
      await this.updateArtifactsIndex(filePath, artifact, summaries);

      // 9. Copy to artifacts/ directory
      await this.copyToArtifactsDirectory(filePath);

      // 10. Emit SSE event for real-time UI update
      this.emitSSE({
        type: 'artifact_detected',
        artifactId: artifact.id,
        artifactTitle: title,
        wordCount,
      });
    }
  }
}
```

### Agent Stack for Proper Attribution

**Problem:** When orchestrator invokes sub-agent, who created the artifact?

**Solution:** Agent execution stack tracks current agent

```typescript
// src/lib/sdk/hook-manager.ts (line 43-95)

class HookManager {
  private agentStack: string[] = [];

  constructor(options) {
    this.agentStack = [options.lensId];  // Start with primary agent
  }

  // PreToolUse hook
  async handlePreToolUse(event, toolUseID, options) {
    // Detect Task tool (sub-agent invocation)
    if (event.tool_name === 'Task' && event.tool_input?.subagent_type) {
      const subAgentName = event.tool_input.subagent_type;

      // Push sub-agent to stack
      this.agentStack.push(subAgentName);

      console.log(`Sub-agent invoked: ${subAgentName}`);
    }
  }

  // PostToolUse hook
  async handlePostToolUse(event, toolUseID, options) {
    // Attribute to current agent (top of stack)
    const currentAgent = this.agentStack[this.agentStack.length - 1];

    // When artifact detected, attribute to currentAgent
    if (event.tool_name === 'Write' && isArtifact) {
      await createArtifact({
        lens_type: currentAgent,  // ✅ Correct attribution
        // ...
      });
    }

    // Pop sub-agent when Task completes
    if (event.tool_name === 'Task' && event.tool_input?.subagent_type) {
      this.agentStack.pop();
    }
  }
}
```

**Result:** Artifacts created by `dragonfly-swot` (invoked via Task) are correctly attributed to SWOT, not orchestrator.

### Artifact Enrichment Pipeline

**After detection, artifacts are enriched:**

```
1. Generate summaries (Claude API)
   ├── summary_short (1-2 sentences)
   ├── summary_long (1 paragraph)
   └── key_findings (3-5 bullet points)

2. Add YAML frontmatter to file
   ---
   title: "SWOT Analysis: Tesla"
   artifact_id: "uuid"
   lens_type: "dragonfly-swot-analysis"
   generated: "2025-11-12"
   word_count: 1250
   summary_short: "..."
   key_findings:
     - "..."
   ---

3. Update artifacts/index.md catalog
   ### SWOT Analysis: Tesla
   - **Date:** 2025-11-12
   - **Lens:** dragonfly-swot-analysis
   - **Words:** 1,250
   - **File:** `artifacts/swot-tesla-2025-11-12.md`
   - **Summary:** Tesla maintains strong battery tech...

4. Copy to artifacts/ directory
   From: sessions/{sessionId}/outputs/swot-tesla-2025-11-12.md
   To:   artifacts/swot-tesla-2025-11-12.md
```

---

## Workspace & Context Management

### Workspace Architecture

**Two modes:**

1. **Legacy Session-Only** (backward compatible)
2. **Project-Based Workspaces** (current)

### Project-Based Workspace Structure

```
/tmp/dragonfly-projects/{projectId}/
├── project.md                     # AI-maintained project summary
├── artifacts/                     # Historical artifacts (read-only to agents)
│   ├── index.md                  # Catalog with summaries
│   ├── swot-tesla-2025-11-10.md
│   ├── pestle-ev-market-2025-11-11.md
│   └── ...
├── files/                         # Uploaded documents (read-only)
│   ├── {fileId}.md               # Extracted markdown content
│   └── ...
└── sessions/
    ├── {session1}/                # Past session workspace
    │   └── outputs/
    │       └── analysis1.md
    └── {session2}/                # Active session workspace (read-write)
        └── outputs/
            └── analysis2.md
```

### Read-Only Context Directories

**Agents get read-only access to shared project context:**

```typescript
// src/lib/sdk/agent-runner.ts (lines 92-111)

if (projectId) {
  const sessionWorkspace = createSessionWorkspace(projectId, sessionId);
  workspace = sessionWorkspace.rootPath;  // Read-write

  const projectWorkspace = getProjectWorkspace(projectId);

  additionalDirectories = [
    projectWorkspace.artifactsDir,  // Read past artifacts
    projectWorkspace.filesDir,      // Read extracted file content
  ];

  console.log(`Session workspace (write): ${workspace}`);
  console.log(`Additional dirs (read-only): ${additionalDirectories.join(', ')}`);
}
```

**SDK configuration:**

```typescript
const sdkOptions = {
  cwd: workspace,  // /tmp/dragonfly-projects/{projectId}/sessions/{sessionId}/
  additionalDirectories: [
    '/tmp/dragonfly-projects/{projectId}/artifacts/',  // Read-only
    '/tmp/dragonfly-projects/{projectId}/files/',      // Read-only
  ],
};
```

**Why this matters:**
- Agents can read past artifacts without modifying them
- New artifacts go to session-specific outputs/ (isolated)
- After detection, artifacts are copied to shared artifacts/ directory
- Project context accumulates across sessions

### Context Injection

**Agents receive project context via prompt injection:**

```typescript
// src/app/api/analysis/start/route.ts (lines 221-244)

let userMessage = prompt;

// Add project summary
if (projectSummary) {
  userMessage = `<project_summary>
${projectSummary}
</project_summary>

${userMessage}`;
}

// Add artifact catalog
if (artifactCatalog) {
  const filePaths = extractFilePathsFromIndex(artifactCatalog);
  const fileList = filePaths.map(path => `- ${path}`).join('\n');

  userMessage = `<artifact_catalog>
## Past Lens Agent Reports

The following strategic analysis reports are available:

${fileList}

You can use Glob, Grep, or Read tools to access these reports.
</artifact_catalog>

${userMessage}`;
}
```

**Example injected context:**

```markdown
<project_summary>
Project: Electric Vehicle Market Analysis

This project analyzes competitive dynamics in the EV market...
</project_summary>

<artifact_catalog>
## Past Lens Agent Reports

- artifacts/swot-tesla-2025-11-10.md
- artifacts/pestle-ev-market-2025-11-11.md
- artifacts/porters-five-forces-2025-11-11.md

You can use Read tools to access these reports.
</artifact_catalog>

Conduct stakeholder analysis for Tesla's supply chain partners
```

### File Upload Context

**When users upload files:**

1. **Extract to markdown** (using Mistral OCR API)
2. **Save to files/{fileId}.md**
3. **Agent reads via Read tool or @-mentions**

**Mention system:**

```typescript
// User message with @-mentions
"Analyze the strategy discussed in @report.pdf"

// Backend builds mention context
const mentionContext = await buildMentionContext(mentions);
// Returns: file content injected as context

// Final prompt to agent
<file_mention file_id="uuid" file_name="report.pdf">
[Extracted markdown content from PDF]
</file_mention>

Analyze the strategy discussed in @report.pdf
```

---

## Hook System & Telemetry

### HookManager Architecture

**Centralized hook handler** (src/lib/sdk/hook-manager.ts, 761 lines)

**Responsibilities:**

1. **Agent Stack Management** - Track parent/child hierarchy
2. **Duration Tracking** - Measure tool/agent execution times
3. **Artifact Detection** - Watch Write tool for artifacts
4. **Artifact Enrichment** - Generate summaries, add frontmatter
5. **SSE Event Emission** - Stream real-time events to browser

### Hook Registration

```typescript
// src/lib/sdk/agent-runner.ts (lines 154-219)

const hookManager = new HookManager({
  sessionId,
  lensId,
  callbacks: {
    onToolEvent,
    onAgentEvent,
    onArtifact,
  },
});

const hooks = {
  PreToolUse: [{
    hooks: [async (event, toolUseID, options) =>
      await hookManager.handlePreToolUse(event, toolUseID, options)
    ],
  }],

  PostToolUse: [{
    hooks: [async (event, toolUseID, options) =>
      await hookManager.handlePostToolUse(event, toolUseID, options)
    ],
  }],
};

// Pass hooks to SDK
for await (const message of query({
  prompt: userMessage,
  options: { hooks, ... },
})) {
  yield message;
}
```

### Hook Event Flow

**PreToolUse (before tool execution):**

```typescript
handlePreToolUse(event, toolUseID, options) {
  // 1. Record start time
  this.toolStartTimes.set(toolUseID, Date.now());

  // 2. Detect Task tool (sub-agent invocation)
  if (event.tool_name === 'Task') {
    const subAgentName = event.tool_input.subagent_type;
    this.agentStack.push(subAgentName);

    // Emit agent_start event
    this.emitSSE({ type: 'agent_start', agent: subAgentName });
  }

  // 3. Emit tool_start event
  const currentAgent = this.agentStack[this.agentStack.length - 1];
  this.emitSSE({
    type: 'tool_start',
    tool: event.tool_name,
    agent: currentAgent,
    params: event.tool_input,
  });
}
```

**PostToolUse (after tool execution):**

```typescript
handlePostToolUse(event, toolUseID, options) {
  // 1. Calculate duration
  const duration = Date.now() - this.toolStartTimes.get(toolUseID);

  // 2. Emit tool_complete event
  const currentAgent = this.agentStack[this.agentStack.length - 1];
  this.emitSSE({
    type: 'tool_complete',
    tool: event.tool_name,
    agent: currentAgent,
    duration,
    result: event.tool_result,
  });

  // 3. Detect Task completion
  if (event.tool_name === 'Task') {
    this.agentStack.pop();  // Pop sub-agent
    this.emitSSE({ type: 'agent_complete', agent: completedAgent });
  }

  // 4. Artifact detection
  if (event.tool_name === 'Write') {
    await this.detectArtifact(event);
  }
}
```

### SSE Event Stream

**Events emitted to browser:**

```typescript
// Tool events
{ type: 'tool_start', tool: 'Write', agent: 'dragonfly-swot', params: {...} }
{ type: 'tool_complete', tool: 'Write', duration: 1234, result: {...} }

// Agent events
{ type: 'agent_start', agent: 'dragonfly-swot' }
{ type: 'agent_complete', agent: 'dragonfly-swot', duration: 45000 }

// Artifact events
{ type: 'artifact_detected', artifactId: 'uuid', artifactTitle: 'SWOT Analysis', wordCount: 1250 }

// Message events (token-by-token streaming)
{ type: 'message_content', agent: 'dragonfly-ai', blockType: 'thinking', text: '...' }
{ type: 'message_content', agent: 'dragonfly-ai', blockType: 'text', text: '...' }
```

**Browser consumption:**

```typescript
// src/app/projects/[id]/sessions/[sessionId]/page.tsx

const eventSource = new EventSource('/api/analysis/events');

eventSource.addEventListener('message', (e) => {
  const event = JSON.parse(e.data);

  if (event.type === 'artifact_detected') {
    // Show new artifact card in UI
    setArtifacts(prev => [...prev, event]);
  }

  if (event.type === 'tool_start') {
    // Show tool execution in timeline
    setTools(prev => [...prev, event]);
  }
});
```

---

## Key Implementation Details

### 1. SDK Query Options

```typescript
// src/lib/sdk/agent-runner.ts (lines 258-282)

const sdkOptions = {
  systemPrompt: primaryPromptWithWorkspace,     // Primary agent prompt
  settingSources: ['project'],                   // Load sub-agents from .claude/agents/*.md
  cwd: workspace,                                // Working directory
  allowedTools: lensAgent.tools,                 // Agent-specific tool allowlist
  hooks,                                         // PreToolUse, PostToolUse
  includePartialMessages: true,                  // Token-by-token streaming
  additionalDirectories: [                       // Read-only context directories
    projectWorkspace.artifactsDir,
    projectWorkspace.filesDir,
  ],
};

for await (const message of query({
  prompt: userMessage,  // Contains project context if available
  options: sdkOptions,
})) {
  yield message;  // Stream to API route → SSE → browser
}
```

### 2. Message Persistence

```typescript
// src/app/api/analysis/start/route.ts

// Save user message
const userMessage = await createMessage(
  sessionId,
  'user',
  prompt,
  undefined,    // executionEvents
  undefined,    // artifactId
  mentions      // @-mentions in message
);

// Collect execution events during stream
const executionEvents: ExecutionEvent[] = [];

for await (const message of runLensAnalysis(options)) {
  // Forward to SSE
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));

  // Track tool/agent events
  if (message.type === 'tool_start' || message.type === 'tool_complete') {
    executionEvents.push(message);
  }
}

// Save assistant message with execution trace
const assistantMessage = await createMessage(
  sessionId,
  'assistant',
  finalContent,
  executionEvents,  // Tool/agent telemetry
  artifactId        // If artifact was created
);
```

### 3. Parallel Sub-Agent Execution

**Problem:** Orchestrator wants to run multiple lenses in parallel

**Current implementation:** Sequential via Task tool

```
dragonfly-ai
  ├── Task: dragonfly-swot      (waits for completion)
  ├── Task: dragonfly-pestle    (waits for completion)
  └── Task: dragonfly-porters   (waits for completion)
```

**Desired:** Parallel execution

```
dragonfly-ai
  ├── Task: dragonfly-swot      ┐
  ├── Task: dragonfly-pestle    ├─ Run in parallel
  └── Task: dragonfly-porters   ┘
```

**Agent stack handling for parallel execution:**

```typescript
// src/lib/sdk/hook-manager.ts (lines 84-94)

// PreToolUse hook
if (event.tool_name === 'Task' && event.tool_input?.subagent_type) {
  const subAgentName = event.tool_input.subagent_type;

  // For parallel execution: Reset stack to just orchestrator
  // This ensures all sub-agents are siblings, not nested
  if (this.agentStack.length > 1) {
    this.agentStack.splice(1);  // Keep only [dragonfly-ai]
  }

  // Push sub-agent (will be popped when Task completes)
  this.agentStack.push(subAgentName);
}
```

**Result:** Agent attribution works correctly even with parallel invocations.

### 4. Tool Formatters for UI

**Problem:** Raw tool params/results are verbose and contain sensitive data

**Solution:** Tool formatters create human-readable summaries

```typescript
// src/lib/tool-formatters.ts

export function formatToolInput(toolName: string, input: any): string {
  if (toolName === 'Write') {
    const wordCount = input.content?.split(/\s+/).length || 0;
    return `Writing ${wordCount} words to ${basename(input.file_path)}`;
  }

  if (toolName === 'Read') {
    return `Reading ${basename(input.file_path)}`;
  }

  if (toolName === 'Task') {
    return `Invoking ${input.subagent_type} sub-agent`;
  }

  // ... more formatters
}

export function formatToolOutput(toolName: string, output: any): string {
  if (toolName === 'Write') {
    return `File created successfully`;
  }

  if (toolName === 'Read') {
    const lineCount = output.content?.split('\n').length || 0;
    return `Read ${lineCount} lines`;
  }

  // ... more formatters
}
```

**Usage in hooks:**

```typescript
const inputSummary = formatToolInput(event.tool_name, event.tool_input);
const outputSummary = formatToolOutput(event.tool_name, event.tool_result);

this.emitSSE({
  type: 'tool_complete',
  inputSummary,   // "Writing 1250 words to swot-tesla-2025-11-12.md"
  outputSummary,  // "File created successfully"
});
```

### 5. Artifact Summary Generation

**Uses Claude API to generate summaries:**

```typescript
// src/lib/summaries/generate-summaries.ts

export async function generateArtifactSummary(
  content: string,
  title: string,
  lensType: string
): Promise<ArtifactSummaries> {
  const prompt = `You are analyzing a strategic analysis report created by the ${lensType} lens agent.

Report title: ${title}

Generate:
1. summary_short: 1-2 sentence summary
2. summary_long: 1 paragraph (3-5 sentences)
3. key_findings: 3-5 bullet points (most important insights)

Report content:
${content}

Return JSON: { summary_short, summary_long, key_findings }`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  return JSON.parse(response.content[0].text);
}
```

**Summaries stored in:**
1. Database (artifacts table)
2. YAML frontmatter (file)
3. Artifact catalog (index.md)

### 6. Project Summary Evaluation

**After each session, evaluate if project summary needs updating:**

```typescript
// src/lib/summaries/evaluate-update.ts

export async function evaluateProjectSummaryUpdate(
  projectId: string,
  sessionId: string
): Promise<{ needsUpdate: boolean; reasoning: string }> {
  // 1. Load current project.md
  const currentSummary = readProjectSummary(projectId);

  // 2. Get session artifacts
  const sessionArtifacts = await getArtifactsBySession(sessionId);

  // 3. Ask Claude: Does summary need updating?
  const prompt = `Current project summary:
${currentSummary}

New artifacts from session:
${sessionArtifacts.map(a => `- ${a.title}: ${a.summary_short}`).join('\n')}

Does the project summary need updating?
Return JSON: { needsUpdate: boolean, reasoning: string }`;

  const response = await callClaude(prompt);
  return JSON.parse(response);
}
```

**If needsUpdate = true:**
- Generate new project summary
- Write to project.md
- Log update in session metadata

---

## Summary

### Core Components

1. **Agent Registry** - TypeScript config + markdown prompts
2. **Agent Runner** - SDK wrapper with workspace path injection
3. **Hook Manager** - Centralized event handling and artifact detection
4. **Workspace System** - Project-based with read-only context directories
5. **SSE Streaming** - Real-time events to browser
6. **Database** - PostgreSQL for sessions, messages, artifacts

### Key Patterns

1. **Orchestrator Delegation** - Primary agent routes to specialized lenses via Task tool
2. **Artifact Contract** - Write tool to /outputs/*.md triggers automatic capture
3. **Agent Stack** - Tracks current agent for proper attribution
4. **Context Injection** - Project summary + artifact catalog prepended to user message
5. **Hook-Based Detection** - PostToolUse hook watches for Write tool
6. **Enrichment Pipeline** - Generate summaries → add frontmatter → update catalog

### Critical Insights

1. **All agents registered upfront** - Enables dynamic orchestration
2. **Workspace path templating** - Prompts work across environments
3. **Agent stack for attribution** - Sub-agents properly credited for artifacts
4. **Read-only context dirs** - Agents reference past work without modification
5. **SSE for real-time UI** - Browser sees tool execution as it happens
6. **Telemetry via hooks** - Complete execution trace for debugging and UX

---

## Files Reference

**Key implementation files:**

- `src/lib/agents/lenses.ts` - Agent registry (2200 lines)
- `src/lib/agents/prompts/` - Agent prompts (61+ files)
- `src/lib/sdk/agent-runner.ts` - SDK wrapper (315 lines)
- `src/lib/sdk/hook-manager.ts` - Hook event handler (761 lines)
- `src/lib/workspace/index.ts` - Workspace management
- `src/app/api/analysis/start/route.ts` - API route (SSE streaming)
- `src/app/api/analysis/events/route.ts` - SSE event emitter
- `docs/architecture/agent-orchestration.md` - Architecture guide

---

**End of documentation. This provides a complete technical reference for rebuilding the multi-agent system with alternative frameworks like DeepAgents.**
