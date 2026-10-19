import { useSyncExternalStore } from "react";

const APP_SETTINGS_KEY = "@paseo:app-settings";
export const DEFAULT_HOST_CODE_FONT_SIZE = 12;

/**
 * Paseo's Code size, from Settings → Appearance → Fonts.
 *
 * The plugin SDK passes no font settings, and Paseo's Unistyles theme only
 * publishes string values as CSS variables, so the size is read from the
 * settings Paseo persists in localStorage. Paseo rewrites its theme stylesheet
 * in `<head>` on every appearance change, after the new settings are stored,
 * which makes that rewrite the change signal. iOS and Android have neither
 * localStorage nor a stylesheet, so they keep the default.
 */
function readCodeFontSize(): number {
  try {
    const stored = globalThis.localStorage?.getItem(APP_SETTINGS_KEY);
    if (!stored) return DEFAULT_HOST_CODE_FONT_SIZE;
    const settings: unknown = JSON.parse(stored);
    const size =
      settings && typeof settings === "object" && "codeFontSize" in settings
        ? settings.codeFontSize
        : undefined;
    return typeof size === "number" && size > 0 ? size : DEFAULT_HOST_CODE_FONT_SIZE;
  } catch {
    return DEFAULT_HOST_CODE_FONT_SIZE;
  }
}

let codeFontSize = readCodeFontSize();
const listeners = new Set<() => void>();
let stopWatching: (() => void) | undefined;

function refresh(): void {
  const next = readCodeFontSize();
  if (next === codeFontSize) return;
  codeFontSize = next;
  for (const listener of listeners) listener();
}

function watchHost(): () => void {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }
  const observer = new MutationObserver(refresh);
  observer.observe(document.head, { childList: true, characterData: true, subtree: true });
  // Another Paseo window changing the setting.
  globalThis.addEventListener?.("storage", refresh);
  return () => {
    observer.disconnect();
    globalThis.removeEventListener?.("storage", refresh);
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!stopWatching) {
    stopWatching = watchHost();
    refresh();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    stopWatching?.();
    stopWatching = undefined;
  };
}

export function useHostCodeFontSize(): number {
  return useSyncExternalStore(
    subscribe,
    () => codeFontSize,
    () => codeFontSize,
  );
}
