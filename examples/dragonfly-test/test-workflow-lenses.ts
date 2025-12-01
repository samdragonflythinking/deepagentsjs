import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { HumanMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";

import { createDeepAgent, type SubAgent } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load a prompt from the prompts directory, stripping YAML frontmatter
function loadPrompt(filename: string): string {
  const promptPath = join(__dirname, "../../src/lib/agents/prompts", filename);
  const content = readFileSync(promptPath, "utf-8");

  // Extract content after YAML frontmatter (after second ---)
  const parts = content.split("---");
  if (parts.length >= 3) {
    return parts.slice(2).join("---").trim();
  }
  return content;
}

// =============================================================================
// LENS DEFINITIONS - All 10 lenses for the Scenario Planning Portfolio workflow
// =============================================================================

// Mapping from workflow lens_id to prompt filename
const LENS_FILES: Record<string, string> = {
  "dragonfly-ai": "dragonfly-ai.md",
  "dragonfly-pestle-analysis": "pestle-analysis.md",
  "dragonfly-trends-uncertainties": "key-trends-uncertainty-assessment.md",
  "dragonfly-four-scenarios": "four-scenarios.md",
  "dragonfly-network-connections": "connections.md",
  "dragonfly-feedback-loops-tipping-points": "feedback-loops-tipping-points.md",
  "dragonfly-synergies-trade-offs": "synergies-trade-offs.md",
  "dragonfly-portfolio-resilience-standard": "portfolio-resilience.md",
  "dragonfly-scenario-stress-testing": "scenario-stress-testing.md",
  "dragonfly-scenario-signposts-trigger-points": "scenario-signposts-trigger-points.md",
};

// Lens descriptions for the orchestrator
const LENS_DESCRIPTIONS: Record<string, string> = {
  "dragonfly-ai":
    "Investment context framing - understand portfolio challenge and uncertainty drivers. Use this as the first step to frame the investment context.",
  "dragonfly-pestle-analysis":
    "PESTLE Analysis - examines Political, Economic, Social, Technological, Legal, and Environmental macro-forces. Use to identify macro drivers affecting the portfolio.",
  "dragonfly-trends-uncertainties":
    "Trends & Uncertainties - scores drivers by Impact/Uncertainty/Velocity for investment risk and identifies scenario axes. Use after PESTLE to prioritize drivers.",
  "dragonfly-four-scenarios":
    "Four Scenarios (2×2 Matrix) - builds 2×2 matrix of portfolio environments with quantified implications. Use to construct distinct future scenarios.",
  "dragonfly-network-connections":
    "Network & Connections - maps system relationships affecting portfolio including sector interdependencies and cascading risks.",
  "dragonfly-feedback-loops-tipping-points":
    "Feedback Loops & Tipping Points - analyzes reinforcing/balancing dynamics that could impact holdings and market feedback loops.",
  "dragonfly-synergies-trade-offs":
    "Synergies & Trade-offs - understands portfolio interaction effects across scenarios including diversification benefits and correlation shifts.",
  "dragonfly-portfolio-resilience-standard":
    "Portfolio Resilience Analysis - designs Core-Satellite-Hedge allocation robust across all scenarios.",
  "dragonfly-scenario-stress-testing":
    "Scenario Stress Testing - tests portfolio strategies against all futures and identifies vulnerabilities and breaking points.",
  "dragonfly-scenario-signposts-trigger-points":
    "Scenario Signposts & Trigger Points - builds early warning system with rebalancing triggers based on scenario signals.",
};

// Create all subagents
function createAllLenses(): SubAgent[] {
  return Object.entries(LENS_FILES).map(([lensId, filename]) => ({
    name: lensId,
    description: LENS_DESCRIPTIONS[lensId],
    systemPrompt: loadPrompt(filename),
  }));
}

// Orchestrator prompt
const orchestratorPrompt = `You are a Dragonfly Thinking orchestrator for portfolio strategy analysis. Your role is to analyze user requests and delegate to specialized analytical lenses.

## Available Lenses (in workflow sequence):

### Core Tier (What futures affect our portfolio?)
1. **dragonfly-ai** - Investment context framing
2. **dragonfly-pestle-analysis** - Macro-environmental forces
3. **dragonfly-trends-uncertainties** - Driver scoring and scenario axes
4. **dragonfly-four-scenarios** - 2×2 scenario matrix building

### Complete Tier (How do portfolio drivers interact?)
5. **dragonfly-network-connections** - System relationships mapping
6. **dragonfly-feedback-loops-tipping-points** - Dynamics analysis
7. **dragonfly-synergies-trade-offs** - Portfolio interaction effects

### Comprehensive Tier (How do we build anti-fragile portfolio?)
8. **dragonfly-portfolio-resilience-standard** - Core-Satellite-Hedge allocation
9. **dragonfly-scenario-stress-testing** - Strategy stress testing
10. **dragonfly-scenario-signposts-trigger-points** - Monitoring and triggers

## Instructions

When delegating to a lens, provide clear context about:
1. The topic/challenge to analyze
2. Any prior analysis results that inform this lens
3. The time horizon and geographic scope
4. What specific outputs are expected

After the lens completes its analysis, summarize the key findings for the user and suggest next steps.`;

// Create the agent with all lenses
const agent = createDeepAgent({
  model: new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    temperature: 0,
  }),
  systemPrompt: orchestratorPrompt,
  subagents: createAllLenses(),
  generalPurposeAgent: false,
});

// =============================================================================
// TEST FUNCTIONS
// =============================================================================

async function testLens(lensName: string, prompt: string) {
  console.log(`\n🔬 Testing ${lensName}...\n`);
  console.log(`📝 User prompt: "${prompt.substring(0, 100)}..."\n`);

  const startTime = Date.now();

  try {
    const result = await agent.invoke(
      {
        messages: [new HumanMessage(prompt)],
      },
      { recursionLimit: 100 }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Test completed in ${duration}s\n`);

    // Get the last message from the agent
    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];

    console.log("📊 Final Response:");
    console.log("─".repeat(60));
    console.log(lastMessage.content);
    console.log("─".repeat(60));

    return { success: true, duration, response: lastMessage.content };
  } catch (error) {
    console.error(`❌ Test failed:`, error);
    return { success: false, error };
  }
}

// Test the Four Scenarios lens
async function testFourScenarios() {
  const prompt = `Build a 2×2 scenario matrix for the US electric vehicle market over the next 5 years.

Use these two critical uncertainties as your scenario axes:
1. **Axis 1: Policy Support** - High government support (IRA continues, new incentives) vs Low support (IRA rollback, reduced incentives)
2. **Axis 2: Battery Technology** - Breakthrough (solid-state batteries commercialized) vs Incremental (lithium-ion improvements only)

For each of the four scenarios:
- Create a memorable name
- Describe the market environment
- Quantify implications for EV manufacturers, battery suppliers, and traditional automakers
- Identify early warning indicators`;

  return testLens("dragonfly-four-scenarios", prompt);
}

// Test all lenses sequentially
async function testAllLenses() {
  console.log("🚀 Testing all workflow lenses...\n");

  const testPrompts: Record<string, string> = {
    "dragonfly-ai":
      "Help me frame an investment analysis for a $10M portfolio allocation decision in the renewable energy sector over the next 3-5 years.",
    "dragonfly-pestle-analysis":
      "Run a PESTLE analysis on the US renewable energy sector for the next 3-5 years.",
    "dragonfly-trends-uncertainties":
      "Identify and score the key trends and uncertainties affecting renewable energy investments by Impact, Uncertainty, and Velocity.",
    "dragonfly-four-scenarios":
      "Build a 2×2 scenario matrix for the renewable energy sector using Policy Support and Technology Adoption as axes.",
    "dragonfly-network-connections":
      "Map the network connections and interdependencies between renewable energy sub-sectors (solar, wind, storage, grid).",
    "dragonfly-feedback-loops-tipping-points":
      "Analyze the feedback loops and tipping points in renewable energy adoption.",
    "dragonfly-synergies-trade-offs":
      "Examine the synergies and trade-offs between different renewable energy investments in a portfolio.",
    "dragonfly-portfolio-resilience-standard":
      "Design a Core-Satellite-Hedge allocation for a renewable energy focused portfolio.",
    "dragonfly-scenario-stress-testing":
      "Stress test a renewable energy portfolio against the four scenarios we developed.",
    "dragonfly-scenario-signposts-trigger-points":
      "Create signposts and trigger points for monitoring which renewable energy scenario is unfolding.",
  };

  const results: Record<string, { success: boolean; duration?: string }> = {};

  for (const [lensId, prompt] of Object.entries(testPrompts)) {
    results[lensId] = await testLens(lensId, prompt);
    console.log("\n" + "=".repeat(80) + "\n");
  }

  // Summary
  console.log("\n📋 Test Summary:");
  console.log("─".repeat(40));
  for (const [lensId, result] of Object.entries(results)) {
    const status = result.success ? "✅" : "❌";
    const duration = result.duration ? ` (${result.duration}s)` : "";
    console.log(`${status} ${lensId}${duration}`);
  }
}

// =============================================================================
// MAIN
// =============================================================================

const testType = process.argv[2] || "four-scenarios";

switch (testType) {
  case "four-scenarios":
    testFourScenarios();
    break;
  case "all":
    testAllLenses();
    break;
  default:
    // Test a specific lens by name
    if (LENS_FILES[testType]) {
      testLens(
        testType,
        `Run a ${testType.replace("dragonfly-", "")} analysis on the US technology sector.`
      );
    } else {
      console.log(`Unknown test: ${testType}`);
      console.log(`Available: four-scenarios, all, or any lens name`);
      console.log(`Lens names: ${Object.keys(LENS_FILES).join(", ")}`);
    }
}
