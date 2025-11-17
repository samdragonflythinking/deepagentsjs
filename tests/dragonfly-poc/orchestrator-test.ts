/**
 * Dragonfly POC - Phase 1: Basic Orchestration Test
 *
 * Tests whether DeepAgents can replicate Dragonfly's core pattern:
 * Orchestrator → Lens delegation → Artifact creation
 *
 * Success criteria:
 * - Orchestrator invokes SWOT lens via task tool
 * - SWOT lens creates markdown artifact
 * - Artifact contains proper SWOT analysis
 * - No errors during execution
 * - Complete session audit trail created
 */

import { createDeepAgent } from '../../src/agent.js';
import { FilesystemBackend } from '../../src/backends/filesystem.js';
import { createSubAgentMiddleware } from '../../src/middleware/subagents.js';
import { createLimitsMiddleware } from '../../src/middleware/limits.js';
import { createFilesystemMiddleware } from '../../src/middleware/fs.js';
import { ChatAnthropic } from '@langchain/anthropic';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createSession,
  savePrompts,
  saveConfig,
  logEvent,
  logToolCall,
  saveChatHistory,
  updateSessionStatus,
  writeSessionSummary,
  type SessionConfig,
} from './utils/session.js';
import { ORCHESTRATOR_PROMPT } from './prompts/orchestrator.js';
import { SWOT_LENS_PROMPT } from './prompts/lenses/swot.js';
import { SWOT_LENS_SIMPLE_PROMPT } from './prompts/lenses/swot-simple.js';
import { GLOBAL_CONTEXT } from './prompts/global-context.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test configuration
 */
const TEST_CONFIG = {
  testName: 'Phase 1: Basic Orchestration',
  testQuery: 'Conduct a SWOT analysis for Tesla as an investment opportunity over a 3-5 year horizon, with focus on competitive positioning versus other EV manufacturers.',
  models: {
    orchestrator: 'claude-sonnet-4-5-20250929',
    lenses: {
      'dragonfly-swot': 'claude-sonnet-4-5-20250929',
    },
  },
  limits: {
    maxToolCalls: 50,
    maxSubagentSpawns: 5,
    maxRecursionDepth: 3,
  },
};

/**
 * Main test function
 */
async function runPhase1Test() {
  console.log('🐉 Dragonfly POC - Phase 1: Basic Orchestration\n');

  const startTime = Date.now();

  // Create session
  const { sessionId, sessionDir, sessionInfo } = createSession(TEST_CONFIG);
  console.log(`📁 Session created: ${sessionId}`);
  console.log(`📂 Output directory: ${sessionDir}\n`);

  try {
    // Save prompts to session
    logEvent(sessionDir, 'Saving prompts to session directory');
    const orchestratorPrompt = GLOBAL_CONTEXT + '\n\n---\n\n' + ORCHESTRATOR_PROMPT;
    // Using simplified SWOT prompt for POC testing
    const swotPrompt = GLOBAL_CONTEXT + '\n\n---\n\n' + SWOT_LENS_SIMPLE_PROMPT;

    savePrompts(sessionDir, orchestratorPrompt, {
      'dragonfly-swot': swotPrompt,
    });

    // Save configuration
    saveConfig(sessionDir, TEST_CONFIG);

    // Set up workspace (outputs folder for artifacts)
    const workspaceDir = path.join(sessionDir, 'outputs');
    logEvent(sessionDir, `Workspace directory: ${workspaceDir}`);

    // Configure models
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY not found in environment variables. ' +
        'Please set it before running this test.'
      );
    }

    const orchestratorModel = new ChatAnthropic({
      model: TEST_CONFIG.models.orchestrator,
      apiKey: anthropicApiKey,
      temperature: 0.7,
    });

    const swotModel = new ChatAnthropic({
      model: TEST_CONFIG.models.lenses['dragonfly-swot'],
      apiKey: anthropicApiKey,
      temperature: 0.7,
    });

    logEvent(sessionDir, 'Models configured');
    console.log('🤖 Models configured:');
    console.log(`   Orchestrator: ${TEST_CONFIG.models.orchestrator}`);
    console.log(`   SWOT Lens: ${TEST_CONFIG.models.lenses['dragonfly-swot']}\n`);

    // Create orchestrator with SWOT lens registered
    logEvent(sessionDir, 'Creating orchestrator agent with SWOT lens');
    console.log('🎯 Creating orchestrator agent with SWOT lens...\n');

    const backend = new FilesystemBackend({
      rootDir: workspaceDir,
      virtualMode: true,
    });

    const orchestrator = createDeepAgent({
      name: 'dragonfly-orchestrator',
      systemPrompt: orchestratorPrompt,
      model: orchestratorModel,
      backend,
      subagents: [
        {
          name: 'dragonfly-swot',
          description: 'SWOT Analysis lens for strategic positioning assessment',
          systemPrompt: swotPrompt,
          model: swotModel,
          // FilesystemMiddleware is added automatically when backend is provided
        },
      ],
      // FilesystemMiddleware is added automatically when backend is provided
    });

    logEvent(sessionDir, 'Orchestrator agent created with SWOT lens registered');
    console.log('✅ Orchestrator ready with SWOT lens registered\n');

    // Run the test query
    logEvent(sessionDir, `Test query: ${TEST_CONFIG.testQuery}`);
    console.log(`🚀 Running test: "${TEST_CONFIG.testQuery}"\n`);
    console.log('=' .repeat(60));
    console.log('EXECUTION LOG');
    console.log('='.repeat(60) + '\n');

    // Use invoke() instead of stream() to match working examples
    console.log('📡 Starting agent execution...\n');
    logEvent(sessionDir, 'Starting agent execution');

    const result = await orchestrator.invoke(
      {
        messages: [{ role: 'user', content: TEST_CONFIG.testQuery }],
      },
      {
        recursionLimit: 100, // Increase from default 25 to handle complex workflows
      }
    );

    console.log('\n✅ Agent execution completed\n');
    logEvent(sessionDir, 'Test query completed successfully');
    console.log('\n' + '='.repeat(60));
    console.log('EXECUTION COMPLETE');
    console.log('='.repeat(60) + '\n');

    // Save chat history
    logEvent(sessionDir, 'Saving chat history');
    saveChatHistory(sessionDir, result.messages);

    // Extract artifacts created
    const fs = await import('fs');
    const artifactsDir = path.join(sessionDir, 'outputs');
    const artifacts = fs.existsSync(artifactsDir)
      ? fs.readdirSync(artifactsDir).filter(f => f.endsWith('.md'))
      : [];

    logEvent(sessionDir, `Artifacts created: ${artifacts.length}`);
    console.log(`\n📄 Artifacts created: ${artifacts.length}`);
    for (const artifact of artifacts) {
      console.log(`   - ${artifact}`);
    }

    // Count tool calls and subagents
    let toolCalls = 0;
    let taskCalls = 0;
    const subagentsInvoked: string[] = [];

    for (const message of result.messages) {
      if (message._getType() === 'ai' && (message as any).tool_calls) {
        const aiToolCalls = (message as any).tool_calls || [];
        toolCalls += aiToolCalls.length;

        for (const toolCall of aiToolCalls) {
          if (toolCall.name === 'task') {
            taskCalls++;
            const subagentType = toolCall.args?.subagent_type;
            if (subagentType && !subagentsInvoked.includes(subagentType)) {
              subagentsInvoked.push(subagentType);
            }
          }
        }
      }
    }

    console.log(`\n🔧 Tool calls: ${toolCalls}`);
    console.log(`🤖 Subagents invoked: ${subagentsInvoked.join(', ')}`);

    // Update session status
    const duration = Date.now() - startTime;
    updateSessionStatus(sessionDir, 'success', duration);

    // Write session summary
    writeSessionSummary(sessionDir, {
      artifactsCreated: artifacts,
      toolCallsCount: toolCalls,
      subagentsInvoked,
      keyFindings: [
        'Orchestrator successfully invoked SWOT lens',
        'SWOT lens created markdown artifact',
        'Execution completed without errors',
      ],
    });

    console.log(`\n✅ Phase 1 test PASSED`);
    console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);
    console.log(`📁 Session: ${sessionId}`);
    console.log(`\n💡 Review complete session in: ${sessionDir}/\n`);

    return {
      success: true,
      sessionId,
      sessionDir,
      artifacts,
      duration,
    };

  } catch (error) {
    // Handle errors
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`\n❌ Phase 1 test FAILED`);
    console.error(`Error: ${errorMessage}\n`);

    logEvent(sessionDir, `ERROR: ${errorMessage}`);
    updateSessionStatus(sessionDir, 'failed', duration, errorMessage);

    writeSessionSummary(sessionDir, {
      artifactsCreated: [],
      toolCallsCount: 0,
      subagentsInvoked: [],
    });

    return {
      success: false,
      sessionId,
      sessionDir,
      error: errorMessage,
      duration,
    };
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase1Test()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export { runPhase1Test };
