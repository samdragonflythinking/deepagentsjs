# DeepAgents Migration Plan: Dragonfly Multi-Agent System

**Date:** 2025-11-12
**Purpose:** Detailed plan for testing whether DeepAgentsJS can replicate Dragonfly's multi-agent orchestration patterns
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Success Criteria](#success-criteria)
3. [Architecture Comparison](#architecture-comparison)
4. [Implementation Phases](#implementation-phases)
5. [Technical Requirements](#technical-requirements)
6. [Test Scenarios](#test-scenarios)
7. [Risk Assessment](#risk-assessment)
8. [Decision Framework](#decision-framework)

---

## Executive Summary

### Current State: Claude Agent SDK

**Dragonfly** is a 68-agent strategic intelligence platform built on Claude Agent SDK with:
- **1 orchestrator agent** (dragonfly-ai) that delegates to specialized lens agents
- **67 lens agents** organized into 8 categories (Stakeholder Analysis, Risk Analysis, Systems Analysis, etc.)
- **Multi-agent orchestration** via Task tool (orchestrator → lens → artifact)
- **Workspace isolation** with read-only access to past artifacts
- **Artifact generation** via Write tool to `/outputs/*.md` with hook-based detection
- **Real-time streaming** via SSE for tool execution and agent transitions

### Proposed State: DeepAgents

Test if **DeepAgentsJS** can replicate the core patterns:
- **SubAgentMiddleware** for orchestrator → lens delegation
- **FilesystemMiddleware** for artifact creation and context access
- **TodoListMiddleware** for planning multi-lens workflows
- **Backend system** (StateBackend or FilesystemBackend) for file operations

### Key Question

**Can DeepAgents handle the orchestration pattern where an orchestrator agent dynamically invokes specialized sub-agents, each producing markdown artifacts that subsequent agents can reference?**

---

## Success Criteria

### Must-Have (P0)

1. ✅ **Orchestrator → Lens Delegation**
   - Orchestrator agent can invoke lens agents via `task` tool
   - Lens agents execute independently with their own tools/prompts
   - Orchestrator receives results after lens completes

2. ✅ **Artifact Creation**
   - Lens agents can create markdown files via filesystem tools
   - Files saved to designated outputs directory
   - Files are visible in file system after execution

3. ✅ **Context Cascade**
   - Lens 2 can read artifact created by Lens 1
   - Orchestrator can read all artifacts for synthesis
   - File paths resolve correctly across agents

4. ✅ **Multi-Lens Workflow**
   - Orchestrator can invoke 2-3 lenses sequentially
   - Each lens produces an artifact
   - All artifacts accessible at end

### Nice-to-Have (P1)

5. 📊 **Performance**
   - Execution time comparable to Claude SDK
   - Token usage reasonable
   - No excessive overhead from middleware

6. 🔧 **Developer Experience**
   - Agent configuration is straightforward
   - Debugging is feasible
   - Error messages are helpful

7. 📈 **Scalability**
   - Can register 68 agents without issues
   - Memory usage acceptable
   - No bottlenecks with multiple sub-agents

### Out of Scope (for initial test)

- ❌ Real-time SSE streaming (can verify post-execution)
- ❌ Hook-based artifact detection (can check file system manually)
- ❌ Database persistence (test in-memory only)
- ❌ Web UI integration (terminal-based test)
- ❌ Project workspace management (single session test)

---

## Architecture Comparison

### Claude Agent SDK Architecture

```
User Request
    ↓
API Route
    ↓
Agent Runner (SDK wrapper)
    ├── Primary agent: dragonfly-ai (orchestrator)
    │   ├── System prompt: dragonfly-ai.md + global-context.md + operational instructions
    │   ├── Tools: [Read, Write, WebFetch, WebSearch, TodoWrite, Bash, Glob, Grep, Task]
    │   └── Workspace: /tmp/dragonfly-projects/{projectId}/sessions/{sessionId}/
    │       ├── outputs/ (write access)
    │       ├── .claude/agents/ (all 68 sub-agents registered)
    │       └── additionalDirectories (read-only):
    │           ├── artifacts/ (past reports)
    │           └── files/ (uploaded docs)
    ├── Task tool invocation
    │   └── Sub-agent: dragonfly-swot (lens)
    │       ├── System prompt: swot-analysis.md + global-context.md + operational instructions
    │       ├── Tools: [Read, Write, WebFetch, WebSearch, TodoWrite, Bash]
    │       ├── Inherits workspace and context directories
    │       └── Saves artifact: outputs/swot-topic-2025-11-12.md
    └── PostToolUse hook
        ├── Detects Write to /outputs/*.md
        ├── Generates summaries (Claude API)
        ├── Adds YAML frontmatter
        ├── Updates artifacts/index.md catalog
        ├── Copies to artifacts/ directory
        └── Emits SSE event
```

### DeepAgents Target Architecture

```
Test Runner (Node.js script)
    ↓
createDeepAgent({
  systemPrompt: orchestratorPrompt,
  model: "claude-sonnet-4-5",
  backend: FilesystemBackend({ cwd: testWorkspace }),
  middleware: [
    todoListMiddleware(),
    createFilesystemMiddleware({ backend }),
    createSubAgentMiddleware({
      subagents: {
        "dragonfly-swot": {
          systemPrompt: swotPrompt,
          tools: ["read_file", "write_file", "glob", "grep"],
        },
        "dragonfly-pestle": {
          systemPrompt: pestlePrompt,
          tools: ["read_file", "write_file", "glob", "grep"],
        },
        "dragonfly-stakeholder": {
          systemPrompt: stakeholderPrompt,
          tools: ["read_file", "write_file", "glob", "grep"],
        },
      },
    }),
  ],
})
    ↓
Agent execution
    ├── Orchestrator analyzes request
    ├── Invokes task tool with subagent_type: "dragonfly-swot"
    │   └── Sub-agent executes
    │       ├── Uses write_file tool
    │       ├── Saves to: testWorkspace/outputs/swot-topic-2025-11-12.md
    │       └── Returns to orchestrator
    ├── Orchestrator invokes task tool with subagent_type: "dragonfly-pestle"
    │   └── Sub-agent executes
    │       ├── Uses read_file to access SWOT artifact
    │       ├── Uses write_file for own artifact
    │       └── Returns to orchestrator
    └── Orchestrator synthesizes (optional)
        └── Uses read_file to access both artifacts
```

### Key Differences

| Feature | Claude SDK | DeepAgents | Notes |
|---------|-----------|-----------|-------|
| **Sub-agent registration** | All 68 agents written to `.claude/agents/*.md` | Passed via `subagents` config object | DeepAgents more explicit |
| **Tool naming** | `Write`, `Read`, `Task` | `write_file`, `read_file`, `task` | Different conventions |
| **Workspace isolation** | `cwd` + `additionalDirectories` (read-only) | `backend` with path resolution | DeepAgents uses backend abstraction |
| **Artifact detection** | PostToolUse hook watches Write tool | Manual file system check | No hook needed for test |
| **Prompt composition** | Global context prepended at runtime | Must combine manually | Need helper function |
| **Model selection** | Per-agent via registry | Per-agent via subagent config | Similar capability |
| **State management** | LangGraph state (messages, todos, etc.) | LangGraph state + backend protocol | DeepAgents more flexible |

---

## Implementation Phases

### Phase 1: Setup and Minimal Test (2-3 hours)

**Goal:** Verify basic orchestration works (orchestrator → 1 lens → artifact)

**Tasks:**
1. Create test directory structure
   ```
   examples/dragonfly-test/
   ├── prompts/
   │   ├── dragonfly-ai-orchestrator.md
   │   ├── dragonfly-swot-lens.md
   │   └── dragonfly-global-context.md
   ├── test-workspace/
   │   └── outputs/
   ├── runner.ts
   └── README.md
   ```

2. Port orchestrator prompt
   - Copy from `/Users/sam/Documents/GitHub/dtclaudecode/src/lib/agents/prompts/dragonfly-ai.md`
   - Combine with global context
   - Adapt operational instructions for DeepAgents tool naming

3. Port 1 lens prompt (SWOT)
   - Copy from `/Users/sam/Documents/GitHub/dtclaudecode/src/lib/agents/prompts/02-risk-analysis/02-swot-analysis.md`
   - Combine with global context
   - Adapt file-saving protocol for DeepAgents

4. Create minimal runner
   ```typescript
   import { createDeepAgent } from '@/agent';
   import { FilesystemBackend } from '@/backends/filesystem';

   const agent = createDeepAgent({
     systemPrompt: orchestratorPrompt,
     backend: new FilesystemBackend({ cwd: './test-workspace' }),
     middleware: [
       createSubAgentMiddleware({
         subagents: { "dragonfly-swot": { systemPrompt: swotPrompt } }
       }),
     ],
   });

   const result = await agent.invoke({
     messages: [{ role: "user", content: "Run SWOT analysis on Tesla's competitive position" }]
   });
   ```

5. Execute and verify
   - Run: `tsx examples/dragonfly-test/runner.ts`
   - Verify: `test-workspace/outputs/swot-tesla-2025-11-12.md` exists
   - Inspect: File contains proper SWOT analysis

**Success Criteria for Phase 1:**
- ✅ Orchestrator successfully invokes SWOT lens via task tool
- ✅ SWOT lens creates markdown artifact in outputs/
- ✅ No errors in execution

---

### Phase 2: Multi-Lens Context Cascade (2-3 hours)

**Goal:** Verify lens 2 can read lens 1's artifact

**Tasks:**
1. Port 2nd lens prompt (PESTLE)
   - Copy from `/Users/sam/Documents/GitHub/dtclaudecode/src/lib/agents/prompts/02-risk-analysis/01-pestle-analysis.md`
   - Adapt for DeepAgents

2. Update runner to invoke 2 lenses sequentially
   ```typescript
   const result = await agent.invoke({
     messages: [{
       role: "user",
       content: `
         Run two analyses:
         1. SWOT analysis on Tesla
         2. PESTLE analysis that references SWOT findings
       `
     }]
   });
   ```

3. Verify PESTLE lens can read SWOT artifact
   - Check PESTLE uses read_file tool
   - Verify PESTLE content references SWOT findings

**Success Criteria for Phase 2:**
- ✅ Orchestrator invokes SWOT, then PESTLE
- ✅ PESTLE lens reads SWOT artifact via read_file
- ✅ PESTLE artifact explicitly references SWOT findings
- ✅ Both artifacts exist in test-workspace/outputs/

---

### Phase 3: Full Multi-Lens Workflow (2-3 hours)

**Goal:** Verify orchestrator can synthesize across multiple lenses

**Tasks:**
1. Port 3rd lens prompt (Stakeholder Analysis)
   - Copy from `/Users/sam/Documents/GitHub/dtclaudecode/src/lib/agents/prompts/01-stakeholder-analysis/01-stakeholder-analysis.md`

2. Update runner for 3-lens workflow
   ```typescript
   const result = await agent.invoke({
     messages: [{
       role: "user",
       content: `
         Conduct comprehensive analysis of Tesla's strategic position:
         1. Stakeholder Analysis
         2. SWOT Analysis (reference stakeholder findings)
         3. PESTLE Analysis (reference both previous analyses)
         4. Provide synthesis of all three
       `
     }]
   });
   ```

3. Verify orchestrator synthesis
   - Orchestrator reads all 3 artifacts
   - Orchestrator provides integrated summary
   - Summary demonstrates compound vision

**Success Criteria for Phase 3:**
- ✅ All 3 lenses produce artifacts
- ✅ Each lens references prior work
- ✅ Orchestrator synthesizes across all 3
- ✅ Synthesis shows value of multi-lens approach

---

### Phase 4: Scalability Test (1-2 hours)

**Goal:** Verify system handles realistic agent count

**Tasks:**
1. Register 10-15 lens agents
   - Port additional lens prompts
   - Add to subagents config

2. Test orchestrator recommendation logic
   - Orchestrator should recommend appropriate lenses
   - Should reference lens catalog correctly

3. Execute 5-lens workflow
   - Verify no performance degradation
   - Check memory usage
   - Measure execution time

**Success Criteria for Phase 4:**
- ✅ Can register 15+ agents without errors
- ✅ 5-lens workflow completes successfully
- ✅ Performance acceptable (< 5 min for 5 lenses on Sonnet)
- ✅ Memory usage reasonable (< 2GB)

---

### Phase 5: Comparison & Decision (1 hour)

**Goal:** Comprehensive comparison and migration decision

**Tasks:**
1. Document findings
   - What works well?
   - What's missing vs Claude SDK?
   - What's better than Claude SDK?

2. Performance benchmarks
   - Execution time comparison
   - Token usage comparison
   - Cost comparison

3. Developer experience assessment
   - Configuration complexity
   - Debugging experience
   - Documentation quality

4. Create decision matrix
   - Stay with Claude SDK
   - Migrate to DeepAgents
   - Hybrid approach

**Deliverable:** `docs/planning/migration-decision.md` with recommendation

---

## Technical Requirements

### Environment Setup

```bash
# Already in repo
cd /Users/sam/Documents/GitHub/deepagentsjs

# Create test directory
mkdir -p examples/dragonfly-test/prompts
mkdir -p examples/dragonfly-test/test-workspace/outputs

# Install dependencies (if needed)
pnpm install
```

### Prompts to Port (Phase 1)

1. **Global Context**
   - Source: `/Users/sam/Documents/GitHub/dtclaudecode/src/lib/agents/prompts/dragonfly-global-context.md`
   - Destination: `examples/dragonfly-test/prompts/global-context.md`

2. **Orchestrator**
   - Source: `/Users/sam/Documents/GitHub/dtclaudecode/src/lib/agents/prompts/dragonfly-ai.md`
   - Destination: `examples/dragonfly-test/prompts/orchestrator.md`
   - Combine with: Operational instructions from `/Users/sam/Documents/GitHub/dtclaudecode/dragonfly/Resources/prompt-operational-instructions/dragonfly-ai-operational-instructions/`

3. **SWOT Lens**
   - Source: `/Users/sam/Documents/GitHub/dtclaudecode/src/lib/agents/prompts/02-risk-analysis/02-swot-analysis.md`
   - Destination: `examples/dragonfly-test/prompts/swot-lens.md`
   - Combine with: Lens operational instructions from `/Users/sam/Documents/GitHub/dtclaudecode/dragonfly/Resources/prompt-operational-instructions/lens-operational-instructions/`

### Tool Name Mapping

| Claude SDK | DeepAgents | Notes |
|------------|-----------|-------|
| `Task` | `task` | Sub-agent invocation |
| `Write` | `write_file` | Create/overwrite files |
| `Read` | `read_file` | Read file contents |
| `Glob` | `glob` | Pattern-based file search |
| `Grep` | `grep` | Content search |
| `TodoWrite` | `write_todos` | Task list management |
| `WebFetch` | N/A | Not in DeepAgents (yet) |
| `WebSearch` | N/A | Not in DeepAgents (yet) |
| `Bash` | N/A | Not in DeepAgents (yet) |

**Note:** For Phase 1, we'll exclude WebFetch/WebSearch/Bash tools. Lenses can still produce artifacts using file-based tools only.

### Prompt Adaptation Strategy

**Replace workspace placeholder:**
```markdown
<!-- Claude SDK version -->
{WORKSPACE_PATH}/outputs/swot-tesla-2025-11-12.md

<!-- DeepAgents version -->
outputs/swot-tesla-2025-11-12.md
```

**Update tool instructions:**
```markdown
<!-- Claude SDK version -->
Tool: Write
file_path: {WORKSPACE_PATH}/outputs/swot-tesla-2025-11-12.md
content: [report content]

<!-- DeepAgents version -->
Tool: write_file
file_path: outputs/swot-tesla-2025-11-12.md
content: [report content]
```

**Update task delegation:**
```markdown
<!-- Claude SDK version -->
Tool: Task
subagent_type: dragonfly-swot
description: "SWOT analysis for Tesla"
prompt: "[detailed instructions]"

<!-- DeepAgents version -->
Tool: task
subagent_type: dragonfly-swot
description: "SWOT analysis for Tesla"
prompt: "[detailed instructions]"
```

---

## Test Scenarios

### Scenario 1: Simple Single-Lens Analysis

**Input:**
```typescript
"Run a SWOT analysis on Tesla's competitive position in the EV market"
```

**Expected Flow:**
1. Orchestrator analyzes request
2. Orchestrator invokes dragonfly-swot via task tool
3. SWOT lens conducts analysis
4. SWOT lens saves artifact: `outputs/swot-tesla-2025-11-12.md`
5. SWOT lens returns summary to orchestrator
6. Orchestrator presents summary to user

**Verification:**
- ✅ File exists: `test-workspace/outputs/swot-tesla-2025-11-12.md`
- ✅ File contains: Proper SWOT structure (Strengths, Weaknesses, Opportunities, Threats)
- ✅ File size: > 3000 words (comprehensive mode)

---

### Scenario 2: Sequential Two-Lens Analysis

**Input:**
```typescript
"Conduct SWOT and PESTLE analyses on Tesla. PESTLE should reference SWOT findings."
```

**Expected Flow:**
1. Orchestrator invokes SWOT lens
2. SWOT creates artifact
3. Orchestrator invokes PESTLE lens with instruction to reference SWOT
4. PESTLE lens uses read_file to access SWOT artifact
5. PESTLE creates artifact with SWOT references
6. Orchestrator summarizes both

**Verification:**
- ✅ Both files exist:
  - `test-workspace/outputs/swot-tesla-2025-11-12.md`
  - `test-workspace/outputs/pestle-tesla-2025-11-12.md`
- ✅ PESTLE artifact contains explicit references to SWOT (e.g., "As identified in the SWOT analysis...")
- ✅ Tool usage visible in logs: PESTLE uses read_file

---

### Scenario 3: Three-Lens Synthesis

**Input:**
```typescript
"Analyze Tesla from three perspectives: Stakeholder, SWOT, and PESTLE. Then synthesize insights."
```

**Expected Flow:**
1. Orchestrator invokes 3 lenses sequentially
2. Each lens creates artifact
3. Each subsequent lens references prior work
4. Orchestrator reads all 3 artifacts
5. Orchestrator provides integrated synthesis

**Verification:**
- ✅ Three files exist:
  - `test-workspace/outputs/stakeholder-tesla-2025-11-12.md`
  - `test-workspace/outputs/swot-tesla-2025-11-12.md`
  - `test-workspace/outputs/pestle-tesla-2025-11-12.md`
- ✅ SWOT references Stakeholder findings
- ✅ PESTLE references both Stakeholder and SWOT
- ✅ Orchestrator's synthesis demonstrates compound vision (identifies convergence, divergence, amplified insights)

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|------------|
| **SubAgentMiddleware doesn't support dynamic agent registry** | Medium | High | Test with 3 agents first, then scale to 15+ |
| **File path resolution breaks across agents** | Medium | High | Use FilesystemBackend with explicit cwd |
| **Prompts too large (token limits)** | Low | Medium | Test with Sonnet (200K context window) |
| **Tool naming conflicts** | Low | Low | Document mapping clearly in prompts |
| **Missing Web tools (WebFetch, WebSearch)** | High | Medium | Start with file-only test, add web tools later |

### Process Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|------------|
| **Test takes longer than expected** | High | Low | Phase approach allows incremental progress |
| **Findings are ambiguous** | Medium | High | Define clear success criteria upfront |
| **Migration effort underestimated** | Medium | High | Focus on proof-of-concept, not full migration |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|------------|
| **DeepAgents doesn't meet needs** | Medium | Medium | Stay with Claude SDK (proven solution) |
| **Migration destabilizes production** | Low | High | Test-only, no production changes |
| **Wasted engineering time** | Low | Medium | Learning value regardless of outcome |

---

## Decision Framework

After completing all phases, use this framework to decide:

### Decision Matrix

| Criteria | Weight | Claude SDK Score (1-10) | DeepAgents Score (1-10) | Notes |
|----------|--------|----------------------|---------------------|-------|
| **Core Functionality** | 30% | | | Can replicate orchestration? |
| **Performance** | 20% | | | Execution time, token usage |
| **Developer Experience** | 15% | | | Configuration, debugging |
| **Flexibility** | 15% | | | Middleware, backend options |
| **Documentation** | 10% | | | Quality, completeness |
| **Community/Support** | 5% | | | Anthropic-backed vs open source |
| **Future-Proofing** | 5% | | | LangGraph compatibility |

**Scoring Guide:**
- 9-10: Excellent, exceeds needs
- 7-8: Good, meets needs
- 5-6: Acceptable, with workarounds
- 3-4: Poor, significant limitations
- 1-2: Unusable

### Decision Options

**Option A: Stay with Claude SDK**
- Choose if: DeepAgents scores < 7 on Core Functionality
- Rationale: Proven, production-ready, Anthropic-supported

**Option B: Full Migration to DeepAgents**
- Choose if: DeepAgents scores ≥ 8 overall AND offers clear advantages
- Rationale: Better architecture, more flexible, open source

**Option C: Hybrid Approach**
- Choose if: DeepAgents scores 6-7 overall
- Rationale: Use DeepAgents for new features, keep existing system on Claude SDK

**Option D: Delayed Decision**
- Choose if: Test is inconclusive or missing critical features
- Rationale: Wait for DeepAgents maturity or additional features

---

## Next Steps

### Immediate (Today)

1. **Review this plan** with team
2. **Confirm approach** is sound
3. **Identify blockers** (e.g., missing API keys, permissions)

### Phase 1 Kickoff (Next Session)

1. **Create test directory structure**
2. **Port orchestrator prompt**
3. **Port SWOT lens prompt**
4. **Build minimal runner**
5. **Execute and verify**

### Success Metrics

We'll know Phase 1 is successful when:
- ✅ Orchestrator invokes SWOT lens
- ✅ SWOT lens creates artifact in outputs/
- ✅ Artifact contains proper SWOT analysis
- ✅ No errors in execution

---

## Questions for Discussion

1. **Prompt porting strategy**: Should we combine global context + lens prompt programmatically, or create single pre-combined files for testing?

2. **Web tools**: How critical are WebFetch/WebSearch for Phase 1? Can we test with "simulated" research (provide mock data in prompt)?

3. **Tool adaptation**: Do we need to add WebFetch/WebSearch/Bash tools to DeepAgents, or test without them first?

4. **Scope**: Should we test all 68 agents, or just the 5-10 most commonly used lenses?

5. **Timeline**: Is 1-2 days reasonable for Phases 1-3, or should we allocate more time?

6. **Success threshold**: What's the minimum score in the decision matrix to consider migration?

---

**Status:** ✅ Planning complete, ready for Phase 1 implementation

**Estimated Time:** 8-12 hours total (Phases 1-5)

**Next Review:** After Phase 1 completion
