# DeepAgents Migration Plan v2: Dragonfly Multi-Agent System

**Date:** 2025-11-12 (Updated after colleague review)
**Purpose:** Detailed plan for testing whether DeepAgentsJS can replicate Dragonfly's multi-agent orchestration patterns
**Status:** Planning Phase - Incorporating Technical Review Feedback
**Previous Version:** deepagents-migration-plan.md

---

## Changelog from v1

**New advantages identified:**
- ✅ First-class SubAgent API with per-lens middleware and HITL
- ✅ Filesystem middleware parity (built-in tools)

**New risks identified:**
- ⚠️ Subagent output routing (may leak to user chat)
- ⚠️ No schema enforcement (need custom validator)
- ⚠️ Recursion/step caps not obvious (need limits middleware)
- 📊 Maturity gaps in persistence layer

**Plan updates:**
- Added chat-routing assertion (Phase 3)
- Added limits middleware (Phase 2)
- Added schema validator (Phase 2)
- Added HITL test (Phase 3)
- Documented web tool fallback (Phase 5)

**Time estimate:** 10-15 hours (was 8-12 hours)

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
- **SubAgent API** for orchestrator → lens delegation with per-lens configuration
- **FilesystemMiddleware** for artifact creation and context access (built-in tools)
- **TodoListMiddleware** for planning multi-lens workflows
- **Custom middleware** for limits, validation, routing

### Key Question

**Can DeepAgents handle the orchestration pattern where an orchestrator agent dynamically invokes specialized sub-agents, each producing markdown artifacts that subsequent agents can reference?**

---

## Success Criteria

### Must-Have (P0) - Updated

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

5. ✅ **Chat Routing (NEW)**
   - Lens outputs hidden from user chat
   - Only orchestrator messages visible to user
   - Tool execution traces properly scoped

6. ✅ **Execution Limits (NEW)**
   - Max tool calls enforced
   - Max subagent spawns enforced
   - Max recursion depth enforced
   - Fail fast with helpful error messages

7. ✅ **Schema Validation (NEW)**
   - Artifact frontmatter validated (YAML)
   - Artifact structure validated (markdown headings)
   - Malformed artifacts rejected with clear errors

### Nice-to-Have (P1)

8. 📊 **Performance**
   - Execution time comparable to Claude SDK
   - Token usage reasonable
   - No excessive overhead from middleware

9. 🔧 **Developer Experience**
   - Agent configuration is straightforward
   - Debugging is feasible
   - Error messages are helpful

10. 📈 **Scalability**
   - Can register 68 agents without issues
   - Memory usage acceptable
   - No bottlenecks with multiple sub-agents

11. 🔒 **HITL Interrupts (NEW)**
   - Per-subagent `interruptOn` works correctly
   - Can pause/resume execution
   - Gated tools require approval

### Out of Scope (for initial test)

- ❌ Real-time SSE streaming (can verify post-execution)
- ❌ Hook-based artifact detection (can check file system manually)
- ❌ Database persistence (test in-memory only) - **Deferred to Phase 5**
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

### DeepAgents Target Architecture (Updated)

```
Test Runner (Node.js script)
    ↓
createDeepAgent({
  systemPrompt: orchestratorPrompt,
  model: "claude-sonnet-4-5",
  backend: FilesystemBackend({ cwd: testWorkspace }),
  middleware: [
    todoListMiddleware(),
    createFilesystemMiddleware({ backend }), // Built-in tools
    createLimitsMiddleware({                 // NEW: Execution limits
      maxToolCalls: 100,
      maxSubagentSpawns: 10,
      maxRecursionDepth: 2,
    }),
    createSubAgentMiddleware({
      subagents: [                           // NEW: SubAgent objects
        {
          name: "dragonfly-swot",
          systemPrompt: swotPrompt,
          tools: ["read_file", "write_file", "glob", "grep"],
          middleware: [
            artifactValidatorMiddleware(),   // NEW: Schema validation
          ],
          interruptOn: ["write_file"],       // NEW: HITL gate
        },
        {
          name: "dragonfly-pestle",
          systemPrompt: pestlePrompt,
          tools: ["read_file", "write_file", "glob", "grep"],
          middleware: [
            artifactValidatorMiddleware(),
          ],
        },
        {
          name: "dragonfly-stakeholder",
          systemPrompt: stakeholderPrompt,
          tools: ["read_file", "write_file", "glob", "grep"],
          middleware: [
            artifactValidatorMiddleware(),
          ],
        },
      ],
    }),
    chatRoutingMiddleware(),                 // NEW: Filter lens outputs
  ],
})
    ↓
Agent execution
    ├── Orchestrator analyzes request
    ├── Invokes task tool with subagent_type: "dragonfly-swot"
    │   └── Sub-agent executes
    │       ├── Uses write_file tool → HITL interrupt
    │       ├── Waits for approval
    │       ├── Saves to: testWorkspace/outputs/swot-topic-2025-11-12.md
    │       ├── Validator checks schema
    │       └── Returns to orchestrator (output hidden from user)
    ├── Orchestrator invokes task tool with subagent_type: "dragonfly-pestle"
    │   └── Sub-agent executes
    │       ├── Uses read_file to access SWOT artifact
    │       ├── Uses write_file for own artifact → HITL interrupt
    │       ├── Validator checks schema
    │       └── Returns to orchestrator
    └── Orchestrator synthesizes (optional)
        └── Uses read_file to access both artifacts
```

### Key Differences (Updated)

| Feature | Claude SDK | DeepAgents | Notes |
|---------|-----------|-----------|-------|
| **Sub-agent registration** | All 68 agents written to `.claude/agents/*.md` | SubAgent objects in config | DeepAgents more explicit |
| **Tool naming** | `Write`, `Read`, `Task` | `write_file`, `read_file`, `task` | Different conventions |
| **Workspace isolation** | `cwd` + `additionalDirectories` (read-only) | `backend` with path resolution | DeepAgents uses backend abstraction |
| **Artifact detection** | PostToolUse hook watches Write tool | Manual file system check + validator middleware | No hook, but middleware works |
| **Prompt composition** | Global context prepended at runtime | Must combine manually | Need helper function |
| **Model selection** | Per-agent via registry | Per-agent via subagent config | Similar capability |
| **State management** | LangGraph state (messages, todos, etc.) | LangGraph state + backend protocol | DeepAgents more flexible |
| **Per-lens middleware** | ❌ Not supported | ✅ Supported | DeepAgents advantage |
| **HITL gating** | ❌ Limited | ✅ Per-subagent `interruptOn` | DeepAgents advantage |
| **Built-in FS tools** | ✅ Yes | ✅ Yes (FilesystemMiddleware) | Parity |
| **Execution limits** | ❌ Not obvious | ⚠️ Custom middleware needed | Need to build |
| **Output routing** | ✅ Clear | ⚠️ May leak (needs testing) | Risk identified |

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
   ├── middleware/
   │   ├── limits-middleware.ts           # NEW
   │   ├── artifact-validator.ts          # NEW
   │   └── chat-routing.ts                # NEW
   ├── test-workspace/
   │   └── outputs/
   ├── runner.ts
   └── README.md
   ```

2. Port orchestrator prompt
   - Copy from Dragonfly codebase
   - Combine with global context
   - Adapt operational instructions for DeepAgents tool naming
   - **NEW:** Prefer built-in filesystem tools

3. Port 1 lens prompt (SWOT)
   - Copy from Dragonfly codebase
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
         subagents: [
           {
             name: "dragonfly-swot",
             systemPrompt: swotPrompt,
             tools: ["read_file", "write_file", "glob", "grep"],
           }
         ]
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

### Phase 2: Context Cascade + Limits + Validation (3-4 hours) - UPDATED

**Goal:** Verify lens 2 can read lens 1's artifact + add safety guards

**Tasks:**
1. Port 2nd lens prompt (PESTLE)
   - Copy from Dragonfly codebase
   - Adapt for DeepAgents

2. **NEW:** Implement limits middleware
   ```typescript
   // middleware/limits-middleware.ts
   export const createLimitsMiddleware = (limits: {
     maxToolCalls: number;
     maxSubagentSpawns: number;
     maxRecursionDepth: number;
   }) => {
     // Track counts, throw helpful errors on exceed
   };
   ```

3. **NEW:** Implement artifact validator
   ```typescript
   // middleware/artifact-validator.ts
   export const artifactValidatorMiddleware = () => {
     // Validate YAML frontmatter + markdown structure
     // Throw on malformed artifacts
   };
   ```

4. Update runner to invoke 2 lenses sequentially
   ```typescript
   const agent = createDeepAgent({
     // ...
     middleware: [
       createLimitsMiddleware({              // NEW
         maxToolCalls: 100,
         maxSubagentSpawns: 10,
         maxRecursionDepth: 2,
       }),
       createSubAgentMiddleware({
         subagents: [
           {
             name: "dragonfly-swot",
             systemPrompt: swotPrompt,
             middleware: [
               artifactValidatorMiddleware(), // NEW
             ],
           },
           {
             name: "dragonfly-pestle",
             systemPrompt: pestlePrompt,
             middleware: [
               artifactValidatorMiddleware(), // NEW
             ],
           },
         ]
       }),
     ],
   });

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

5. Verify PESTLE lens can read SWOT artifact
   - Check PESTLE uses read_file tool
   - Verify PESTLE content references SWOT findings

6. **NEW:** Test limits enforcement
   - Create test that exceeds maxSubagentSpawns
   - Verify clean error message

7. **NEW:** Test schema validation
   - Create test with malformed artifact (missing frontmatter)
   - Verify validator catches it

**Success Criteria for Phase 2:**
- ✅ Orchestrator invokes SWOT, then PESTLE
- ✅ PESTLE lens reads SWOT artifact via read_file
- ✅ PESTLE artifact explicitly references SWOT findings
- ✅ Both artifacts exist in test-workspace/outputs/
- ✅ **NEW:** Execution limits enforced (fail fast with helpful error)
- ✅ **NEW:** Token/step budget reported at end
- ✅ **NEW:** Artifact schema validation passes

---

### Phase 3: Multi-Lens + Routing + HITL (3-4 hours) - UPDATED

**Goal:** Verify orchestrator can synthesize across multiple lenses + test output routing + HITL

**Tasks:**
1. Port 3rd lens prompt (Stakeholder Analysis)
   - Copy from Dragonfly codebase

2. **NEW:** Implement chat routing middleware
   ```typescript
   // middleware/chat-routing.ts
   export const chatRoutingMiddleware = () => {
     // Filter lens outputs from user-visible messages
     // Only orchestrator speaks to user
   };
   ```

3. Update runner for 3-lens workflow with HITL
   ```typescript
   const agent = createDeepAgent({
     // ...
     middleware: [
       chatRoutingMiddleware(),              // NEW
       createSubAgentMiddleware({
         subagents: [
           // ...existing lenses
           {
             name: "dragonfly-pestle",
             systemPrompt: pestlePrompt,
             middleware: [artifactValidatorMiddleware()],
             interruptOn: ["write_file"],    // NEW: HITL test
           },
         ]
       }),
     ],
   });

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

4. Verify orchestrator synthesis
   - Orchestrator reads all 3 artifacts
   - Orchestrator provides integrated summary
   - Summary demonstrates compound vision

5. **NEW:** Test chat routing
   ```typescript
   // Only orchestrator messages should be visible
   const visibleMessages = result.messages.filter(isUserVisible);
   const lensMessages = visibleMessages.filter(m =>
     m.content.includes('dragonfly-swot') ||
     m.content.includes('dragonfly-pestle')
   );
   expect(lensMessages).toHaveLength(0);
   ```

6. **NEW:** Test HITL interrupt
   ```typescript
   const execution = agent.stream({ messages: [...] });
   const interrupt = await execution.waitForInterrupt();
   expect(interrupt.toolName).toBe('write_file');
   execution.resume({ approved: true });
   await execution.complete();
   ```

**Success Criteria for Phase 3:**
- ✅ All 3 lenses produce artifacts
- ✅ Each lens references prior work
- ✅ Orchestrator synthesizes across all 3
- ✅ Synthesis shows value of multi-lens approach
- ✅ **NEW:** Only orchestrator messages visible to user (lens outputs hidden)
- ✅ **NEW:** HITL interrupt/resume works correctly

---

### Phase 4: Scalability Test (1-2 hours)

**Goal:** Verify system handles realistic agent count

**No changes from v1** - This phase remains the same

---

### Phase 5: Comparison & Decision + Web Tool Strategy (1-2 hours) - UPDATED

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

4. **NEW:** Evaluate web tool options
   - Wait for native DeepAgents support?
   - Build microservice bridge?
   - Keep Claude SDK for web-heavy lenses (hybrid)?

5. Create decision matrix
   - Stay with Claude SDK
   - Migrate to DeepAgents
   - Hybrid approach
   - **NEW:** Include web tool strategy

**Deliverable:** `docs/planning/migration-decision.md` with recommendation

**Success Criteria for Phase 5:**
- ✅ Decision matrix completed
- ✅ Performance benchmarks documented
- ✅ **NEW:** Web tool strategy documented
- ✅ Clear recommendation with rationale

---

## Technical Requirements

### Environment Setup

```bash
# Already in repo
cd /Users/sam/Documents/GitHub/deepagentsjs

# Create test directory
mkdir -p examples/dragonfly-test/prompts
mkdir -p examples/dragonfly-test/middleware      # NEW
mkdir -p examples/dragonfly-test/test-workspace/outputs

# Install dependencies (if needed)
pnpm install
```

### Tool Name Mapping (Updated)

| Claude SDK | DeepAgents | Status | Notes |
|------------|-----------|--------|-------|
| `Task` | `task` | ✅ Ready | Sub-agent invocation |
| `Write` | `write_file` | ✅ Ready | Use built-in from FilesystemMiddleware |
| `Read` | `read_file` | ✅ Ready | Use built-in from FilesystemMiddleware |
| `Glob` | `glob` | ✅ Ready | Use built-in from FilesystemMiddleware |
| `Grep` | `grep` | ✅ Ready | Use built-in from FilesystemMiddleware |
| `TodoWrite` | `write_todos` | ✅ Ready | Task list management |
| `WebFetch` | ❌ Missing | ⚠️ Phase 5 | Microservice bridge or wait |
| `WebSearch` | ❌ Missing | ⚠️ Phase 5 | Microservice bridge or wait |
| `Bash` | ❌ Missing | ⚠️ Skip | Not needed for Phase 1-4 |

**NEW: Prefer built-in filesystem tools** - Use FilesystemMiddleware instead of custom implementations

---

## Test Scenarios

### Scenario 1: Simple Single-Lens Analysis

**No changes from v1**

---

### Scenario 2: Sequential Two-Lens Analysis

**No changes from v1**

---

### Scenario 3: Three-Lens Synthesis with Routing Test (UPDATED)

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
6. **NEW:** Lens outputs hidden from user chat

**Verification:**
- ✅ Three files exist
- ✅ SWOT references Stakeholder findings
- ✅ PESTLE references both Stakeholder and SWOT
- ✅ Orchestrator's synthesis demonstrates compound vision
- ✅ **NEW:** User only sees orchestrator messages (no lens outputs)

---

### Scenario 4: Execution Limits Test (NEW)

**Input:**
```typescript
// Configure agent with maxSubagentSpawns: 5
// Request 7 lenses
"Run analyses: Stakeholder, SWOT, PESTLE, Pre-Mortem, Porter's, Scenario Planning, Risk Mitigation"
```

**Expected Flow:**
1. Orchestrator starts invoking lenses
2. After 5th lens, limits middleware throws error
3. Error message is clear and helpful

**Verification:**
- ✅ Clean error: "Exceeded max subagent spawns (5)"
- ✅ First 5 artifacts created successfully
- ✅ Execution stops before 6th lens
- ✅ Error includes suggestion to increase limit

---

### Scenario 5: Schema Validation Test (NEW)

**Input:**
```typescript
// Create test lens that produces malformed artifact
// Missing YAML frontmatter
```

**Expected Flow:**
1. Lens creates artifact without frontmatter
2. Validator middleware catches malformed artifact
3. Execution fails with clear error

**Verification:**
- ✅ Error: "Missing YAML frontmatter in swot-tesla.md"
- ✅ Error includes expected format
- ✅ File exists but is flagged as invalid

---

### Scenario 6: HITL Interrupt Test (NEW)

**Input:**
```typescript
// PESTLE lens configured with interruptOn: ["write_file"]
"Run PESTLE analysis on Tesla"
```

**Expected Flow:**
1. PESTLE lens completes analysis
2. Attempts to use write_file tool
3. Execution pauses (interrupt)
4. Test resumes with approval
5. Artifact is created

**Verification:**
- ✅ Execution pauses at write_file
- ✅ Interrupt details provided (toolName, params)
- ✅ Resumption works correctly
- ✅ Artifact created after approval

---

## Risk Assessment (Updated)

### Technical Risks

| Risk | Likelihood | Impact | Mitigation | Status |
|------|-----------|---------|------------|--------|
| **Subagent output routing leaks** | Medium | High | Test in Phase 3, build filter middleware | **NEW** |
| **No schema enforcement** | High | Medium | Build validator middleware | **NEW** |
| **Runaway recursion** | Low | High | Limits middleware | **NEW** |
| **SubAgentMiddleware doesn't support dynamic registry** | Medium | High | Test with 3 agents first, then scale to 15+ | Existing |
| **File path resolution breaks** | Medium | High | Use FilesystemBackend with explicit cwd | Existing |
| **Prompts too large** | Low | Medium | Test with Sonnet (200K context) | Existing |
| **Tool naming conflicts** | Low | Low | Document mapping clearly | Existing |
| **Missing Web tools** | High | Medium | Phase 5 strategy (microservice or wait) | **UPDATED** |
| **Persistence gaps** | Medium | Low | Defer to Phase 5 | **NEW** |

---

## Decision Framework (Updated)

### Decision Matrix

| Criteria | Weight | Claude SDK | DeepAgents | Notes |
|----------|--------|------------|-----------|-------|
| **Core Functionality** | 30% | 9/10 | TBD | Can replicate orchestration? |
| **Performance** | 15% | 8/10 | TBD | Execution time, tokens |
| **Developer Experience** | 15% | 7/10 | TBD | Config, debugging |
| **Flexibility** | 15% | 6/10 | TBD | Middleware, backends |
| **Per-Lens Middleware** | 10% | 4/10 | TBD | **NEW:** DeepAgents advantage |
| **HITL Gating** | 5% | 5/10 | TBD | **NEW:** DeepAgents advantage |
| **Documentation** | 5% | 8/10 | TBD | Quality, completeness |
| **Community/Support** | 3% | 9/10 | TBD | Anthropic vs open source |
| **Future-Proofing** | 2% | 7/10 | TBD | LangGraph compatibility |

**Scoring updated with new criteria from colleague feedback**

---

## Timeline (Updated)

**Total estimate:** 10-15 hours (was 8-12)
- Phase 1: 2-3 hours (no change)
- Phase 2: 3-4 hours (was 2-3) - Added limits + validation
- Phase 3: 3-4 hours (was 2-3) - Added routing + HITL
- Phase 4: 1-2 hours (no change)
- Phase 5: 1-2 hours (was 1) - Added web tool strategy

---

## Next Steps

### Immediate (After v2 Review)

1. **Finalize plan** with team
2. **Confirm new test scope** is acceptable
3. **Identify any remaining blockers**

### Phase 1 Kickoff

1. **Create test directory structure** (including middleware/)
2. **Port orchestrator prompt**
3. **Port SWOT lens prompt**
4. **Build minimal runner**
5. **Execute and verify**

---

## References

- **v1 Plan:** `deepagents-migration-plan.md`
- **Colleague Feedback:** `colleague-feedback-integration.md`
- **Prompt Adaptation:** `prompt-adaptation-guide.md`
- **Dragonfly Architecture:** `../DTclaude-multi-agent-setup/`

---

**Status:** ✅ v2 planning complete, incorporating technical review feedback

**Next Review:** After Phase 1 completion

**Estimated Start:** Upon approval of v2 scope
