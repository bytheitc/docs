import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { StyleSheet, type ColorValue } from "react-native";

import { useTheme } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * The tab bar hands its icon a colour that React Native types as possibly a processed colour
 * (a number) or null, while the icon font only takes a string. Coerce once here rather than at
 * four call sites.
 */
const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={typeof color === "string" ? color : undefined} size={size} />
  );

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", fontSize: 20 },
        sceneStyle: { backgroundColor: t.bg },
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.inkFaint,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: t.line,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="work" options={{ title: "Work", tabBarIcon: icon("git-commit-outline") }} />
      <Tabs.Screen name="claims" options={{ title: "Claims", tabBarIcon: icon("bookmark-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("person-outline") }} />
    </Tabs>
  );
}
