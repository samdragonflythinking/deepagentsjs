# Dragonfly Multi-Agent Architecture - Exploration Guide

**Purpose:** Reference documentation for understanding and recreating the Dragonfly multi-agent system
**Created:** 2025-11-12
**Status:** Active exploration - DeepAgentsJS migration research

---

## What is Dragonfly?

**Dragonfly Thinking** is a strategic intelligence platform that enables users to analyze complex challenges through multiple specialized analytical frameworks called "lenses." Like a dragonfly's compound eyes that see the world through thousands of facets simultaneously, Dragonfly applies 61+ strategic frameworks (SWOT, PESTLE, Porter's Five Forces, Stakeholder Analysis, Pre-Mortem, etc.) to examine problems from multiple perspectives.

Each lens is an AI agent specialized in a specific strategic methodology. Users engage with an orchestrator agent (Dragonfly AI) that recommends appropriate lenses, delegates analysis to specialized agents, and synthesizes insights across multiple frameworks. The system generates comprehensive markdown reports ("artifacts") that combine evidence-based analysis with transparent reasoning.

The platform is built for strategists, consultants, and decision-makers who need rigorous, multi-perspective analysis rather than superficial advice. Every claim requires evidence, every framework acknowledges its limitations, and insights emerge from systematic application of proven analytical methods.

---

## How the App Works (High-Level Architecture)

### User Experience Flow

```
1. User starts session in a Project
   ↓
2. User asks strategic question
   "Analyze Tesla's competitive position in the EV market"
   ↓
3. Dragonfly AI (orchestrator) responds
   "I recommend Porter's Five Forces + SWOT + Competitive Intelligence"
   ↓
4. User approves
   "Yes, run all three"
   ↓
5. Orchestrator invokes specialized lenses sequentially
   - Porter's Five Forces agent → creates artifact (3-5 min)
   - SWOT Analysis agent → creates artifact (3-5 min)
   - Competitive Intelligence agent → creates artifact (3-5 min)
   ↓
6. User sees artifacts appear in real-time
   Each artifact is a comprehensive markdown report (500-2000+ words)
   ↓
7. Orchestrator synthesizes insights
   "Key findings across all three lenses: [integration]"
   ↓
8. User continues conversation
   "Now run Pre-Mortem to identify failure modes"
   (Pre-Mortem agent can read all 3 previous artifacts for context)
```

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Next.js App (TypeScript, React 19, Tailwind CSS v4)            │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Sidebar    │  │  Chat Panel  │  │  Artifacts   │         │
│  │  (Projects)  │  │  (Messages)  │  │    Panel     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                           ↓                   ↑                 │
│                    Server-Sent Events (SSE)                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ API Route: /api/analysis/start                                  │
│                                                                 │
│  1. Create/reuse session                                        │
│  2. Load project context (project.md, artifacts/index.md)       │
│  3. Inject context into user message                            │
│  4. Stream execution via SSE                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Agent Runner (Claude Agent SDK wrapper)                         │
│                                                                 │
│  1. Create workspace: /tmp/dragonfly-projects/{projectId}/      │
│  2. Load all 61 agent definitions (prompts + tools + metadata)  │
│  3. Write sub-agents to workspace/.claude/agents/*.md           │
│  4. Inject {WORKSPACE_PATH} into prompts                        │
│  5. Register hooks (PreToolUse, PostToolUse)                    │
│  6. Execute primary agent (dragonfly-ai orchestrator)           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Primary Agent: dragonfly-ai (Orchestrator)                      │
│                                                                 │
│  - Analyzes user request                                        │
│  - Recommends appropriate lenses                                │
│  - Invokes specialized agents via Task tool                     │
│  - Synthesizes insights across lenses                           │
│                                                                 │
│  Tools: Read, Write, WebFetch, WebSearch, TodoWrite,            │
│         Bash, Glob, Grep, Task                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Lens Agents (SWOT, PESTLE, Porter's, etc.)                     │
│                                                                 │
│  1. Receive task from orchestrator (via Task tool)              │
│  2. Research evidence (WebSearch, WebFetch, Read past artifacts)│
│  3. Conduct analysis using specialized framework                │
│  4. Create markdown report via Write tool                       │
│     → /outputs/swot-tesla-2025-11-12.md                         │
│                                                                 │
│  Tools: Read, Write, WebFetch, WebSearch, TodoWrite,            │
│         Grep, Glob, Bash                                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ HookManager (Artifact Detection & Telemetry)                    │
│                                                                 │
│  PostToolUse Hook:                                              │
│    1. Detects Write tool to /outputs/*.md                       │
│    2. Extracts title, word count                                │
│    3. Generates AI summaries (short, long, key findings)        │
│    4. Saves to PostgreSQL database                              │
│    5. Adds YAML frontmatter to file                             │
│    6. Updates artifacts/index.md catalog                        │
│    7. Copies to artifacts/ directory                            │
│    8. Emits SSE event → browser shows new artifact              │
│                                                                 │
│  Agent Stack: [dragonfly-ai → dragonfly-swot]                   │
│    → Ensures artifact attributed to correct sub-agent           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PostgreSQL Database                                             │
│                                                                 │
│  - sessions (chat threads)                                      │
│  - messages (user/assistant with execution events)              │
│  - artifacts (reports with summaries and metadata)              │
│  - projects (strategic analysis projects)                       │
│  - file_sources (uploaded documents)                            │
└─────────────────────────────────────────────────────────────────┘
```

### Workspace Structure

```
/tmp/dragonfly-projects/{projectId}/
├── project.md                      # AI-maintained project summary
├── artifacts/                      # Historical artifacts (read-only to agents)
│   ├── index.md                   # Catalog with summaries
│   ├── swot-tesla-2025-11-10.md
│   ├── pestle-ev-market-2025-11-11.md
│   └── ...
├── files/                          # Uploaded documents (read-only)
│   ├── {fileId}.md                # Extracted markdown content
│   └── ...
└── sessions/
    ├── {session1}/                # Past session workspace
    │   └── outputs/
    │       └── analysis1.md
    └── {session2}/                # Active session workspace (read-write)
        ├── .claude/
        │   └── agents/            # Sub-agent definitions (61 files)
        │       ├── dragonfly-swot-analysis.md
        │       ├── dragonfly-pestle-analysis.md
        │       └── ...
        └── outputs/               # New artifacts this session
            └── swot-tesla-2025-11-12.md
```

### Key Mechanisms

1. **Multi-Agent Orchestration**
   - Orchestrator (dragonfly-ai) routes requests to specialized lenses
   - Task tool enables sub-agent invocation (like making a function call)
   - All 61 agents registered upfront for dynamic delegation
   - Agent stack tracks current agent for proper artifact attribution

2. **Artifact Generation**
   - Lens agents use Write tool to save markdown reports to `/outputs/`
   - HookManager watches for Write tool usage via PostToolUse hook
   - Automatic detection by path pattern (no explicit "create artifact" API)
   - Enrichment: generate summaries, add frontmatter, update catalog

3. **Context Accumulation**
   - Project context injected into user message (project.md + artifact catalog)
   - Agents read past artifacts from `artifacts/` directory (read-only access)
   - New artifacts copied to shared `artifacts/` after creation
   - Each session builds on previous work in the project

4. **Real-Time Streaming**
   - Server-Sent Events (SSE) for browser updates
   - HookManager emits events: tool_start, tool_complete, artifact_detected
   - Browser sees tool execution, agent transitions, artifacts in real-time
   - Message streaming includes thinking, text, tool usage

---

## Technology Stack

- **Framework:** Next.js 16.0.0 (App Router, React 19, TypeScript)
- **AI SDK:** Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- **Database:** PostgreSQL 15 (sessions, messages, artifacts)
- **Styling:** Tailwind CSS v4 (CSS-first, oklch color space)
- **UI Components:** shadcn/ui (accessible, customizable)
- **Streaming:** Server-Sent Events (SSE)
- **Package Manager:** pnpm
- **Development:** Turbopack (faster HMR)

---

## Core Concepts

### Lens Agents
Specialized AI agents that apply specific strategic frameworks. Each lens:
- Has a unique system prompt defining its methodology
- Uses specific tools for research and analysis
- Creates structured markdown reports
- Can reference past artifacts for context

**Categories:**
1. Stakeholder Analysis (5 lenses)
2. Risk Analysis (8 lenses)
3. Strategic Planning (9 lenses)
4. Market Analysis (7 lenses)
5. Innovation (6 lenses)
6. Business Strategy (10 lenses)
7. Organizational Design (5 lenses)
8. Decision-Making (6 lenses)
9. Synthesis & Workflows (5 lenses)

### Orchestrator
The Dragonfly AI agent that:
- Clarifies vague strategic questions
- Recommends appropriate lenses based on request
- Plans multi-lens analysis journeys
- Invokes specialized lenses via Task tool
- Synthesizes insights across multiple frameworks
- Maintains conversational context

### Artifacts
Strategic analysis reports generated by lens agents:
- Markdown format (500-2000+ words typical)
- Evidence-based (cites sources, shows reasoning)
- Structured (follows lens-specific templates)
- Enriched (AI summaries, YAML frontmatter, catalog entry)
- Persistent (saved to database and workspace)

### Projects
Strategic analysis workspaces that:
- Group related sessions around a common challenge
- Accumulate artifacts across sessions
- Maintain AI-generated project summary
- Provide shared context to all agents
- Enable multi-session workflows

---

## Key Design Decisions

### Why Claude Agent SDK?
- Native support for sub-agents (Task tool)
- File system tools (Read, Write, Glob, Grep)
- Streaming execution with hooks
- Workspace sandboxing
- Active development by Anthropic

### Why All Agents Registered?
- Enables dynamic orchestration (no predefined workflows)
- Supports cascading delegation (lens → lens → lens)
- Allows agents to reference each other
- Future: Multi-lens synthesis agents

### Why Hook-Based Artifact Detection?
- Decouples lens logic from artifact system
- Agents just use Write tool (simple contract)
- System handles enrichment automatically
- Easy to extend (frontmatter, catalog, summaries)

### Why Read-Only Context Directories?
- Prevents agents from modifying past work
- Enables safe concurrent access
- Clear isolation: new work in `/outputs/`, history in `/artifacts/`
- SDK `additionalDirectories` feature provides this

### Why Project-Based Workspaces?
- Multi-session context accumulation
- Scalable to large strategic initiatives
- Clear project boundaries
- Easy cleanup and archival

---

## Documentation in This Folder

### [multi-agent-architecture-overview.md](./multi-agent-architecture-overview.md)
Comprehensive technical reference covering:
- System overview and architecture
- Agent definition patterns
- Orchestration mechanisms
- Artifact generation pipeline
- Workspace and context management
- Hook system implementation
- Key code patterns

### [agent-tools-and-capabilities.md](./agent-tools-and-capabilities.md)
Complete tool reference including:
- Tool inventory (Read, Write, Glob, Grep, WebFetch, etc.)
- Tool usage by agent type
- Execution patterns
- Custom implementations
- Security and sandboxing
- Usage statistics

### [implementation-examples.md](./implementation-examples.md)
Concrete code examples showing:
- Complete request flow
- Agent execution patterns
- Hook implementations
- Context building
- SSE streaming

### [prompt-file-reference.md](./prompt-file-reference.md)
File paths and organization for:
- Global context prompt
- Orchestrator prompt
- All 61 lens agent prompts
- Category organization
- Prompt structure patterns

---

## Exploration Goal

**Objective:** Evaluate DeepAgentsJS as potential alternative to Claude Agent SDK

**Research Questions:**
1. Can DeepAgentsJS replicate the orchestrator → lens → artifact pattern?
2. How does sub-agent delegation compare to Claude SDK's Task tool?
3. Can we achieve equivalent artifact detection without PostToolUse hooks?
4. What are the performance/cost tradeoffs?
5. Does the middleware architecture offer advantages?

**Minimal Test Sequence:**
1. Create orchestrator agent (Dragonfly AI)
2. Create 2-3 lens agents (SWOT, PESTLE, Stakeholder)
3. Test delegation: orchestrator → SWOT lens
4. Test artifact generation: lens saves markdown report
5. Test context: PESTLE lens reads SWOT artifact
6. Test synthesis: orchestrator reads multiple artifacts

**Success Criteria:**
- ✅ Orchestrator can invoke lenses dynamically
- ✅ Lenses can create markdown reports
- ✅ Artifacts are detected/captured automatically
- ✅ Context flows between lenses
- ✅ Background file uploads work
- ✅ Real-time streaming to terminal (SSE not required for test)

---

## Next Steps

1. **Setup DeepAgentsJS test repository**
   - Initialize new TypeScript project
   - Install DeepAgentsJS dependencies
   - Copy agent prompts from this repo

2. **Recreate core agents**
   - Port dragonfly-ai.md → DeepAgent orchestrator
   - Port 2-3 lens prompts → DeepAgent sub-agents
   - Configure tools (read_file, write_file, etc.)

3. **Test orchestration flow**
   - Terminal-based interaction
   - Orchestrator → lens delegation
   - Artifact generation and detection
   - Multi-lens workflow

4. **Document findings**
   - What works well?
   - What's missing vs Claude SDK?
   - Performance comparison
   - Migration feasibility

5. **Decision point**
   - Continue with Claude SDK (current)
   - Migrate to DeepAgentsJS (if superior)
   - Hybrid approach (DeepAgents for some use cases)

---

## Questions?

Refer to the detailed documentation files in this folder or review the source code:

- **Agent Registry:** `src/lib/agents/lenses.ts`
- **Agent Runner:** `src/lib/sdk/agent-runner.ts`
- **Hook Manager:** `src/lib/sdk/hook-manager.ts`
- **API Route:** `src/app/api/analysis/start/route.ts`
- **Prompts:** `src/lib/agents/prompts/`

**Last Updated:** 2025-11-12
