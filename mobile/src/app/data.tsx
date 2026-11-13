// Your data: what the portal holds, how to take a copy, and how to end it.
//
// The portal frames this as amānah — something held in trust. Trust that cannot be withdrawn is
// not trust, so deletion is here, it is plain, and it says exactly what it does before it does it.
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Share, View } from "react-native";

import { Button, Card, Field, Problem, Row, Screen, Section, T } from "@/components/ui";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { plural } from "@/lib/format";
import { space } from "@/lib/theme";

export default function Data() {
  const { contributor, token, signOut } = useAuth();
  const router = useRouter();

  const [exported, setExported] = useState<{ json: string; counts: Record<string, number> } | null>(null);
  const [working, setWorking] = useState<null | "export" | "delete">(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [confirmError, setConfirmError] = useState<string | undefined>();

  const doExport = async () => {
    setWorking("export");
    setProblem(null);
    try {
      const data = await api.exportMyData(token!);
      const json = JSON.stringify(data, null, 2);
      setExported({
        json,
        counts: {
          contributions: Array.isArray(data.contributions) ? data.contributions.length : 0,
          claims: Array.isArray(data.claims) ? data.claims.length : 0,
          accounts: Array.isArray(data.accounts) ? data.accounts.length : 0,
        },
      });
    } catch (e) {
      setProblem(e instanceof ApiError ? e.message : "Could not fetch your data.");
    } finally {
      setWorking(null);
    }
  };

  const doDelete = () => {
    if (confirm !== contributor?.handle) {
      setConfirmError(`Type your handle, ${contributor?.handle}, to confirm.`);
      return;
    }
    setConfirmError(undefined);
    Alert.alert(
      "Delete your account?",
      "Your profile, your linked accounts and your claims are deleted. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setWorking("delete");
              setProblem(null);
              try {
                await api.deleteAccount(token!, confirm);
                await signOut();
                router.replace("/sign-in");
              } catch (e) {
                if (e instanceof ApiError && e.fields?.confirm) setConfirmError(e.fields.confirm);
                else setProblem(e instanceof ApiError ? e.message : "Could not delete your account.");
                setWorking(null);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen edges={[]}>
      {problem ? <Problem message={problem} /> : null}

      <Section
        title="Take a copy"
        hint="Everything held about you, as JSON — including the records a steward has hidden from your own dashboard."
      >
        <Button label="Fetch my data" onPress={doExport} loading={working === "export"} variant="secondary" />
        {exported ? (
          <Card>
            <Row>
              <T variant="body" style={{ flex: 1 }}>Contributions</T>
              <T variant="body" tone="soft">{exported.counts.contributions}</T>
            </Row>
            <Row>
              <T variant="body" style={{ flex: 1 }}>Claims</T>
              <T variant="body" tone="soft">{exported.counts.claims}</T>
            </Row>
            <Row last>
              <T variant="body" style={{ flex: 1 }}>Linked accounts</T>
              <T variant="body" tone="soft">{exported.counts.accounts}</T>
            </Row>
            <View style={{ padding: space.lg, gap: space.md }}>
              <Button
                label="Copy to clipboard"
                variant="secondary"
                onPress={() => {
                  void Clipboard.setStringAsync(exported.json);
                  Alert.alert("Copied", `${plural(Math.round(exported.json.length / 1024), "kilobyte")} of JSON.`);
                }}
              />
              <Button
                label="Send it somewhere"
                variant="quiet"
                onPress={() => void Share.share({ message: exported.json })}
              />
            </View>
          </Card>
        ) : null}
      </Section>

      <Section title="Delete your account">
        <Card>
          <View style={{ padding: space.lg, gap: space.md }}>
            <T variant="callout" tone="soft">
              This deletes your profile, your linked accounts and your claims. Work that other people
              reviewed or depended on is kept, but it stops being attributed to you.
            </T>
            <Field
              label={`Type ${contributor?.handle} to confirm`}
              value={confirm}
              onChangeText={(v) => {
                setConfirm(v);
                setConfirmError(undefined);
              }}
              error={confirmError}
              placeholder={contributor?.handle}
              maxLength={60}
            />
            <Button
              label="Delete my account"
              variant="danger"
              loading={working === "delete"}
              disabled={confirm !== contributor?.handle}
              onPress={doDelete}
            />
          </View>
        </Card>
      </Section>
    </Screen>
  );
}
