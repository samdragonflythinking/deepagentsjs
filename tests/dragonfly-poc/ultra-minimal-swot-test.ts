/**
 * Ultra-minimal SWOT test
 *
 * Strip everything down to bare essentials to prove multi-agent pattern works
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { createDeepAgent, FilesystemBackend } from "../../src/index.js";

const outputDir = "/tmp/deepagents-ultra-minimal-swot";

async function main() {
  console.log("🧪 Ultra-Minimal SWOT Test\n");
  console.log("Goal: Prove orchestrator → SWOT lens → file creation works\n");
  console.log("=".repeat(60));

  // Create agent with minimal SWOT subagent
  const agent = createDeepAgent({
    name: "minimal-orchestrator",
    systemPrompt: "You delegate SWOT analyses to the swot-lens subagent. Call it with the task tool.",
    model: new ChatAnthropic({
      model: "claude-sonnet-4-5-20250929",
      temperature: 0
    }),
    backend: new FilesystemBackend({
      rootDir: outputDir,
      virtualMode: true,
    }),
    subagents: [
      {
        name: "swot-lens",
        description: "Runs SWOT analyses and saves them to files",
        systemPrompt: `You run SWOT analyses. When given a topic:

1. Create a simple SWOT with these sections:
   - Strengths (2-3 points)
   - Weaknesses (2-3 points)
   - Opportunities (2-3 points)
   - Threats (2-3 points)

2. Call write_file with:
   - file_path: "/swot.md"
   - content: Your complete SWOT analysis in markdown format

3. Respond "SWOT analysis complete"

Do not ask questions. Just create and save the analysis.`,
        // Use parent's model by not specifying one
      },
    ],
  });

  console.log("\n📡 Invoking orchestrator with: 'Do a SWOT analysis of Tesla'\n");

  const startTime = Date.now();

  const result = await agent.invoke(
    {
      messages: [{
        role: "user",
        content: "Do a SWOT analysis of Tesla"
      }],
    },
    { recursionLimit: 50 }
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Completed in ${duration}s`);
  console.log(`\nMessages: ${result.messages.length}`);
  console.log(`\nFiles created:`);
  Object.keys(result.files).forEach(file => {
    console.log(`  - ${file} (${result.files[file].length} chars)`);
  });

  if (result.files["/swot.md"]) {
    console.log("\n📄 SWOT Content:");
    console.log(result.files["/swot.md"]);
  } else {
    console.log("\n❌ No /swot.md file created!");
  }

  console.log("\n🎉 Success! Multi-agent SWOT pattern works!");
}

main().catch(error => {
  console.error("\n💥 Error:");
  console.error(error);
  process.exit(1);
});
