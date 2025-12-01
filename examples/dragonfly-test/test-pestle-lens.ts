import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { HumanMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";

import { createDeepAgent, type SubAgent } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the PESTLE prompt from the prompts directory
function loadPrompt(filename: string): string {
  const promptPath = join(__dirname, "../../src/lib/agents/prompts", filename);
  const content = readFileSync(promptPath, "utf-8");

  // Extract content after YAML frontmatter (after second ---)
  const parts = content.split("---");
  if (parts.length >= 3) {
    // Join everything after the frontmatter
    return parts.slice(2).join("---").trim();
  }
  return content;
}

// Load PESTLE lens prompt
const pestlePrompt = loadPrompt("pestle-analysis.md");

// Create PESTLE subagent
const pestleLens: SubAgent = {
  name: "dragonfly-pestle-analysis",
  description:
    "PESTLE Analysis lens - examines Political, Economic, Social, Technological, Legal, and Environmental macro-forces shaping strategic context. Use this lens to understand the external environment affecting a strategic challenge.",
  systemPrompt: pestlePrompt,
};

// Simple orchestrator prompt for testing
const orchestratorPrompt = `You are a Dragonfly Thinking orchestrator. Your role is to analyze user requests and delegate to specialized analytical lenses.

When the user asks for environmental or macro-force analysis, use the dragonfly-pestle-analysis lens.

IMPORTANT: When delegating to a lens, provide clear context about:
1. The topic/challenge to analyze
2. The time horizon (if specified)
3. The geographic scope (if specified)
4. What output format is expected

After the lens completes its analysis, summarize the key findings for the user.`;

// Create the agent
const agent = createDeepAgent({
  model: new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    temperature: 0,
  }),
  systemPrompt: orchestratorPrompt,
  subagents: [pestleLens],
  generalPurposeAgent: false, // Only use our custom lenses
});

// Test function
async function testPestleLens() {
  console.log("🔬 Testing PESTLE Lens Agent...\n");
  console.log("📝 Prompt loaded:", pestlePrompt.substring(0, 200) + "...\n");

  try {
    const result = await agent.invoke(
      {
        messages: [
          new HumanMessage(
            "Run a PESTLE analysis on the electric vehicle industry in the United States for the next 3-5 years. Focus on the key macro-forces that will shape the competitive landscape."
          ),
        ],
      },
      { recursionLimit: 50 }
    );

    console.log("\n✅ Test completed successfully!\n");

    // Get the last message from the agent
    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];

    console.log("📊 Final Response:");
    console.log("─".repeat(60));
    console.log(lastMessage.content);
    console.log("─".repeat(60));

    // Show todos if any
    if (result.todos && result.todos.length > 0) {
      console.log("\n📋 Agent ToDo List:");
      result.todos.forEach((todo: { content: string; status: string }) => {
        console.log(` - ${todo.content} (${todo.status})`);
      });
    }

    // Show files if any
    if (result.files && Object.keys(result.files).length > 0) {
      console.log("\n📁 Files Created:");
      Object.entries(result.files).forEach(([key, value]) => {
        console.log(` - ${key}: ${String(value).substring(0, 100)}...`);
      });
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

// Run the test
testPestleLens();
