/**
 * Session Management Utilities for Dragonfly POC
 *
 * Creates and manages test session directories with complete audit trails.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BaseMessage } from '@langchain/core/messages';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SessionConfig {
  testName: string;
  testQuery: string;
  models: {
    orchestrator: string;
    lenses: Record<string, string>;
  };
  limits: {
    maxToolCalls: number;
    maxSubagentSpawns: number;
    maxRecursionDepth: number;
  };
}

export interface SessionInfo {
  sessionId: string;
  timestamp: string;
  testName: string;
  testQuery: string;
  models: {
    orchestrator: string;
    lenses: Record<string, string>;
  };
  config: {
    maxToolCalls: number;
    maxSubagentSpawns: number;
    maxRecursionDepth: number;
  };
  duration?: string;
  status?: 'running' | 'success' | 'failed';
  error?: string;
}

export interface ToolCallLog {
  timestamp: string;
  agent: string;
  tool: string;
  parameters: any;
  result?: any;
  error?: string;
  duration?: number;
}

/**
 * Creates a new session directory with timestamped folder name
 */
export function createSession(config: SessionConfig): {
  sessionId: string;
  sessionDir: string;
  sessionInfo: SessionInfo;
} {
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.split('T')[0];
  const timeStr = timestamp.split('T')[1].split('.')[0].replace(/:/g, '-');

  // Create session ID: YYYY-MM-DDTHH-MM-SS-{topic-slug}
  const topicSlug = config.testQuery
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);

  const sessionId = `${dateStr}T${timeStr}-${topicSlug}`;

  // Create session directory
  const sessionsRoot = path.join(__dirname, '../../sessions');
  const sessionDir = path.join(sessionsRoot, sessionId);

  fs.mkdirSync(sessionDir, { recursive: true });
  fs.mkdirSync(path.join(sessionDir, 'outputs'), { recursive: true });

  // Initialize session info
  const sessionInfo: SessionInfo = {
    sessionId,
    timestamp,
    testName: config.testName,
    testQuery: config.testQuery,
    models: config.models,
    config: config.limits,
    status: 'running',
  };

  // Write initial session info
  fs.writeFileSync(
    path.join(sessionDir, 'session-info.json'),
    JSON.stringify(sessionInfo, null, 2)
  );

  // Create execution log file
  fs.writeFileSync(
    path.join(sessionDir, 'execution-log.txt'),
    `=== Dragonfly POC Test Session ===\n` +
    `Session ID: ${sessionId}\n` +
    `Test: ${config.testName}\n` +
    `Query: ${config.testQuery}\n` +
    `Started: ${timestamp}\n` +
    `\n` +
    `=== Execution Log ===\n\n`
  );

  return { sessionId, sessionDir, sessionInfo };
}

/**
 * Saves agent prompts to session directory
 */
export function savePrompts(
  sessionDir: string,
  orchestratorPrompt: string,
  lensPrompts: Record<string, string>
): void {
  // Save orchestrator prompt
  fs.writeFileSync(
    path.join(sessionDir, 'orchestrator-prompt.md'),
    `# Orchestrator System Prompt\n\n` +
    `**Agent**: dragonfly-orchestrator\n` +
    `**Saved**: ${new Date().toISOString()}\n\n` +
    `---\n\n` +
    orchestratorPrompt
  );

  // Save lens prompts
  for (const [lensName, prompt] of Object.entries(lensPrompts)) {
    const filename = `${lensName}-prompt.md`;
    fs.writeFileSync(
      path.join(sessionDir, filename),
      `# ${lensName} System Prompt\n\n` +
      `**Agent**: ${lensName}\n` +
      `**Saved**: ${new Date().toISOString()}\n\n` +
      `---\n\n` +
      prompt
    );
  }
}

/**
 * Saves configuration to session directory
 */
export function saveConfig(sessionDir: string, config: any): void {
  fs.writeFileSync(
    path.join(sessionDir, 'config.json'),
    JSON.stringify(config, null, 2)
  );
}

/**
 * Logs a tool call to the execution log
 */
export function logToolCall(
  sessionDir: string,
  log: ToolCallLog
): void {
  const logEntry =
    `[${log.timestamp}] ${log.agent} → ${log.tool}\n` +
    `Parameters: ${JSON.stringify(log.parameters, null, 2)}\n` +
    (log.error
      ? `ERROR: ${log.error}\n`
      : log.result
        ? `Result: ${JSON.stringify(log.result, null, 2)}\n`
        : ''
    ) +
    (log.duration ? `Duration: ${log.duration}ms\n` : '') +
    `\n`;

  fs.appendFileSync(
    path.join(sessionDir, 'execution-log.txt'),
    logEntry
  );
}

/**
 * Logs a general event to the execution log
 */
export function logEvent(
  sessionDir: string,
  message: string
): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n\n`;

  fs.appendFileSync(
    path.join(sessionDir, 'execution-log.txt'),
    logEntry
  );
}

/**
 * Saves chat history to session directory
 */
export function saveChatHistory(
  sessionDir: string,
  messages: BaseMessage[]
): void {
  // Save as JSON for programmatic access
  const messagesJson = messages.map(msg => ({
    type: msg._getType(),
    content: msg.content,
    name: (msg as any).name,
    additional_kwargs: (msg as any).additional_kwargs,
  }));

  fs.writeFileSync(
    path.join(sessionDir, 'chat-history.json'),
    JSON.stringify(messagesJson, null, 2)
  );

  // Save as readable markdown
  let markdown = '# Chat History\n\n';

  for (const msg of messages) {
    const type = msg._getType();
    const role = type === 'human' ? 'User' :
                 type === 'ai' ? 'Assistant' :
                 type === 'system' ? 'System' :
                 type === 'tool' ? 'Tool' :
                 type;

    markdown += `## ${role}\n\n`;

    if (typeof msg.content === 'string') {
      markdown += `${msg.content}\n\n`;
    } else {
      markdown += `\`\`\`json\n${JSON.stringify(msg.content, null, 2)}\n\`\`\`\n\n`;
    }

    markdown += `---\n\n`;
  }

  fs.writeFileSync(
    path.join(sessionDir, 'chat-history.md'),
    markdown
  );
}

/**
 * Updates session info with final status
 */
export function updateSessionStatus(
  sessionDir: string,
  status: 'success' | 'failed',
  duration: number,
  error?: string
): void {
  const sessionInfoPath = path.join(sessionDir, 'session-info.json');
  const sessionInfo: SessionInfo = JSON.parse(
    fs.readFileSync(sessionInfoPath, 'utf-8')
  );

  sessionInfo.status = status;
  sessionInfo.duration = `${Math.round(duration / 1000)}s`;
  if (error) {
    sessionInfo.error = error;
  }

  fs.writeFileSync(
    sessionInfoPath,
    JSON.stringify(sessionInfo, null, 2)
  );

  // Log completion
  logEvent(sessionDir, `Session ${status.toUpperCase()}`);
  logEvent(sessionDir, `Duration: ${sessionInfo.duration}`);
  if (error) {
    logEvent(sessionDir, `Error: ${error}`);
  }
}

/**
 * Creates a session summary markdown file
 */
export function writeSessionSummary(
  sessionDir: string,
  summary: {
    artifactsCreated: string[];
    toolCallsCount: number;
    subagentsInvoked: string[];
    keyFindings?: string[];
  }
): void {
  const sessionInfo: SessionInfo = JSON.parse(
    fs.readFileSync(path.join(sessionDir, 'session-info.json'), 'utf-8')
  );

  let markdown = `# Session Summary\n\n`;
  markdown += `**Session ID**: ${sessionInfo.sessionId}\n`;
  markdown += `**Test**: ${sessionInfo.testName}\n`;
  markdown += `**Query**: ${sessionInfo.testQuery}\n`;
  markdown += `**Status**: ${sessionInfo.status}\n`;
  markdown += `**Duration**: ${sessionInfo.duration}\n\n`;

  markdown += `## Configuration\n\n`;
  markdown += `**Orchestrator Model**: ${sessionInfo.models.orchestrator}\n`;
  markdown += `**Lens Models**:\n`;
  for (const [lens, model] of Object.entries(sessionInfo.models.lenses)) {
    markdown += `- ${lens}: ${model}\n`;
  }
  markdown += `\n`;

  markdown += `**Execution Limits**:\n`;
  markdown += `- Max Tool Calls: ${sessionInfo.config.maxToolCalls}\n`;
  markdown += `- Max Subagent Spawns: ${sessionInfo.config.maxSubagentSpawns}\n`;
  markdown += `- Max Recursion Depth: ${sessionInfo.config.maxRecursionDepth}\n\n`;

  markdown += `## Results\n\n`;
  markdown += `**Artifacts Created**: ${summary.artifactsCreated.length}\n`;
  for (const artifact of summary.artifactsCreated) {
    markdown += `- ${artifact}\n`;
  }
  markdown += `\n`;

  markdown += `**Tool Calls**: ${summary.toolCallsCount}\n\n`;

  markdown += `**Subagents Invoked**: ${summary.subagentsInvoked.length}\n`;
  for (const subagent of summary.subagentsInvoked) {
    markdown += `- ${subagent}\n`;
  }
  markdown += `\n`;

  if (summary.keyFindings && summary.keyFindings.length > 0) {
    markdown += `## Key Findings\n\n`;
    for (const finding of summary.keyFindings) {
      markdown += `- ${finding}\n`;
    }
    markdown += `\n`;
  }

  if (sessionInfo.error) {
    markdown += `## Error\n\n`;
    markdown += `\`\`\`\n${sessionInfo.error}\n\`\`\`\n`;
  }

  fs.writeFileSync(
    path.join(sessionDir, 'SUMMARY.md'),
    markdown
  );
}
