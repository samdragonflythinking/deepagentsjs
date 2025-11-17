/**
 * Limits Middleware for DeepAgents
 *
 * Tracks and enforces execution limits to prevent runaway agent behavior:
 * - maxToolCalls: Maximum number of tool invocations
 * - maxSubagentSpawns: Maximum number of subagents that can be spawned
 * - maxRecursionDepth: Maximum depth of nested subagent calls
 *
 * When limits are exceeded, throws descriptive errors to halt execution.
 */

import { Command, type StateGraph } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { ReactAgentState } from 'langchain/agents';

export interface LimitsConfig {
  /**
   * Maximum number of tool calls allowed in this execution
   * @default 50
   */
  maxToolCalls?: number;

  /**
   * Maximum number of subagents that can be spawned
   * @default 10
   */
  maxSubagentSpawns?: number;

  /**
   * Maximum recursion depth for nested subagent calls
   * @default 5
   */
  maxRecursionDepth?: number;

  /**
   * Whether to log limit tracking (useful for debugging)
   * @default false
   */
  verbose?: boolean;
}

interface LimitsState {
  toolCallCount: number;
  subagentSpawnCount: number;
  recursionDepth: number;
}

const DEFAULT_CONFIG: Required<Omit<LimitsConfig, 'verbose'>> = {
  maxToolCalls: 50,
  maxSubagentSpawns: 10,
  maxRecursionDepth: 5,
};

/**
 * Creates limits middleware that tracks and enforces execution limits
 */
export function createLimitsMiddleware(config: LimitsConfig = {}) {
  const limits = { ...DEFAULT_CONFIG, ...config };
  const verbose = config.verbose ?? false;

  // Track limits in closure (per-agent instance)
  const state: LimitsState = {
    toolCallCount: 0,
    subagentSpawnCount: 0,
    recursionDepth: 0,
  };

  return async (
    graph: StateGraph<any, any>,
    agentState: ReactAgentState
  ): Promise<Command | void> => {
    const messages = agentState.messages || [];

    // Count tool calls and task invocations from messages
    let toolCalls = 0;
    let taskCalls = 0;

    for (const message of messages) {
      // Check for AIMessage with tool_calls
      if (message._getType() === 'ai' && (message as any).tool_calls) {
        const aiToolCalls = (message as any).tool_calls || [];
        toolCalls += aiToolCalls.length;

        // Count task tool specifically for subagent spawns
        for (const toolCall of aiToolCalls) {
          if (toolCall.name === 'task') {
            taskCalls++;
          }
        }
      }

      // Check for ToolMessage (indicates tool execution)
      if (message._getType() === 'tool') {
        // This is a completed tool call
        // (Already counted above in tool_calls)
      }
    }

    // Update state
    state.toolCallCount = toolCalls;
    state.subagentSpawnCount = taskCalls;

    // Get recursion depth from state if available
    // (This would be passed down from parent agents in subagent invocations)
    if ((agentState as any).recursionDepth !== undefined) {
      state.recursionDepth = (agentState as any).recursionDepth;
    }

    if (verbose) {
      console.log('[LimitsMiddleware] Current state:', {
        toolCalls: state.toolCallCount,
        maxToolCalls: limits.maxToolCalls,
        subagentSpawns: state.subagentSpawnCount,
        maxSubagentSpawns: limits.maxSubagentSpawns,
        recursionDepth: state.recursionDepth,
        maxRecursionDepth: limits.maxRecursionDepth,
      });
    }

    // Check limits and throw if exceeded
    if (state.toolCallCount > limits.maxToolCalls) {
      const error = new Error(
        `[LimitsMiddleware] Maximum tool calls exceeded: ${state.toolCallCount}/${limits.maxToolCalls}\n` +
        `This agent has made too many tool invocations. This usually indicates:\n` +
        `- The agent is stuck in a loop\n` +
        `- The task is too complex for current limits\n` +
        `- The agent needs better guidance\n\n` +
        `Consider: Increase maxToolCalls or simplify the task.`
      );
      error.name = 'LimitExceededError';
      throw error;
    }

    if (state.subagentSpawnCount > limits.maxSubagentSpawns) {
      const error = new Error(
        `[LimitsMiddleware] Maximum subagent spawns exceeded: ${state.subagentSpawnCount}/${limits.maxSubagentSpawns}\n` +
        `This agent has spawned too many subagents. This usually indicates:\n` +
        `- The orchestration strategy needs refinement\n` +
        `- Tasks should be batched or consolidated\n` +
        `- The workflow is too deeply nested\n\n` +
        `Consider: Increase maxSubagentSpawns or redesign the workflow.`
      );
      error.name = 'LimitExceededError';
      throw error;
    }

    if (state.recursionDepth > limits.maxRecursionDepth) {
      const error = new Error(
        `[LimitsMiddleware] Maximum recursion depth exceeded: ${state.recursionDepth}/${limits.maxRecursionDepth}\n` +
        `Subagents are nested too deeply. This usually indicates:\n` +
        `- Circular subagent delegation\n` +
        `- Missing base case in orchestration logic\n` +
        `- Task decomposition is too granular\n\n` +
        `Consider: Increase maxRecursionDepth or flatten the agent hierarchy.`
      );
      error.name = 'LimitExceededError';
      throw error;
    }

    // No limits exceeded - continue execution
    return undefined;
  };
}

/**
 * Helper to increment recursion depth when spawning subagents
 *
 * Use this in your subagent configuration to track nesting level:
 *
 * @example
 * ```typescript
 * const subagent = createDeepAgent({
 *   ...config,
 *   state: {
 *     ...parentState,
 *     recursionDepth: incrementRecursionDepth(parentState),
 *   },
 * });
 * ```
 */
export function incrementRecursionDepth(parentState: any): number {
  const currentDepth = parentState.recursionDepth ?? 0;
  return currentDepth + 1;
}

/**
 * Helper to get current limits state for logging/debugging
 */
export function getLimitsState(messages: BaseMessage[]): {
  toolCalls: number;
  taskCalls: number;
} {
  let toolCalls = 0;
  let taskCalls = 0;

  for (const message of messages) {
    if (message._getType() === 'ai' && (message as any).tool_calls) {
      const aiToolCalls = (message as any).tool_calls || [];
      toolCalls += aiToolCalls.length;

      for (const toolCall of aiToolCalls) {
        if (toolCall.name === 'task') {
          taskCalls++;
        }
      }
    }
  }

  return { toolCalls, taskCalls };
}
