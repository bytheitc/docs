// Sign in with any provider this deployment has configured. The list comes from the api rather
// than being hard-coded, so a deployment that has only GitHub configured shows only GitHub.
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { Button, Card, Field, Loading, Problem, Row, Screen, T } from "@/components/ui";
import { Mark } from "@/components/Mark";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { providerName } from "@/lib/houses";
import { space } from "@/lib/theme";
import type { Provider } from "@/lib/types";

export default function SignIn() {
  const { signIn, busy } = useAuth();
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [devEnabled, setDevEnabled] = useState(false);
  const [devUser, setDevUser] = useState("dev-contributor");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await api.getProviders();
      setProviders(res.usable);
      setDevEnabled(res.devEnabled);
    } catch (e) {
      setProviders([]);
      setLoadError(e instanceof api.ApiError ? e.message : "Could not reach the portal.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const go = async (id: string, user?: string) => {
    setError(null);
    setPending(id);
    const res = await signIn(id, user);
    setPending(null);
    // An empty error is a cancelled sheet — the person closed it on purpose, so say nothing.
    if (!res.ok && res.error) setError(res.error);
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={{ alignItems: "center", gap: space.md, paddingTop: space.xxl, paddingBottom: space.lg }}>
        <Mark size={72} />
        <T variant="display" center>Islamic Tech Collective</T>
        <T variant="callout" tone="soft" center>
          The contributor portal. Your profile, your work and your claims, on your phone.
        </T>
      </View>

      {error ? <Problem message={error} /> : null}
      {loadError ? <Problem message={loadError} onRetry={load} /> : null}

      {providers === null ? (
        <Loading label="Finding your ways in" />
      ) : providers.length === 0 && !devEnabled ? (
        !loadError ? (
          <Card>
            <View style={{ padding: space.xl, gap: space.sm }}>
              <T variant="heading">No way to sign in yet</T>
              <T variant="callout" tone="soft">
                This portal has no sign-in provider configured. Someone with access to the deployment
                needs to set one up before anyone can sign in.
              </T>
            </View>
          </Card>
        ) : null
      ) : (
        <Card>
          {providers.map((p, i) => (
            <Row key={p.id} onPress={busy ? undefined : () => go(p.id)} last={i === providers.length - 1 && !devEnabled}>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="body">Continue with {providerName(p.id)}</T>
                {p.category ? <T variant="caption" tone="faint">{p.category}</T> : null}
              </View>
              {pending === p.id ? <T variant="caption" tone="faint">Opening…</T> : <T variant="body" tone="faint">›</T>}
            </Row>
          ))}
        </Card>
      )}

      {devEnabled ? (
        <Card>
          <View style={{ padding: space.lg, gap: space.md }}>
            <T variant="eyebrow" tone="faint">Development only</T>
            <T variant="caption" tone="soft">
              This deployment accepts a development account. It exists so the portal can be worked on
              without real provider credentials, and it is off in production.
            </T>
            <Field label="Username" value={devUser} onChangeText={setDevUser} placeholder="dev-contributor" />
            <Button
              label="Continue as a development account"
              variant="secondary"
              loading={pending === "dev"}
              disabled={busy || !devUser.trim()}
              onPress={() => go("dev", devUser.trim())}
            />
          </View>
        </Card>
      ) : null}

      <T variant="caption" tone="faint" center>
        Signing in links the account you choose to your ITC contributor record. The portal never sees
        or stores a provider password or token.
      </T>
    </Screen>
  );
}
