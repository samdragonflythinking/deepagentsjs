# Dragonfly POC - DeepAgents Migration Test

This directory contains proof-of-concept tests for validating whether **DeepAgents** can replicate **Dragonfly Thinking**'s multi-agent orchestration patterns.

## Project Context

**Dragonfly Thinking** is a 68-agent strategic intelligence platform built on Claude Agent SDK. This POC explores migrating to DeepAgents for improved flexibility and reduced vendor lock-in.

## Phase 1: Basic Orchestration

**Goal**: Validate core orchestration pattern: Orchestrator → Lens delegation → Artifact creation

**Test**: Orchestrator invokes SWOT lens via `task` tool, lens creates markdown artifact

**Success Criteria**:
- ✅ Orchestrator successfully invokes SWOT lens
- ✅ SWOT lens creates markdown artifact
- ✅ Artifact contains proper SWOT analysis structure
- ✅ No errors during execution
- ✅ Complete session audit trail created

## Quick Start

### 1. Set up environment

```bash
# Copy example env file
cp .env.example .env

# Add your Anthropic API key
# Edit .env and set: ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 2. Run Phase 1 test

```bash
# From repo root
ANTHROPIC_API_KEY=your-key-here tsx tests/dragonfly-poc/orchestrator-test.ts
```

### 3. Review results

```bash
# Session output will be in:
tests/dragonfly-poc/sessions/YYYY-MM-DDTHH-MM-SS-{topic}/

# Each session contains:
# - session-info.json       # Metadata, config, status
# - orchestrator-prompt.md  # System prompt served to orchestrator
# - dragonfly-swot-prompt.md # System prompt served to SWOT lens
# - chat-history.json       # Complete message history
# - chat-history.md         # Readable message history
# - execution-log.txt       # Tool calls, events, timing
# - config.json            # Test configuration
# - SUMMARY.md             # Session summary
# - outputs/               # Artifacts created by lenses
#   └── swot-*.md         # SWOT analysis artifact
```

## Session Structure

Every test run creates a timestamped session folder with complete audit trail:

```
sessions/2025-11-12T14-30-45-tesla-swot/
├── session-info.json              # Metadata (timestamp, models, status)
├── orchestrator-prompt.md         # Full orchestrator system prompt
├── dragonfly-swot-prompt.md       # Full SWOT lens system prompt
├── chat-history.json              # Complete message history (JSON)
├── chat-history.md                # Readable message history (Markdown)
├── execution-log.txt              # Tool calls, timing, events
├── config.json                    # Test configuration used
├── SUMMARY.md                     # Session summary
└── outputs/                       # Artifacts created
    └── swot-tesla-2025-11-12.md   # SWOT analysis report
```

## Directory Structure

```
tests/dragonfly-poc/
├── orchestrator-test.ts           # Main test runner (Phase 1)
├── prompts/
│   ├── orchestrator.ts            # Orchestrator prompt (simplified)
│   ├── global-context.ts          # Shared Dragonfly standards
│   └── lenses/
│       └── swot.ts                # SWOT lens prompt (simplified)
├── utils/
│   └── session.ts                 # Session management utilities
├── sessions/                      # Test session outputs (gitignored)
│   └── [timestamp-topic]/         # Individual session folders
├── .env.example                   # Environment variables template
└── README.md                      # This file
```

## Prompts (Simplified for Phase 1)

The prompts in this POC are **simplified versions** of the full Dragonfly system:

### What's Included (Essentials):
- Core Dragonfly identity and philosophy
- Evidence protocol (three-layer standard)
- Professional standards (no fabrication, specificity)
- Tool usage patterns (`task`, `read_file`, `write_file`)
- Orchestration workflow (discovery → delegation → synthesis)
- Framework methodology (SWOT-specific analysis process)

### What's Excluded (Full System):
- Tier system (T1/T2/T3) with production budgets
- 13 structured workflows
- 8 professional personas
- Element counting system
- Multi-lens execution protocol
- Validation protocol details
- Workspace navigation and artifact catalog integration

**Note**: Comments in prompt files document what's been simplified. Full prompts will be integrated in later phases if POC succeeds.

## Model Configuration

Phase 1 uses Claude Sonnet 4.5 by default, but DeepAgents is model-agnostic:

```typescript
// Easy to swap models:
const model = new ChatAnthropic({ model: "claude-sonnet-4-5-20250929" });
// Or: new ChatOpenAI({ model: "gpt-4" })
// Or: new ChatGoogleGenerativeAI({ model: "gemini-1.5-pro" })
```

Future phases will test with multiple model providers.

## Execution Limits

LimitsMiddleware enforces safety constraints:

- **maxToolCalls**: 50 (prevent runaway tool usage)
- **maxSubagentSpawns**: 5 (cap number of subagents)
- **maxRecursionDepth**: 3 (prevent infinite delegation loops)

These can be adjusted in `orchestrator-test.ts` TEST_CONFIG.

## Next Steps After Phase 1

If Phase 1 succeeds:

**Phase 2** (Context Cascade):
- Add PESTLE lens
- Test lens reading prior artifacts
- Implement artifact validator middleware

**Phase 3** (Multi-Lens Synthesis):
- Add Stakeholder Analysis lens
- Test orchestrator synthesizing 3 lenses
- Implement chat routing middleware

**Phase 4** (Scalability):
- Register 15 agents
- Test 5-lens workflow
- Performance benchmarking

**Phase 5** (Decision):
- Compare DeepAgents vs Claude SDK
- Migration effort estimate
- Go/No-Go recommendation

## Troubleshooting

### API Key Issues

```
Error: ANTHROPIC_API_KEY not found
```

**Solution**: Set environment variable before running test:
```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
# Or add to .env file
```

### Limit Exceeded Errors

```
LimitExceededError: Maximum tool calls exceeded
```

**Solution**: Increase limits in `orchestrator-test.ts`:
```typescript
const TEST_CONFIG = {
  limits: {
    maxToolCalls: 100,  // Increase from 50
    // ...
  },
};
```

### Missing Artifacts

If test completes but no artifact created:

1. Check `execution-log.txt` for errors
2. Review `chat-history.md` to see agent interactions
3. Verify SWOT lens is saving to correct path: `outputs/swot-*.md`

### Session Directory Issues

Sessions are created in `tests/dragonfly-poc/sessions/`. If directory doesn't exist, it's created automatically. If permissions issue, check directory access.

## Key Files to Review After Test

1. **SUMMARY.md** - High-level session summary
2. **execution-log.txt** - Tool calls and timing
3. **outputs/swot-*.md** - The artifact produced
4. **chat-history.md** - Full agent conversation
5. **session-info.json** - Metadata and status

## Success Indicators

✅ **Test Passed** if:
- Session status: "success"
- Artifacts created: 1+ (swot-*.md)
- Subagents invoked: ["dragonfly-swot"]
- No errors in execution-log.txt
- SWOT artifact contains all required sections

❌ **Test Failed** if:
- Session status: "failed"
- Error message in session-info.json
- Missing artifact in outputs/
- Execution halted due to limits
- Agent stuck in loop or timeout

## Contact

For questions about this POC or Dragonfly migration:
- Review: `/docs/planning/deepagents-migration-plan-v2.md`
- Status: `/docs/planning/STATUS.md`

---

**Last Updated**: 2025-11-12
**Phase**: Phase 1 (Basic Orchestration)
**Status**: Ready for testing
