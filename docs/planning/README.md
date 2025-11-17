# DeepAgents Migration Exploration - Overview

> **📊 PHASE 1 COMPLETE (2025-11-17):** Multi-agent orchestration proven successful! See [STATUS.md](./STATUS.md) for detailed results and next steps.

**Date Created:** 2025-11-12
**Last Updated:** 2025-11-17
**Current Phase:** Phase 1 Complete, Phase 2 Ready
**Purpose:** Executive overview for technical review

---

## Quick Context: What is Dragonfly?

**Dragonfly Thinking** is a multi-agent strategic intelligence platform with **68 specialized AI agents** ("lenses") that analyze complex challenges through different frameworks (SWOT, PESTLE, Porter's Five Forces, Stakeholder Analysis, etc.).

**Current Architecture:**
- Built on **Claude Agent SDK** (Anthropic's official framework)
- **1 orchestrator agent** (dragonfly-ai) delegates to 67 lens agents
- Each lens produces **markdown artifacts** (strategic analysis reports)
- Lenses can **reference past artifacts** to build cumulative intelligence
- Users get **real-time streaming** of tool execution and results

**Scale:**
- 68 agents across 8 categories
- ~50KB of prompt engineering per agent (global context + methodology + operational instructions)
- Production system serving strategic analysts, consultants, decision-makers

---

## The Question: Should We Migrate to DeepAgents?

### What is DeepAgents?

**DeepAgentsJS** is an open-source TypeScript framework (this repo) for building "deep agents" - LLM agents capable of:
- Multi-step reasoning and planning
- Spawning specialized sub-agents
- File system operations with context isolation
- Complex workflows via middleware architecture

Built on **LangGraph** (same foundation as Claude SDK), but with potential advantages:
- More flexible middleware system
- Better backend abstraction (state, filesystem, composite)
- Open source (vs. Anthropic's closed SDK)
- TypeScript-native

### Why Explore Migration?

**Current pain points with Claude SDK:**
- Limited middleware extensibility
- Tightly coupled to Anthropic's tool conventions
- Less control over state management
- Vendor lock-in risk

**Potential DeepAgents advantages:**
- Middleware architecture for better separation of concerns
- Backend flexibility (in-memory, filesystem, composite)
- Open source community and extensibility
- Could be more cost-effective at scale

**The risk:**
- DeepAgents is newer, less proven
- Missing some features (WebFetch, WebSearch tools)
- Migration effort could be significant
- Might not support our orchestration patterns

### The Goal

**Test whether DeepAgents can replicate Dragonfly's core multi-agent orchestration pattern:**
1. Orchestrator agent invokes specialized lens agents dynamically
2. Each lens produces a markdown artifact (analysis report)
3. Subsequent lenses can read and reference prior artifacts
4. All artifacts are accessible for synthesis

If successful → Consider migration for flexibility and cost benefits
If unsuccessful → Stay with Claude SDK (proven, production-ready)

---

## The Test Plan

### Approach: Phased Proof-of-Concept

We're **not** doing a full migration. We're building a **minimal test** to validate the architecture.

#### Phase 1: Basic Orchestration (2-3 hours)
**Test:** Orchestrator → SWOT lens → artifact creation

**Setup:**
- Port 1 orchestrator prompt + 1 lens prompt
- Create DeepAgents runner with minimal config
- Verify task delegation works

**Success criteria:**
- ✅ Orchestrator invokes SWOT lens via `task` tool
- ✅ SWOT lens creates markdown artifact
- ✅ No errors in execution

#### Phase 2: Context Cascade (2-3 hours)
**Test:** PESTLE lens reads SWOT artifact

**Setup:**
- Port 2nd lens prompt (PESTLE)
- Configure orchestrator to invoke both sequentially
- Verify file reading works

**Success criteria:**
- ✅ PESTLE lens uses `read_file` to access SWOT artifact
- ✅ PESTLE content explicitly references SWOT findings
- ✅ Both artifacts exist in test workspace

#### Phase 3: Multi-Lens Synthesis (2-3 hours)
**Test:** 3 lenses + orchestrator synthesis

**Setup:**
- Port 3rd lens (Stakeholder Analysis)
- Orchestrator reads all 3 artifacts
- Provide integrated synthesis

**Success criteria:**
- ✅ All 3 lenses produce artifacts
- ✅ Each lens references prior work
- ✅ Orchestrator synthesis shows "compound vision" (multi-lens insights)

#### Phase 4: Scalability (1-2 hours)
**Test:** 15 agents registered, 5-lens workflow

**Success criteria:**
- ✅ No performance degradation
- ✅ Memory usage acceptable
- ✅ Execution time < 5 min

#### Phase 5: Decision (1 hour)
**Test:** Comprehensive comparison and recommendation

**Deliverable:** Decision matrix scoring Claude SDK vs. DeepAgents on:
- Core functionality
- Performance
- Developer experience
- Flexibility
- Documentation

---

## Key Technical Challenges

### 1. Tool Name Differences
**Claude SDK:** `Task`, `Write`, `Read`, `Glob`, `Grep`
**DeepAgents:** `task`, `write_file`, `read_file`, `glob`, `grep`

**Impact:** Must adapt all prompts (68 agents)

### 2. File Path Handling
**Claude SDK:** Uses `{WORKSPACE_PATH}` placeholder replaced at runtime
**DeepAgents:** Relative paths from backend's `cwd`

**Impact:** Simplifies paths but requires prompt updates

### 3. Sub-Agent Registration
**Claude SDK:** All 68 agents written to `.claude/agents/*.md` at runtime
**DeepAgents:** Passed via config object to `createSubAgentMiddleware()`

**Impact:** More explicit, but requires programmatic registration

### 4. Missing Web Tools
**Claude SDK:** WebFetch, WebSearch, Bash built-in
**DeepAgents:** Not available (yet)

**Impact:** Phase 1 tests file-only workflows; web tools can be added later

### 5. Artifact Detection
**Claude SDK:** PostToolUse hook watches Write tool, auto-detects artifacts
**DeepAgents:** No hook system (yet)

**Impact:** For test, we manually check file system; could build hook layer later

---

## What We're NOT Testing (Out of Scope)

- ❌ Real-time SSE streaming to web UI
- ❌ Database persistence (PostgreSQL integration)
- ❌ Hook-based artifact enrichment (summaries, YAML frontmatter)
- ❌ Project workspace management (multi-session context)
- ❌ Full 68-agent catalog (just 3-5 for test)
- ❌ Web research tools (WebFetch/WebSearch)
- ❌ Production deployment

These can be addressed **after** we validate core orchestration works.

---

## Documentation Structure

### For Understanding Dragonfly (Current System)
📁 `/docs/DTclaude-multi-agent-setup/`
- `multi-agent-architecture-overview.md` - System architecture, agent patterns
- `agent-tools-and-capabilities.md` - Complete tool reference
- `implementation-examples.md` - Code patterns, workflows
- `prompt-file-reference.md` - Where all prompts live

📄 `/docs/README.md` - High-level overview of Dragonfly system

### For Understanding the Test Plan
📁 `/docs/planning/`
- `deepagents-migration-plan.md` - **Complete 5-phase roadmap** ⭐
- `prompt-adaptation-guide.md` - How to port prompts from Claude SDK to DeepAgents
- `README.md` - This file (executive overview)

---

## Review Questions for Your Colleague

We'd love feedback on:

### 1. **Is the phased approach sound?**
- Does the test sequence (1 lens → 2 lens cascade → 3 lens synthesis) adequately validate the architecture?
- Are there critical scenarios we're missing?

### 2. **Are the success criteria clear and sufficient?**
- What else should we measure to make a confident decision?
- Are there edge cases we should test?

### 3. **What's the risk assessment?**
- What could go wrong that we haven't anticipated?
- What's the downside if DeepAgents doesn't work out?

### 4. **Is the scope appropriate?**
- Too ambitious (should we reduce scope)?
- Too limited (should we test more features)?

### 5. **Technical concerns?**
- Any red flags in the DeepAgents architecture?
- Concerns about the middleware approach?
- Missing features that are dealbreakers?

### 6. **Migration effort estimate?**
- If DeepAgents works, how hard is full migration?
- Is the juice worth the squeeze?

---

## Success Metrics

### Minimum Viable Success (Go/No-Go)
- ✅ Orchestrator can invoke lens agents dynamically
- ✅ Lens agents create markdown artifacts
- ✅ Artifacts can be read by subsequent agents
- ✅ Multi-lens workflows complete without errors

**If these work → DeepAgents is viable**
**If any fail → Stay with Claude SDK**

### Stretch Goals (Nice-to-Have)
- 📊 Performance comparable to Claude SDK
- 🔧 Better developer experience (easier config, debugging)
- 📈 Handles 15+ agents without issues
- 💰 Lower cost per analysis

---

## Timeline

**Estimated effort:** 8-12 hours total
- Phase 1-3: 6-9 hours (core validation)
- Phase 4: 1-2 hours (scalability)
- Phase 5: 1 hour (decision)

**Proposed schedule:**
- **Day 1:** Phase 1-2 (basic orchestration + context cascade)
- **Day 2:** Phase 3-4 (multi-lens synthesis + scalability)
- **Day 3:** Phase 5 (comparison and decision)

**Deliverable:** Decision document with recommendation and supporting evidence

---

## Next Steps

**After review:**
1. ✅ Get feedback on this plan
2. ✅ Address any concerns/adjustments
3. ✅ Proceed with Phase 1 implementation

**If approved:**
- Create test directory: `examples/dragonfly-test/`
- Port prompts (orchestrator + 3 lenses)
- Build minimal runner
- Execute Phase 1 test

---

## Questions?

**For technical details:** See `/docs/planning/deepagents-migration-plan.md`
**For prompt porting:** See `/docs/planning/prompt-adaptation-guide.md`
**For Dragonfly context:** See `/docs/DTclaude-multi-agent-setup/`

**Contact:** [Your contact info here]

---

**Status:** ✅ Planning complete, awaiting review and approval for Phase 1
