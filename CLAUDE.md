# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**deepagents** is a TypeScript package for creating "Deep Agents" - LLM agents capable of handling complex, multi-step tasks through a combination of planning tools, subagent spawning, file system access, and detailed prompts. This is a TypeScript port of the Python deepagents library, maintaining 1:1 compatibility.

The package is built on LangGraph and provides three core middleware components:
1. **TodoListMiddleware** - Planning and task decomposition via `write_todos` tool
2. **FilesystemMiddleware** - Context management via file system tools (`ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`)
3. **SubAgentMiddleware** - Subagent spawning via `task` tool for context isolation

## Current Mission: Dragonfly Migration Exploration

**Status:** ✅ **Phase 1 Complete** - Multi-Agent Orchestration Proven (2025-11-17)

This repository is being evaluated as a potential alternative to Claude Agent SDK for **Dragonfly Thinking**, a 68-agent strategic intelligence platform.

**Phase 1 Results:** Successfully validated that DeepAgentsJS can replicate Dragonfly's multi-agent orchestration patterns where an orchestrator agent dynamically invokes specialized "lens" agents that produce markdown artifacts. All 5 tests passed, including ultra-minimal SWOT test that generated a professional 10KB analysis in 90 seconds.

### Key Documentation
- **Migration Plan:** `docs/planning/deepagents-migration-plan-v2.md` (detailed 5-phase test plan)
- **Current Status:** `docs/planning/STATUS.md` (approval checklist, next steps)
- **Dragonfly Architecture:** `docs/DTclaude-multi-agent-setup/` (current system reference)
- **Prompt Adaptation:** `docs/planning/prompt-adaptation-guide.md` (porting guide)

### Critical Success Criteria (P0)
When working on this project, prioritize features that enable:
1. **Orchestrator → Lens Delegation** - Orchestrator invoking sub-agents via `task` tool
2. **Artifact Creation** - Lenses creating markdown files via filesystem tools
3. **Context Cascade** - Lens 2 reading artifacts created by Lens 1
4. **Multi-Lens Workflow** - Orchestrator invoking 2-3+ lenses sequentially
5. **Chat Routing** - Lens outputs hidden from user chat (only orchestrator visible)
6. **Execution Limits** - Max tool calls, subagent spawns, recursion depth enforced
7. **Schema Validation** - Artifact frontmatter and structure validated

### Implementation Phases (10-15 hours total)
- ✅ **Phase 1 COMPLETE** (4h): Basic orchestration test - ALL TESTS PASSED
  - Orchestrator → SWOT lens delegation works perfectly
  - Artifact creation via write_file successful (10KB professional SWOT)
  - 5/5 tests passed (including framework validation)
  - Key learning: Simple prompts work flawlessly, complex prompts cause hanging
- **Phase 2** (3-4h): Context cascade + limits middleware + schema validation
- **Phase 3** (3-4h): Multi-lens synthesis + chat routing + HITL interrupts
- **Phase 4** (1-2h): Scalability test (15 agents, 5-lens workflow)
- **Phase 5** (1-2h): Performance comparison and migration decision

### Confirmed Advantages Over Claude SDK (Phase 1 Validated)
- ✅ **Multi-agent orchestration works perfectly** - Orchestrator → subagent delegation via task tool
- ✅ **Built-in filesystem tools** - FilesystemMiddleware provides all needed file operations (tested)
- ✅ **Flexible backend abstraction** - FilesystemBackend with virtualMode works flawlessly
- ✅ **Open source** - Community extensibility and reduced vendor lock-in
- ✅ **Per-lens middleware** - Each sub-agent can have its own middleware stack (not yet tested)
- ✅ **Per-subagent HITL gating** - Fine-grained control with `interruptOn` per lens (not yet tested)

### Known Gaps vs Claude SDK
- ⚠️ **Web tools missing** (WebFetch, WebSearch) - will need microservice bridge or hybrid approach
- ⚠️ **Output routing** - need to ensure lens outputs don't leak to user chat
- ⚠️ **Schema enforcement** - need custom validator middleware
- ⚠️ **Execution limits** - need custom limits middleware
- ⚠️ **Maturity** - Claude SDK is production-proven, DeepAgents is newer

## Commands

### Build and Development
```bash
# Build the project (uses tsdown)
pnpm build

# Type checking
pnpm typecheck

# Watch mode for development
pnpm dev
```

### Testing
```bash
# Run all tests (uses vitest)
pnpm test

# Watch mode
pnpm test:watch

# UI mode
pnpm test:ui

# Coverage report
pnpm test:coverage
```

Tests are located in `tests/` with two directories:
- `tests/unit/` - Unit tests for backends and middleware
- `tests/integration/` - Integration tests

### Linting and Formatting
```bash
# Lint
pnpm lint

# Lint with auto-fix
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Publishing
```bash
# Release (builds and publishes with changesets)
pnpm release
```

### Running Examples
```bash
# Research agent example (requires TAVILY_API_KEY)
cd examples/research
tsx research-agent.ts
```

## Architecture

### Core Factory: `createDeepAgent`

The main entry point is `src/agent.ts:createDeepAgent()` which creates a LangGraph ReactAgent with automatically attached middleware. Key aspects:

1. **Default Model**: `claude-sonnet-4-5-20250929`
2. **Middleware Stack** (applied in order):
   - `todoListMiddleware()` - Task planning
   - `createFilesystemMiddleware()` - File operations
   - `createSubAgentMiddleware()` - Subagent delegation
   - `summarizationMiddleware()` - Auto-summarization when approaching token limits (170K tokens)
   - `anthropicPromptCachingMiddleware()` - Prompt caching for cost reduction
   - `createPatchToolCallsMiddleware()` - Tool call compatibility patching
   - `humanInTheLoopMiddleware()` - Optional, if `interruptOn` provided
   - Custom middleware (appended last)

3. **System Prompt**: Custom prompt is prepended to a base prompt: `"In order to complete the objective that the user asks of you, you have access to a number of standard tools."`

### Middleware Components

#### FilesystemMiddleware (`src/middleware/fs.ts`)

Provides 6 filesystem tools backed by pluggable backends:
- `ls` - List directory contents
- `read_file` - Read file contents (with optional line ranges)
- `write_file` - Create new files (errors if exists)
- `edit_file` - Edit existing files via string replacement
- `glob` - Pattern-based file search (e.g., `**/*.ts`)
- `grep` - Content search within files

**Tool Result Eviction**: Large tool results are automatically evicted from message history to prevent context overflow. Uses LangGraph `Command` to remove ToolMessage content.

#### SubAgentMiddleware (`src/middleware/subagents.ts`)

Enables spawning specialized subagents via the `task` tool:
- Supports custom subagents with specialized prompts/tools/models
- Includes optional "general-purpose" agent with all parent tools
- Subagents inherit parent's backend and middleware (configurable)
- State propagation: Non-excluded state keys passed to subagents
- Excluded keys: `messages`, `todos`, `jumpTo`

**Key Feature**: Parallel execution support - can launch multiple subagents concurrently when tasks are independent.

#### PatchToolCallsMiddleware (`src/middleware/patch_tool_calls.ts`)

Patches tool calls to ensure cross-model compatibility (handles edge cases in different LLM providers' tool calling implementations).

### Backend System

Backends provide storage for filesystem operations. Four implementations:

1. **StateBackend** (`src/backends/state.ts`) - In-memory, ephemeral storage in agent state
2. **StoreBackend** (`src/backends/store.ts`) - Persistent storage using LangGraph Store
3. **FilesystemBackend** (`src/backends/filesystem.ts`) - Actual filesystem operations
4. **CompositeBackend** (`src/backends/composite.ts`) - Combines multiple backends (e.g., state + store)

All backends implement `BackendProtocol` interface (`src/backends/protocol.ts`).

**Backend Selection**: Pass `backend` parameter to `createDeepAgent()` - can be a backend instance or factory function.

### File Structure

```
src/
├── agent.ts              # Main createDeepAgent factory
├── index.ts              # Public API exports
├── middleware/
│   ├── fs.ts             # Filesystem middleware (17KB)
│   ├── subagents.ts      # Subagent delegation (18KB)
│   ├── patch_tool_calls.ts
│   └── index.ts
└── backends/
    ├── protocol.ts       # Backend interface
    ├── state.ts          # In-memory backend
    ├── store.ts          # Persistent backend
    ├── filesystem.ts     # Real filesystem backend
    ├── composite.ts      # Multi-backend composition
    ├── utils.ts          # Shared utilities (15KB)
    └── index.ts
```

## Important Implementation Details

### Tool Result Eviction Pattern

Large tool results are evicted from context to prevent overflow:

```typescript
// In fs.ts and backends/utils.ts
if (shouldEvictToolResult(result)) {
  return new Command({
    update: { messages: [new ToolMessage({ content: "", tool_call_id })] },
    // ... tool logic
  });
}
```

This is critical for handling large file reads or search results.

### Backend Factory Pattern

Backends can be provided as factories to access runtime state/store:

```typescript
createDeepAgent({
  backend: (config) => new CompositeBackend({
    state: new StateBackend(config),
    store: config.store ? new StoreBackend(config) : undefined,
  }),
  store: new InMemoryStore(),
});
```

The factory receives `{ state, store }` and returns a BackendProtocol instance.

### Subagent Prompt Engineering

The `task` tool description includes extensive examples and guidance (see `src/middleware/subagents.ts:getTaskToolDescription()`). Key principles:
- Use for context isolation, not simple tool calls
- Launch multiple subagents in parallel when tasks are independent
- Provide detailed, self-contained prompts to subagents
- Expect only final report back (no follow-up communication)

### Dragonfly-Specific Patterns

When implementing features for the Dragonfly migration test, follow these patterns:

**Orchestrator Agent Pattern:**
- Single orchestrator that analyzes user requests and delegates to specialized lenses
- Uses `task` tool to invoke sub-agents by name (e.g., `subagent_type: "dragonfly-swot"`)
- Reads artifacts after lens completion for synthesis
- Provides integrated insights across multiple analytical frameworks

**Lens Agent Pattern:**
- Specialized agents focused on specific analytical frameworks (SWOT, PESTLE, Porter's Five Forces, etc.)
- Receive task from orchestrator with full context
- Research evidence using available tools (file reading, web search if available)
- Create markdown artifact via `write_file` tool to `/outputs/` directory
- Can reference past artifacts for cumulative intelligence

**Artifact Structure:**
- YAML frontmatter with metadata (title, lens, date, word_count, key_findings)
- Markdown body with structured headings per framework
- Evidence-based analysis with transparent reasoning
- Saved to predictable path: `outputs/{lens}-{topic}-{date}.md`

**Context Cascade:**
- Later lenses can read earlier artifacts via `read_file`
- Orchestrator reads all artifacts for synthesis
- File paths resolve correctly across parent and sub-agents
- Read-only access to historical artifacts (future: via backend configuration)

### Zod Version Handling

Uses Zod v3 (imported as `zod/v3`) with LangGraph compatibility via `withLangGraph()` wrapper. This ensures schemas work with both LangChain tools and LangGraph state.

## Testing Strategy

Tests use Vitest with 60-second timeouts (integration tests may call LLMs). Test utilities in `tests/utils.ts` provide helpers for setting up agents, backends, and stores.

### Dragonfly Migration Testing Priorities

When implementing or testing features for the Dragonfly migration exploration:

**Phase 1 Priorities (Basic Orchestration):**
- Verify `createSubAgentMiddleware` can register sub-agents with custom prompts
- Test orchestrator can invoke lens via `task` tool with `subagent_type` parameter
- Confirm `FilesystemBackend` correctly saves artifacts from sub-agents
- Validate file paths resolve correctly across orchestrator and lens agents

**Phase 2 Priorities (Safety & Context):**
- Implement and test `createLimitsMiddleware` for execution safety:
  - `maxToolCalls`: Prevent runaway tool usage
  - `maxSubagentSpawns`: Cap number of sub-agents
  - `maxRecursionDepth`: Prevent infinite delegation loops
- Implement and test `artifactValidatorMiddleware` for schema enforcement:
  - Validate YAML frontmatter presence and structure
  - Validate markdown heading hierarchy
  - Provide clear error messages on malformed artifacts
- Test lens agents can read artifacts created by prior lenses

**Phase 3 Priorities (Advanced Features):**
- Implement and test `chatRoutingMiddleware` to filter sub-agent outputs from user chat
- Test HITL (Human-in-the-Loop) interrupts with per-subagent `interruptOn` configuration
- Verify orchestrator can synthesize insights from multiple lens artifacts

**Required Middleware (Not Yet Implemented):**
1. **LimitsMiddleware** (`src/middleware/limits.ts`) - Track and enforce execution limits
2. **ArtifactValidatorMiddleware** (`src/middleware/artifact-validator.ts`) - Validate artifact schemas
3. **ChatRoutingMiddleware** (`src/middleware/chat-routing.ts`) - Filter sub-agent outputs from user messages

## Key Dependencies

- `@langchain/anthropic` - Claude models
- `@langchain/core` - Base LangChain abstractions
- `@langchain/langgraph` - Graph-based agent framework
- `langchain` - Main LangChain library (includes createAgent, middleware)
- `fast-glob` - File globbing
- `micromatch` - Pattern matching
- `zod` - Schema validation

## Package Configuration

- **Module system**: ESM (`"type": "module"`)
- **Build tool**: tsdown
- **Target**: ES2021
- **Module resolution**: NodeNext
- **Published files**: `dist/**/*` only

## Examples Directory

`examples/` contains demonstration agents:
- `examples/research/` - Research agent using Tavily search
- `examples/backends/` - Backend usage examples
- `examples/dragonfly-test/` - **[PLANNED]** Dragonfly migration test implementation
  - `prompts/` - Orchestrator and lens agent prompts (ported from Claude SDK)
  - `middleware/` - Custom middleware (limits, validator, routing)
  - `test-workspace/outputs/` - Artifact output directory
  - `runner.ts` - Test execution script

Each example has its own `.env.example`, `.gitignore`, and `langgraph.json` (for LangGraph Studio).

## Next Steps for Dragonfly Migration

**Immediate priorities for Phase 1 implementation:**

1. **Create test directory structure**
   ```bash
   mkdir -p examples/dragonfly-test/{prompts,middleware,test-workspace/outputs}
   ```

2. **Implement required middleware**
   - `src/middleware/limits.ts` - Execution limits enforcement
   - `src/middleware/artifact-validator.ts` - Schema validation
   - `src/middleware/chat-routing.ts` - Output filtering

3. **Port agent prompts**
   - Copy orchestrator prompt from Dragonfly codebase
   - Copy SWOT lens prompt from Dragonfly codebase
   - Adapt tool names (Task → task, Write → write_file, etc.)
   - Combine with global context

4. **Create minimal test runner**
   - Configure `createDeepAgent` with orchestrator prompt
   - Register SWOT lens in `createSubAgentMiddleware`
   - Use `FilesystemBackend` pointing to test workspace
   - Execute test: "Run SWOT analysis on Tesla"

5. **Verify success criteria**
   - Orchestrator successfully invokes SWOT lens
   - Artifact created at `test-workspace/outputs/swot-tesla-*.md`
   - Artifact contains proper SWOT analysis structure
   - No errors during execution

**Decision Point:**
- If Phase 1 succeeds → Proceed to Phase 2 (context cascade)
- If Phase 1 fails → Document blockers and recommend staying with Claude SDK

**Full migration plan:** See `docs/planning/deepagents-migration-plan-v2.md` for complete 5-phase roadmap.
