/**
 * Logged Multi-Agent Test Runner
 *
 * This script runs Dragonfly tests with comprehensive logging of:
 * - All prompts sent to agents
 * - All tool calls and responses
 * - All messages exchanged
 * - Agent invocations and completions
 * - File artifacts created
 * - Full execution trace
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { createDeepAgent, FilesystemBackend } from "../src/index.js";
import fs from "fs";
import path from "path";

// Create timestamped session directory (directly in agent-testing/)
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const sessionDir = path.join(process.cwd(), "agent-testing", timestamp);
const logsDir = path.join(sessionDir, "logs");
const outputsDir = path.join(sessionDir, "outputs");
const promptsDir = path.join(sessionDir, "prompts");
const backgroundDir = path.join(sessionDir, "background");
const priorReportsDir = path.join(sessionDir, "prior-reports");

// Create directories
fs.mkdirSync(sessionDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });
fs.mkdirSync(outputsDir, { recursive: true });
fs.mkdirSync(promptsDir, { recursive: true });
fs.mkdirSync(backgroundDir, { recursive: true });
fs.mkdirSync(priorReportsDir, { recursive: true });

// Logging utilities
const logFile = path.join(logsDir, "execution.log");
const messagesFile = path.join(logsDir, "messages.json");
const toolCallsFile = path.join(logsDir, "tool-calls.json");
const agentInvocationsFile = path.join(logsDir, "agent-invocations.json");

let allMessages: any[] = [];
let allToolCalls: any[] = [];
let allAgentInvocations: any[] = [];

function log(message: string, data?: any) {
  const entry = `[${new Date().toISOString()}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  fs.appendFileSync(logFile, entry);
  console.log(message, data || '');
}

function logMessage(agent: string, role: string, content: any) {
  const messageEntry = {
    timestamp: new Date().toISOString(),
    agent,
    role,
    content: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  };
  allMessages.push(messageEntry);
  fs.writeFileSync(messagesFile, JSON.stringify(allMessages, null, 2));
}

function logToolCall(agent: string, toolName: string, args: any, result: any) {
  const toolCallEntry = {
    timestamp: new Date().toISOString(),
    agent,
    toolName,
    arguments: args,
    result: typeof result === 'string' ? result.substring(0, 500) : result
  };
  allToolCalls.push(toolCallEntry);
  fs.writeFileSync(toolCallsFile, JSON.stringify(allToolCalls, null, 2));
}

function logAgentInvocation(parentAgent: string, subagent: string, prompt: string, status: string, duration?: number) {
  const invocationEntry = {
    timestamp: new Date().toISOString(),
    parentAgent,
    subagent,
    prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
    status,
    durationMs: duration
  };
  allAgentInvocations.push(invocationEntry);
  fs.writeFileSync(agentInvocationsFile, JSON.stringify(allAgentInvocations, null, 2));
}

// Copy UAE project files to session
const uaeProjectDir = path.join(process.cwd(), "agent-testing", "uae-project-example");
const copyDir = (src: string, dest: string) => {
  if (!fs.existsSync(src)) return;
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.statSync(srcPath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
};

log("Copying UAE project files to session...");
copyDir(path.join(uaeProjectDir, "background"), backgroundDir);
copyDir(path.join(uaeProjectDir, "prior-reports"), priorReportsDir);
log("✓ Background and prior reports copied to session");

// Load global context
const globalContext = fs.readFileSync("tests/dragonfly-poc/prompts/global-context-simplified.md", "utf-8");

// Save global context to session
fs.writeFileSync(path.join(promptsDir, "global-context.md"), globalContext);

// Define test lenses (starting with just 2 for comprehensive logging test)
const lenses = [
  {
    name: "dragonfly-swot",
    description: "SWOT Analysis - Strengths, Weaknesses, Opportunities, Threats",
    systemPrompt: `${globalContext}

# SWOT Analysis Lens

You conduct systematic SWOT analyses. When given a topic:

1. Create a SWOT analysis with these sections:
   - **Strengths** (3-5 points): Internal advantages and capabilities
   - **Weaknesses** (3-5 points): Internal limitations and vulnerabilities
   - **Opportunities** (3-5 points): External possibilities for growth
   - **Threats** (3-5 points): External risks and challenges

2. For each point, be specific and actionable.

3. Add a **Strategic Implications** section with 2-3 key insights.

4. Save using write_file:
   - file_path: outputs/swot-[topic-slug]-2025-11-17.md
   - content: Your complete SWOT analysis in markdown

5. Respond: "SWOT analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-pestle",
    description: "PESTLE Analysis - Political, Economic, Social, Technological, Legal, Environmental factors",
    systemPrompt: `${globalContext}

# PESTLE Analysis Lens

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
   - file_path: outputs/pestle-[topic-slug]-2025-11-17.md
   - content: Your complete PESTLE analysis

5. Respond: "PESTLE analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-porter",
    description: "Porter's Five Forces Analysis - Competitive forces shaping strategy",
    systemPrompt: `${globalContext}

# Porter's Five Forces Analysis Lens

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
   - file_path: outputs/porter-[topic-slug]-2025-11-17.md
   - content: Your complete Porter's Five Forces analysis

5. Respond: "Porter's Five Forces analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
  {
    name: "dragonfly-stakeholder",
    description: "Stakeholder Analysis - Key actors, interests, influence, and alignment",
    systemPrompt: `${globalContext}

# Stakeholder Analysis Lens

You conduct systematic stakeholder analysis to map key actors and their interests. When given a topic:

**IMPORTANT GUIDELINES**:
- Base your analysis ONLY on information available in the background documentation
- Use role-based categories (e.g., "Federal AI Ministry officials", "Private sector AI firms") rather than attempting to find specific individual names
- After reviewing the background materials ONCE, proceed directly to creating the analysis
- Do not attempt exhaustive research or re-read files multiple times
- Prioritize completing the analysis over perfect accuracy

1. Create a Stakeholder Analysis with these sections:
   - **Primary Stakeholders** (3-5): Direct decision-makers and implementers
   - **Secondary Stakeholders** (3-5): Indirect influencers and affected parties
   - **External Stakeholders** (2-4): Ecosystem players and broader context

2. For each stakeholder or stakeholder group, provide:
   - **Interest & Influence**: What they care about and their power level (High/Medium/Low)
   - **Alignment**: Support/Neutral/Opposition

3. Add a **Stakeholder Map** section with priority groupings (Manage Closely, Keep Satisfied, Keep Informed, Monitor).

4. Save using write_file:
   - file_path: outputs/stakeholder-[topic-slug]-2025-11-17.md
   - content: Your complete Stakeholder Analysis

5. Respond: "Stakeholder analysis complete"

Do not ask questions. Just create and save the analysis.`,
  },
];

// Save lens prompts to session
lenses.forEach(lens => {
  fs.writeFileSync(
    path.join(promptsDir, `${lens.name}.md`),
    lens.systemPrompt
  );
});

// Orchestrator prompt
const orchestratorPrompt = `${globalContext}

# Dragonfly AI - Strategic Intelligence Orchestrator (UAE AI Strategy Project)

You are coordinating strategic analysis of the UAE National AI Strategy 2031. This session has access to comprehensive background documentation and prior analyses.

## Available Reference Materials

You can read these files using the read_file tool:

**Background Documentation:**
- background/project-overview.md - Project scope and objectives
- background/strategic-context.md - UAE AI Strategy 2031 detailed framework
- background/market-analysis.md - Regional and global AI market positioning
- background/challenges-assessment.md - Implementation barriers and risks

**Prior Analysis Reports:**
- prior-reports/swot-uae-ai-2024-q4.md - Comprehensive SWOT analysis (Dec 2024)
- prior-reports/policy-landscape-2024.md - Regulatory framework review (Nov 2024)

## Available Lens Agents

You can invoke specialized analysis lenses using the task tool:

1. **dragonfly-swot**: SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats)
2. **dragonfly-pestle**: PESTLE Analysis (Political, Economic, Social, Tech, Legal, Environmental)
3. **dragonfly-porter**: Porter's Five Forces (Competitive dynamics analysis)
4. **dragonfly-stakeholder**: Stakeholder Analysis (Key actors, interests, influence)

## Your Responsibilities

1. **Read background context**: Start by reviewing relevant background files to understand the UAE AI Strategy

2. **Reference prior reports**: Check prior-reports/ for existing analyses to build upon

3. **Invoke appropriate lenses**: Use task tool to call analytical lenses with full context:
   \`\`\`
   Tool: task
   subagent_type: dragonfly-pestle
   prompt: Conduct PESTLE analysis for UAE AI Strategy 2031. Reference prior SWOT analysis in prior-reports/swot-uae-ai-2024-q4.md and background context in background/strategic-context.md. Focus on [specific aspect].
   \`\`\`

4. **Synthesize results**: After lenses complete, read their outputs from outputs/ and integrate with prior analyses

5. **Provide strategic recommendations**: Offer actionable insights based on comprehensive multi-lens view

## Guidelines

- **Use available context**: Always read background files before invoking lenses
- **Build on prior work**: Reference existing analyses in prior-reports/
- **Provide detailed context to lenses**: Include specific file references when delegating
- **Synthesize across sources**: Integrate new analysis with prior reports
- **Be evidence-based**: Ground insights in the detailed background documentation
`;

// Save orchestrator prompt
fs.writeFileSync(path.join(promptsDir, "orchestrator.md"), orchestratorPrompt);

async function main() {
  log("=".repeat(80));
  log("DRAGONFLY LOGGED TEST SESSION");
  log(`Session ID: ${timestamp}`);
  log(`Session Directory: ${sessionDir}`);
  log("=".repeat(80));

  log("\n📊 Creating orchestrator agent with logging...");

  // Create the orchestrator with logging hooks
  const agent = createDeepAgent({
    name: "dragonfly-orchestrator",
    systemPrompt: orchestratorPrompt,
    model: new ChatAnthropic({
      model: "claude-sonnet-4-5-20250929",
      temperature: 0,
      callbacks: [{
        handleLLMStart: async (llm: any, prompts: string[]) => {
          log(`[Orchestrator] LLM Start`);
          prompts.forEach((prompt, i) => {
            logMessage("orchestrator", "system", prompt);
          });
        },
        handleLLMEnd: async (output: any) => {
          log(`[Orchestrator] LLM End`);
          if (output.generations) {
            output.generations.forEach((gen: any) => {
              gen.forEach((g: any) => {
                logMessage("orchestrator", "assistant", g.text);
              });
            });
          }
        },
      }]
    }),
    backend: new FilesystemBackend({
      rootDir: outputsDir,
      virtualMode: true,
    }),
    subagents: lenses.map(lens => ({
      ...lens,
      // Add logging to each subagent
      model: new ChatAnthropic({
        model: "claude-sonnet-4-5-20250929",
        temperature: 0,
        callbacks: [{
          handleLLMStart: async (llm: any, prompts: string[]) => {
            log(`[${lens.name}] LLM Start`);
            prompts.forEach((prompt) => {
              logMessage(lens.name, "system", prompt);
            });
          },
          handleLLMEnd: async (output: any) => {
            log(`[${lens.name}] LLM End`);
            if (output.generations) {
              output.generations.forEach((gen: any) => {
                gen.forEach((g: any) => {
                  logMessage(lens.name, "assistant", g.text);
                });
              });
            }
          },
        }]
      }),
    })),
  });

  log("✅ Agent created successfully\n");

  const testPrompt = "Conduct a comprehensive strategic analysis of the UAE AI Strategy 2031 implementation. Review the background documentation and prior reports, then use all four available lenses (SWOT, PESTLE, Porter's Five Forces, and Stakeholder Analysis) to provide multi-dimensional insights covering strengths/weaknesses, macro-environment factors, competitive dynamics, and key actors.";
  log(`📝 Test Prompt: "${testPrompt}"\n`);

  log("🚀 Starting agent invocation...\n");
  const startTime = Date.now();

  try {
    const result = await agent.invoke(
      {
        messages: [{
          role: "user",
          content: testPrompt
        }],
      },
      { recursionLimit: 150 }
    );

    const duration = Date.now() - startTime;

    log("\n" + "=".repeat(80));
    log(`✅ Test completed in ${(duration / 1000).toFixed(1)}s`);
    log(`💬 Total messages: ${result.messages.length}`);
    log("=".repeat(80));

    // Save full result
    fs.writeFileSync(
      path.join(logsDir, "full-result.json"),
      JSON.stringify(result, null, 2)
    );

    // Check for generated files
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
      duration: `${(duration / 1000).toFixed(1)}s`,
      messagesExchanged: result.messages.length,
      toolCallsCount: allToolCalls.length,
      agentInvocations: allAgentInvocations.length,
      artifactsCreated: files.length,
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

  } catch (error) {
    log("\n💥 ERROR:");
    log(error instanceof Error ? error.message : String(error));
    log((error as any).stack || '');
    throw error;
  }
}

log("Starting logged test runner...\n");
main().catch(error => {
  log("\n💥 Fatal Error:");
  log(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
