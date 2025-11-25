# DeepAgentsJS: Functional Overview for Product Managers

**Audience:** Technical product managers who need to understand the system's capabilities and limitations without diving into code

**Last Updated:** 2025-11-24

---

## Table of Contents

1. [What is an Agent?](#what-is-an-agent)
2. [How Does an Agent Invoke Subagents?](#how-does-an-agent-invoke-subagents)
3. [How Does an Agent Use Tools?](#how-does-an-agent-use-tools)
4. [How Does the File System Work?](#how-does-the-file-system-work)
5. [How Does Memory Management Work?](#how-does-memory-management-work)
6. [Automatic Context Compaction](#automatic-context-compaction)
7. [Key Affordances and Limitations](#key-affordances-and-limitations)
8. [Complete Workflow Example](#complete-workflow-example)

---

## What is an Agent?

An **agent** in DeepAgentsJS is an AI assistant powered by Claude (or other LLMs) that can:
- Understand natural language instructions
- Make decisions about what actions to take
- Execute those actions using **tools**
- Manage complex, multi-step tasks autonomously
- Delegate work to specialized **subagents**

### The Basic Agent Lifecycle

```
1. User sends a message → Agent receives task
2. Agent thinks and plans → May create a todo list
3. Agent executes actions → Uses tools (file operations, web search, etc.)
4. Agent may spawn subagents → Delegates complex subtasks
5. Agent responds → Returns results to user
```

### Agent Architecture

Each agent has several components:

**1. System Prompt** - Instructions that define the agent's role and capabilities
```
Example: "You are an expert researcher who conducts thorough research
and writes polished reports."
```

**2. Tools** - Functions the agent can call to perform actions
```
Examples:
- write_file: Create a new file
- read_file: Read file contents
- internet_search: Search the web
- task: Spawn a subagent
```

**3. Model** - The underlying LLM (typically Claude Sonnet 4.5)

**4. Middleware Stack** - Layers that add capabilities:
- TodoListMiddleware: Planning and task tracking
- FilesystemMiddleware: File operations
- SubAgentMiddleware: Subagent delegation
- SummarizationMiddleware: Automatic context compression
- PromptCachingMiddleware: Cost optimization

**5. State** - The agent's working memory containing:
- Message history (conversation)
- Todo list (if planning)
- Files (virtual or real filesystem)
- Custom context data

---

## How Does an Agent Invoke Subagents?

### The Subagent Pattern

Subagents are **ephemeral, specialized agents** that handle isolated tasks. Think of them as temporary assistants that:
- Live only for the duration of one specific task
- Have their own isolated context window
- Return a single result when done
- Disappear after completing their task

### Why Use Subagents?

**Context Isolation:** When researching 5 different topics, each subagent only sees content relevant to its topic. This prevents context pollution and reduces token usage.

**Parallelization:** Multiple subagents can run simultaneously. Example: Research 3 competitors at once instead of sequentially.

**Specialization:** Different subagents can have different:
- System prompts (specialized expertise)
- Tools (subset of capabilities)
- Models (use cheaper/faster models for simple tasks)

### How Subagents Are Created

The parent agent has a special tool called `task` that spawns subagents:

```
Parent Agent Decision:
"I need to research Tesla, Ford, and GM. I'll spawn 3 research subagents in parallel."

Action:
- Calls task(subagent_type="research-agent", description="Research Tesla's EV strategy")
- Calls task(subagent_type="research-agent", description="Research Ford's EV strategy")
- Calls task(subagent_type="research-agent", description="Research GM's EV strategy")

Result:
- 3 subagents execute simultaneously
- Each returns a comprehensive report
- Parent agent receives all 3 reports
- Parent synthesizes findings into final answer
```

### Subagent Configuration

When creating a Deep Agent, you can register custom subagents:

```typescript
const agent = createDeepAgent({
  model: "claude-sonnet-4-5-20250929",
  subagents: [
    {
      name: "research-agent",
      description: "Used to research topics in depth",
      systemPrompt: "You are a dedicated researcher...",
      tools: [internetSearch], // Only has search capability
      model: "claude-haiku-4", // Use cheaper model
    },
    {
      name: "critique-agent",
      description: "Used to critique reports",
      systemPrompt: "You are a dedicated editor...",
      // Inherits parent's tools by default
    }
  ]
});
```

### State Propagation to Subagents

When a subagent spawns, it receives:
- **Copied state:** Custom context data from parent
- **New message:** Only the task description (fresh conversation)
- **Excluded data:** Parent's message history, todos, navigation state

After completion, the subagent's **final response** flows back to the parent, but the internal conversation is hidden (context isolation).

### The "General-Purpose" Agent

DeepAgents automatically includes a `general-purpose` subagent with:
- Same tools as parent
- Same model as parent
- Generic capabilities

This is useful for:
- Isolating token-heavy research
- Breaking down complex multi-part tasks
- Preventing context bloat in parent thread

---

## How Does an Agent Use Tools?

### What Are Tools?

Tools are **functions that agents can call** to interact with the world. Each tool has:
- **Name:** Identifier (e.g., `write_file`)
- **Description:** Explains when and how to use it
- **Schema:** Defines required parameters
- **Implementation:** The actual code that executes

### Standard Tool Library

DeepAgents provides built-in tools:

#### Filesystem Tools (Always Available)
- `ls` - List files in a directory
- `read_file` - Read file contents with line numbers
- `write_file` - Create new files (errors if exists)
- `edit_file` - Replace text in existing files
- `glob` - Find files matching patterns (e.g., `**/*.ts`)
- `grep` - Search file contents with regex

#### Planning Tools (Always Available)
- `write_todos` - Create/update task list

#### Delegation Tools (Always Available)
- `task` - Spawn a subagent

#### Custom Tools (User-Defined)
You can add any custom tools:
```typescript
const internetSearch = tool(
  async ({ query, maxResults }) => {
    // Call external API
    return searchResults;
  },
  {
    name: "internet_search",
    description: "Run a web search",
    schema: z.object({
      query: z.string(),
      maxResults: z.number().default(5)
    })
  }
);

const agent = createDeepAgent({
  tools: [internetSearch]
});
```

### Tool Execution Flow

```
1. Agent decides to use a tool
   → "I need to read the report file"

2. Agent calls tool with parameters
   → read_file({ file_path: "/report.md" })

3. Tool executes
   → Filesystem backend retrieves file content
   → Formats with line numbers

4. Result returns to agent
   → "     1	# Research Report
        2	## Executive Summary
        3	Tesla leads in EV technology..."

5. Agent continues reasoning
   → "Based on this report, I can now..."
```

### Tool Result Eviction

**Problem:** Large tool results (huge files, search results) can overflow context.

**Solution:** Automatic eviction when results exceed ~80KB:
1. System detects large result
2. Saves content to `/large_tool_results/{tool_call_id}`
3. Returns summary: "Tool result too large (20,000 tokens). Content saved to /large_tool_results/abc123"
4. Agent can read the file if needed

This keeps the main conversation context lean.

---

## How Does the File System Work?

### The Backend System

DeepAgents uses a **pluggable backend architecture** for file storage. This means the same file operations can work with different storage systems.

### Available Backends

#### 1. StateBackend (Default - Ephemeral)

**How it works:**
- Files stored in agent's memory (LangGraph state)
- Lives only during the conversation
- Automatically checkpointed after each step
- Persists within a thread (if using checkpointers)

**When to use:**
- Testing and development
- Temporary scratch space
- Files don't need to outlive the conversation

**Example:**
```typescript
const agent = createDeepAgent({
  // StateBackend used by default
  // No backend parameter needed
});

// Agent creates /analysis.md → stored in memory
// Agent reads /analysis.md → retrieved from memory
// Conversation ends → file disappears (unless checkpointed)
```

#### 2. FilesystemBackend (Real Files)

**How it works:**
- Files written to actual filesystem
- Persists permanently
- Can read/write any files in allowed directories
- Supports security controls (virtual mode)

**When to use:**
- Production deployments
- Files need to persist
- Sharing artifacts with users
- Reading existing files

**Example:**
```typescript
const agent = createDeepAgent({
  backend: new FilesystemBackend({
    rootDir: "/Users/sam/project/outputs",
    virtualMode: true, // Sandbox to rootDir
    maxFileSizeMb: 10
  })
});

// Agent creates /report.md → saved to /Users/sam/project/outputs/report.md
// Files persist after conversation ends
```

#### 3. StoreBackend (Persistent Memory)

**How it works:**
- Files stored in LangGraph Store (database)
- Persists across conversations
- Can share files between different threads
- Namespace isolation per assistant

**When to use:**
- Long-term memory across conversations
- Multi-user scenarios
- Cloud deployments

#### 4. CompositeBackend (Hybrid)

**How it works:**
- Combines multiple backends
- Route operations based on path patterns
- Example: State for temp files, Filesystem for outputs

**When to use:**
- Complex architectures
- Different persistence needs for different files

### Virtual Mode vs. Real Paths

**Virtual Mode** (Recommended for production):
```
User sees: /report.md
Actual location: /Users/sam/outputs/report.md

Benefits:
- Sandboxed to root directory
- Agent can't escape containment
- Consistent paths regardless of actual filesystem
- Security: Prevents path traversal attacks
```

**Real Path Mode** (Development only):
```
User sees: /Users/sam/outputs/report.md
Actual location: /Users/sam/outputs/report.md

Benefits:
- Direct filesystem access
- Can read system files
- Simpler for development

Risks:
- Agent could potentially access any file
- Path traversal vulnerabilities
```

### File Operations in Practice

**Writing a file:**
```
Agent: "I'll create a research report"
→ write_file(file_path="/research/tesla-analysis.md", content="# Analysis...")
→ Backend creates file
→ Returns: "Successfully wrote to '/research/tesla-analysis.md'"
```

**Reading a file:**
```
Agent: "Let me check what we have"
→ read_file(file_path="/research/tesla-analysis.md")
→ Backend retrieves content
→ Returns formatted with line numbers:
     1	# Tesla Analysis
     2	## Market Position
     3	Tesla commands 65% of the EV market...
```

**Editing a file:**
```
Agent: "I need to update the conclusion"
→ edit_file(
    file_path="/research/tesla-analysis.md",
    old_string="## Conclusion\nTBD",
    new_string="## Conclusion\nTesla maintains market leadership..."
  )
→ Backend performs replacement
→ Returns: "Successfully replaced 1 occurrence(s)"
```

**Searching files:**
```
Agent: "Find all analysis files"
→ glob(pattern="**/analysis*.md")
→ Returns:
  /research/tesla-analysis.md
  /research/ford-analysis.md

Agent: "Search for 'market share' references"
→ grep(pattern="market share", path="/research")
→ Returns:
  /research/tesla-analysis.md:
    3: Tesla commands 65% of the EV market share
  /research/ford-analysis.md:
    7: Ford's market share has grown to 8%
```

---

## How Does Memory Management Work?

### State Management

DeepAgents uses **LangGraph's state system** which is like a structured database that flows through the agent:

```typescript
State = {
  messages: [
    HumanMessage("Write a report on Tesla"),
    AIMessage("I'll research and create a report..."),
    ToolMessage("Search results: ..."),
    AIMessage("Here's my analysis...")
  ],
  todos: [
    { content: "Research Tesla", status: "completed" },
    { content: "Write report", status: "in_progress" }
  ],
  files: {
    "/research.md": {
      content: ["# Research", "Tesla is..."],
      created_at: "2025-11-24T10:00:00Z",
      modified_at: "2025-11-24T10:05:00Z"
    }
  },
  // Custom fields you add
  user_preferences: { ... },
  session_data: { ... }
}
```

### Memory Types

#### 1. Conversation Memory (Short-term)

**What it is:** The message history in the current conversation

**How long it lasts:** Until context limit is reached

**What happens when full:**
- Automatic summarization (see next section)
- Older messages compressed
- Recent messages preserved

**Size:** ~170,000 tokens (~680KB of text) before summarization

#### 2. File Memory (Medium-term)

**What it is:** Files created/modified during conversation

**How long it lasts:**
- StateBackend: Until conversation ends (or checkpointed)
- FilesystemBackend: Forever
- StoreBackend: Until explicitly deleted

**Use cases:**
- Scratch space for research
- Intermediate artifacts
- Final outputs

#### 3. Checkpointed State (Long-term)

**What it is:** Snapshots of entire agent state at each step

**How long it lasts:** As long as checkpointer persists (database, disk, etc.)

**What's saved:**
- Full message history
- Todo lists
- Files (if using StateBackend)
- Custom state

**Use cases:**
- Resume interrupted conversations
- Time travel (view past states)
- Branching conversations

#### 4. Store Memory (Long-term, Cross-conversation)

**What it is:** Persistent key-value storage across conversations

**How long it lasts:** Until explicitly deleted

**Use cases:**
- User preferences across sessions
- Long-term facts/knowledge
- Shared data between agents

**Access pattern:**
```typescript
// Automatically available in tools
const userPrefs = await store.get("user_123", "preferences");
await store.put("user_123", "preferences", { theme: "dark" });
```

---

## Automatic Context Compaction

### The Token Limit Problem

Claude Sonnet 4.5 has a **200,000 token context window** (~800KB of text). Long conversations will eventually hit this limit.

**Without compression:**
```
[Messages 1-500] ← Eventually this runs out of space
Agent can't continue → Error or truncation
```

### SummarizationMiddleware Solution

DeepAgents includes **automatic summarization** that triggers when approaching limits:

**Trigger Point:** 170,000 tokens (~85% of capacity)

**What happens:**
```
1. System detects approaching limit
2. Keeps recent 6 messages (for context continuity)
3. Summarizes everything before that into a concise summary
4. Replaces old messages with summary
5. Agent continues with compressed history
```

**Example:**
```
Before Summarization (170K tokens):
- [1,000 messages about research, analysis, file operations...]
- Message 995: "Let me analyze the competition"
- Message 996: [Tool result: competitive analysis]
- Message 997: "Based on this data..."
- Message 998-1000: [Recent conversation]

After Summarization (40K tokens):
- SUMMARY: "The conversation covered research on Tesla's market
  position, competitive analysis showing 65% market share, technical
  innovations in battery technology, and financial performance analysis."
- Message 995-1000: [6 recent messages preserved verbatim]

Result: 130K tokens freed, agent continues working
```

### Summarization Behavior

**Frequency:** Only when needed (at 85% capacity)

**Retention:** Last 6 messages always preserved

**Model:** Same model as agent (Claude Sonnet 4.5)

**Performance:** Takes ~5-10 seconds, happens automatically

**Transparency:** Agent is aware that summarization occurred

### When Summarization Doesn't Help

If the agent is working with a **single massive document** or **huge tool result**, summarization can't compress it because it's all recent context.

**Solution:** Tool result eviction (see "Tool Result Eviction" section)

### Configuration

You can customize summarization behavior:

```typescript
const agent = createDeepAgent({
  // Summarization middleware is included by default with these settings:
  // maxTokensBeforeSummary: 170000
  // messagesToKeep: 6
});
```

---

## Key Affordances and Limitations

### What DeepAgents Does Well

✅ **Complex Multi-Step Tasks**
- Autonomous planning and execution
- Handles tasks requiring 10-100+ steps
- Example: "Research 5 competitors, analyze data, write comparative report"

✅ **Context Isolation**
- Subagents prevent context pollution
- Each subtask gets clean slate
- Parallel execution for independent work

✅ **File-Based Workflows**
- Natural scratch space for agents
- Persistent artifacts
- Structured data across steps

✅ **Flexible Memory Options**
- In-memory for testing
- Filesystem for production
- Database for cloud deployments

✅ **Automatic Resource Management**
- Context summarization
- Large result eviction
- Token optimization

✅ **State Persistence**
- Checkpoint entire conversations
- Resume from any point
- Branching conversations

### Current Limitations

⚠️ **No Built-in Web Tools**
- No WebFetch or WebSearch out of the box
- Must integrate external APIs (Tavily, etc.)
- Workaround: Add custom tools

⚠️ **Single-Model Focus**
- Designed primarily for Claude
- Other models work but less tested
- No specialized multi-model routing

⚠️ **Limited Schema Enforcement**
- No built-in artifact validation
- Must add custom middleware for structure checks
- Example: Validating YAML frontmatter in documents

⚠️ **No Execution Limits**
- No max tool calls enforcement
- No subagent spawn limits
- No recursion depth checks
- Workaround: Need custom middleware

⚠️ **Output Routing**
- Subagent outputs visible in logs by default
- No filtering of intermediate agent chatter
- User sees all agent reasoning

⚠️ **Newer System**
- Less battle-tested than alternatives
- Smaller community
- Fewer examples and patterns

### Comparison to Claude Agent SDK

**DeepAgents Advantages:**
- More flexible backend system
- Better context isolation with subagents
- Open source (community extensibility)
- More control over middleware stack

**Claude SDK Advantages:**
- Built-in web tools (WebFetch, WebSearch)
- Production-proven stability
- Better documentation
- Official Anthropic support
- More examples and patterns

---

## Complete Workflow Example

Let's trace a complete research workflow through the system:

### Scenario: "Write a competitive analysis of Tesla, Ford, and GM's EV strategies"

#### Step 1: User Input
```
User: "Write a competitive analysis of Tesla, Ford, and GM's EV strategies"
```

#### Step 2: Agent Planning
```
Agent receives message → TodoListMiddleware activates

Agent thinks: "This requires research on 3 companies, then synthesis"

Agent calls: write_todos([
  { content: "Research Tesla's EV strategy", status: "pending" },
  { content: "Research Ford's EV strategy", status: "pending" },
  { content: "Research GM's EV strategy", status: "pending" },
  { content: "Synthesize findings into report", status: "pending" }
])

State updated:
  todos: [4 tasks, all pending]
```

#### Step 3: Parallel Subagent Research
```
Agent marks todo #1-3 "in_progress"

Agent calls task tool 3 times in parallel:

  Subagent 1: task(
    subagent_type="research-agent",
    description="Research Tesla's EV strategy, including market
                 position, technology, and future plans"
  )

  Subagent 2: task(
    subagent_type="research-agent",
    description="Research Ford's EV strategy..."
  )

  Subagent 3: task(
    subagent_type="research-agent",
    description="Research GM's EV strategy..."
  )

Each subagent independently:
  1. Receives its task description (isolated context)
  2. Uses internet_search tool multiple times
  3. Reads search results
  4. Synthesizes findings
  5. Returns final summary to parent

Time: ~30-45 seconds (parallel execution)
```

#### Step 4: Parent Receives Subagent Results
```
Parent agent receives 3 tool results:

ToolMessage(content="Tesla Research: Commands 65% of EV market,
  leading in battery tech with 4680 cells, expanding production
  with Gigafactories in Texas and Berlin...", tool_call_id="task1")

ToolMessage(content="Ford Research: 8% market share, investing
  $50B in EV transformation, F-150 Lightning is best-selling
  electric truck...", tool_call_id="task2")

ToolMessage(content="GM Research: 10% market share, targeting
  all-electric lineup by 2035, Ultium platform provides
  flexibility across brands...", tool_call_id="task3")

Agent marks todos #1-3 "completed"
Agent marks todo #4 "in_progress"
```

#### Step 5: Creating the Report
```
Agent calls: write_file(
  file_path="/competitive-analysis.md",
  content="# EV Strategy Competitive Analysis

  ## Executive Summary
  The electric vehicle market is rapidly evolving...

  ## Tesla: Market Leader
  Tesla commands 65% market share...
  [Full detailed analysis]

  ## Ford: Traditional Automaker Transformation
  Ford is investing $50B...
  [Full detailed analysis]

  ## General Motors: Betting on Ultium
  GM targets all-electric by 2035...
  [Full detailed analysis]

  ## Comparative Analysis
  | Metric | Tesla | Ford | GM |
  |--------|-------|------|-----|
  | Market Share | 65% | 8% | 10% |
  [Comparison table]

  ## Conclusion
  Tesla maintains technical and market leadership..."
)

FilesystemBackend:
  1. Resolves path: /outputs/competitive-analysis.md
  2. Creates directory structure
  3. Writes file to disk
  4. Returns success

State updated:
  files: {
    "/competitive-analysis.md": { content: [...], timestamps }
  }

Agent marks todo #4 "completed"
```

#### Step 6: Quality Check (Optional)
```
Agent thinks: "Let me review this for quality"

Agent calls: task(
  subagent_type="critique-agent",
  description="Review /competitive-analysis.md for
               comprehensiveness, clarity, and accuracy"
)

Critique agent:
  1. Reads /competitive-analysis.md (uses read_file)
  2. Analyzes structure, content, sources
  3. Returns: "Report is comprehensive with good data.
     Suggestion: Add section on regulatory challenges each
     company faces."

Parent agent considers feedback:
  "This is a good addition, let me update the report"

Agent calls: edit_file(
  file_path="/competitive-analysis.md",
  old_string="## Conclusion",
  new_string="## Regulatory Landscape
  [New section about regulations]

  ## Conclusion"
)
```

#### Step 7: Final Response
```
Agent sends final message:

"I've completed a comprehensive competitive analysis of Tesla,
Ford, and GM's EV strategies. The report covers:

- Market positioning and share
- Technology approaches
- Investment strategies
- Future roadmaps
- Comparative analysis across key metrics

The full analysis has been saved to /competitive-analysis.md.

Key finding: Tesla maintains substantial market leadership (65%)
with technical advantages in battery technology, while Ford and GM
are making significant investments ($50B and all-electric by 2035
respectively) to transform their traditional automotive businesses."

All todos marked completed.
```

### What Happened Behind the Scenes?

**Context Management:**
- Parent thread: ~15 messages total
- Each subagent: 5-10 messages in isolated contexts (then discarded)
- Total tokens used: ~50,000 (well under 170K limit)

**File Operations:**
- 1 write: Created report
- 1 read: Critique agent reviewed report
- 1 edit: Updated with regulatory section
- Backend: All saved to actual filesystem

**Tool Calls:**
- 3x task (spawn subagents)
- 9x internet_search (3 per subagent)
- 1x write_file
- 1x read_file (by critique agent)
- 1x edit_file
- 2x write_todos (initial + updates)

**Parallelization:**
- Research phase: 3 subagents running simultaneously
- Time saved: ~60 seconds (vs. sequential execution)

**Memory Footprint:**
- State size: ~100KB
- Checkpointed: Can resume if interrupted
- Files: 1 artifact (25KB) persisted to disk

---

## Conclusion

DeepAgentsJS provides a powerful framework for building autonomous AI agents with:

- **Hierarchical task delegation** via subagents
- **Flexible tool system** for custom capabilities
- **Pluggable storage** for different deployment scenarios
- **Automatic resource management** for long-running tasks

As a product manager, your key decisions involve:

1. **Backend choice:** Memory vs. Filesystem vs. Database storage
2. **Subagent strategy:** How to decompose complex workflows
3. **Tool selection:** What capabilities your agents need
4. **Memory limits:** When to checkpoint, when to summarize

The system is production-ready for most use cases, with the main gaps being:
- Need custom web tools (not included)
- Need custom validation middleware for structured outputs
- Need custom execution limits for safety

Understanding these functional aspects helps you make informed decisions about architecture, feature scoping, and user experience design for agent-powered applications.