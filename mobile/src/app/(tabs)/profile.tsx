// You, as the portal holds you — and the way out to everything you can change.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, View } from "react-native";

import { Avatar, Badge, Button, Card, Row, Screen, Section, T } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { shortDate, plural } from "@/lib/format";
import { providerName } from "@/lib/houses";
import { space, useTheme } from "@/lib/theme";

export default function Profile() {
  const { contributor, accounts, signOut, signOutEverywhere } = useAuth();
  const router = useRouter();
  const t = useTheme();

  if (!contributor) return null;
  const p = contributor.profile;

  const confirmSignOut = () =>
    Alert.alert("Sign out?", "You will need to sign in again on this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);

  const confirmSignOutAll = () =>
    Alert.alert(
      "Sign out everywhere?",
      "Every session ends, on every device and in the browser. Anyone signed in as you is signed out.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out everywhere", style: "destructive", onPress: () => void signOutEverywhere() },
      ],
    );

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg, padding: space.lg }}>
          <Avatar name={contributor.displayName} size={56} />
          <View style={{ flex: 1, gap: space.xs }}>
            <T variant="title" numberOfLines={1}>{contributor.displayName}</T>
            <T variant="callout" tone="soft">@{contributor.handle}</T>
            <View style={{ flexDirection: "row", gap: space.sm, paddingTop: 2 }}>
              <Badge label={p.public ? "public" : "private"} tone={p.public ? "ok" : "neutral"} />
              {p.onWall ? <Badge label="on the wall" tone="accent" /> : null}
            </View>
          </View>
        </View>
        {p.bio ? (
          <Row last>
            <T variant="callout" tone="soft">{p.bio}</T>
          </Row>
        ) : null}
      </Card>

      <Button label="Edit profile" onPress={() => router.push("/profile-edit")} />

      <Section
        title="Visibility"
        hint={
          p.public
            ? "Your profile page is visible to anyone with the link."
            : "Nothing about you is public. Everything below is off while your profile is private."
        }
      >
        <Card>
          <Row>
            <T variant="body" style={{ flex: 1 }}>Public profile</T>
            <T variant="body" tone={p.public ? "accent" : "faint"}>{p.public ? "On" : "Off"}</T>
          </Row>
          <Row>
            <T variant="body" style={{ flex: 1 }}>Listed on the contributors wall</T>
            <T variant="body" tone={p.public && p.onWall ? "accent" : "faint"}>{p.public && p.onWall ? "On" : "Off"}</T>
          </Row>
          <Row>
            <T variant="body" style={{ flex: 1 }}>Shows your houses</T>
            <T variant="body" tone={p.showHouses ? "accent" : "faint"}>{p.showHouses ? "On" : "Off"}</T>
          </Row>
          <Row>
            <T variant="body" style={{ flex: 1 }}>Shows your linked accounts</T>
            <T variant="body" tone={p.showAccounts ? "accent" : "faint"}>{p.showAccounts ? "On" : "Off"}</T>
          </Row>
          <Row last>
            <T variant="body" style={{ flex: 1 }}>Shows your contributions</T>
            <T variant="body" tone={p.showContributions ? "accent" : "faint"}>{p.showContributions ? "On" : "Off"}</T>
          </Row>
        </Card>
      </Section>

      <Section title="Accounts">
        <Card>
          <Row onPress={() => router.push("/accounts")} last>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="body">Linked accounts</T>
              <T variant="caption" tone="faint">
                {accounts.length === 0
                  ? "None linked"
                  : accounts.map((a) => providerName(a.provider)).join(", ")}
              </T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.inkFaint} />
          </Row>
        </Card>
      </Section>

      <Section title="Your data">
        <Card>
          <Row onPress={() => router.push("/data")} last>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="body">Export or delete</T>
              <T variant="caption" tone="faint">Everything the portal holds about you</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.inkFaint} />
          </Row>
        </Card>
      </Section>

      <Section title="Session">
        <Card>
          <Row onPress={confirmSignOut}>
            <T variant="body" style={{ flex: 1 }}>Sign out</T>
          </Row>
          <Row onPress={confirmSignOutAll} last>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="body" tone="danger">Sign out everywhere</T>
              <T variant="caption" tone="faint">Ends every session, including the browser</T>
            </View>
          </Row>
        </Card>
      </Section>

      <T variant="caption" tone="faint" center>
        Contributor since {shortDate(contributor.createdAt)} · {plural(accounts.length, "linked account")}
      </T>
    </Screen>
  );
}
