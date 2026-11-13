// The app's whole visual vocabulary. Screens compose these and define almost no styles of
// their own, so spacing, type and touch targets stay consistent without anyone policing it.
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ReactNode } from "react";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { HIT, radius, space, type, useTheme, type Palette } from "@/lib/theme";

/* --------------------------------------------------------------- text --- */

type TextTone = "ink" | "soft" | "faint" | "accent" | "danger" | "warn" | "onAccent";

const toneColor = (t: Palette, tone: TextTone) =>
  tone === "soft" ? t.inkSoft
  : tone === "faint" ? t.inkFaint
  : tone === "accent" ? t.accent
  : tone === "danger" ? t.danger
  : tone === "warn" ? t.warn
  : tone === "onAccent" ? t.accentInk
  : t.ink;

export function T({
  children,
  variant = "body",
  tone = "ink",
  style,
  numberOfLines,
  center,
}: {
  children: ReactNode;
  variant?: keyof typeof type;
  tone?: TextTone;
  style?: object;
  numberOfLines?: number;
  center?: boolean;
}) {
  const t = useTheme();
  const v = type[variant];
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontSize: v.fontSize, lineHeight: v.lineHeight, fontWeight: v.fontWeight as never, color: toneColor(t, tone) },
        "letterSpacing" in v ? { letterSpacing: (v as { letterSpacing: number }).letterSpacing } : null,
        center ? { textAlign: "center" as const } : null,
        style,
      ]}
    >
      {variant === "eyebrow" && typeof children === "string" ? children.toUpperCase() : children}
    </Text>
  );
}

/* ------------------------------------------------------------- screens --- */

export function Screen({
  children,
  scroll = true,
  edges = ["top"],
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  refreshControl?: React.ReactElement;
}) {
  const t = useTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl, gap: space.lg }}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: space.lg, gap: space.lg }}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.bg }}>
      {body}
    </SafeAreaView>
  );
}

export function Section({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      {title ? <T variant="eyebrow" tone="faint">{title}</T> : null}
      {children}
      {hint ? <T variant="caption" tone="faint">{hint}</T> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const t = useTheme();
  return (
    <View
      style={[
        { backgroundColor: t.card, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: t.line, overflow: "hidden" },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A tappable line in a card. `last` drops the divider. */
export function Row({
  children,
  onPress,
  last,
  align = "center",
}: {
  children: ReactNode;
  onPress?: () => void;
  last?: boolean;
  align?: "center" | "flex-start";
}) {
  const t = useTheme();
  const inner = (
    <View
      style={{
        flexDirection: "row",
        alignItems: align,
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        minHeight: HIT + space.md,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: t.line,
      }}
    >
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? t.sunken : "transparent" })}>
      {inner}
    </Pressable>
  );
}

/* ------------------------------------------------------------- buttons --- */

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  full = true,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
}) {
  const t = useTheme();
  const off = disabled || loading;

  const bg =
    variant === "primary" ? t.accent
    : variant === "danger" ? t.dangerWash
    : variant === "secondary" ? t.card
    : "transparent";
  const fg =
    variant === "primary" ? t.accentInk
    : variant === "danger" ? t.danger
    : t.ink;
  const border = variant === "secondary" ? t.lineStrong : variant === "danger" ? t.danger : "transparent";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(loading) }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => ({
        backgroundColor: bg,
        opacity: off ? 0.5 : pressed ? 0.85 : 1,
        borderWidth: variant === "secondary" || variant === "danger" ? 1 : 0,
        borderColor: border,
        borderRadius: radius.md,
        minHeight: HIT + 4,
        paddingHorizontal: space.xl,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: full ? "stretch" : "flex-start",
        flexDirection: "row",
        gap: space.sm,
      })}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 16, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------- inputs --- */

export function Field({
  label,
  value,
  onChangeText,
  error,
  hint,
  placeholder,
  multiline,
  autoCapitalize = "none",
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
  keyboardType?: "default" | "url" | "number-pad";
  maxLength?: number;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <T variant="label" tone="soft">{label}</T>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.inkFaint}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize !== "none"}
        keyboardType={keyboardType}
        maxLength={maxLength}
        accessibilityLabel={label}
        style={{
          backgroundColor: t.card,
          color: t.ink,
          borderWidth: 1,
          borderColor: error ? t.danger : t.line,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
          paddingVertical: space.md,
          minHeight: multiline ? 100 : HIT + 4,
          textAlignVertical: multiline ? "top" : "center",
          fontSize: 16,
        }}
      />
      {error ? <T variant="caption" tone="danger">{error}</T> : hint ? <T variant="caption" tone="faint">{hint}</T> : null}
    </View>
  );
}

/** A labelled switch, as a card row. Tapping anywhere on the row toggles it. */
export function Toggle({
  label,
  description,
  value,
  onValueChange,
  disabled,
  last,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      accessibilityLabel={label}
      onPress={disabled ? undefined : () => onValueChange(!value)}
      style={({ pressed }) => ({ backgroundColor: pressed && !disabled ? t.sunken : "transparent", opacity: disabled ? 0.45 : 1 })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          minHeight: HIT + space.md,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: t.line,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body">{label}</T>
          {description ? <T variant="caption" tone="faint">{description}</T> : null}
        </View>
        {/* Drawn rather than <Switch>, so it reads the same on both platforms and in both themes. */}
        <View
          style={{
            width: 48,
            height: 29,
            borderRadius: radius.pill,
            padding: 2,
            backgroundColor: value ? t.accent : t.lineStrong,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 25,
              height: 25,
              borderRadius: radius.pill,
              backgroundColor: "#FFFFFF",
              transform: [{ translateX: value ? 19 : 0 }],
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

/* --------------------------------------------------------------- bits --- */

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "ok" | "warn" | "danger" | "accent" }) {
  const t = useTheme();
  const map = {
    neutral: [t.sunken, t.inkSoft],
    ok: [t.okWash, t.ok],
    warn: [t.warnWash, t.warn],
    danger: [t.dangerWash, t.danger],
    accent: [t.accentWash, t.accent],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.sm, alignSelf: "flex-start" }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: "700", letterSpacing: 0.4 }}>{label.toUpperCase()}</Text>
    </View>
  );
}

/** Initials on a tinted disc. The nūn is the Collective's mark, not a person's. */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const t = useTheme();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: t.accentWash,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: t.accent, fontSize: size * 0.38, fontWeight: "700" }}>{initials || "·"}</Text>
    </View>
  );
}

/**
 * Pick one of a handful of options. A wrapping row of chips rather than a native picker: the
 * lists here are short and fixed, and seeing all of them at once beats opening a wheel.
 */
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  error?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <T variant="label" tone="soft">{label}</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.id)}
              style={({ pressed }) => ({
                minHeight: HIT,
                justifyContent: "center",
                paddingHorizontal: space.lg,
                borderRadius: radius.pill,
                backgroundColor: on ? t.accent : pressed ? t.sunken : t.card,
                borderWidth: 1,
                borderColor: on ? t.accent : t.line,
              })}
            >
              <Text style={{ color: on ? t.accentInk : t.ink, fontSize: 15, fontWeight: on ? "600" : "400" }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <T variant="caption" tone="danger">{error}</T> : null}
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <Card>
      <View style={{ padding: space.xl, gap: space.sm, alignItems: "center" }}>
        <T variant="heading" center>{title}</T>
        {body ? <T variant="callout" tone="soft" center>{body}</T> : null}
        {action ? <View style={{ paddingTop: space.sm, alignSelf: "stretch" }}>{action}</View> : null}
      </View>
    </Card>
  );
}

export function Loading({ label }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={{ padding: space.xxl, alignItems: "center", gap: space.md }}>
      <ActivityIndicator color={t.accent} />
      {label ? <T variant="caption" tone="faint">{label}</T> : null}
    </View>
  );
}

export function Problem({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.dangerWash, borderRadius: radius.md, padding: space.lg, gap: space.md }}>
      <T variant="callout" tone="danger">{message}</T>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} full={false} /> : null}
    </View>
  );
}
