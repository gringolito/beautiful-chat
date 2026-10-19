import { useEffect } from "react";
import { useAgent } from "@getpaseo/plugin/client";
import type { PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import type { ToolCalloutData } from "../shared/contracts";
import {
  getEnhancerPreferences,
  subscribeEnhancerPreferences,
  updateEnhancerPreferences,
  useEnhancerPreferences,
} from "./preferences";

/** Paseo's own agent tools that carry a prompt from one agent to another. */
const MESSAGING_PASEO_TOOLS: Record<string, true> = {
  create_agent: true,
  send_agent_prompt: true,
};

/**
 * Whether a tool call is part of the conversation rather than the work: a
 * question put to the user, a delegation, or a message sent or received over
 * the hub. Clean chat keeps these on screen.
 */
export function isConversationTool(name: string, data: ToolCalloutData): boolean {
  if (data.tool === "ask" || data.tool === "task") return true;
  if (MESSAGING_PASEO_TOOLS[name.toLowerCase()]) return true;
  const hub = data.hub;
  if (hub?.kind === "send") return true;
  if (hub?.kind === "waited") return hub.data.message !== null;
  if (hub?.kind === "inbox") return hub.data.messages.length > 0;
  return false;
}

function pillButton(cleanChat: boolean) {
  return cleanChat
    ? {
        title: "Showing prompts, replies and agent messages. Press to show every tool call.",
        icon: "EyeOff",
        label: "Clean chat",
      }
    : {
        title: "Showing every tool call and reasoning step. Press to hide them.",
        icon: "Eye",
        label: "Full chat",
      };
}

interface Pill {
  workspaceId: string;
  registration: PluginButtonRegistration;
}

let addPill: ((agentId: string, workspaceId: string) => PluginButtonRegistration) | null = null;
const pills = new Map<string, Pill>();

/**
 * Lets renderers put the clean chat toggle on their agent's composer.
 *
 * A pill is registered per agent and workspace. The plugin has no agent
 * directory of its own, so an agent gets its pill the first time one of its
 * rows renders; every chat this plugin draws has at least the prompt row.
 */
export function installCleanChatPills(client: PluginClientContext): () => void {
  addPill = (agentId, workspaceId) =>
    client.addComposerPill({
      id: "clean-chat",
      workspaceId,
      agentId,
      button: {
        ...pillButton(getEnhancerPreferences().cleanChat),
        behavior: {
          kind: "action",
          onPress() {
            updateEnhancerPreferences({ cleanChat: !getEnhancerPreferences().cleanChat });
          },
        },
      },
    });

  let shown = getEnhancerPreferences().cleanChat;
  const unsubscribe = subscribeEnhancerPreferences(() => {
    const next = getEnhancerPreferences().cleanChat;
    if (next === shown) return;
    shown = next;
    for (const pill of pills.values()) pill.registration.update(pillButton(next));
  });

  return () => {
    unsubscribe();
    for (const pill of pills.values()) pill.registration.remove();
    pills.clear();
    addPill = null;
  };
}

function ensurePill(agentId: string, workspaceId: string): void {
  const existing = pills.get(agentId);
  if (existing?.workspaceId === workspaceId || !addPill) return;
  existing?.registration.remove();
  pills.set(agentId, { workspaceId, registration: addPill(agentId, workspaceId) });
}

/** Whether clean chat is on, and the toggle placed on this agent's composer. */
export function useCleanChat(agentId: string): boolean {
  const workspaceId = useAgent(agentId, (agent) => agent.workspaceId);
  useEffect(() => {
    if (workspaceId) ensurePill(agentId, workspaceId);
  }, [agentId, workspaceId]);
  return useEnhancerPreferences().cleanChat;
}
