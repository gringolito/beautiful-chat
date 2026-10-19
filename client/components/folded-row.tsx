import React from "react";
import { View, type ViewProps } from "react-native";
import { getEnhancerPreferences, subscribeEnhancerPreferences } from "../preferences";
import { findColorClasses } from "./host-notice";

const STYLE_ELEMENT_ID = "beautiful-chat-clean-chat";

/**
 * The host wraps every row in a view whose bottom margin is the gap to the
 * next row. A hidden row still gets that wrapper, so without this each one
 * would leave a blank band behind. A row's root is the wrapper's only child,
 * which is what `:has(> …)` matches; `:empty` lets a hidden row that still
 * shows the running-jobs card keep its gap.
 */
const FOLD_RULE = `*:has(> [data-bcfold]:empty) { margin-bottom: 0 !important; }`;

const folded = { dataSet: { bcfold: true } } as unknown as ViewProps;

/** What a row clean chat hides draws in its place. */
export function FoldedRow({ children }: { children?: React.ReactNode }) {
  return <View {...folded}>{children}</View>;
}

/**
 * Clean chat on the rows the plugin cannot replace. The host draws
 * `notification` items itself, such as a finished background job or an MCP
 * mount. They are hidden by the class carrying the info tint, the same class
 * `host-notice.ts` restyles. Warnings and errors stay.
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
    const rules = [FOLD_RULE];
    if (getEnhancerPreferences().cleanChat) {
      infoClass ??= findColorClasses().get("info");
      if (infoClass) {
        rules.push(
          `${infoClass} { display: none !important; }`,
          `*:has(> ${infoClass}) { margin-bottom: 0 !important; }`,
        );
      }
    }
    const text = rules.join("\n");
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
