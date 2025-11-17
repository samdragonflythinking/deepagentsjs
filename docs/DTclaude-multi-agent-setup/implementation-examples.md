# Implementation Examples and Code Patterns

**Purpose:** Concrete code examples showing how Dragonfly implements key patterns
**Date:** 2025-11-12
**Audience:** Reference for implementing equivalent patterns in DeepAgents

---

## Table of Contents

1. [Complete Request Flow Example](#complete-request-flow-example)
2. [Agent Execution Patterns](#agent-execution-patterns)
3. [Hook Implementation Examples](#hook-implementation-examples)
4. [Context Building Patterns](#context-building-patterns)
5. [SSE Streaming Implementation](#sse-streaming-implementation)

---

## Complete Request Flow Example

### User Request to Artifact

**Step-by-step flow with actual code:**

#### 1. API Route Receives Request

```typescript
// src/app/api/analysis/start/route.ts

export async function POST(request: NextRequest) {
  const body: StartAnalysisRequest = await request.json();

  // Create or reuse session
  const session = await createSession({
    title: body.title || generateTitle(body.prompt),
    project_id: body.projectId || LEGACY_PROJECT_ID,
    metadata: { lensId: body.lensId },
  });

  // Default to orchestrator
  const lensId = body.lensId || 'dragonfly-ai';
  const projectId = body.projectId || session.project_id;

  // Save user message
  const userMessage = await createMessage(
    session.id,
    'user',
    body.prompt,
    undefined,
    undefined,
    body.mentions  // @-mentions if present
  );

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const executionEvents: ExecutionEvent[] = [];
      let assistantContent = '';

      try {
        // Build context from project
        let enhancedPrompt = body.prompt;

        if (projectId) {
          const projectWorkspace = getProjectWorkspace(projectId);

          // Load project.md
          const projectSummary = fs.existsSync(projectWorkspace.projectFile)
            ? fs.readFileSync(projectWorkspace.projectFile, 'utf-8')
            : null;

          // Load artifacts/index.md
          const artifactCatalog = fs.existsSync(projectWorkspace.artifactsIndexFile)
            ? fs.readFileSync(projectWorkspace.artifactsIndexFile, 'utf-8')
            : null;

          // Inject context into prompt
          if (projectSummary) {
            enhancedPrompt = `<project_summary>\n${projectSummary}\n</project_summary>\n\n${enhancedPrompt}`;
          }

          if (artifactCatalog) {
            // Extract file paths from catalog
            const filePaths = extractFilePathsFromCatalog(artifactCatalog);
            const fileList = filePaths.map(p => `- ${p}`).join('\n');

            enhancedPrompt = `<artifact_catalog>
## Past Lens Agent Reports

${fileList}

You can use Read tools to access these reports.
</artifact_catalog>

${enhancedPrompt}`;
          }
        }

        // Build mention context if present
        if (body.mentions && body.mentions.length > 0) {
          const mentionContext = await buildMentionContext(body.mentions);
          enhancedPrompt = `${mentionContext}\n\n${enhancedPrompt}`;
        }

        // Run agent with SDK
        for await (const message of runLensAnalysis({
          lensId,
          prompt: enhancedPrompt,
          sessionId: session.id,
          projectId,
          onArtifact: async (artifact) => {
            // Send artifact event to SSE
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({
                type: 'artifact_detected',
                artifactId: artifact.artifactId,
                title: artifact.title,
                wordCount: artifact.wordCount,
              })}\n\n`
            ));
          },
          onToolEvent: (event) => {
            // Track for message metadata
            executionEvents.push(event);

            // Send tool event to SSE
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify(event)}\n\n`
            ));
          },
        })) {
          // Stream SDK messages to client
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify(message)}\n\n`
          ));

          // Accumulate assistant content
          if (message.type === 'assistant' && message.content) {
            assistantContent += extractTextFromContent(message.content);
          }
        }

        // Save assistant message
        await createMessage(
          session.id,
          'assistant',
          assistantContent,
          executionEvents,
          null  // artifactId if relevant
        );

        // Evaluate if project summary needs updating
        if (projectId) {
          const evaluation = await evaluateProjectSummaryUpdate(projectId, session.id);
          if (evaluation.needsUpdate) {
            console.log('[API] Project summary update recommended:', evaluation.reasoning);
            // Update could be triggered here or via background job
          }
        }

        // End stream
        controller.close();
      } catch (error) {
        console.error('[API] Stream error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

#### 2. Agent Runner Initializes

```typescript
// src/lib/sdk/agent-runner.ts

export async function* runLensAnalysis(options: RunLensOptions) {
  const { lensId, prompt, sessionId, projectId, onArtifact, onToolEvent } = options;

  // Get lens definition from registry
  const lensAgent = getLensAgent(lensId);
  if (!lensAgent) {
    throw new Error(`Unknown lens: ${lensId}`);
  }

  // Setup workspace
  let workspace: string;
  let additionalDirs: string[] = [];

  if (projectId) {
    // Project-based workspace
    const sessionWorkspace = createSessionWorkspace(projectId, sessionId);
    workspace = sessionWorkspace.rootPath;

    const projectWorkspace = getProjectWorkspace(projectId);
    additionalDirs = [
      projectWorkspace.artifactsDir,  // Read past artifacts
      projectWorkspace.filesDir,      // Read uploaded files
    ];
  } else {
    // Legacy session-only workspace
    workspace = `/tmp/dragonfly-sessions/${sessionId}`;
    await mkdir(resolve(workspace, 'outputs'), { recursive: true });
  }

  // Create HookManager for artifact detection and telemetry
  const hookManager = new HookManager({
    sessionId,
    lensId,
    callbacks: {
      onToolEvent: onToolEvent ? (event) => onToolEvent(convertToolEvent(event)) : undefined,
      onArtifact: onArtifact ? async (event) => await onArtifact(event) : undefined,
    },
  });

  // Write sub-agents to workspace/.claude/agents/
  await writeWorkspaceAgents(workspace, lensId);

  // Inject workspace path into primary agent prompt
  const primaryPrompt = lensAgent.prompt.replace(/{WORKSPACE_PATH}/g, workspace);

  // Configure SDK options
  const sdkOptions = {
    systemPrompt: primaryPrompt,
    settingSources: ['project'],  // Load sub-agents from .claude/agents/
    cwd: workspace,
    allowedTools: lensAgent.tools,
    hooks: {
      PreToolUse: [{
        hooks: [async (event, toolUseID, options) =>
          await hookManager.handlePreToolUse(event, toolUseID, options)
        ],
      }],
      PostToolUse: [{
        hooks: [async (event, toolUseID, options) =>
          await hookManager.handlePostToolUse(event, toolUseID, options)
        ],
      }],
    },
    includePartialMessages: true,  // Token-by-token streaming
  };

  // Add read-only context directories
  if (additionalDirs.length > 0) {
    sdkOptions.additionalDirectories = additionalDirs;
  }

  // Emit agent_start event
  hookManager.emitAgentStart(lensAgent.description);

  // Execute SDK query
  try {
    for await (const message of query({
      prompt: prompt,
      options: sdkOptions,
    })) {
      yield message as LensExecutionMessage;
    }

    hookManager.emitAgentComplete(true);
  } catch (error) {
    hookManager.emitAgentComplete(false);
    throw error;
  }
}
```

---

#### 3. HookManager Detects Artifact

```typescript
// src/lib/sdk/hook-manager.ts

class HookManager {
  async handlePostToolUse(event, toolUseID, options) {
    // Calculate duration
    const duration = Date.now() - this.toolStartTimes.get(toolUseID);

    // Get current agent from stack
    const currentAgent = this.agentStack[this.agentStack.length - 1];

    // Emit tool_complete event
    this.emitSSE({
      type: 'tool_complete',
      tool: event.tool_name,
      agent: currentAgent,
      duration,
    });

    // Detect Task completion (sub-agent finished)
    if (event.tool_name === 'Task' && event.tool_input?.subagent_type) {
      this.agentStack.pop();
      this.emitSSE({
        type: 'agent_complete',
        agent: event.tool_input.subagent_type,
        duration,
      });
    }

    // Artifact detection
    if (event.tool_name === 'Write') {
      await this.detectArtifact(event);
    }
  }

  private async detectArtifact(event) {
    const filePath = event.tool_input?.file_path;
    const content = event.tool_input?.content;

    // Artifact contract: .md file in /outputs/ or /artifacts/
    const isArtifact =
      filePath &&
      content &&
      filePath.endsWith('.md') &&
      (filePath.includes('/outputs/') || filePath.includes('/artifacts/')) &&
      !filePath.endsWith('/index.md') &&
      !filePath.endsWith('/project.md');

    if (!isArtifact) return;

    // Get current agent (proper attribution)
    const currentAgent = this.agentStack[this.agentStack.length - 1];

    // Extract title and word count
    const title = extractTitleFromContent(content) || extractTitleFromFilename(filePath);
    const wordCount = calculateWordCount(content);

    // Generate summaries using Claude API
    const summaries = await generateArtifactSummary(content, title, currentAgent);

    // Save to database
    const artifact = await createArtifact({
      session_id: this.sessionId,
      lens_type: currentAgent,  // ✅ Correct attribution
      title,
      content,
      word_count: wordCount,
      summary_short: summaries.summary_short,
      summary_long: summaries.summary_long,
      key_findings: summaries.key_findings,
    });

    // Enrich artifact file
    await this.addYamlFrontmatter(filePath, content, artifact, summaries, currentAgent);
    await this.updateArtifactsIndex(filePath, artifact, summaries, currentAgent);
    await this.copyToArtifactsDirectory(filePath);

    // Emit artifact event
    this.emitSSE({
      type: 'artifact_detected',
      artifactId: artifact.id,
      artifactTitle: title,
      wordCount,
    });

    // Callback to API route
    if (this.callbacks.onArtifact) {
      await this.callbacks.onArtifact({
        type: 'artifact_detected',
        artifactId: artifact.id,
        filePath,
        content,
        title,
        wordCount,
        timestamp: new Date(),
        sessionId: this.sessionId,
        lensType: currentAgent,
      });
    }

    this.artifactCount++;
  }
}
```

---

## Agent Execution Patterns

### Pattern: Orchestrator Delegation

```typescript
// Agent: dragonfly-ai (orchestrator)

// 1. Understand request
const analysis = analyzeUserRequest(userPrompt);
// → User wants competitive analysis for Tesla

// 2. Recommend lenses
const recommendations = [
  { lens: 'dragonfly-porters-five-forces', reasoning: 'Competitive forces analysis' },
  { lens: 'dragonfly-swot-analysis', reasoning: 'Internal/external assessment' },
  { lens: 'dragonfly-competitive-intelligence', reasoning: 'Competitor deep-dive' },
];

// 3. Present to user
respondToUser(`I recommend three lenses for Tesla competitive analysis:
1. Porter's Five Forces - Assess industry structure
2. SWOT Analysis - Evaluate strategic position
3. Competitive Intelligence - Deep-dive on competitors

Shall I run all three?`);

// 4. User approves
if (userApproves) {
  // 5. Sequential execution
  const results = [];

  // Task 1: Porter's Five Forces
  const porters = await invokeLens({
    subagent_type: 'dragonfly-porters-five-forces',
    description: "Porter's Five Forces analysis for EV industry",
    prompt: "Conduct Porter's Five Forces analysis for the electric vehicle industry, focusing on Tesla's competitive position...",
  });
  results.push(porters);

  // Task 2: SWOT (with context from Porter's)
  const swot = await invokeLens({
    subagent_type: 'dragonfly-swot-analysis',
    description: 'SWOT analysis for Tesla',
    prompt: `Conduct SWOT analysis for Tesla. Consider the Porter's Five Forces insights from the previous analysis, particularly regarding competitive rivalry and supplier power...`,
  });
  results.push(swot);

  // Task 3: Competitive Intelligence (with full context)
  const competitive = await invokeLens({
    subagent_type: 'dragonfly-competitive-intelligence',
    description: 'Competitive intelligence on Tesla competitors',
    prompt: `Conduct competitive intelligence analysis focusing on Tesla's main competitors (BYD, NIO, traditional OEMs). Reference the SWOT and Porter's analyses for context on Tesla's competitive positioning...`,
  });
  results.push(competitive);

  // 6. Synthesize insights
  respondToUser(`Analysis complete! Three artifacts generated:
1. ${results[0].title}
2. ${results[1].title}
3. ${results[2].title}

Key integrated insights:
- [Synthesis of findings across all three lenses]
- [Cross-cutting themes]
- [Strategic implications]

Would you like me to create a synthesis artifact integrating all three perspectives?`);
}
```

---

### Pattern: Evidence-Driven Analysis

```typescript
// Agent: dragonfly-pestle-analysis

// 1. Plan analysis phases
await todoWrite([
  { content: 'Research political factors', status: 'in_progress' },
  { content: 'Research economic factors', status: 'pending' },
  { content: 'Research social factors', status: 'pending' },
  // ... other factors
]);

// 2. Political factors research
const regulatoryNews = await webSearch({
  query: 'electric vehicle regulations 2025',
});

const iea_report = await webFetch({
  url: 'https://www.iea.org/reports/global-ev-outlook-2025',
  prompt: 'Extract key regulatory policies and government incentives for EVs',
});

const past_pestle = await read({
  file_path: 'artifacts/pestle-ev-market-2024-12-10.md',
});

// 3. Synthesize evidence
const politicalFactors = synthesize([
  regulatoryNews,
  iea_report,
  past_pestle,
]);

// 4. Continue for all PESTLE dimensions...
// Economic, Social, Technological, Legal, Environmental

// 5. Create artifact
await write({
  file_path: '{WORKSPACE_PATH}/outputs/pestle-ev-market-2025-11-12.md',
  content: `# PESTLE Analysis: Electric Vehicle Market 2025

## Political Factors

### Government Regulations
${politicalFactors.regulations}

*Evidence: IEA Global EV Outlook 2025, Section 3.2*

### Incentive Programs
${politicalFactors.incentives}

*Evidence: Recent policy announcements (WebSearch results from Nov 2025)*

## Economic Factors
...
`,
});
```

---

### Pattern: Context-Aware Multi-Lens Workflow

```typescript
// Agent: dragonfly-stakeholder-workflow-orchestrator

// 1. Read project context
const projectSummary = await read({ file_path: 'project.md' });
const artifactCatalog = await read({ file_path: 'artifacts/index.md' });

// 2. Check what's already been done
const existingStakeholderAnalysis = await grep({
  pattern: 'stakeholder',
  path: 'artifacts/',
  output_mode: 'files_with_matches',
});

// 3. Plan workflow based on context
let workflow;
if (existingStakeholderAnalysis.matches.length > 0) {
  // Build on existing work
  workflow = [
    { lens: 'dragonfly-stakeholder-dynamics', rationale: 'Deepen relationship analysis' },
    { lens: 'dragonfly-stakeholder-engagement', rationale: 'Design engagement strategies' },
  ];
} else {
  // Start from scratch
  workflow = [
    { lens: 'dragonfly-stakeholder-analysis', rationale: 'Initial mapping' },
    { lens: 'dragonfly-stakeholder-dynamics', rationale: 'Relationship analysis' },
    { lens: 'dragonfly-stakeholder-engagement', rationale: 'Engagement strategies' },
  ];
}

// 4. Execute workflow with cascading context
for (const step of workflow) {
  const context = await buildContextFromPreviousSteps();

  await invokeLens({
    subagent_type: step.lens,
    description: step.rationale,
    prompt: `${context}\n\nUser request: ${userPrompt}`,
  });
}

// 5. Create synthesis
await synthesizeAllSteps(workflow);
```

---

## Hook Implementation Examples

### Agent Stack Management

```typescript
// src/lib/sdk/hook-manager.ts

class HookManager {
  private agentStack: string[] = [];

  constructor(options: HookManagerOptions) {
    this.agentStack = [options.lensId];  // Start with primary agent
  }

  async handlePreToolUse(event, toolUseID, options) {
    // Detect Task tool (sub-agent invocation)
    if (event.tool_name === 'Task' && event.tool_input?.subagent_type) {
      const subAgentName = event.tool_input.subagent_type;

      // For parallel execution: Reset stack to just orchestrator
      if (this.agentStack.length > 1) {
        this.agentStack.splice(1);  // Keep only [orchestrator]
      }

      // Push sub-agent to stack
      this.agentStack.push(subAgentName);

      console.log(`[HookManager] Sub-agent invoked: ${subAgentName}`);
      console.log(`[HookManager] Current stack: ${this.agentStack.join(' → ')}`);
      // Example output: "Current stack: dragonfly-ai → dragonfly-swot-analysis"

      // Emit agent_start event
      this.emitSSE({
        type: 'agent_start',
        agent: subAgentName,
      });
    }

    // Get current agent (top of stack)
    const currentAgent = this.agentStack[this.agentStack.length - 1];

    // Emit tool_start event attributed to current agent
    this.emitSSE({
      type: 'tool_start',
      tool: event.tool_name,
      agent: currentAgent,  // ✅ Correct attribution
    });
  }

  async handlePostToolUse(event, toolUseID, options) {
    // Get current agent
    const currentAgent = this.agentStack[this.agentStack.length - 1];

    // Emit tool_complete event
    this.emitSSE({
      type: 'tool_complete',
      tool: event.tool_name,
      agent: currentAgent,
    });

    // Detect Task completion (sub-agent finished)
    if (event.tool_name === 'Task' && event.tool_input?.subagent_type) {
      const completedAgent = event.tool_input.subagent_type;

      // Pop sub-agent from stack
      if (this.agentStack[this.agentStack.length - 1] === completedAgent) {
        this.agentStack.pop();
      }

      console.log(`[HookManager] Sub-agent completed: ${completedAgent}`);
      console.log(`[HookManager] Current stack: ${this.agentStack.join(' → ')}`);

      // Emit agent_complete event
      this.emitSSE({
        type: 'agent_complete',
        agent: completedAgent,
      });
    }
  }

  getCurrentAgent(): string {
    return this.agentStack[this.agentStack.length - 1];
  }
}
```

**Example execution trace:**

```
[HookManager] Agent stack initialized: [dragonfly-ai]

[HookManager] Sub-agent invoked: dragonfly-swot-analysis
[HookManager] Current stack: dragonfly-ai → dragonfly-swot-analysis

[HookManager] Tool: Write, Agent: dragonfly-swot-analysis
[HookManager] Artifact detected, attributed to: dragonfly-swot-analysis ✅

[HookManager] Sub-agent completed: dragonfly-swot-analysis
[HookManager] Current stack: dragonfly-ai

[HookManager] Sub-agent invoked: dragonfly-pestle-analysis
[HookManager] Current stack: dragonfly-ai → dragonfly-pestle-analysis

[HookManager] Tool: Write, Agent: dragonfly-pestle-analysis
[HookManager] Artifact detected, attributed to: dragonfly-pestle-analysis ✅
```

---

### Duration Tracking

```typescript
class HookManager {
  private toolStartTimes = new Map<string, number>();
  private agentStartTime: number;

  constructor(options) {
    this.agentStartTime = Date.now();
  }

  async handlePreToolUse(event, toolUseID, options) {
    // Record start time
    if (toolUseID) {
      this.toolStartTimes.set(toolUseID, Date.now());
    }
  }

  async handlePostToolUse(event, toolUseID, options) {
    // Calculate duration
    let duration: number | undefined;
    if (toolUseID && this.toolStartTimes.has(toolUseID)) {
      const startTime = this.toolStartTimes.get(toolUseID)!;
      duration = Date.now() - startTime;
      this.toolStartTimes.delete(toolUseID);
    }

    // Emit with duration
    this.emitSSE({
      type: 'tool_complete',
      tool: event.tool_name,
      duration,  // Milliseconds
    });

    console.log(`[HookManager] ${event.tool_name} completed in ${duration}ms`);
  }

  emitAgentComplete(success: boolean) {
    const duration = Date.now() - this.agentStartTime;

    this.emitSSE({
      type: 'agent_complete',
      duration,
      success,
      artifactCount: this.artifactCount,
    });

    console.log(`[HookManager] Agent completed in ${duration}ms, ${this.artifactCount} artifacts`);
  }
}
```

---

## Context Building Patterns

### Project Context Injection

```typescript
// src/app/api/analysis/start/route.ts

async function buildProjectContext(projectId: string): Promise<{
  projectSummary: string | null;
  artifactCatalog: string | null;
}> {
  const projectWorkspace = getProjectWorkspace(projectId);

  // Load project.md
  let projectSummary: string | null = null;
  if (fs.existsSync(projectWorkspace.projectFile)) {
    projectSummary = fs.readFileSync(projectWorkspace.projectFile, 'utf-8');
  }

  // Load artifacts/index.md
  let artifactCatalog: string | null = null;
  if (fs.existsSync(projectWorkspace.artifactsIndexFile)) {
    artifactCatalog = fs.readFileSync(projectWorkspace.artifactsIndexFile, 'utf-8');
  }

  return { projectSummary, artifactCatalog };
}

// Usage in API route
const { projectSummary, artifactCatalog } = await buildProjectContext(projectId);

let enhancedPrompt = userPrompt;

if (projectSummary) {
  enhancedPrompt = `<project_summary>
${projectSummary}
</project_summary>

${enhancedPrompt}`;
}

if (artifactCatalog) {
  // Extract file paths from catalog
  const filePathRegex = /\*\*File:\*\*\s*`([^`]+)`/g;
  const filePaths: string[] = [];
  let match;
  while ((match = filePathRegex.exec(artifactCatalog)) !== null) {
    filePaths.push(match[1]);
  }

  const fileList = filePaths.map(p => `- ${p}`).join('\n');

  enhancedPrompt = `<artifact_catalog>
## Past Lens Agent Reports

${fileList}

You can use Read, Grep, or Glob tools to access these reports.
</artifact_catalog>

${enhancedPrompt}`;
}

// enhancedPrompt is now passed to agent
```

---

### Mention Context Building

```typescript
// src/lib/mentions/mention-context.ts

export async function buildMentionContext(mentions: MessageMention[]): Promise<string> {
  let context = '';

  for (const mention of mentions) {
    if (mention.type === 'file') {
      // Load file content from workspace
      const filePath = `files/${mention.id}.md`;  // Extracted markdown
      const content = await readFile(filePath);

      context += `<file_mention file_id="${mention.id}" file_name="${mention.name}">
${content}
</file_mention>

`;
    } else if (mention.type === 'artifact') {
      // Load artifact from database
      const artifact = await getArtifactById(mention.id);

      context += `<artifact_mention artifact_id="${mention.id}" artifact_title="${artifact.title}">
${artifact.content}
</artifact_mention>

`;
    }
  }

  return context;
}

// Usage
const mentionContext = await buildMentionContext(body.mentions);
const enhancedPrompt = `${mentionContext}\n\n${userPrompt}`;

// Example output:
// <file_mention file_id="uuid" file_name="market-report.pdf">
// # Market Analysis Report
// ...
// </file_mention>
//
// Analyze the competitive dynamics discussed in @market-report.pdf
```

---

## SSE Streaming Implementation

### Event Emitter Pattern

```typescript
// src/app/api/analysis/events/route.ts

// Global event emitter (Node.js EventTarget)
export const eventEmitter = new EventTarget();

// SSE endpoint
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Event listener
      const listener = (event: Event) => {
        const customEvent = event as CustomEvent;
        const eventData = customEvent.detail;

        // Serialize and send via SSE
        const sseMessage = `data: ${JSON.stringify(eventData)}\n\n`;
        controller.enqueue(encoder.encode(sseMessage));
      };

      // Subscribe to events
      eventEmitter.addEventListener('sdk-event', listener);

      // Keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 30000);

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        eventEmitter.removeEventListener('sdk-event', listener);
        clearInterval(keepAlive);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

### HookManager SSE Emission

```typescript
// src/lib/sdk/hook-manager.ts

class HookManager {
  private emitSSE(eventData: SSEEventData): void {
    try {
      const emitter = getEventEmitter();

      // Sanitize to remove circular references
      const sanitizedEventData = sanitizeForJSON(eventData);

      // Emit event
      const event = new CustomEvent('sdk-event', {
        detail: sanitizedEventData,
      });

      emitter.dispatchEvent(event);
    } catch (error) {
      console.error('[HookManager] Failed to emit SSE event:', error);
    }
  }

  async handlePreToolUse(event, toolUseID, options) {
    this.emitSSE({
      type: 'tool_start',
      timestamp: Date.now(),
      tool: event.tool_name,
      agent: this.getCurrentAgent(),
    });
  }

  async handlePostToolUse(event, toolUseID, options) {
    this.emitSSE({
      type: 'tool_complete',
      timestamp: Date.now(),
      tool: event.tool_name,
      agent: this.getCurrentAgent(),
      duration: this.calculateDuration(toolUseID),
    });
  }

  private async detectArtifact(event) {
    // ... artifact detection logic

    this.emitSSE({
      type: 'artifact_detected',
      timestamp: Date.now(),
      artifactId: artifact.id,
      artifactTitle: artifact.title,
      wordCount: artifact.word_count,
    });
  }
}
```

---

### Browser SSE Consumption

```typescript
// src/app/projects/[id]/sessions/[sessionId]/page.tsx

useEffect(() => {
  const eventSource = new EventSource('/api/analysis/events');

  eventSource.addEventListener('message', (e) => {
    const event = JSON.parse(e.data);

    // Route events to state handlers
    switch (event.type) {
      case 'artifact_detected':
        setArtifacts(prev => [...prev, {
          id: event.artifactId,
          title: event.artifactTitle,
          wordCount: event.wordCount,
        }]);
        break;

      case 'tool_start':
        setTools(prev => [...prev, {
          id: event.toolUseId,
          name: event.tool,
          agent: event.agent,
          status: 'running',
          startTime: event.timestamp,
        }]);
        break;

      case 'tool_complete':
        setTools(prev => prev.map(tool =>
          tool.id === event.toolUseId
            ? { ...tool, status: 'completed', duration: event.duration }
            : tool
        ));
        break;

      case 'agent_start':
        setAgents(prev => [...prev, {
          name: event.agent,
          status: 'running',
          startTime: event.timestamp,
        }]);
        break;

      case 'agent_complete':
        setAgents(prev => prev.map(agent =>
          agent.name === event.agent
            ? { ...agent, status: 'completed', duration: event.duration }
            : agent
        ));
        break;
    }
  });

  return () => {
    eventSource.close();
  };
}, []);
```

---

## Summary

### Key Implementation Patterns

1. **Agent Registration** - TypeScript registry + workspace agents
2. **Workspace Path Injection** - Template replacement at runtime
3. **Hook-Based Detection** - PostToolUse watches for Write tool
4. **Agent Stack** - Tracks current agent for attribution
5. **SSE Streaming** - Global event emitter + custom events
6. **Context Building** - Programmatic prompt enhancement
7. **Duration Tracking** - Map-based start/end time tracking

### Critical Code Locations

- **Agent Runner:** `src/lib/sdk/agent-runner.ts` (315 lines)
- **Hook Manager:** `src/lib/sdk/hook-manager.ts` (761 lines)
- **API Route:** `src/app/api/analysis/start/route.ts` (streaming setup)
- **SSE Events:** `src/app/api/analysis/events/route.ts` (global emitter)
- **Agent Registry:** `src/lib/agents/lenses.ts` (2200 lines)

### Migration Considerations

1. **Agent Lifecycle Management** - How DeepAgents handles sub-agent invocation
2. **Hook System Equivalent** - How to intercept tool calls for artifact detection
3. **Workspace Isolation** - How to sandbox agents to specific directories
4. **Context Injection** - How to provide read-only access to shared resources
5. **Real-Time Events** - How to stream execution events to clients

---

**End of implementation examples. This provides concrete code patterns for recreating the system architecture.**
