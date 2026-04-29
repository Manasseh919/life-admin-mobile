import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";

export default function AccountScreen() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Profile and session</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Stage 1 status</Text>
          <Text style={styles.value}>Auth + session persistence active</Text>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Log out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f7f8",
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111111",
  },
  subtitle: {
    color: "#6b7280",
    marginTop: -4,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eceef1",
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
    color: "#111111",
    fontWeight: "600",
  },
  button: {
    marginTop: 14,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
