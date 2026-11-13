// Issues you have claimed, so nobody duplicates the work — and the ones you can hand back.
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, RefreshControl, View } from "react-native";

import { Badge, Button, Card, Empty, Loading, Problem, Row, Screen, Section, T } from "@/components/ui";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { relativeDays, shortDate } from "@/lib/format";
import { providerName } from "@/lib/houses";
import { space, useTheme } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import type { Claim, Dashboard } from "@/lib/types";

/** Where an issue lives, for the providers the portal can claim on. */
function issueUrl(c: Claim): string | null {
  if (c.provider === "github") return `https://github.com/${c.repo}/issues/${c.issue}`;
  if (c.provider === "gitlab") return `https://gitlab.com/${c.repo}/-/issues/${c.issue}`;
  if (c.provider === "codeberg") return `https://codeberg.org/${c.repo}/issues/${c.issue}`;
  return null;
}

export default function Claims() {
  const { token } = useAuth();
  const router = useRouter();
  const t = useTheme();
  const [releasing, setReleasing] = useState<string | null>(null);

  const dash = useAsync<Dashboard>((signal) => api.getDashboard(token!, signal), [token]);

  if (dash.loading) return <Screen><Loading /></Screen>;

  const claims = dash.data?.claims ?? [];
  const active = claims.filter((c) => c.status === "active");
  const past = claims.filter((c) => c.status !== "active");

  const release = (c: Claim) => {
    const run = async () => {
      setReleasing(c.id);
      try {
        await api.releaseOwnClaim(token!, c.id);
        await dash.reload();
      } catch (e) {
        Alert.alert("Could not release it", e instanceof ApiError ? e.message : "Something went wrong.");
      } finally {
        setReleasing(null);
      }
    };
    // Releasing frees the issue for someone else immediately, so it is worth one question first.
    Alert.alert(
      "Hand this claim back?",
      `${c.repo} #${c.issue} becomes free for anyone else to pick up. You can claim it again later if it is still open.`,
      [
        { text: "Keep it", style: "cancel" },
        { text: "Release", style: "destructive", onPress: () => void run() },
      ],
    );
  };

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={dash.refreshing} onRefresh={dash.refresh} tintColor={t.accent} />}
    >
      {dash.error ? <Problem message={dash.error} onRetry={dash.reload} /> : null}

      <Button label="Claim an issue" onPress={() => router.push("/claim-issue")} />

      <Section title="Open">
        {active.length === 0 ? (
          <Empty
            title="No open claims"
            body="Claiming an issue tells everyone else you are on it, and holds it for a set number of days."
          />
        ) : (
          <Card>
            {active.map((c, i) => {
              const url = issueUrl(c);
              return (
                <Row key={c.id} last={i === active.length - 1} align="flex-start">
                  <View style={{ flex: 1, gap: space.xs }}>
                    <T variant="body">{c.repo} #{c.issue}</T>
                    <T variant="caption" tone="faint">
                      {providerName(c.provider)} · claimed {shortDate(c.createdAt)}
                    </T>
                    <T variant="caption" tone={new Date(c.expiresAt) < new Date(Date.now() + 2 * 864e5) ? "warn" : "faint"}>
                      Expires {relativeDays(c.expiresAt)}
                    </T>
                    <View style={{ flexDirection: "row", gap: space.sm, paddingTop: space.xs, flexWrap: "wrap" }}>
                      {url ? (
                        <Button label="Open issue" variant="quiet" full={false} onPress={() => void Linking.openURL(url)} />
                      ) : null}
                      <Button
                        label="Release"
                        variant="quiet"
                        full={false}
                        loading={releasing === c.id}
                        onPress={() => release(c)}
                      />
                    </View>
                  </View>
                  {c.assigned ? <Badge label="assigned" tone="ok" /> : <Badge label="held" tone="accent" />}
                </Row>
              );
            })}
          </Card>
        )}
        {active.length ? (
          <T variant="caption" tone="faint">
            A claim runs out on its own if no work lands. Releasing one early is the honest thing to do
            when you cannot get to it — it frees the issue straight away.
          </T>
        ) : null}
      </Section>

      {past.length ? (
        <Section title="Past" hint="Released and expired claims are kept, so the record stays honest.">
          <Card>
            {past.map((c, i) => (
              <Row key={c.id} last={i === past.length - 1} align="flex-start">
                <View style={{ flex: 1, gap: space.xs }}>
                  <T variant="body" tone="soft">{c.repo} #{c.issue}</T>
                  <T variant="caption" tone="faint">
                    {c.status === "released"
                      ? `released ${shortDate(c.releasedAt)}${c.releasedBy ? ` by ${c.releasedBy}` : ""}`
                      : `expired ${shortDate(c.expiresAt)}`}
                  </T>
                </View>
                <Badge label={c.status} />
              </Row>
            ))}
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}
