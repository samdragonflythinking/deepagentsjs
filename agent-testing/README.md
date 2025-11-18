# Agent Testing Directory

This directory contains comprehensive logging and testing infrastructure for multi-agent Dragonfly systems.

## Directory Structure

```
agent-testing/
├── README.md                    # This file
├── logged-test-runner.ts        # Main test runner with full logging
├── uae-project-example/         # Master copy of test project (read-only)
│   ├── background/              # Background documentation
│   │   ├── project-overview.md
│   │   ├── strategic-context.md
│   │   ├── market-analysis.md
│   │   └── challenges-assessment.md
│   ├── prior-reports/           # Pre-existing analysis
│   │   ├── swot-uae-ai-2024-q4.md
│   │   └── policy-landscape-2024.md
│   └── outputs/                 # Empty (agents write to session outputs)
└── YYYY-MM-DDTHH-MM-SS/        # Timestamped session directory (gitignored)
    ├── SUMMARY.json             # Test summary
    ├── logs/
    │   ├── execution.log        # Complete execution trace
    │   ├── messages.json        # All messages exchanged
    │   ├── tool-calls.json      # All tool invocations
    │   ├── agent-invocations.json  # Subagent calls
    │   └── full-result.json     # Complete agent result
    ├── background/              # Copy of background docs (session-specific)
    ├── prior-reports/           # Copy of prior reports (session-specific)
    ├── outputs/                 # New artifacts generated THIS session
    │   ├── pestle-*.md
    │   └── integrated-analysis-*.md
    └── prompts/                 # All prompts used
        ├── global-context.md
        ├── orchestrator.md
        ├── dragonfly-swot.md
        └── dragonfly-pestle.md
```

## What Gets Logged

### 1. Execution Log (`logs/execution.log`)
- Timestamped events
- Agent lifecycle (start, end, errors)
- Progress messages
- File I/O operations

### 2. Messages (`logs/messages.json`)
```json
{
  "timestamp": "2025-11-17T10:00:00.000Z",
  "agent": "orchestrator | dragonfly-swot | dragonfly-pestle",
  "role": "system | user | assistant",
  "content": "..."
}
```

### 3. Tool Calls (`logs/tool-calls.json`)
```json
{
  "timestamp": "2025-11-17T10:00:00.000Z",
  "agent": "dragonfly-swot",
  "toolName": "write_file",
  "arguments": {...},
  "result": "..."
}
```

### 4. Agent Invocations (`logs/agent-invocations.json`)
```json
{
  "timestamp": "2025-11-17T10:00:00.000Z",
  "parentAgent": "orchestrator",
  "subagent": "dragonfly-swot",
  "prompt": "Conduct SWOT analysis...",
  "status": "started | completed | failed",
  "durationMs": 72000
}
```

### 5. Full Result (`logs/full-result.json`)
- Complete LangGraph state
- All messages in conversation
- Metadata and execution stats

### 6. Summary (`SUMMARY.json`)
- Session overview
- Duration and message counts
- Artifacts created
- Quick reference for session review

## Running Tests

### Basic Usage

```bash
ANTHROPIC_API_KEY=your_key pnpm tsx agent-testing/logged-test-runner.ts
```

### With Debug Output

```bash
DEEPAGENTS_DEBUG_SUBAGENTS=true ANTHROPIC_API_KEY=your_key pnpm tsx agent-testing/logged-test-runner.ts
```

## Reviewing Test Results

### 1. Quick Overview
Check `SUMMARY.json` for high-level stats:
```bash
cat agent-testing/YYYY-MM-DDTHH-MM-SS/SUMMARY.json
```

### 2. Execution Trace
View complete execution log:
```bash
less agent-testing/YYYY-MM-DDTHH-MM-SS/logs/execution.log
```

### 3. Message Flow
See all messages exchanged:
```bash
cat agent-testing/YYYY-MM-DDTHH-MM-SS/logs/messages.json | jq
```

### 4. Tool Usage
Review all tool calls:
```bash
cat agent-testing/YYYY-MM-DDTHH-MM-SS/logs/tool-calls.json | jq
```

### 5. Agent Invocations
Track subagent delegations:
```bash
cat agent-testing/YYYY-MM-DDTHH-MM-SS/logs/agent-invocations.json | jq
```

### 6. Generated Artifacts
View created files:
```bash
ls -lh agent-testing/YYYY-MM-DDTHH-MM-SS/outputs/
cat agent-testing/YYYY-MM-DDTHH-MM-SS/outputs/swot-*.md
```

### 7. Prompts Used
Review exact prompts sent to agents:
```bash
cat agent-testing/YYYY-MM-DDTHH-MM-SS/prompts/orchestrator.md
cat agent-testing/YYYY-MM-DDTHH-MM-SS/prompts/dragonfly-swot.md
```

## Debugging Issues

### Agent Not Completing
1. Check `logs/execution.log` for last logged event
2. Review `logs/messages.json` to see where conversation stopped
3. Check `logs/agent-invocations.json` for stuck subagent

### Artifacts Not Created
1. Check `logs/tool-calls.json` for `write_file` calls
2. Review `logs/execution.log` for file I/O errors
3. Verify prompts in `prompts/` directory match expected format

### Performance Issues
1. Check `SUMMARY.json` for duration
2. Review `logs/agent-invocations.json` for slow subagents
3. Look at `logs/messages.json` to find long exchanges

## Session Management

### List All Sessions
```bash
ls -lt agent-testing/ | grep "^d"
```

### Clean Old Sessions
```bash
# Keep only last 5 sessions
cd agent-testing && ls -dt 20*/ | tail -n +6 | xargs rm -rf
```

### Archive Session
```bash
tar -czf session-YYYY-MM-DD.tar.gz agent-testing/YYYY-MM-DDTHH-MM-SS/
```

## Customizing Tests

To modify the test runner:

1. Edit `agent-testing/logged-test-runner.ts`
2. Change lenses in the `lenses` array
3. Modify the `testPrompt` string
4. Add custom logging in the callbacks
5. Adjust `recursionLimit` if needed

## Tips

- **Use jq for JSON**: `cat file.json | jq '.[] | select(.agent == "dragonfly-swot")'`
- **Grep logs**: `grep "ERROR" agent-testing/*/logs/execution.log`
- **Compare sessions**: `diff agent-testing/2025-11-17T10-00-00/logs/messages.json agent-testing/2025-11-17T11-00-00/logs/messages.json`
- **Watch live**: `tail -f agent-testing/20*/logs/execution.log`

## Troubleshooting

### "Session directory already exists"
- Sessions are timestamped to the second, so wait 1 second and retry
- Or manually delete the conflicting session directory

### "No messages logged"
- Ensure LLM callbacks are properly configured
- Check that model initialization includes `callbacks` parameter

### "Tool calls not captured"
- Tool call logging happens in result processing
- Verify tool middleware is installed correctly

## Integration with DeepAgentsJS

This testing infrastructure is designed specifically for:
- **Dragonfly multi-lens systems**
- **Orchestrator → Subagent patterns**
- **Artifact-generating workflows**
- **Long-running multi-agent tests**

It captures all LangGraph state, LangChain callbacks, and DeepAgents middleware operations.
