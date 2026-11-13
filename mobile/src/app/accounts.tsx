// Linked accounts: the provider identities the portal matches your work against.
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, View } from "react-native";

import { Badge, Button, Card, Empty, Loading, Problem, Row, Screen, Section, T } from "@/components/ui";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { providerName } from "@/lib/houses";
import { space, useTheme } from "@/lib/theme";
import type { Provider } from "@/lib/types";

export default function Accounts() {
  const { accounts, token, refresh, linkAccount, busy } = useAuth();
  const t = useTheme();
  const [usable, setUsable] = useState<Provider[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.getProviders();
      setUsable(res.usable);
    } catch {
      setUsable([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const linked = new Set(accounts.map((a) => a.provider));
  const available = (usable ?? []).filter((p) => !linked.has(p.id));

  const link = async (id: string) => {
    setProblem(null);
    setWorking(id);
    const res = await linkAccount(id);
    setWorking(null);
    if (!res.ok && res.error) setProblem(res.error);
  };

  const unlink = (provider: string, providerUserId: string, username: string) => {
    const run = async () => {
      setWorking(provider);
      setProblem(null);
      try {
        await api.unlinkAccount(token!, provider, providerUserId);
        await refresh();
      } catch (e) {
        setProblem(e instanceof ApiError ? e.message : "Could not unlink that account.");
      } finally {
        setWorking(null);
      }
    };
    Alert.alert(
      `Unlink ${providerName(provider)}?`,
      `Work the portal matched to ${username} stops being attributed to you until you link it again.`,
      [
        { text: "Keep it", style: "cancel" },
        { text: "Unlink", style: "destructive", onPress: () => void run() },
      ],
    );
  };

  return (
    <Screen edges={[]}>
      {problem ? <Problem message={problem} /> : null}

      <Section title="Linked" hint="Your work is matched to these identities when the portal syncs.">
        {accounts.length === 0 ? (
          <Empty title="Nothing linked" body="Link an account so your work is recognised automatically." />
        ) : (
          <Card>
            {accounts.map((a, i) => (
              <Row key={`${a.provider}:${a.providerUserId}`} last={i === accounts.length - 1} align="flex-start">
                <View style={{ flex: 1, gap: space.xs }}>
                  <T variant="body">{providerName(a.provider)}</T>
                  <T variant="caption" tone="faint">
                    {a.username} · linked {shortDate(a.linkedAt)}
                  </T>
                  {a.profileUrl ? (
                    <View style={{ alignSelf: "flex-start", paddingTop: space.xs }}>
                      <Button
                        label="Open profile"
                        variant="quiet"
                        full={false}
                        onPress={() => void Linking.openURL(a.profileUrl!)}
                      />
                    </View>
                  ) : null}
                </View>
                {accounts.length > 1 ? (
                  <Button
                    label="Unlink"
                    variant="quiet"
                    full={false}
                    loading={working === a.provider}
                    onPress={() => unlink(a.provider, a.providerUserId, a.username)}
                  />
                ) : (
                  <Badge label="only account" />
                )}
              </Row>
            ))}
          </Card>
        )}
        {accounts.length === 1 ? (
          <T variant="caption" tone="faint">
            This is the only way you can sign in, so it cannot be unlinked. Link another first.
          </T>
        ) : null}
      </Section>

      {usable === null ? (
        <Loading />
      ) : available.length ? (
        <Section title="Add another">
          <Card>
            {available.map((p, i) => (
              <Row key={p.id} onPress={busy ? undefined : () => link(p.id)} last={i === available.length - 1}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="body">{providerName(p.id)}</T>
                  {p.category ? <T variant="caption" tone="faint">{p.category}</T> : null}
                </View>
                {working === p.id ? (
                  <T variant="caption" tone="faint">Opening…</T>
                ) : (
                  <Ionicons name="add" size={20} color={t.accent} />
                )}
              </Row>
            ))}
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}
