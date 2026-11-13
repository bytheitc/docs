// Root layout: the providers every screen needs, and the gate that decides whether you are
// looking at the app or at the sign-in screen.
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Loading } from "@/components/ui";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useIsDark, useTheme } from "@/lib/theme";

function Gate() {
  const { contributor, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const t = useTheme();

  const onSignIn = segments[0] === "sign-in";

  useEffect(() => {
    // Nothing is decided until the keychain has been read. Redirecting before that would bounce
    // a signed-in person to sign-in for a frame on every cold start.
    if (loading) return;
    if (!contributor && !onSignIn) router.replace("/sign-in");
    else if (contributor && onSignIn) router.replace("/");
  }, [contributor, loading, onSignIn, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: "center" }}>
        <Loading />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.ink,
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: t.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="profile-edit" options={{ title: "Edit profile", presentation: "modal" }} />
      <Stack.Screen name="log-work" options={{ title: "Log work", presentation: "modal" }} />
      <Stack.Screen name="claim-issue" options={{ title: "Claim an issue", presentation: "modal" }} />
      <Stack.Screen name="accounts" options={{ title: "Linked accounts" }} />
      <Stack.Screen name="data" options={{ title: "Your data" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const dark = useIsDark();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style={dark ? "light" : "dark"} />
          <Gate />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
