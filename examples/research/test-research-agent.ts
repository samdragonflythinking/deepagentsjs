import "dotenv/config";
import { agent } from "./research-agent.js";

async function main() {
  console.log("🔬 Testing official research agent with subagents...\n");
  console.log("Query: 'What is LangGraph?'\n");
  console.log("This agent has 2 subagents:");
  console.log("  - research-agent: Does deep research on topics");
  console.log("  - critique-agent: Critiques the final report\n");
  console.log("Expected behavior:");
  console.log("  1. Main agent receives question");
  console.log("  2. Calls research-agent subagent(s) to gather info");
  console.log("  3. Writes final_report.md");
  console.log("  4. May call critique-agent for feedback");
  console.log("  5. May revise report based on critique\n");
  console.log("=" .repeat(60));

  const startTime = Date.now();

  const result = await agent.invoke(
    {
      messages: [{ role: "user", content: "What is LangGraph?" }],
    },
    { recursionLimit: 100 }
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log(`\n🎉 Finished in ${duration}s!`);
  console.log(
    `\nAgent ToDo List:\n${result.todos.map((todo) => ` - ${todo.content} (${todo.status})`).join("\n")}`
  );
  console.log(
    `\nFiles Created:\n${Object.entries(result.files)
      .map(([key, value]) => ` - ${key} (${value.length} chars)`)
      .join("\n")}`
  );

  // Show snippet of final report
  if (result.files["final_report.md"]) {
    console.log("\n📄 Final Report Preview:");
    console.log(result.files["final_report.md"].substring(0, 500) + "...\n");
  }
}

main().catch(error => {
  console.error("\n💥 Error:");
  console.error(error);
  process.exit(1);
});
