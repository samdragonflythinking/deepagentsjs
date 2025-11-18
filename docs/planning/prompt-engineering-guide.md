# Prompt Engineering Guide for DeepAgentsJS Lens Agents

This guide documents best practices for writing lens agent prompts that prevent recursion loops and ensure reliable artifact generation.

## Key Learnings from Testing

### The Recursion Problem

**Case Study**: Stakeholder Analysis lens initially hit LangGraph's 150-step recursion limit, executing 100+ LLM cycles without producing output.

**Root Cause**: The agent attempted to identify specific individuals and organizations, repeatedly re-reading background documentation searching for concrete details that weren't available.

**The Fix**: Adding explicit constraints reduced execution from 100 cycles to just 6 cycles, with successful artifact generation.

---

## Required Prompt Structure

Every lens prompt MUST include these elements in this order:

### 1. Explicit Guidelines Block (CRITICAL)

Place this at the very beginning of the lens instructions, before the numbered steps:

```markdown
**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information available in the background documentation
- Use role-based categories (e.g., "Federal AI Ministry officials", "Private sector AI firms")
  rather than attempting to find specific individual names
- After reviewing the background materials ONCE, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy
```

**Why this works**:
- Sets clear boundaries on research depth
- Prevents perfectionism loops
- Explicitly instructs single-pass reading
- Encourages role-based vs. specific identification

### 2. Clear Section Structure

Define exactly what sections the artifact must contain:

```markdown
1. Create a [Framework Name] analysis with these sections:
   - **Section 1** (2-4 points): Description
   - **Section 2** (2-4 points): Description
   - **Section 3** (2-4 points): Description
```

**Best practices**:
- Specify exact number of sections (not "at least" or "as many as needed")
- Provide point counts (2-4 points) to bound scope
- Use concrete section names, not generic descriptions

### 3. Simplified Attributes

Keep the number of attributes per item to 2-3 maximum:

**❌ Too Complex** (4 attributes - caused 100 cycle loop):
```markdown
For each stakeholder, provide:
- Interest: What they care about
- Influence: Power level (High/Medium/Low)
- Alignment: Support/Neutral/Opposition
- Engagement Strategy: How to work with them
```

**✅ Optimal** (2 attributes - completed in 6 cycles):
```markdown
For each stakeholder, provide:
- Interest & Influence: What they care about and their power level (High/Medium/Low)
- Alignment: Support/Neutral/Opposition
```

### 4. Explicit File Save Instruction

Always include exact file path format:

```markdown
4. Save using write_file:
   - file_path: outputs/[lens-name]-[topic-slug]-2025-11-17.md
   - content: Your complete [Framework Name] analysis

5. Respond: "[Framework Name] analysis complete"
```

### 5. Anti-Question Directive

End with this exact phrase:

```markdown
Do not ask questions. Just create and save the analysis.
```

---

## Proven Template

Use this template for all new lens agents:

```markdown
${globalContext}

# [Framework Name] Lens

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information available in the background documentation
- Use role-based categories rather than attempting to find specific individual names
- After reviewing the background materials ONCE, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy

You conduct systematic [framework name] analyses. When given a topic:

1. Create a [Framework Name] analysis with these sections:
   - **Section 1** (2-4 points): Description
   - **Section 2** (2-4 points): Description
   - **Section 3** (2-4 points): Description

2. For each point, be specific and evidence-based where possible.

3. Add a **Key Insights** section with 2-3 major takeaways.

4. Save using write_file:
   - file_path: outputs/[lens-name]-[topic-slug]-2025-11-17.md
   - content: Your complete [Framework Name] analysis

5. Respond: "[Framework Name] analysis complete"

Do not ask questions. Just create and save the analysis.
```

---

## Pattern Comparison: What Works vs. What Loops

### ✅ Pattern: Abstract Analysis (Porter's Five Forces - 8 cycles)

**Characteristics**:
- Analyzes market dynamics and competitive forces
- Can be completed with general industry knowledge
- Not dependent on specific factual details about individuals/orgs
- 5 sections with intensity ratings

**Why it works**: The task is conceptual analysis that doesn't require identifying specific entities.

### ❌ Pattern: Concrete Identification (Old Stakeholder - 100 cycles)

**Characteristics**:
- Requires identifying specific actors (people, organizations, ministries)
- 4 attributes per stakeholder (complex multi-dimensional analysis)
- Dependent on concrete information about actual entities
- No explicit constraints on research depth

**Why it failed**: Agent kept searching for specific names and details, re-reading files trying to find information that wasn't available.

### ✅ Pattern: Role-Based Categories (Fixed Stakeholder - 6 cycles)

**Characteristics**:
- Uses role-based categories ("Federal Government Leadership", "Healthcare AI Adopters")
- 2 simplified attributes (Interest & Influence combined, Alignment)
- Explicit "review materials ONCE" instruction
- Clear boundaries on research scope

**Why it works**: Agent doesn't need to find specific individuals, can complete analysis with available context.

---

## Guidelines by Framework Type

### Competitive/Market Analysis (SWOT, PESTLE, Porter)

**Characteristics**: Abstract, conceptual analysis
**Guidelines**: Standard template works well
**Complexity**: Can handle 4-6 sections with 2-4 points each

**Example frameworks**:
- SWOT Analysis (4 quadrants)
- PESTLE Analysis (6 dimensions)
- Porter's Five Forces (5 forces)
- BCG Matrix (4 categories)

### Stakeholder/Actor Analysis

**Characteristics**: Requires identifying specific entities
**Guidelines**: MUST use role-based categories + explicit constraints
**Complexity**: Limit to 2-3 attributes per stakeholder

**Key constraints to add**:
```markdown
- Use role-based categories (e.g., "Federal AI Ministry officials")
- Do not search for specific individual names
- Prioritize completing the analysis over perfect accuracy
```

### Scenario/Future Analysis

**Characteristics**: Creative extrapolation from current trends
**Guidelines**: Add "based on available context only" constraint
**Complexity**: 3-4 scenarios maximum

**Key constraints to add**:
```markdown
- Base scenarios on trends evident in the background documentation
- Do not attempt to research external future predictions
- Focus on plausible extrapolations from current context
```

---

## Performance Metrics

Track these metrics to identify problematic prompts:

| Metric | Good | Concerning | Critical |
|--------|------|------------|----------|
| **LLM Cycles** | < 10 | 10-25 | > 25 |
| **Duration** | < 5 min | 5-15 min | > 15 min |
| **Tool Calls** | < 15 | 15-30 | > 30 |
| **File Reads** | < 5 | 5-10 | > 10 |

**Red flags**:
- Agent re-reading the same file multiple times
- More than 3 minutes per LLM cycle (indicates stuck reasoning)
- More than 20 LLM cycles without writing output file
- Increasing cycle durations (suggests accumulating context/confusion)

---

## Testing New Lens Prompts

Before deploying a new lens, validate it:

1. **Run isolated test** - Test the lens with orchestrator in `agent-testing/`
2. **Check cycle count** - Should complete in < 15 LLM cycles
3. **Review artifact** - Ensure all required sections present
4. **Check logs** - Look for repeated file reads or long reasoning cycles
5. **Measure duration** - Should complete in < 10 minutes

**Test command**:
```bash
ANTHROPIC_API_KEY=... pnpm tsx agent-testing/logged-test-runner.ts
```

---

## Common Pitfalls

### ❌ Pitfall 1: Open-Ended Research
```markdown
"Research and identify all relevant stakeholders..."
```
**Problem**: "All" is unbounded, agent will loop searching

**Fix**:
```markdown
"Based on available documentation, identify 3-5 primary stakeholders..."
```

### ❌ Pitfall 2: Multiple Attribute Dimensions
```markdown
For each item, provide:
- Attribute 1
- Attribute 2
- Attribute 3
- Attribute 4
- Attribute 5
```
**Problem**: Complex multi-dimensional analysis causes paralysis

**Fix**:
```markdown
For each item, provide:
- Combined Attribute 1 & 2: Description
- Attribute 3: Value (High/Medium/Low)
```

### ❌ Pitfall 3: Missing Completion Signal
```markdown
4. Save using write_file
```
**Problem**: Agent doesn't know it's done after saving

**Fix**:
```markdown
4. Save using write_file:
   - file_path: outputs/...
   - content: Your complete analysis

5. Respond: "Analysis complete"
```

### ❌ Pitfall 4: Encouraging Iteration
```markdown
"Review your analysis and refine as needed..."
```
**Problem**: Invites perfectionism loops

**Fix**:
```markdown
"After reviewing materials ONCE, proceed directly to creating the analysis"
```

---

## When to Deviate from Template

The template is optimized for **comprehensive but bounded** strategic analysis. You may need adjustments for:

### Quick Diagnostic Lenses (< 1KB outputs)
- Can use simpler prompts without extensive guidelines
- Example: "List 3 key risks. Save to outputs/risks-[topic].md"

### Research-Heavy Lenses (when web search available)
- Add explicit search budget: "Use up to 3 web searches"
- Require citation format: "Include [Source: URL] for external claims"

### Multi-Stage Lenses (reading prior artifacts)
- Add explicit file list: "First read outputs/swot-*.md and outputs/pestle-*.md"
- Prevent cascade loops: "Read each prior artifact once, do not re-read"

---

## Prompt Evolution

As you gather more data:

1. **Track metrics** - Log cycles, duration, tool calls per lens
2. **Identify outliers** - Lenses with > 20 cycles need review
3. **A/B test changes** - Run old vs. new prompt, compare metrics
4. **Document patterns** - Update this guide with new findings

**Continuous improvement loop**:
```
Write prompt → Test → Measure cycles → Identify issues →
Add constraints → Test again → Document pattern
```

---

## Summary Checklist

Before deploying any lens prompt, verify:

- [ ] **Guidelines block** at the top with research constraints
- [ ] **Role-based categories** for any entity identification tasks
- [ ] **2-3 attributes max** per analyzed item
- [ ] **Exact section structure** specified (not open-ended)
- [ ] **Explicit file save** instruction with path format
- [ ] **Completion response** specified
- [ ] **"Do not ask questions"** directive at end
- [ ] **Test run completed** in < 15 cycles
- [ ] **Artifact validated** with all required sections
- [ ] **No repeated file reads** in execution logs

---

**Version**: 1.0
**Last Updated**: 2025-11-18
**Based on**: Test sessions 2025-11-17T12-00-42 (failure) and 2025-11-18T10-28-39 (success)
**See also**: `docs/planning/test-findings.md` for detailed test results
