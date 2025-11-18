/**
 * Multi-Lens Test - Phase 2
 *
 * Tests:
 * 1. Sequential lens invocation (SWOT → PESTLE)
 * 2. Context cascade (PESTLE reads SWOT artifact)
 * 3. Multiple artifacts created by different lenses
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { createDeepAgent, FilesystemBackend } from "../../src/index.js";

const outputDir = "/tmp/deepagents-multi-lens-test";

async function main() {
  console.log("🧪 Multi-Lens Test (Phase 2)\n");
  console.log("Goal: Prove sequential lens invocation + context cascade works\n");
  console.log("=".repeat(60));

  // Create agent with SWOT and PESTLE lenses
  const agent = createDeepAgent({
    name: "multi-lens-orchestrator",
    systemPrompt: `You coordinate multiple analytical lenses for strategic analysis.

When asked to analyze a topic:
1. First call the swot-lens subagent to create a SWOT analysis
2. Then call the pestle-lens subagent to create a PESTLE analysis
3. Report back that both analyses are complete

Use the task tool to invoke each lens.`,
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
      },
      {
        name: "pestle-lens",
        description: "Runs PESTLE analyses and saves them to files. Can reference prior analyses.",
        systemPrompt: `You run PESTLE analyses. When given a topic:

1. First, check if a SWOT analysis exists by calling read_file with file_path: "/swot.md"
   - If it exists, reference key insights from it in your analysis
   - If it doesn't exist, proceed without it

2. Create a PESTLE analysis with these sections:
   - Political (2-3 points)
   - Economic (2-3 points)
   - Social (2-3 points)
   - Technological (2-3 points)
   - Legal (2-3 points)
   - Environmental (2-3 points)

3. If you read the SWOT file, add a section at the top:
   ## Context from SWOT Analysis
   - Briefly note 1-2 key insights from the SWOT that inform this PESTLE

4. Call write_file with:
   - file_path: "/pestle.md"
   - content: Your complete PESTLE analysis in markdown format

5. Respond "PESTLE analysis complete"

Do not ask questions. Just create and save the analysis.`,
      },
    ],
  });

  console.log("\n📡 Invoking orchestrator with: 'Analyze Tesla using SWOT and PESTLE'\n");

  const startTime = Date.now();

  const result = await agent.invoke(
    {
      messages: [{
        role: "user",
        content: "Analyze Tesla using SWOT and PESTLE frameworks"
      }],
    },
    { recursionLimit: 100 }
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Completed in ${duration}s`);
  console.log(`\nMessages: ${result.messages.length}`);
  console.log(`\nFiles created:`);
  Object.keys(result.files).forEach(file => {
    console.log(`  - ${file} (${result.files[file].length} chars)`);
  });

  // Check SWOT file
  if (result.files["/swot.md"]) {
    console.log("\n📄 SWOT Analysis:");
    console.log("-".repeat(60));
    console.log(result.files["/swot.md"].substring(0, 500));
    console.log(result.files["/swot.md"].length > 500 ? "\n... (truncated)" : "");
  } else {
    console.log("\n❌ No /swot.md file created!");
  }

  // Check PESTLE file
  if (result.files["/pestle.md"]) {
    console.log("\n📄 PESTLE Analysis:");
    console.log("-".repeat(60));
    console.log(result.files["/pestle.md"].substring(0, 500));
    console.log(result.files["/pestle.md"].length > 500 ? "\n... (truncated)" : "");

    // Check if PESTLE references SWOT (context cascade proof)
    if (result.files["/pestle.md"].toLowerCase().includes("swot")) {
      console.log("\n✅ Context Cascade Verified: PESTLE references SWOT analysis!");
    } else {
      console.log("\n⚠️  PESTLE doesn't seem to reference SWOT (check manually)");
    }
  } else {
    console.log("\n❌ No /pestle.md file created!");
  }

  // Success criteria
  const swotExists = !!result.files["/swot.md"];
  const pestleExists = !!result.files["/pestle.md"];
  const contextCascade = pestleExists && result.files["/pestle.md"].toLowerCase().includes("swot");

  console.log("\n" + "=".repeat(60));
  console.log("📊 Phase 2 Success Criteria:");
  console.log(`  ✅ SWOT lens executed: ${swotExists ? "PASS" : "FAIL"}`);
  console.log(`  ✅ PESTLE lens executed: ${pestleExists ? "PASS" : "FAIL"}`);
  console.log(`  ✅ Context cascade (PESTLE reads SWOT): ${contextCascade ? "PASS" : "FAIL"}`);

  if (swotExists && pestleExists && contextCascade) {
    console.log("\n🎉 Phase 2 Multi-Lens Test: SUCCESS!");
  } else {
    console.log("\n❌ Phase 2 Multi-Lens Test: FAILED");
    process.exit(1);
  }
}

main().catch(error => {
  console.error("\n💥 Error:");
  console.error(error);
  process.exit(1);
});
