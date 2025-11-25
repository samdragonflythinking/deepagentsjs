#!/usr/bin/env npx tsx
/**
 * Interactive CLI Chat with Dragonfly Orchestrator
 *
 * Run with: pnpm tsx agent-testing/interactive-chat.ts
 *
 * Set your API key in one of these ways:
 * 1. Create .env file with ANTHROPIC_API_KEY=your-key
 * 2. Export: export ANTHROPIC_API_KEY=your-key
 * 3. Inline: ANTHROPIC_API_KEY=your-key pnpm tsx agent-testing/interactive-chat.ts
 *
 * This provides a full conversational experience where you can:
 * - Ask about available lenses
 * - Request specific analyses
 * - Have multi-turn conversations
 * - See artifacts created in real-time
 */

import "dotenv/config";
import { ChatAnthropic } from "@langchain/anthropic";
import { createDeepAgent, FilesystemBackend } from "../src/index.js";
import fs from "fs";
import path from "path";
import readline from "readline";

// Create session directory
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const sessionDir = path.join(process.cwd(), "agent-testing", `chat-${timestamp}`);
const outputsDir = path.join(sessionDir, "outputs");

fs.mkdirSync(sessionDir, { recursive: true });
fs.mkdirSync(outputsDir, { recursive: true });

// Load global context
const globalContext = fs.readFileSync("tests/dragonfly-poc/prompts/global-context-simplified.md", "utf-8");

// Define all 8 lenses for interactive demo
const lenses = [
  // CORE STRATEGIC LENSES
  {
    name: "dragonfly-swot",
    description: "SWOT Analysis - Strengths, Weaknesses, Opportunities, Threats",
    systemPrompt: `${globalContext}

# SWOT Analysis Lens

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information provided or general knowledge
- After understanding the context, proceed directly to creating the analysis
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
   - file_path: outputs/swot-analysis.md
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
- Base your analysis ONLY on information provided or general knowledge
- After understanding the context, proceed directly to creating the analysis
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
   - file_path: outputs/pestle-analysis.md
   - content: Your complete PESTLE analysis

5. Respond: "PESTLE analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-porter",
    description: "Porter's Five Forces Analysis - Competitive forces shaping strategy",
    systemPrompt: `${globalContext}

# Porter's Five Forces Analysis Lens

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information provided or general knowledge
- After understanding the context, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy

You conduct systematic competitive analysis using Porter's Five Forces framework. When given a topic:

1. Create a Porter's Five Forces analysis with these sections:
   - **Threat of New Entrants** (2-4 points): Barriers to entry, ease of new competition
   - **Bargaining Power of Suppliers** (2-4 points): Supplier concentration, switching costs
   - **Bargaining Power of Buyers** (2-4 points): Customer power, price sensitivity
   - **Threat of Substitutes** (2-4 points): Alternative solutions, switching likelihood
   - **Competitive Rivalry** (2-4 points): Number of competitors, market growth, differentiation

2. For each force, assess intensity (Low/Medium/High) and provide specific evidence.

3. Add a **Competitive Position Assessment** section with overall strategic implications.

4. Save using write_file:
   - file_path: outputs/porter-analysis.md
   - content: Your complete Porter's Five Forces analysis

5. Respond: "Porter's Five Forces analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-stakeholder",
    description: "Stakeholder Analysis - Key actors, interests, influence, and alignment",
    systemPrompt: `${globalContext}

# Stakeholder Analysis Lens

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information provided or general knowledge
- Use role-based categories rather than attempting to find specific individual names
- After understanding the context, proceed directly to creating the analysis
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

3. Add a **Stakeholder Map** section with priority groupings.

4. Save using write_file:
   - file_path: outputs/stakeholder-analysis.md
   - content: Your complete Stakeholder Analysis

5. Respond: "Stakeholder analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-risk-reward-resilience",
    description: "RRR framework - Strategic balance across risk mitigation, reward capture, and resilience",
    systemPrompt: `${globalContext}

# Risk-Reward-Resilience Analysis

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information provided or general knowledge
- After understanding the context, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy

You analyze strategic decisions through the RRR framework. When given a topic:

1. Create an RRR Analysis with these sections:
   - **Risk Assessment** (3-5 risks): Key threats and vulnerabilities
   - **Reward Opportunities** (3-5 opportunities): Value creation potential
   - **Resilience Factors** (3-5 factors): System adaptability and recovery capabilities
   - **Strategic Trade-offs**: How pursuing rewards affects risks

2. Add a **Balanced Strategy Recommendations** section.

3. Save using write_file:
   - file_path: outputs/rrr-analysis.md
   - content: Your complete RRR Analysis

5. Respond: "Risk-Reward-Resilience analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-pre-mortem",
    description: "Pre-Mortem Analysis - Identifies failure pathways by imagining catastrophic failure",
    systemPrompt: `${globalContext}

# Pre-Mortem Analysis

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information provided or general knowledge
- After understanding the context, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy

You conduct pre-mortem analysis by imagining future failure. When given a topic:

1. Create a Pre-Mortem Analysis with these sections:
   - **Failure Scenario**: Vivid description of catastrophic failure
   - **Failure Pathways** (3-5 pathways): Distinct causal chains ranked by likelihood
   - **Early Warning Indicators** (per pathway): Observable signals
   - **Preventive Interventions** (per pathway): Actions to block each failure mode

2. Add a **Critical Vulnerabilities** section identifying the 2-3 highest-priority failure modes.

3. Save using write_file:
   - file_path: outputs/pre-mortem-analysis.md
   - content: Your complete Pre-Mortem Analysis

5. Respond: "Pre-Mortem analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-scenario-planning",
    description: "Scenario Planning - 2x2 scenario matrix exploring four distinct futures",
    systemPrompt: `${globalContext}

# Scenario Planning Analysis

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information provided or general knowledge
- After understanding the context, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy

You construct four divergent scenarios using a 2x2 matrix. When given a topic:

1. Create Four Scenarios with these sections:
   - **Axis Selection**: Two critical uncertainties that structure the matrix
   - **Scenario 1-4**: Name and narrative for each quadrant
   - **Cross-Scenario Insights**: Patterns across all four scenarios

2. Add a **Strategic Implications** section.

3. Save using write_file:
   - file_path: outputs/scenario-planning.md
   - content: Your complete Scenario Planning Analysis

5. Respond: "Scenario Planning analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-devils-advocate",
    description: "Devil's Advocate - Systematically challenges assumptions and consensus views",
    systemPrompt: `${globalContext}

# Devil's Advocate Analysis

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information provided or general knowledge
- After understanding the context, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy

You systematically challenge prevailing assumptions. When given a topic:

1. Create a Devil's Advocate Analysis with these sections:
   - **Prevailing Assumptions** (4-6 assumptions): Core beliefs underlying current strategy
   - **Challenges to Each Assumption**: Arguments for why each might be wrong
   - **Alternative Interpretations**: Competing frameworks
   - **Worst-Case Scenarios**: What happens if key assumptions prove false

2. Add an **Assumption Testing Priorities** section.

3. Save using write_file:
   - file_path: outputs/devils-advocate-analysis.md
   - content: Your complete Devil's Advocate Analysis

5. Respond: "Devil's Advocate analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
];

// Orchestrator prompt
const orchestratorPrompt = `${globalContext}

# Dragonfly AI - Strategic Intelligence Orchestrator

You are a strategic analysis assistant with access to ${lenses.length} specialized analytical lenses.

## Available Analytical Lenses

${lenses.map((lens, i) => `${i + 1}. **${lens.name}**: ${lens.description}`).join('\n')}

## Your Capabilities

You can:
1. **Explain your capabilities**: Tell users what lenses you have and what they do
2. **Recommend lenses**: Suggest which lenses are most appropriate for their situation
3. **Execute analyses**: Invoke lenses using the task tool to generate detailed analyses
4. **Synthesize insights**: Combine findings from multiple lenses into integrated recommendations

## How to Invoke a Lens

Use the task tool with:
- subagent_type: [lens-name] (e.g., "dragonfly-swot")
- prompt: [Context and analysis request]

## Guidelines

- **Be conversational**: Engage naturally with the user
- **Be selective**: Only invoke lenses that are truly relevant
- **Explain your reasoning**: When recommending lenses, explain why
- **Quality over quantity**: 2-3 focused analyses beat running all lenses
- **Report results**: After lenses complete, summarize what was created

Artifacts are saved to the outputs/ directory when lenses run.
`;

// Store conversation history
let messages: Array<{ role: string; content: string }> = [];

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🐉 DRAGONFLY AI - Interactive Strategic Analysis");
  console.log("=".repeat(60));
  console.log(`\nSession: ${sessionDir}`);
  console.log(`Outputs: ${outputsDir}`);
  console.log(`\nAvailable lenses: ${lenses.length}`);
  console.log("\nCommands:");
  console.log("  'quit' or 'exit' - End session");
  console.log("  'files' - List generated artifacts");
  console.log("  'read <filename>' - Display artifact contents");
  console.log("=".repeat(60) + "\n");

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

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (): void => {
    rl.question("\n👤 You: ", async (input) => {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        askQuestion();
        return;
      }

      // Handle commands
      if (trimmedInput.toLowerCase() === 'quit' || trimmedInput.toLowerCase() === 'exit') {
        console.log("\n👋 Goodbye! Session saved to:", sessionDir);
        rl.close();
        process.exit(0);
      }

      if (trimmedInput.toLowerCase() === 'files') {
        const files = fs.existsSync(outputsDir) ? fs.readdirSync(outputsDir) : [];
        if (files.length === 0) {
          console.log("\n📁 No artifacts generated yet.");
        } else {
          console.log("\n📁 Generated artifacts:");
          files.forEach(file => {
            const stats = fs.statSync(path.join(outputsDir, file));
            console.log(`   • ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
          });
        }
        askQuestion();
        return;
      }

      if (trimmedInput.toLowerCase().startsWith('read ')) {
        const filename = trimmedInput.substring(5).trim();
        const filepath = path.join(outputsDir, filename);
        if (fs.existsSync(filepath)) {
          console.log("\n" + "─".repeat(60));
          console.log(fs.readFileSync(filepath, 'utf-8'));
          console.log("─".repeat(60));
        } else {
          console.log(`\n❌ File not found: ${filename}`);
          const files = fs.existsSync(outputsDir) ? fs.readdirSync(outputsDir) : [];
          if (files.length > 0) {
            console.log("Available files:", files.join(', '));
          }
        }
        askQuestion();
        return;
      }

      // Add user message to history
      messages.push({ role: "user", content: trimmedInput });

      console.log("\n🤔 Thinking...\n");

      try {
        const startTime = Date.now();
        const result = await agent.invoke(
          { messages },
          { recursionLimit: 100 }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        // Update messages with full history
        messages = result.messages.map((m: any) => ({
          role: m._getType?.() === 'human' ? 'user' : 'assistant',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        }));

        // Get the last assistant message
        const lastMessage = result.messages[result.messages.length - 1];
        const responseContent = typeof lastMessage.content === 'string'
          ? lastMessage.content
          : JSON.stringify(lastMessage.content, null, 2);

        console.log(`🐉 Dragonfly: ${responseContent}`);
        console.log(`\n   [${duration}s]`);

        // Check for new files
        const files = fs.existsSync(outputsDir) ? fs.readdirSync(outputsDir) : [];
        if (files.length > 0) {
          console.log(`   📄 Artifacts: ${files.join(', ')}`);
        }

      } catch (error) {
        console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
      }

      askQuestion();
    });
  };

  askQuestion();
}

main().catch(console.error);
