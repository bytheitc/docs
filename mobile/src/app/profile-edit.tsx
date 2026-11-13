// Edit your profile: your name, your handle, and exactly how much of you is public.
//
// Nothing here is public unless the master switch is on. The switches below it stay visible when
// it is off — so you can see what you have chosen — but they are disabled, because turning one on
// while the profile is private would be a promise the api does not keep.
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button, Card, Field, Problem, Screen, Section, T, Toggle } from "@/components/ui";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { space } from "@/lib/theme";

export default function ProfileEdit() {
  const { contributor, token, refresh } = useAuth();
  const router = useRouter();

  const [handle, setHandle] = useState(contributor?.handle ?? "");
  const [displayName, setDisplayName] = useState(contributor?.displayName ?? "");
  const [bio, setBio] = useState(contributor?.profile.bio ?? "");
  const [website, setWebsite] = useState(contributor?.profile.website ?? "");
  const [isPublic, setIsPublic] = useState(contributor?.profile.public ?? false);
  const [onWall, setOnWall] = useState(contributor?.profile.onWall ?? false);
  const [showHouses, setShowHouses] = useState(contributor?.profile.showHouses ?? true);
  const [showAccounts, setShowAccounts] = useState(contributor?.profile.showAccounts ?? false);
  const [showContributions, setShowContributions] = useState(contributor?.profile.showContributions ?? false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErrors({});
    setProblem(null);
    try {
      await api.updateProfile(token!, {
        handle: handle.trim().toLowerCase(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        public: isPublic,
        onWall,
        showHouses,
        showAccounts,
        showContributions,
      });
      await refresh();
      router.back();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.fields) setErrors(e.fields);
        else setProblem(e.message);
      } else {
        setProblem("Could not save your profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={[]}>
      {problem ? <Problem message={problem} /> : null}

      <Section title="You">
        <View style={{ gap: space.lg }}>
          <Field
            label="Name"
            value={displayName}
            onChangeText={setDisplayName}
            error={errors.displayName}
            autoCapitalize="words"
            maxLength={80}
          />
          <Field
            label="Handle"
            value={handle}
            onChangeText={(v) => setHandle(v.toLowerCase())}
            error={errors.handle}
            hint="2–30 lowercase letters, digits or hyphens. This is your address on the portal."
            maxLength={30}
          />
          <Field
            label="Bio"
            value={bio}
            onChangeText={setBio}
            error={errors.bio}
            multiline
            autoCapitalize="sentences"
            maxLength={400}
            hint={`${bio.length}/400`}
          />
          <Field
            label="Website"
            value={website}
            onChangeText={setWebsite}
            error={errors.website}
            placeholder="https://"
            keyboardType="url"
            maxLength={300}
          />
        </View>
      </Section>

      <Section
        title="What is public"
        hint="Your work is recorded either way. These switches only decide what a visitor can see."
      >
        <Card>
          <Toggle
            label="Public profile"
            description="Turns everything below on or off at once"
            value={isPublic}
            onValueChange={setIsPublic}
          />
          <Toggle
            label="List me on the contributors wall"
            value={onWall}
            onValueChange={setOnWall}
            disabled={!isPublic}
          />
          <Toggle label="Show the houses I work in" value={showHouses} onValueChange={setShowHouses} disabled={!isPublic} />
          <Toggle
            label="Show my linked accounts"
            value={showAccounts}
            onValueChange={setShowAccounts}
            disabled={!isPublic}
          />
          <Toggle
            label="Show my contributions"
            value={showContributions}
            onValueChange={setShowContributions}
            disabled={!isPublic}
            last
          />
        </Card>
      </Section>

      <Button label="Save" onPress={save} loading={saving} disabled={!displayName.trim() || !handle.trim()} />
      <Button label="Cancel" variant="quiet" onPress={() => router.back()} />
    </Screen>
  );
}
