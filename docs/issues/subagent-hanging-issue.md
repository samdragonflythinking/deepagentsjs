# Subagent Execution Hanging Issue

**Date**: 2025-11-14
**Version**: deepagents@1.1.0
**Status**: BLOCKING - Subagents hang indefinitely during execution

## Executive Summary

When using `createDeepAgent` with subagents configured for multi-agent orchestration, the subagent execution hangs indefinitely without completing or throwing errors. This occurs consistently across different configurations, prompt complexities, and invocation methods. Single-agent setups with identical middleware work correctly, confirming the issue is specific to the subagent execution path.

## Test Setup

### Goal
Test whether DeepAgentsJS can replicate a multi-agent orchestration pattern where:
1. An orchestrator agent receives a user query
2. Orchestrator delegates specialized tasks to subagents via the `task` tool
3. Subagents create artifacts (markdown files) using filesystem tools
4. Orchestrator synthesizes results from multiple subagents

### Architecture

```
User Query
    ↓
Orchestrator Agent (main agent)
    ↓ (calls task tool)
SWOT Lens Agent (subagent)
    ↓ (calls write_file tool)
Artifact: /outputs/swot-*.md
```

### File Structure

```
tests/dragonfly-poc/
├── orchestrator-test.ts         # Main test runner
├── prompts/
│   ├── orchestrator.ts          # Orchestrator system prompt
│   ├── global-context.ts        # Shared context
│   └── lenses/
│       ├── swot.ts              # Complex SWOT lens prompt (~387 lines)
│       └── swot-simple.ts       # Simplified prompt (~150 lines)
└── utils/
    └── session.ts               # Session management utilities

tests/sessions/
└── [timestamp]-[query-slug]/    # Session-based audit trails
    ├── outputs/                 # Artifact directory (empty - bug manifests here)
    ├── config.json              # Test configuration
    ├── execution-log.txt        # Event log
    ├── orchestrator-prompt.md   # Full orchestrator prompt
    └── dragonfly-swot-prompt.md # Full SWOT lens prompt
```

## Implementation Details

### Main Agent Configuration

```typescript
const backend = new FilesystemBackend({
  rootDir: workspaceDir,
  virtualMode: true,
});

const orchestrator = createDeepAgent({
  name: 'dragonfly-orchestrator',
  systemPrompt: orchestratorPrompt,
  model: new ChatAnthropic({
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0,
  }),
  backend,
  subagents: [
    {
      name: 'dragonfly-swot',
      description: 'SWOT Analysis lens for strategic positioning assessment',
      systemPrompt: swotPrompt,
      model: new ChatAnthropic({
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0,
      }),
    },
  ],
});
```

### Invocation

```typescript
const result = await orchestrator.invoke(
  {
    messages: [{ role: 'user', content: 'Conduct a SWOT analysis for Tesla...' }],
  },
  {
    recursionLimit: 100,
  }
);
```

### Expected Behavior

1. Orchestrator receives user query
2. Orchestrator calls `task` tool with `subagent_type: "dragonfly-swot"`
3. SWOT lens executes:
   - Analyzes the topic based on training data
   - Calls `write_file` with both `file_path` and `content` parameters
   - Creates markdown file in `/outputs/` directory
4. SWOT lens returns completion message
5. Orchestrator synthesizes and responds to user

### Actual Behavior

1. ✅ Orchestrator receives user query
2. ✅ Orchestrator calls `task` tool with `subagent_type: "dragonfly-swot"`
3. ❌ **HANGS INDEFINITELY** - Subagent execution never completes
4. ❌ No artifact created
5. ❌ No error thrown
6. ❌ Eventually hits recursion limit after 100+ iterations (73+ minutes)

## Reproduction Steps

### Minimal Reproduction

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Build the project: `pnpm build`
4. Set API key: `export ANTHROPIC_API_KEY=your-key`
5. Run test: `pnpm tsx tests/dragonfly-poc/orchestrator-test.ts`
6. Observe: Test hangs after printing "Starting agent execution..."
7. Wait 2+ minutes: No progress, no artifacts created
8. Check outputs: `ls tests/sessions/[latest-session]/outputs/` - empty directory

### Verification Test (Proves Single Agent Works)

```typescript
// tests/dragonfly-poc/simple-file-test.ts
const agent = createDeepAgent({
  name: 'simple-test',
  systemPrompt: 'Write a file when asked.',
  model: new ChatAnthropic({ model: 'claude-sonnet-4-5-20250929' }),
  backend: new FilesystemBackend({
    rootDir: outputsDir,
    virtualMode: true,
  }),
});

const result = await agent.invoke({
  messages: [{
    role: 'user',
    content: 'Write a file called /hello-world.md with content "# Hello World"'
  }],
});

// ✅ WORKS: File is created successfully
```

This proves:
- FilesystemBackend configuration is correct
- `write_file` tool works correctly
- Agent can execute and complete tasks
- Issue is specific to subagent execution

## Testing Matrix

We tested multiple configurations to isolate the issue:

| Configuration | Invocation Method | Prompt Complexity | Result |
|--------------|------------------|-------------------|---------|
| Single agent + FilesystemBackend | `.invoke()` | Simple | ✅ SUCCESS |
| Orchestrator + Subagent | `.invoke()` | Complex (~387 lines) | ❌ HANGS |
| Orchestrator + Subagent | `.stream()` | Complex | ❌ HANGS |
| Orchestrator + Subagent | `.invoke()` | Simple (~150 lines) | ❌ HANGS |
| Orchestrator + Subagent | `.invoke()` + recursionLimit fix | Simple | ❌ HANGS |

## Bug Discovered & Fixed

During investigation, we discovered a critical bug in `/src/middleware/subagents.ts:367`:

### Original Code (Buggy)

```typescript
// Invoke the subagent
const result = (await subagent.invoke(subagentState)) as Record<
  string,
  unknown
>;
```

**Problem**: No `recursionLimit` passed to subagent invocation, causing subagent to use default limit of 25.

### Fixed Code

```typescript
// Invoke the subagent with parent's recursionLimit config
const result = (await subagent.invoke(subagentState, {
  recursionLimit: config.recursionLimit || 100,
})) as Record<
  string,
  unknown
>;
```

**Note**: This fix was necessary but **did not resolve the hanging issue**. It's still a critical bug that should be merged.

## Diagnostic Output

### Subagent Debug Logging (New)

Set `DEEPAGENTS_DEBUG_SUBAGENTS=true` before running the test to log when each subagent starts and completes (with duration + message count). This instrumentation lives inside `src/middleware/subagents.ts` and should help confirm that the subagent promise never resolves.

**Result**: With enhanced debug logging enabled, we captured the complete subagent configuration:

```
[DeepAgents|Subagent] Creating subagent {
  name: 'dragonfly-swot',
  hasCustomTools: false,
  defaultToolsCount: 0,
  middlewareCount: 5,
  middlewareNames: [
    'todoListMiddleware',
    'FilesystemMiddleware',
    'SummarizationMiddleware',
    'PromptCachingMiddleware',
    'patchToolCallsMiddleware'
  ]
}

[DeepAgents|Subagent] Invoking subagent {
  subagent_type: 'dragonfly-swot',
  toolCallId: 'toolu_01WStupJoUJZExqxcir2Awdx',
  stateKeys: [ 'files', '_privateState', 'lg_tool_call', 'messages' ],
  messageCount: 1,
  recursionLimit: 100
}
```

And then **nothing**. No "Subagent completed" message, no error, no exception. The `await subagent.invoke()` call hangs indefinitely without resolving or rejecting.

**Critical Observation**: The subagent is configured correctly:
- ✅ Has FilesystemMiddleware (tools should be available)
- ✅ Has complete middleware stack (5 middleware components)
- ✅ Receives correct state (files, messages, etc.)
- ✅ Has proper recursionLimit (100)
- ✅ Has 0 custom tools (expected - tools come from middleware)

This confirms the issue is **inside the subagent's invoke execution**, not in configuration or the task tool wrapper. The subagent receives everything it needs but never completes execution.

### Successful Orchestrator Tool Call (Before Hang)

```
🔧 Tool Call #1: task
   Args: {
  "subagent_type": "dragonfly-swot",
  "description": "Conduct SWOT analysis of Tesla as an investment opportunity..."
}

📦 Chunk 3: model_request
```

After this point, no further output occurs. The subagent never returns.

### Session Execution Log (From 73-minute run)

```
[2025-11-12T12:37:23.829Z] Test query: Conduct a SWOT analysis for Tesla...
[2025-11-12T12:37:23.840Z] Received chunk 1
[2025-11-12T12:37:23.841Z] Received chunk 2
[2025-11-12T12:37:35.853Z] Received chunk 3

[2025-11-12T13:50:24.168Z] ERROR: Error in middleware "FilesystemMiddleware":
  Recursion limit of 100 reached without hitting a stop condition.

[2025-11-12T13:50:24.170Z] Session FAILED
[2025-11-12T13:50:24.170Z] Duration: 4380s (73 minutes)
```

### Empty Outputs Directory

```bash
$ ls -lah tests/sessions/2025-11-14T08-59-34-conduct-a-swot-analysis-for-te/outputs/
total 0
drwxr-xr-x@ 2 sam  staff    64B Nov 14 09:59 .
drwxr-xr-x@ 8 sam  staff   256B Nov 14 09:59 ..
```

No artifacts ever created by subagent.

## Root Cause Analysis

### Confirmed Facts (From Enhanced Debug Logging)

1. **Subagent Configuration is Correct**: The subagent is created with all necessary components:
   - ✅ FilesystemMiddleware (provides write_file, read_file, ls, edit_file, glob, grep tools)
   - ✅ TodoListMiddleware (provides write_todos tool)
   - ✅ SummarizationMiddleware (context management)
   - ✅ PromptCachingMiddleware (cost optimization)
   - ✅ PatchToolCallsMiddleware (compatibility)

2. **Subagent State is Correct**: The subagent receives proper invocation state:
   - ✅ State keys: ['files', '_privateState', 'lg_tool_call', 'messages']
   - ✅ Message count: 1 (the orchestrator's task delegation message)
   - ✅ recursionLimit: 100 (sufficient for completion)

3. **Hang Location is Confirmed**: The hang occurs at `src/middleware/subagents.ts:399-401`:
   ```typescript
   result = (await subagent.invoke(subagentState, {
     recursionLimit: config.recursionLimit || 100,
   })) as Record<string, unknown>;
   ```
   This `await` never resolves or rejects.

4. **No Errors Are Thrown**: The subagent execution silently hangs without throwing exceptions or logging errors.

### Hypothesis

Based on extensive testing, we believe the issue is in the subagent execution flow within the LangGraph agent created by `createAgent` (used for subagents):

1. When the `task` tool is called, it invokes `subagent.invoke(subagentState, config)`
2. The subagent is created with `createAgent` (not `createDeepAgent`)
3. The subagent receives middleware including `FilesystemMiddleware`
4. **Something in the middleware stack or agent execution loop is preventing completion**
5. The subagent never returns control to the orchestrator
6. No errors are thrown or propagated
7. Eventually parent recursion limit is hit

### Key Observation

The middleware stack for subagents in `/src/agent.ts:129-149` includes:

```typescript
defaultMiddleware: [
  todoListMiddleware(),
  createFilesystemMiddleware({ backend: filesystemBackend }),
  summarizationMiddleware({ model, maxTokensBeforeSummary: 170000, messagesToKeep: 6 }),
  anthropicPromptCachingMiddleware({ unsupportedModelBehavior: "ignore" }),
  createPatchToolCallsMiddleware(),
]
```

This is the same middleware stack that works fine for single agents, suggesting the issue may be in how `createAgent` (used for subagents) interacts with this middleware stack during `invoke()`.

## Environment

```
Node: v22.17.0
pnpm: 9.15.0
TypeScript: 5.x
OS: macOS (Darwin 25.0.0)
Package: deepagents@1.1.0
Dependencies:
  @langchain/anthropic: latest
  @langchain/langgraph: latest
  langchain: latest
```

## Workarounds Attempted

1. ❌ Simplified prompts to minimal complexity
2. ❌ Switched from `.stream()` to `.invoke()`
3. ❌ Increased recursion limits
4. ❌ Fixed recursionLimit propagation bug
5. ❌ Removed custom middleware overrides
6. ❌ Used correct `FilesystemBackend` parameters (`rootDir`, `virtualMode`)
7. ❌ Tested with different models
8. ❌ Simplified test to "hello world" level

**None of these resolved the hanging issue.**

## What Works

- ✅ Single agent with FilesystemBackend
- ✅ Orchestrator invokes task tool correctly
- ✅ Filesystem tools (`write_file`, `read_file`, etc.) work correctly
- ✅ Backend path resolution works (`virtualMode` with `rootDir`)
- ✅ Agent configuration matches official examples

## What Doesn't Work

- ❌ Subagent execution via `task` tool
- ❌ Any multi-agent orchestration pattern
- ❌ Subagent returning control to parent
- ❌ Subagent creating artifacts

## Impact

This issue is **blocking** for any use case requiring:
- Multi-agent orchestration
- Task delegation to specialized subagents
- Context isolation via subagents
- Parallel subagent execution

## Requested Actions

1. **Investigate subagent execution flow** in `/src/middleware/subagents.ts`
2. **Test the research example** (`examples/research/research-agent.ts`) to verify it works
3. **Add integration tests** for multi-agent patterns
4. **Merge recursionLimit fix** from this investigation
5. **Add debugging/logging** to subagent invocation for visibility
6. **Document known limitations** if this is expected behavior

## Additional Context

This investigation was conducted as part of evaluating DeepAgentsJS as a replacement for Claude Agent SDK for a 68-agent strategic intelligence platform (Dragonfly Thinking). The multi-agent orchestration pattern is critical for the migration.

### Comparison: Claude Agent SDK

The same pattern works correctly in Claude Agent SDK:

```typescript
// Claude Agent SDK (works)
const orchestrator = new Agent({
  name: 'orchestrator',
  instructions: orchestratorPrompt,
  subagents: [
    new Agent({
      name: 'swot-lens',
      instructions: swotPrompt,
    }),
  ],
});

// Subagent execution completes successfully
// Artifacts are created
// Orchestrator receives results
```

## Files for Reference

All test code and session data available in:
- `/tests/dragonfly-poc/` - Test implementation
- `/tests/sessions/` - Session audit trails with full execution logs
- `/src/middleware/subagents.ts:366-372` - Subagent invocation code (bug location)
- `/src/agent.ts:126-153` - SubAgent middleware configuration

## Contact

For questions or additional debugging information, please reference this issue.
