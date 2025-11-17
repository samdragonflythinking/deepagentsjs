# Prompt File Reference - Complete File Paths

**Purpose:** Quick reference for locating all agent prompts and configuration files
**Last Updated:** 2025-11-12

---

## Global Context Prompt

**File:** `src/lib/agents/prompts/dragonfly-global-context.md`

This prompt is **prepended to all lens agent prompts** and defines:
- Three foundational pillars (Evidence-Driven Intelligence, Compound Vision, Adaptive Precision)
- Ten core capabilities
- Quality standards and output requirements
- Evidence protocols
- File saving instructions

**Usage:**
```typescript
// Automatically prepended in loadPrompt() function
const lensPrompt = loadPrompt('02-risk-analysis/02-swot-analysis.md');
// Result: dragonfly-global-context.md + swot-analysis.md
```

---

## Orchestrator Agent

**File:** `src/lib/agents/prompts/dragonfly-ai.md`

**Agent ID:** `dragonfly-ai`

**Description:** Strategic intelligence orchestrator that:
- Clarifies vague strategic questions
- Recommends appropriate lenses
- Delegates to specialized agents via Task tool
- Synthesizes insights across multiple frameworks
- Maintains conversational context

**Tools:** Read, Write, WebFetch, WebSearch, TodoWrite, Bash, Glob, Grep, Task

**Key Sections:**
- Dragonfly identity and philosophy
- Three foundational pillars
- Ten core capabilities
- Available lens agents (complete catalog)
- Multi-lens workflow patterns
- Common lens combinations
- Synthesis guidance

---

## Lens Agent Prompts by Category

### Category 1: Stakeholder Analysis (5 lenses)

**Directory:** `src/lib/agents/prompts/01-stakeholder-analysis/`

| Agent ID | File | Description |
|----------|------|-------------|
| `dragonfly-stakeholder-analysis` | `01-stakeholder-analysis.md` | Stakeholder mapping and power dynamics |
| `dragonfly-expert-perspectives` | `02-expert-perspectives.md` | Multi-expert consultation simulation |
| `dragonfly-stakeholder-engagement` | `03-stakeholder-engagement.md` | Engagement strategies and communication plans |
| `dragonfly-stakeholder-dynamics` | `04-stakeholder-dynamics.md` | Relationship mapping and influence networks |
| `dragonfly-stakeholder-workflow-orchestrator` | `05-stakeholder-workflow-orchestrator.md` | Multi-lens stakeholder workflow coordinator |

---

### Category 2: Risk Analysis (8 lenses)

**Directory:** `src/lib/agents/prompts/02-risk-analysis/`

| Agent ID | File | Description |
|----------|------|-------------|
| `dragonfly-pestle-analysis` | `01-pestle-analysis.md` | Macro-environmental scanning (Political, Economic, Social, Technological, Legal, Environmental) |
| `dragonfly-swot-analysis` | `02-swot-analysis.md` | Strengths, Weaknesses, Opportunities, Threats analysis |
| `dragonfly-pre-mortem-analysis` | `03-pre-mortem-analysis.md` | Prospective hindsight - imagine failure and work backwards |
| `dragonfly-risk-mitigation-resilience` | `04-risk-mitigation-resilience.md` | Risk response strategies and resilience building |
| `dragonfly-scenario-planning` | `05-scenario-planning.md` | Multiple future scenarios exploration |
| `dragonfly-sensitivity-analysis` | `06-sensitivity-analysis.md` | Variable sensitivity and robustness testing |
| `dragonfly-threat-modeling` | `07-threat-modeling.md` | Systematic threat identification and assessment |
| `dragonfly-risk-workflow-orchestrator` | `08-risk-workflow-orchestrator.md` | Multi-lens risk workflow coordinator |

---

### Category 3: Strategic Planning (9 lenses)

**Directory:** `src/lib/agents/prompts/03-strategic-planning/`

| Agent ID | File | Description |
|----------|------|-------------|
| `dragonfly-goals-alignment` | `01-goals-alignment.md` | Strategic goal setting and alignment |
| `dragonfly-objectives-key-results` | `02-objectives-key-results.md` | OKR framework implementation |
| `dragonfly-roadmap-planning` | `03-roadmap-planning.md` | Strategic roadmap development |
| `dragonfly-theory-of-change` | `04-theory-of-change.md` | Logic model for change initiatives |
| `dragonfly-north-star-metric` | `05-north-star-metric.md` | Core metric identification and alignment |
| `dragonfly-balanced-scorecard` | `06-balanced-scorecard.md` | Multi-perspective performance measurement |
| `dragonfly-resource-allocation` | `07-resource-allocation.md` | Strategic resource distribution |
| `dragonfly-capability-gap-analysis` | `08-capability-gap-analysis.md` | Current vs. required capabilities |
| `dragonfly-strategic-planning-workflow-orchestrator` | `09-strategic-planning-workflow-orchestrator.md` | Multi-lens strategic planning coordinator |

---

### Category 4: Market Analysis (7 lenses)

**Directory:** `src/lib/agents/prompts/04-market-analysis/`

| Agent ID | File | Description |
|----------|------|-------------|
| `dragonfly-porters-five-forces` | `01-porters-five-forces.md` | Industry structure analysis (competitive rivalry, supplier power, buyer power, substitutes, new entrants) |
| `dragonfly-competitive-intelligence` | `02-competitive-intelligence.md` | Competitor deep-dive and positioning |
| `dragonfly-value-chain-analysis` | `03-value-chain-analysis.md` | Value creation and competitive advantage |
| `dragonfly-market-segmentation` | `04-market-segmentation.md` | Customer segmentation and targeting |
| `dragonfly-positioning-strategy` | `05-positioning-strategy.md` | Brand and market positioning |
| `dragonfly-pricing-strategy` | `06-pricing-strategy.md` | Pricing models and optimization |
| `dragonfly-market-analysis-workflow-orchestrator` | `07-market-analysis-workflow-orchestrator.md` | Multi-lens market analysis coordinator |

---

### Category 5: Innovation (6 lenses)

**Directory:** `src/lib/agents/prompts/05-innovation/`

| Agent ID | File | Description |
|----------|------|-------------|
| `dragonfly-innovation-opportunity` | `01-innovation-opportunity.md` | Innovation opportunity identification |
| `dragonfly-jobs-to-be-done` | `02-jobs-to-be-done.md` | Customer job analysis |
| `dragonfly-technology-assessment` | `03-technology-assessment.md` | Technology evaluation and adoption |
| `dragonfly-disruptive-innovation` | `04-disruptive-innovation.md` | Disruptive threat and opportunity analysis |
| `dragonfly-blue-ocean-strategy` | `05-blue-ocean-strategy.md` | Uncontested market space creation |
| `dragonfly-innovation-workflow-orchestrator` | `06-innovation-workflow-orchestrator.md` | Multi-lens innovation coordinator |

---

### Category 6: Business Strategy (10 lenses)

**Directory:** `src/lib/agents/prompts/06-business-strategy/`

| Agent ID | File | Description |
|----------|------|-------------|
| `dragonfly-business-model-canvas` | `01-business-model-canvas.md` | Business model design (9 blocks) |
| `dragonfly-lean-canvas` | `02-lean-canvas.md` | Lean startup business model |
| `dragonfly-value-proposition-canvas` | `03-value-proposition-canvas.md` | Customer value alignment |
| `dragonfly-strategic-options` | `04-strategic-options.md` | Strategic alternative generation |
| `dragonfly-moat-analysis` | `05-moat-analysis.md` | Competitive advantage sustainability |
| `dragonfly-growth-strategy` | `06-growth-strategy.md` | Growth pathway analysis |
| `dragonfly-partnership-strategy` | `07-partnership-strategy.md` | Strategic alliance evaluation |
| `dragonfly-platform-strategy` | `08-platform-strategy.md` | Platform business model design |
| `dragonfly-ecosystem-mapping` | `09-ecosystem-mapping.md` | Business ecosystem analysis |
| `dragonfly-business-strategy-workflow-orchestrator` | `10-business-strategy-workflow-orchestrator.md` | Multi-lens business strategy coordinator |

---

### Category 7: Organizational Design (5 lenses)

**Directory:** `src/lib/agents/prompts/07-organizational-design/`

| Agent ID | File | Description |
|----------|------|-------------|
| `dragonfly-organizational-structure` | `01-organizational-structure.md` | Org chart and reporting design |
| `dragonfly-culture-assessment` | `02-culture-assessment.md` | Organizational culture analysis |
| `dragonfly-change-management` | `03-change-management.md` | Change initiative planning |
| `dragonfly-team-design` | `04-team-design.md` | Team structure and composition |
| `dragonfly-organizational-design-workflow-orchestrator` | `05-organizational-design-workflow-orchestrator.md` | Multi-lens organizational design coordinator |

---

### Category 8: Decision-Making (6 lenses)

**Directory:** `src/lib/agents/prompts/08-decision-making/`

| Agent ID | File | Description |
|----------|------|-------------|
| `dragonfly-decision-matrix` | `01-decision-matrix.md` | Multi-criteria decision analysis |
| `dragonfly-cost-benefit-analysis` | `02-cost-benefit-analysis.md` | Financial cost-benefit evaluation |
| `dragonfly-decision-trees` | `03-decision-trees.md` | Decision tree modeling |
| `dragonfly-real-options` | `04-real-options.md` | Strategic options valuation |
| `dragonfly-ethical-analysis` | `05-ethical-analysis.md` | Ethical implications assessment |
| `dragonfly-decision-making-workflow-orchestrator` | `06-decision-making-workflow-orchestrator.md` | Multi-lens decision-making coordinator |

---

### Category 9: Synthesis & Meta-Agents (5 lenses)

**Directory:** `src/lib/agents/prompts/09-synthesis-workflows/`

| Agent ID | File | Description |
|----------|------|-------------|
| `dragonfly-synthesizer` | `01-synthesizer.md` | Multi-lens insight integration |
| `dragonfly-lens-recommender` | `02-lens-recommender.md` | Lens selection advisor |
| `dragonfly-deep-research` | `03-deep-research.md` | Comprehensive research agent |
| `dragonfly-strategic-brief` | `04-strategic-brief.md` | Executive summary generator |
| `dragonfly-workflow-designer` | `05-workflow-designer.md` | Custom workflow creation |

---

## Agent Registry Configuration

**File:** `src/lib/agents/lenses.ts`

This TypeScript file contains the `DRAGONFLY_LENSES` registry that maps agent IDs to:
- Display name
- Description
- Prompt file path (loaded via `loadPrompt()`)
- Tools array
- Model preference (sonnet/opus/haiku/inherit)
- Category
- Tagline
- UI metadata (icon, color)

**Example:**
```typescript
export const DRAGONFLY_LENSES: Record<string, LensAgentDefinition> = {
  'dragonfly-swot-analysis': {
    description: 'Strategic SWOT analysis expert - V2',
    prompt: loadPrompt('02-risk-analysis/02-swot-analysis.md'),
    tools: ['Read', 'Write', 'WebFetch', 'TodoWrite', 'WebSearch', 'Bash'],
    model: 'inherit',
    displayName: 'SWOT Analysis',
    category: 'risk-analysis',
    tagline: 'Strengths, Weaknesses, Opportunities, Threats',
    icon: 'shield-check',
    color: 'blue',
  },
  // ... 60 more lenses
};
```

---

## Prompt Loading Function

**File:** `src/lib/agents/prompts/index.ts`

```typescript
export function loadPrompt(promptPath: string): string {
  const fs = require('fs');
  const path = require('path');

  // Load global context
  const globalContextPath = path.join(__dirname, 'dragonfly-global-context.md');
  const globalContext = fs.readFileSync(globalContextPath, 'utf-8');

  // Load specific lens prompt
  const lensPromptPath = path.join(__dirname, promptPath);
  const lensPrompt = fs.readFileSync(lensPromptPath, 'utf-8');

  // Combine: global context + lens prompt
  return `${globalContext}\n\n---\n\n${lensPrompt}`;
}
```

---

## Prompt Structure Pattern

**All lens prompts follow this structure:**

```markdown
# [Lens Name] Expert

You are a strategic analysis expert specializing in [framework name].

## Your Task

[What this lens does, what framework it applies]

## Methodology

[Step-by-step analysis process]

## Report Structure

[Template for the report with sections and subsections]

## Quality Standards

- Evidence-based: Every claim must cite sources
- Transparent reasoning: Show your analytical steps
- Acknowledge limitations: State what you can't assess
- Actionable insights: Provide clear strategic implications

## CRITICAL: File Saving Instructions

**Your workspace location:** `{WORKSPACE_PATH}`

**IMPORTANT - You MUST save your analysis to a file:**

1. Use an absolute path
2. Save to the outputs folder - Path MUST include `/outputs/`
3. Use markdown format - Filename ends with `.md`

**Correct file path format:**
{WORKSPACE_PATH}/outputs/[lens-name]-[topic-slug]-[date].md

**Example:**
{WORKSPACE_PATH}/outputs/swot-tesla-market-analysis-2025-11-12.md

## Additional Instructions

[Lens-specific guidance, edge cases, best practices]
```

---

## Workspace Path Injection

**At runtime, the `{WORKSPACE_PATH}` placeholder is replaced:**

```typescript
// src/lib/sdk/agent-runner.ts

const workspace = '/tmp/dragonfly-projects/proj-123/sessions/sess-456/';

const promptWithWorkspace = lensAgent.prompt.replace(
  /{WORKSPACE_PATH}/g,
  workspace
);

// Result:
// {WORKSPACE_PATH}/outputs/swot-tesla.md
// → /tmp/dragonfly-projects/proj-123/sessions/sess-456/outputs/swot-tesla.md
```

---

## How to Recreate Agents for DeepAgents

### Step 1: Copy Global Context
```bash
cp src/lib/agents/prompts/dragonfly-global-context.md \
   /path/to/deepagents-repo/prompts/global-context.md
```

### Step 2: Copy Orchestrator
```bash
cp src/lib/agents/prompts/dragonfly-ai.md \
   /path/to/deepagents-repo/prompts/orchestrator.md
```

### Step 3: Copy Lens Prompts
```bash
# Example: Copy SWOT lens
cp src/lib/agents/prompts/02-risk-analysis/02-swot-analysis.md \
   /path/to/deepagents-repo/prompts/swot-analysis.md

# Copy PESTLE lens
cp src/lib/agents/prompts/02-risk-analysis/01-pestle-analysis.md \
   /path/to/deepagents-repo/prompts/pestle-analysis.md

# Copy Stakeholder lens
cp src/lib/agents/prompts/01-stakeholder-analysis/01-stakeholder-analysis.md \
   /path/to/deepagents-repo/prompts/stakeholder-analysis.md
```

### Step 4: Combine Global Context + Lens Prompt

In DeepAgents, you'll need to manually combine or programmatically prepend:

```typescript
// DeepAgents setup
import fs from 'fs';

const globalContext = fs.readFileSync('./prompts/global-context.md', 'utf-8');
const swotPrompt = fs.readFileSync('./prompts/swot-analysis.md', 'utf-8');

const fullPrompt = `${globalContext}\n\n---\n\n${swotPrompt}`;

// Use fullPrompt when creating DeepAgent
```

### Step 5: Replace Workspace Path

DeepAgents likely uses similar placeholders, but verify the mechanism:

```typescript
// Example with DeepAgents
const workspace = '/tmp/deepagents-test/';
const promptWithWorkspace = fullPrompt.replace(/{WORKSPACE_PATH}/g, workspace);
```

---

## Quick Reference: Essential Prompts for Testing

**Minimal test set (orchestrator + 3 lenses):**

1. **Global Context:** `dragonfly-global-context.md`
2. **Orchestrator:** `dragonfly-ai.md`
3. **SWOT Lens:** `02-risk-analysis/02-swot-analysis.md`
4. **PESTLE Lens:** `02-risk-analysis/01-pestle-analysis.md`
5. **Stakeholder Lens:** `01-stakeholder-analysis/01-stakeholder-analysis.md`

**Full catalog (61 lenses):**
- See [Agent Registry](#agent-registry-configuration) section above
- All prompts in `src/lib/agents/prompts/` directory
- Organized by 9 categories

---

## File Count Summary

- **1** Global context prompt
- **1** Orchestrator prompt
- **61** Lens agent prompts
  - 5 Stakeholder Analysis lenses
  - 8 Risk Analysis lenses
  - 9 Strategic Planning lenses
  - 7 Market Analysis lenses
  - 6 Innovation lenses
  - 10 Business Strategy lenses
  - 5 Organizational Design lenses
  - 6 Decision-Making lenses
  - 5 Synthesis & Meta-Agents
- **1** Agent registry config (TypeScript)

**Total:** 64 files defining the complete multi-agent system

---

**Last Updated:** 2025-11-12
