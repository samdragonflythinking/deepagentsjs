/**
 * Minimal subagent tests to isolate the hanging issue
 *
 * Test 1: Built-in general-purpose subagent only
 * Test 2: Custom SubAgent with minimal config
 * Test 3: CompiledSubAgent with manual LangChain graph
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage } from "@langchain/core/messages";
import { createAgent } from "langchain";

import {
  createDeepAgent,
  type SubAgent,
  type CompiledSubAgent,
  FilesystemBackend
} from "../../src/index.js";

const testDir = "/tmp/deepagents-minimal-test";

// ============================================================
// TEST 1: Built-in general-purpose subagent only
// ============================================================
async function test1_GeneralPurpose() {
  console.log("\n🧪 TEST 1: Built-in general-purpose subagent");
  console.log("=" .repeat(60));

  const agent = createDeepAgent({
    name: "test1-orchestrator",
    model: new ChatAnthropic({
      model: "claude-sonnet-4-5-20250929",
      temperature: 0
    }),
    backend: new FilesystemBackend({
      rootDir: `${testDir}/test1`,
      virtualMode: true,
    }),
    // NO custom subagents - only built-in general-purpose
  });

  console.log("📡 Invoking with request to call task tool...");

  const result = await agent.invoke(
    {
      messages: [new HumanMessage({
        content: `Please call the task tool with these exact parameters:
- subagent_type: "general-purpose"
- description: "Write test file"
- prompt: "Write a file called /test.md with the content '# Test 1 Success' and then respond with DONE"

After calling the task tool, tell me what happened.`,
      })],
    },
    { recursionLimit: 50 },
  );

  console.log("\n✅ TEST 1 COMPLETED");
  console.log(`Messages: ${result.messages.length}`);
  console.log(`Last message: ${result.messages[result.messages.length - 1].content}`);

  return result;
}

// ============================================================
// TEST 2: Custom SubAgent with minimal config
// ============================================================
async function test2_CustomSubAgent() {
  console.log("\n🧪 TEST 2: Custom SubAgent (minimal config)");
  console.log("=" .repeat(60));

  const minimalSubAgent: SubAgent = {
    name: "minimal-test",
    description: "Minimal test subagent - just responds with confirmation",
    systemPrompt: "You are a test agent. When invoked, respond with 'TEST 2 SUCCESS' and nothing else.",
    // No tools, no model override - use defaults
  };

  const agent = createDeepAgent({
    name: "test2-orchestrator",
    model: new ChatAnthropic({
      model: "claude-sonnet-4-5-20250929",
      temperature: 0
    }),
    backend: new FilesystemBackend({
      rootDir: `${testDir}/test2`,
      virtualMode: true,
    }),
    subagents: [minimalSubAgent],
  });

  console.log("📡 Invoking with request to call task tool...");

  const result = await agent.invoke(
    {
      messages: [new HumanMessage({
        content: `Please call the task tool with:
- subagent_type: "minimal-test"
- description: "Run minimal test"
- prompt: "Execute your instructions"

Then tell me what the subagent responded.`,
      })],
    },
    { recursionLimit: 50 },
  );

  console.log("\n✅ TEST 2 COMPLETED");
  console.log(`Messages: ${result.messages.length}`);
  console.log(`Last message: ${result.messages[result.messages.length - 1].content}`);

  return result;
}

// ============================================================
// TEST 3: CompiledSubAgent with manual LangChain graph
// ============================================================
async function test3_CompiledSubAgent() {
  console.log("\n🧪 TEST 3: CompiledSubAgent (manual graph)");
  console.log("=" .repeat(60));

  // Create a simple LangChain agent graph
  const trivialGraph = createAgent({
    model: new ChatAnthropic({
      model: "claude-sonnet-4-5-20250929",
      temperature: 0
    }),
    prompt: "You are a trivial test agent. Respond with 'TEST 3 SUCCESS' and nothing else.",
    tools: [], // No tools
  });

  const compiledSubAgent: CompiledSubAgent = {
    name: "compiled-test",
    description: "CompiledSubAgent test - uses pre-compiled LangChain graph",
    runnable: trivialGraph,
  };

  const agent = createDeepAgent({
    name: "test3-orchestrator",
    model: new ChatAnthropic({
      model: "claude-sonnet-4-5-20250929",
      temperature: 0
    }),
    backend: new FilesystemBackend({
      rootDir: `${testDir}/test3`,
      virtualMode: true,
    }),
    subagents: [compiledSubAgent],
  });

  console.log("📡 Invoking with request to call task tool...");

  const result = await agent.invoke(
    {
      messages: [new HumanMessage({
        content: `Please call the task tool with:
- subagent_type: "compiled-test"
- description: "Run compiled test"
- prompt: "Execute"

Then tell me the result.`,
      })],
    },
    { recursionLimit: 50 },
  );

  console.log("\n✅ TEST 3 COMPLETED");
  console.log(`Messages: ${result.messages.length}`);
  console.log(`Last message: ${result.messages[result.messages.length - 1].content}`);

  return result;
}

// ============================================================
// RUN ALL TESTS
// ============================================================
async function runAllTests() {
  console.log("🐉 Minimal Subagent Tests");
  console.log("Testing different subagent configurations to isolate hanging issue\n");

  const results: { test: string; status: string; error?: string }[] = [];

  // Test 1
  try {
    await Promise.race([
      test1_GeneralPurpose(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Test 1 timeout after 2 minutes")), 120000)
      ),
    ]);
    results.push({ test: "Test 1 (general-purpose)", status: "✅ SUCCESS" });
  } catch (error) {
    results.push({
      test: "Test 1 (general-purpose)",
      status: "❌ FAILED",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 2
  try {
    await Promise.race([
      test2_CustomSubAgent(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Test 2 timeout after 2 minutes")), 120000)
      ),
    ]);
    results.push({ test: "Test 2 (custom SubAgent)", status: "✅ SUCCESS" });
  } catch (error) {
    results.push({
      test: "Test 2 (custom SubAgent)",
      status: "❌ FAILED",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 3
  try {
    await Promise.race([
      test3_CompiledSubAgent(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Test 3 timeout after 2 minutes")), 120000)
      ),
    ]);
    results.push({ test: "Test 3 (CompiledSubAgent)", status: "✅ SUCCESS" });
  } catch (error) {
    results.push({
      test: "Test 3 (CompiledSubAgent)",
      status: "❌ FAILED",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  results.forEach(({ test, status, error }) => {
    console.log(`${status} ${test}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  });

  console.log("\n🔍 DIAGNOSIS:");
  const allFailed = results.every(r => r.status.includes("FAILED"));
  const allSucceeded = results.every(r => r.status.includes("SUCCESS"));
  const test1Failed = results[0]?.status.includes("FAILED");
  const test2Failed = results[1]?.status.includes("FAILED");
  const test3Failed = results[2]?.status.includes("FAILED");

  if (allSucceeded) {
    console.log("✅ All tests passed - subagent execution works correctly!");
    console.log("   The issue may be specific to your SWOT lens configuration.");
  } else if (allFailed) {
    console.log("❌ All tests failed - fundamental issue with subagent execution");
    console.log("   This confirms the bug is in core subagent invoke() logic.");
  } else if (test1Failed && !test2Failed) {
    console.log("⚠️  Built-in general-purpose fails but custom SubAgent works");
    console.log("   Issue is in general-purpose subagent implementation.");
  } else if (!test1Failed && test2Failed) {
    console.log("⚠️  General-purpose works but custom SubAgent fails");
    console.log("   Issue is in custom SubAgent creation/middleware setup.");
  } else if (test3Failed && !test1Failed && !test2Failed) {
    console.log("⚠️  CompiledSubAgent fails but others work");
    console.log("   Issue is in pre-compiled graph integration.");
  } else {
    console.log("⚠️  Mixed results - issue may be intermittent or context-dependent");
  }
}

// Run tests
runAllTests().catch(error => {
  console.error("\n💥 Fatal error running tests:");
  console.error(error);
  process.exit(1);
});
