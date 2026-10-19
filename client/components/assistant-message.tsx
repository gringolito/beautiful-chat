import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { copyText } from "@getpaseo/plugin/client/react-native";
import { Glyph } from "./glyph";
import { Pop } from "./motion";
import { radius } from "./theme-tokens";
import type { ExtendedThemeTokens } from "./theme-tokens";
import { formatClock } from "./user-message";
import { unselectable } from "./selection";

interface AssistantMessageProps {
  /** The reply, copied verbatim. */
  text: string;
  at: Date;
  tokens: ExtendedThemeTokens;
  children: React.ReactNode;
}

/**
 * One agent reply in its own card, so consecutive replies read as separate
 * messages. It mirrors the prompt bubble: a labelled header with the time and
 * a copy button, and a square corner on the owner's side, here the left.
 */
export function AssistantMessage({ text, at, tokens, children }: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    copyText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }, [text]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingTop: 8,
          paddingBottom: 10,
          paddingHorizontal: 14,
          gap: 4,
          borderRadius: radius.card,
          borderTopLeftRadius: radius.chip,
          backgroundColor: tokens.surface1,
          borderWidth: 1,
          borderColor: tokens.border,
          ...tokens.boxShadow,
        },
        metaRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        label: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: tokens.foregroundMuted,
          ...unselectable,
        },
        clock: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          color: tokens.foregroundMuted,
          ...unselectable,
        },
        copyButton: {
          paddingHorizontal: 4,
          paddingVertical: 2,
        },
      }),
    [tokens],
  );

  return (
    <View style={styles.container}>
      <View style={styles.metaRow}>
        <Text style={styles.label}>Agent</Text>
        <Text style={styles.clock}>{formatClock(at)}</Text>
        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel={copied ? "Reply copied" : "Copy reply"}
          style={styles.copyButton}
        >
          <Pop trigger={copied}>
            <Glyph
              name={copied ? "Check" : "Copy"}
              size={11}
              color={copied ? tokens.success : tokens.foregroundMuted}
            />
          </Pop>
        </Pressable>
      </View>
      {children}
    </View>
  );
}
