/**
 * Intelligent Lens Selection Test
 *
 * This test validates the orchestrator's ability to:
 * 1. Report how many lenses it has access to
 * 2. Recommend appropriate lenses for a given task
 * 3. Execute only the selected lenses (not all 35)
 *
 * This demonstrates intelligent selection rather than exhaustive execution.
 */

import "dotenv/config";
import { ChatAnthropic } from "@langchain/anthropic";
import { createDeepAgent, FilesystemBackend } from "../src/index.js";
import fs from "fs";
import path from "path";

// Create timestamped session directory
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const sessionDir = path.join(process.cwd(), "agent-testing", `selection-test-${timestamp}`);
const logsDir = path.join(sessionDir, "logs");
const outputsDir = path.join(sessionDir, "outputs");
const promptsDir = path.join(sessionDir, "prompts");

// Create directories
fs.mkdirSync(sessionDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });
fs.mkdirSync(outputsDir, { recursive: true });
fs.mkdirSync(promptsDir, { recursive: true });

// Logging utilities
const logFile = path.join(logsDir, "execution.log");

function log(message: string, data?: any) {
  const entry = `[${new Date().toISOString()}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  fs.appendFileSync(logFile, entry);
  console.log(message, data || '');
}

// Load global context
const globalContext = fs.readFileSync("tests/dragonfly-poc/prompts/global-context-simplified.md", "utf-8");

// Save global context to session
fs.writeFileSync(path.join(promptsDir, "global-context.md"), globalContext);

// Define all 35 lenses (same as logged-test-runner.ts)
const lenses = [
  // CORE STRATEGIC LENSES (4)
  {
    name: "dragonfly-swot",
    description: "SWOT Analysis - Strengths, Weaknesses, Opportunities, Threats",
    systemPrompt: `${globalContext}

# SWOT Analysis Lens

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information available in the background documentation
- After reviewing the background materials ONCE, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy

You conduct systematic SWOT analyses. When given a topic:

1. Create a SWOT analysis with these sections:
   - **Strengths** (3-5 points): Internal advantages and capabilities
   - **Weaknesses** (3-5 points): Internal limitations and vulnerabilities
   - **Opportunities** (3-5 points): External possibilities for growth
   - **Threats** (3-5 points): External risks and challenges

2. For each point, be specific and actionable.

3. Add a **Strategic Implications** section with 2-3 key insights.

4. Save using write_file:
   - file_path: outputs/swot-[topic-slug]-2025-11-19.md
   - content: Your complete SWOT analysis in markdown

5. Respond: "SWOT analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-pestle",
    description: "PESTLE Analysis - Political, Economic, Social, Technological, Legal, Environmental factors",
    systemPrompt: `${globalContext}

# PESTLE Analysis Lens

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information available in the background documentation
- After reviewing the background materials ONCE, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy

You conduct systematic PESTLE analyses. When given a topic:

1. Create a PESTLE analysis with these sections:
   - **Political** (2-4 points): Government, policy, regulation impacts
   - **Economic** (2-4 points): Economic forces and market conditions
   - **Social** (2-4 points): Demographics, culture, values
   - **Technological** (2-4 points): Tech disruption and innovation
   - **Legal** (2-4 points): Laws, compliance, legal risks
   - **Environmental** (2-4 points): Sustainability, climate, resources

2. For each point, be specific and evidence-based where possible.

3. Add a **Key Takeaways** section with 2-3 major insights.

4. Save using write_file:
   - file_path: outputs/pestle-[topic-slug]-2025-11-19.md
   - content: Your complete PESTLE analysis

5. Respond: "PESTLE analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-risk-reward-resilience",
    description: "RRR framework - Strategic balance across risk mitigation, reward capture, and resilience",
    systemPrompt: `${globalContext}

# Risk-Reward-Resilience Analysis

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information available in the background documentation
- After reviewing the background materials ONCE, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy

You analyze strategic decisions through the three-dimensional RRR framework. When given a topic:

1. Create an RRR Analysis with these sections:
   - **Risk Assessment** (3-5 risks): Key threats and vulnerabilities with likelihood and impact ratings
   - **Reward Opportunities** (3-5 opportunities): Value creation potential with probability and magnitude
   - **Resilience Factors** (3-5 factors): System adaptability, redundancy, and recovery capabilities
   - **Strategic Trade-offs**: How pursuing rewards affects risks and how resilience investments constrain reward capture

2. For each dimension, provide evidence-based assessment from available documentation.

3. Add a **Balanced Strategy Recommendations** section with 2-3 insights for optimizing across all three dimensions.

4. Save using write_file:
   - file_path: outputs/risk-reward-resilience-[topic-slug]-2025-11-19.md
   - content: Your complete RRR Analysis

5. Respond: "Risk-Reward-Resilience analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-stakeholder",
    description: "Stakeholder Analysis - Key actors, interests, influence, and alignment",
    systemPrompt: `${globalContext}

# Stakeholder Analysis Lens

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information available in the background documentation
- Use role-based categories (e.g., "Federal AI Ministry officials") rather than attempting to find specific individual names
- After reviewing the background materials ONCE, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy

You conduct systematic stakeholder analysis. When given a topic:

1. Create a Stakeholder Analysis with these sections:
   - **Primary Stakeholders** (3-5): Direct decision-makers and implementers
   - **Secondary Stakeholders** (3-5): Indirect influencers and affected parties
   - **External Stakeholders** (2-4): Ecosystem players and broader context

2. For each stakeholder or stakeholder group, provide:
   - **Interest & Influence**: What they care about and their power level (High/Medium/Low)
   - **Alignment**: Support/Neutral/Opposition

3. Add a **Stakeholder Map** section with priority groupings (Manage Closely, Keep Satisfied, Keep Informed, Monitor).

4. Save using write_file:
   - file_path: outputs/stakeholder-[topic-slug]-2025-11-19.md
   - content: Your complete Stakeholder Analysis

5. Respond: "Stakeholder analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
];

// Orchestrator prompt with intelligent selection focus
const orchestratorPrompt = `${globalContext}

# Dragonfly AI - Strategic Intelligence Orchestrator (Intelligent Selection Test)

You are a strategic analysis coordinator with access to multiple specialized analytical lenses.

## Available Analytical Lenses

You have access to the following ${lenses.length} specialized analytical lenses:

${lenses.map((lens, i) => `${i + 1}. **${lens.name}**: ${lens.description}`).join('\n')}

## Your Capabilities

When a user asks you questions:

1. **About your capabilities**: You can explain how many lenses you have and what they do
2. **Lens recommendations**: You can suggest which lenses would be most appropriate for a given analysis task
3. **Selective execution**: You can invoke just the most relevant lenses using the task tool, rather than running all of them

## How to Invoke a Lens

To invoke a lens, use the task tool:
\`\`\`
Tool: task
subagent_type: [lens-name]
prompt: [Specific analysis request with context]
\`\`\`

## Guidelines

- **Be selective**: Only invoke lenses that are truly relevant to the user's question
- **Explain your choices**: When recommending lenses, explain why they're appropriate
- **Quality over quantity**: 2-3 focused analyses are better than running all lenses
- **Build on context**: If background information is available, reference it when delegating to lenses

## Important

You should NOT automatically invoke all lenses. Think carefully about what the user needs and select the most appropriate tools for the job.
`;

// Save orchestrator prompt
fs.writeFileSync(path.join(promptsDir, "orchestrator.md"), orchestratorPrompt);

async function main() {
  log("=".repeat(80));
  log("INTELLIGENT LENS SELECTION TEST");
  log(`Session ID: ${timestamp}`);
  log(`Session Directory: ${sessionDir}`);
  log("=".repeat(80));

  log("\n📊 Creating orchestrator agent...");

  const agent = createDeepAgent({
    name: "dragonfly-orchestrator",
    systemPrompt: orchestratorPrompt,
    model: new ChatAnthropic({
      model: "claude-sonnet-4-5-20250929",
      temperature: 0,
    }),
    backend: new FilesystemBackend({
      rootDir: outputsDir,
      virtualMode: true,
    }),
    subagents: lenses.map(lens => ({
      ...lens,
      model: new ChatAnthropic({
        model: "claude-sonnet-4-5-20250929",
        temperature: 0,
      }),
    })),
  });

  log("✅ Agent created successfully\n");

  // Test 1: Ask about capabilities
  log("\n" + "=".repeat(80));
  log("TEST 1: Query available lenses");
  log("=".repeat(80));

  const test1Prompt = "How many analytical lenses do you have access to? Please list them by category.";
  log(`📝 Prompt: "${test1Prompt}"\n`);

  const test1Start = Date.now();
  const result1 = await agent.invoke({
    messages: [{ role: "user", content: test1Prompt }],
  });

  const test1Duration = Date.now() - test1Start;
  const lastMessage1 = result1.messages[result1.messages.length - 1];

  log(`✅ Test 1 completed in ${(test1Duration / 1000).toFixed(1)}s`);
  log("\nResponse:");
  log(typeof lastMessage1.content === 'string' ? lastMessage1.content : JSON.stringify(lastMessage1.content));

  fs.writeFileSync(
    path.join(logsDir, "test1-response.txt"),
    typeof lastMessage1.content === 'string' ? lastMessage1.content : JSON.stringify(lastMessage1.content, null, 2)
  );

  // Test 2: Ask for recommendations and execute
  log("\n" + "=".repeat(80));
  log("TEST 2: Request lens recommendations and execution");
  log("=".repeat(80));

  const test2Prompt = "I'm planning to launch a new AI-powered healthcare product in a competitive market. Which 2 lenses would you recommend for analyzing this situation, and why? Then execute those 2 lenses with the analysis.";
  log(`📝 Prompt: "${test2Prompt}"\n`);

  const test2Start = Date.now();
  const result2 = await agent.invoke({
    messages: [
      ...result1.messages,
      { role: "user", content: test2Prompt }
    ],
  }, { recursionLimit: 100 });

  const test2Duration = Date.now() - test2Start;
  const lastMessage2 = result2.messages[result2.messages.length - 1];

  log(`✅ Test 2 completed in ${(test2Duration / 1000).toFixed(1)}s`);
  log("\nResponse:");
  log(typeof lastMessage2.content === 'string' ? lastMessage2.content : JSON.stringify(lastMessage2.content));

  fs.writeFileSync(
    path.join(logsDir, "test2-response.txt"),
    typeof lastMessage2.content === 'string' ? lastMessage2.content : JSON.stringify(lastMessage2.content, null, 2)
  );

  // Check for generated artifacts
  const files = fs.readdirSync(outputsDir);
  log(`\n📄 Generated ${files.length} artifacts:`);
  files.forEach(file => {
    const stats = fs.statSync(path.join(outputsDir, file));
    const sizeKB = (stats.size / 1024).toFixed(1);
    log(`  ✓ ${file} (${sizeKB} KB)`);
  });

  // Create summary report
  const summary = {
    sessionId: timestamp,
    test1: {
      duration: `${(test1Duration / 1000).toFixed(1)}s`,
      messagesExchanged: result1.messages.length,
    },
    test2: {
      duration: `${(test2Duration / 1000).toFixed(1)}s`,
      messagesExchanged: result2.messages.length,
      artifactsCreated: files.length,
    },
    totalDuration: `${((test1Duration + test2Duration) / 1000).toFixed(1)}s`,
    artifacts: files.map(f => ({
      name: f,
      size: `${(fs.statSync(path.join(outputsDir, f)).size / 1024).toFixed(1)} KB`
    }))
  };

  fs.writeFileSync(
    path.join(sessionDir, "SUMMARY.json"),
    JSON.stringify(summary, null, 2)
  );

  log(`\n📊 Summary saved to: ${path.join(sessionDir, "SUMMARY.json")}`);
  log(`📁 All session data available at: ${sessionDir}`);

  log("\n" + "=".repeat(80));
  log("TEST VALIDATION");
  log("=".repeat(80));
  log(`✅ Orchestrator should have reported ${lenses.length} lenses available`);
  log(`✅ Orchestrator should have recommended 2 specific lenses`);
  log(`✅ Exactly 2 artifacts should have been created (not ${lenses.length})`);
  log(`✅ Artifacts created: ${files.length}`);

  if (files.length === 2) {
    log("\n🎉 SUCCESS: Intelligent selection validated!");
  } else if (files.length === 0) {
    log("\n⚠️  WARNING: No artifacts created - orchestrator may not have executed lenses");
  } else if (files.length > 2) {
    log("\n⚠️  WARNING: More than 2 artifacts created - orchestrator may have over-selected");
  }
}

log("Starting intelligent selection test...\n");
main().catch(error => {
  log("\n💥 Fatal Error:");
  log(error instanceof Error ? error.message : String(error));
  console.error(error);
  process.exit(1);
});
