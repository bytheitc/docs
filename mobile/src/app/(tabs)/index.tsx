// Home: who you are here, what you have done, and anything waiting on you.
import { useRouter } from "expo-router";
import { RefreshControl, View } from "react-native";

import { Avatar, Badge, Button, Card, Empty, Loading, Problem, Row, Screen, Section, T } from "@/components/ui";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { shortDate, plural, relativeDays } from "@/lib/format";
import { houseName, kindLabel } from "@/lib/houses";
import { radius, space, useTheme } from "@/lib/theme";
import { useAsync } from "@/lib/useAsync";
import type { Dashboard, MaintainerMe } from "@/lib/types";

export default function Home() {
  const { token, contributor } = useAuth();
  const router = useRouter();
  const t = useTheme();

  const dash = useAsync<Dashboard>((signal) => api.getDashboard(token!, signal), [token]);
  // Maintainership is optional: most contributors hold none, and the endpoint simply returns
  // empty lists for them. A failure here must not take the whole screen down with it.
  const maint = useAsync<MaintainerMe | null>(() => api.getMaintainerMe(token!).catch(() => null), [token]);

  if (dash.loading) return <Screen><Loading /></Screen>;

  const d = dash.data;
  const activeClaims = d?.claims.filter((c) => c.status === "active") ?? [];
  const recent = [...(d?.contributions ?? [])]
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
    .slice(0, 4);
  // The api already narrows both of these: invitations come back open-only, and nominations you
  // may not object to (your own, and ones about you) are filtered out server-side.
  const invitations = maint.data?.invitations ?? [];
  const nominations = maint.data?.nominationsToConsider ?? [];
  const who = (id: string) => maint.data?.people?.[id];
  const next = d?.milestones?.next?.[0];

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={dash.refreshing} onRefresh={dash.refresh} tintColor={t.accent} />}
    >
      {dash.error ? <Problem message={dash.error} onRetry={dash.reload} /> : null}

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg, padding: space.lg }}>
          <Avatar name={contributor?.displayName ?? "?"} size={52} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="title" numberOfLines={1}>{contributor?.displayName}</T>
            <T variant="callout" tone="soft">@{contributor?.handle}</T>
          </View>
        </View>
        <Row last>
          <View style={{ flex: 1 }}>
            <T variant="display">{d?.counted ?? 0}</T>
            <T variant="caption" tone="faint">counted toward milestones</T>
          </View>
          <View style={{ flex: 1 }}>
            <T variant="display">{activeClaims.length}</T>
            <T variant="caption" tone="faint">{activeClaims.length === 1 ? "open claim" : "open claims"}</T>
          </View>
        </Row>
      </Card>

      {invitations.length || nominations.length ? (
        <Section title="Waiting on you">
          <Card>
            {invitations.map((inv, i) => (
              <Row key={inv.id} last={i === invitations.length - 1 && nominations.length === 0} align="flex-start">
                <View style={{ flex: 1, gap: space.xs }}>
                  <T variant="body">You have been invited to maintain {inv.repo}</T>
                  <T variant="caption" tone="faint">
                    Invited {shortDate(inv.createdAt)}
                    {who(inv.invitedBy) ? ` by @${who(inv.invitedBy)}` : ""}
                  </T>
                </View>
                <Badge label="invitation" tone="accent" />
              </Row>
            ))}
            {nominations.map((n, i) => (
              <Row key={n.id} last={i === nominations.length - 1} align="flex-start">
                <View style={{ flex: 1, gap: space.xs }}>
                  <T variant="body">
                    {who(n.candidateId) ? `@${who(n.candidateId)}` : "Someone"} is nominated for {n.repo}
                  </T>
                  <T variant="caption" tone="faint">
                    {n.closesAt ? `Carries ${relativeDays(n.closesAt)} unless someone objects` : "Open for objections"}
                  </T>
                </View>
                <Badge label="nomination" tone="warn" />
              </Row>
            ))}
          </Card>
          <T variant="caption" tone="faint">
            Invitations and objections are decided in the portal on the web, where the full governance
            record sits.
          </T>
        </Section>
      ) : null}

      {next ? (
        <Section title="Next milestone">
          <Card>
            <View style={{ padding: space.lg, gap: space.sm }}>
              <T variant="heading">{next.title}</T>
              {next.description ? <T variant="callout" tone="soft">{next.description}</T> : null}
              <View style={{ height: 8, backgroundColor: t.sunken, borderRadius: radius.pill, overflow: "hidden", marginTop: space.xs }}>
                <View
                  style={{
                    width: `${Math.min(100, Math.round(((d?.counted ?? 0) / Math.max(1, next.threshold)) * 100))}%`,
                    height: "100%",
                    backgroundColor: t.accent,
                  }}
                />
              </View>
              <T variant="caption" tone="faint">
                {d?.counted ?? 0} of {next.threshold}
              </T>
            </View>
          </Card>
        </Section>
      ) : null}

      {d?.milestones?.reached.length ? (
        <Section title="Reached">
          <Card>
            {d.milestones!.reached.map((m, i) => (
              <Row key={m.id} last={i === d.milestones.reached.length - 1}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="body">{m.title}</T>
                  <T variant="caption" tone="faint">{shortDate(m.at)}</T>
                </View>
              </Row>
            ))}
          </Card>
        </Section>
      ) : null}

      <Section title="Recent work">
        {recent.length === 0 ? (
          <Empty
            title="Nothing recorded yet"
            body="Work synced from your linked accounts appears here. You can also log work that happened somewhere the portal cannot see."
            action={<Button label="Log work" onPress={() => router.push("/log-work")} />}
          />
        ) : (
          <>
            <Card>
              {recent.map((c, i) => (
                <Row key={c.id} last={i === recent.length - 1} align="flex-start">
                  <View style={{ flex: 1, gap: space.xs }}>
                    <T variant="body" numberOfLines={2}>{c.title}</T>
                    <T variant="caption" tone="faint">
                      {kindLabel(c.kind)} · {houseName(c.house)} · {shortDate(c.occurredAt)}
                    </T>
                  </View>
                  {c.review?.status === "pending" ? <Badge label="pending" tone="warn" /> : null}
                  {c.review?.status === "declined" ? <Badge label="declined" tone="danger" /> : null}
                </Row>
              ))}
            </Card>
            <T variant="caption" tone="faint">
              {plural(d?.contributions.length ?? 0, "record")} in all.
            </T>
          </>
        )}
      </Section>
    </Screen>
  );
}
