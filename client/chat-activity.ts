import { useCallback, useSyncExternalStore } from "react";

/**
 * The tool call each agent is working on, as far as its timeline shows.
 *
 * Clean chat hides tool calls but keeps the newest one on screen while the
 * agent runs, so the reader can tell what it is doing. A prompt or reply that
 * arrives after that call means the turn moved on, and the call hides again.
 * Reasoning is not recorded: thinking between two calls keeps the last call up.
 *
 * Moments are the items' own timestamps, so a row scrolling back into view
 * does not take over from a newer one.
 */
interface Activity {
  tool: { key: string; at: number } | null;
  messageAt: number;
}

const activity = new Map<string, Activity>();
const listeners = new Set<() => void>();

function publish(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function current(agentId: string): Activity {
  return activity.get(agentId) ?? { tool: null, messageAt: 0 };
}

export function noteToolActivity(agentId: string, key: string, at: number): void {
  const state = current(agentId);
  if (state.tool && (state.tool.at > at || state.tool.key === key)) return;
  activity.set(agentId, { ...state, tool: { key, at } });
  publish();
}

export function noteMessageActivity(agentId: string, at: number): void {
  const state = current(agentId);
  if (at <= state.messageAt) return;
  activity.set(agentId, { ...state, messageAt: at });
  publish();
}

/** True while this call is the agent's newest and nothing was said after it. */
export function useIsCurrentTool(agentId: string, key: string): boolean {
  const getSnapshot = useCallback(() => {
    const tool = activity.get(agentId)?.tool;
    return tool?.key === key && tool.at >= current(agentId).messageAt;
  }, [agentId, key]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
