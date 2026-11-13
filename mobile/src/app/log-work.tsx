// Log work the portal could not see for itself — a talk, a translation, a design review.
//
// Everything logged here arrives as pending and waits for a steward. The screen says so, because
// a form that looks like it publishes something and does not is a small betrayal.
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button, Choice, Field, Problem, Screen, Section, T } from "@/components/ui";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isDateLike, today } from "@/lib/format";
import { HOUSES, SELF_KINDS } from "@/lib/houses";
import { space } from "@/lib/theme";
import type { HouseId } from "@/lib/types";

export default function LogWork() {
  const { token } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [house, setHouse] = useState<HouseId | null>(null);
  const [kind, setKind] = useState<string | null>(null);
  const [date, setDate] = useState(today());

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setErrors({});
    setProblem(null);
    try {
      await api.logContribution(token!, {
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
        house: house ?? "",
        kind: kind ?? "",
        date,
      });
      router.back();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.fields) setErrors(e.fields);
        else setProblem(e.message);
      } else {
        setProblem("Could not log that.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={[]}>
      {problem ? <Problem message={problem} /> : null}

      <T variant="callout" tone="soft">
        For work that happened somewhere the portal cannot see. A steward checks it before it counts
        toward anything.
      </T>

      <Section>
        <View style={{ gap: space.lg }}>
          <Field
            label="Title"
            value={title}
            onChangeText={setTitle}
            error={errors.title}
            autoCapitalize="sentences"
            placeholder="What was it?"
            maxLength={200}
          />
          <Choice label="Kind of work" options={SELF_KINDS} value={kind} onChange={setKind} error={errors.kind} />
          <Choice
            label="House"
            options={HOUSES.map((h) => ({ id: h.id, label: h.name }))}
            value={house}
            onChange={setHouse}
            error={errors.house}
          />
          <Field
            label="Link"
            value={url}
            onChangeText={setUrl}
            error={errors.url}
            hint="Somewhere a steward can see the work for themselves."
            placeholder="https://"
            keyboardType="url"
            maxLength={500}
          />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            error={errors.description}
            multiline
            autoCapitalize="sentences"
            placeholder="A sentence or two about what you did."
            maxLength={2000}
          />
          <Field
            label="Date"
            value={date}
            onChangeText={setDate}
            error={errors.date ?? (date && !isDateLike(date) ? "Use the form 2026-03-14." : undefined)}
            placeholder="YYYY-MM-DD"
            hint="The day the work happened. Not in the future."
            maxLength={10}
          />
        </View>
      </Section>

      <Button
        label="Log it"
        onPress={submit}
        loading={saving}
        disabled={!title.trim() || !kind || !house || !url.trim() || description.trim().length < 10 || !isDateLike(date)}
      />
      <Button label="Cancel" variant="quiet" onPress={() => router.back()} />
    </Screen>
  );
}
