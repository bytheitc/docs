// Claim an issue, so two people don't spend a weekend on the same thing.
//
// You can only claim on a platform you have linked — the api checks for a linked account on that
// provider and refuses otherwise — so the choices here are narrowed to the ones that will work.
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button, Card, Choice, Field, Problem, Screen, Section, T } from "@/components/ui";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CLAIMABLE, providerName } from "@/lib/houses";
import { space } from "@/lib/theme";

const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;

export default function ClaimIssue() {
  const { token, accounts } = useAuth();
  const router = useRouter();

  // Only providers you have linked *and* the portal can claim on.
  const options = accounts
    .filter((a) => CLAIMABLE.includes(a.provider))
    .map((a) => ({ id: a.provider, label: providerName(a.provider) }))
    .filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i);

  const [provider, setProvider] = useState<string | null>(options.length === 1 ? options[0].id : null);
  const [repo, setRepo] = useState("");
  const [issue, setIssue] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setErrors({});
    setProblem(null);
    try {
      await api.claimIssue(token!, { provider: provider ?? "", repo: repo.trim(), issue: issue.trim() });
      router.back();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.fields) setErrors(e.fields);
        else setProblem(e.message);
      } else {
        setProblem("Could not claim that issue.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (options.length === 0) {
    return (
      <Screen edges={[]}>
        <Card>
          <View style={{ padding: space.xl, gap: space.md }}>
            <T variant="heading">Link an account first</T>
            <T variant="callout" tone="soft">
              Claims are held against your username on the platform the issue lives on, so you need a
              linked account there before you can claim anything.
            </T>
            <Button label="Linked accounts" onPress={() => router.replace("/accounts")} />
          </View>
        </Card>
      </Screen>
    );
  }

  const repoOk = REPO.test(repo.trim());
  const issueOk = /^\d{1,7}$/.test(issue.trim()) && Number(issue) >= 1;

  return (
    <Screen edges={[]}>
      {problem ? <Problem message={problem} /> : null}

      <T variant="callout" tone="soft">
        Claiming tells everyone else you are on it. The claim is held for a set number of days, then
        runs out on its own if no work lands.
      </T>

      <Section>
        <View style={{ gap: space.lg }}>
          <Choice label="Where" options={options} value={provider} onChange={setProvider} error={errors.provider} />
          <Field
            label="Repository"
            value={repo}
            onChangeText={setRepo}
            error={errors.repo ?? (repo && !repoOk ? "Use the form owner/name." : undefined)}
            placeholder="owner/name"
            maxLength={201}
          />
          <Field
            label="Issue number"
            value={issue}
            onChangeText={(v) => setIssue(v.replace(/[^0-9]/g, ""))}
            error={errors.issue}
            placeholder="123"
            keyboardType="number-pad"
            maxLength={7}
          />
        </View>
      </Section>

      <Button label="Claim it" onPress={submit} loading={saving} disabled={!provider || !repoOk || !issueOk} />
      <Button label="Cancel" variant="quiet" onPress={() => router.back()} />
    </Screen>
  );
}
