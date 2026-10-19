import { getEnhancerPreferences, subscribeEnhancerPreferences } from "../preferences";
import { findColorClasses } from "./host-notice";

const STYLE_ELEMENT_ID = "beautiful-chat-clean-chat";

/**
 * Clean chat on the rows the plugin cannot replace. The host draws
 * `notification` items itself, such as a finished background job or an MCP
 * mount, and rejects a transformer for them. They are hidden by the class
 * carrying the info tint, the same class `host-notice.ts` restyles. Warnings
 * and errors stay.
 *
 * The host writes a style's class the first time something uses it, so until
 * a notice has been drawn there is no class to match. The lookup repeats until
 * one appears. Off web there is no stylesheet and this is a no-op.
 */
export function installCleanChatStyle(): () => void {
  if (typeof document === "undefined") return () => {};
  if (document.getElementById(STYLE_ELEMENT_ID)) return () => {};

  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  document.head.appendChild(style);

  let infoClass: string | undefined;
  const render = () => {
    let text = "";
    if (getEnhancerPreferences().cleanChat) {
      infoClass ??= findColorClasses().get("info");
      if (infoClass) text = `${infoClass} { display: none !important; }`;
    }
    if (style.textContent !== text) style.textContent = text;
  };

  render();
  const unsubscribe = subscribeEnhancerPreferences(render);
  const poll = setInterval(() => {
    if (!infoClass && getEnhancerPreferences().cleanChat) render();
  }, 2000);

  return () => {
    clearInterval(poll);
    unsubscribe();
    style.remove();
  };
}
