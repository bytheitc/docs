// Everything recorded about what you have contributed, synced or self-logged.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, RefreshControl, View } from "react-native";

import { Badge, Button, Card, Empty, Loading, Problem, Row, Screen, T } from "@/components/ui";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { houseName, kindLabel, providerName } from "@/lib/houses";
import { HIT, radius, space, useTheme } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import type { Contribution, Dashboard } from "@/lib/types";

type Filter = "all" | "pending" | "self";

export default function Work() {
  const { token } = useAuth();
  const router = useRouter();
  const t = useTheme();
  const [filter, setFilter] = useState<Filter>("all");

  const dash = useAsync<Dashboard>((signal) => api.getDashboard(token!, signal), [token]);

  if (dash.loading) return <Screen><Loading /></Screen>;

  const all = [...(dash.data?.contributions ?? [])].sort(
    (a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt),
  );
  const shown =
    filter === "pending" ? all.filter((c) => c.review?.status === "pending")
    : filter === "self" ? all.filter((c) => c.provider === "self")
    : all;

  const tabs: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: "All", n: all.length },
    { id: "pending", label: "Pending", n: all.filter((c) => c.review?.status === "pending").length },
    // "Logged by you" is the accurate phrase but it truncates in a third of a phone's width.
    { id: "self", label: "Yours", n: all.filter((c) => c.provider === "self").length },
  ];

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={dash.refreshing} onRefresh={dash.refresh} tintColor={t.accent} />}
    >
      {dash.error ? <Problem message={dash.error} onRetry={dash.reload} /> : null}

      <View style={{ flexDirection: "row", gap: space.sm }}>
        {tabs.map((tab) => {
          const on = filter === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(tab.id)}
              style={{
                flex: 1,
                minHeight: HIT,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: radius.md,
                backgroundColor: on ? t.accentWash : "transparent",
                borderWidth: 1,
                borderColor: on ? "transparent" : t.line,
                paddingHorizontal: space.sm,
              }}
            >
              <T variant="label" tone={on ? "accent" : "soft"} numberOfLines={1}>
                {tab.label}
              </T>
              <T variant="caption" tone="faint">{tab.n}</T>
            </Pressable>
          );
        })}
      </View>

      <Button label="Log work" onPress={() => router.push("/log-work")} variant="secondary" />

      {shown.length === 0 ? (
        <Empty
          title={filter === "all" ? "Nothing recorded yet" : "Nothing here"}
          body={
            filter === "all"
              ? "Link an account so your work syncs automatically, or log something you did elsewhere."
              : "Try another filter."
          }
        />
      ) : (
        <Card>
          {shown.map((c, i) => (
            <ContributionRow key={c.id} c={c} last={i === shown.length - 1} />
          ))}
        </Card>
      )}
    </Screen>
  );
}

function ContributionRow({ c, last }: { c: Contribution; last: boolean }) {
  const t = useTheme();
  const open = c.url ? () => void Linking.openURL(c.url!) : undefined;
  return (
    <Row onPress={open} last={last} align="flex-start">
      <View style={{ flex: 1, gap: space.xs }}>
        <T variant="body" numberOfLines={2}>{c.title}</T>
        <T variant="caption" tone="faint">
          {kindLabel(c.kind)} · {houseName(c.house)} · {shortDate(c.occurredAt)}
          {c.provider !== "self" ? ` · ${providerName(c.provider)}` : ""}
        </T>
        {c.repo ? <T variant="caption" tone="faint">{c.repo}</T> : null}
        {c.review?.status === "declined" && c.review.note ? (
          <T variant="caption" tone="danger">{c.review.note}</T>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end", gap: space.xs }}>
        {c.review?.status === "pending" ? <Badge label="pending" tone="warn" /> : null}
        {c.review?.status === "verified" ? <Badge label="verified" tone="ok" /> : null}
        {c.review?.status === "declined" ? <Badge label="declined" tone="danger" /> : null}
        {open ? <Ionicons name="open-outline" size={16} color={t.inkFaint} /> : null}
      </View>
    </Row>
  );
}
