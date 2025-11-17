#!/usr/bin/env tsx

/**
 * SIMPLE FILESYSTEM TEST
 *
 * Tests if a subagent can successfully write a file using FilesystemBackend.
 * This is Step 3 from the debugging plan - a minimal "hello world" test.
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { createDeepAgent } from '../../src/agent.js';
import { FilesystemBackend } from '../../src/backends/filesystem.js';
import * as path from 'path';
import * as fs from 'fs';

const TEST_DIR = path.join(process.cwd(), 'tests', 'sessions', 'simple-test');
const OUTPUTS_DIR = path.join(TEST_DIR, 'outputs');

// Create test directory
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}
if (!fs.existsSync(OUTPUTS_DIR)) {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

console.log('📁 Test directory:', TEST_DIR);
console.log('📂 Outputs directory:', OUTPUTS_DIR);

const model = new ChatAnthropic({
  model: 'claude-sonnet-4-5-20250929',
  temperature: 0,
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const backend = new FilesystemBackend({
  rootDir: OUTPUTS_DIR,
  virtualMode: true,
});

// Simple prompt that just asks the agent to write a file
const simplePrompt = `
You are a test agent. Your ONLY task is to create a markdown file.

When asked to write a file, use the write_file tool with:
- file_path: An absolute path starting with / (e.g., /test.md)
- content: The actual content to write

IMPORTANT: In virtualMode, paths like /test.md will be written to the correct location automatically.

Example:
write_file({
  file_path: "/hello.md",
  content: "# Hello World\\n\\nThis is a test file."
})

DO NOT try to use relative paths. Always use absolute paths starting with /.
`.trim();

async function runSimpleTest() {
  console.log('\n🧪 Creating simple test agent...\n');

  const agent = createDeepAgent({
    name: 'simple-test',
    systemPrompt: simplePrompt,
    model,
    backend,
  });

  console.log('✅ Agent created\n');
  console.log('🚀 Running test: "Please write a file called /hello-world.md with the content: # Hello World\\n\\nThis is a simple test file."\n');
  console.log('=' .repeat(60));

  const result = await agent.invoke({
    messages: [
      {
        role: 'user',
        content: 'Please write a file called /hello-world.md with the content: # Hello World\\n\\nThis is a simple test file.',
      },
    ],
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed\n');

  // Check if file was created
  const expectedFile = path.join(OUTPUTS_DIR, 'hello-world.md');
  if (fs.existsSync(expectedFile)) {
    console.log('✅ SUCCESS: File was created!');
    console.log('📄 File path:', expectedFile);
    const content = fs.readFileSync(expectedFile, 'utf-8');
    console.log('\n📄 File content:');
    console.log(content);
  } else {
    console.log('❌ FAILURE: File was NOT created');
    console.log('Expected file at:', expectedFile);
    console.log('\nLast agent message:');
    const lastMsg = result.messages[result.messages.length - 1];
    console.log(JSON.stringify(lastMsg, null, 2));
  }

  return result;
}

// Run the test
runSimpleTest()
  .then(() => {
    console.log('\n✅ Simple test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Simple test failed:');
    console.error(error);
    process.exit(1);
  });
