import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const joinedLabel = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Active";
  const updatedLabel = user?.updatedAt
    ? new Date(user.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Synced";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar style="dark" />
      <LinearGradient
        pointerEvents="none"
        colors={["#f8fbff", "#dfe9f7", "#f7efe7"]}
        locations={[0, 0.58, 1]}
        style={styles.backgroundWash}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerShell}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.kicker}>Profile and session</Text>
            <Text style={styles.title}>Account</Text>
            <Text style={styles.subtitle}>{user?.email}</Text>
          </View>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={24} color="#0f172a" />
          </View>
        </View>

        <LinearGradient
          colors={["rgba(255,255,255,0.92)", "rgba(255,255,255,0.58)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.glassGlint} />
          <View style={styles.profileTopRow}>
            <View style={styles.profileIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#0f766e" />
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileLabel}>Signed in as</Text>
              <Text style={styles.profileValue} numberOfLines={2}>
                {user?.email}
              </Text>
            </View>
          </View>
          <View style={styles.sessionPill}>
            <View style={styles.liveDot} />
            <Text style={styles.sessionText}>Session persistence active</Text>
          </View>
        </LinearGradient>

        <View style={styles.summaryRow}>
          <InfoTile
            icon="calendar-clear-outline"
            label="Joined"
            value={joinedLabel}
            tone="#2563eb"
          />
          <InfoTile
            icon="sync-outline"
            label="Updated"
            value={updatedLabel}
            tone="#0f766e"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Text style={styles.sectionHint}>Local session</Text>
        </View>

        <GlassRow
          icon="key-outline"
          title="Authentication"
          detail="Auth + refresh session ready"
          tone="#7c3aed"
        />
        <GlassRow
          icon="lock-closed-outline"
          title="Stored tokens"
          detail="Secure local persistence enabled"
          tone="#0f766e"
        />

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Ionicons name="log-out-outline" size={18} color="#ffffff" />
          <Text style={styles.buttonText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <LinearGradient
      colors={["rgba(255,255,255,0.88)", "rgba(255,255,255,0.5)"]}
      style={styles.infoTile}
    >
      <View style={[styles.tileIcon, { backgroundColor: `${tone}18` }]}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </LinearGradient>
  );
}

function GlassRow({
  icon,
  title,
  detail,
  tone,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  detail: string;
  tone: string;
}) {
  return (
    <LinearGradient
      colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.56)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.rowCard}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${tone}18` }]}>
        <Ionicons name={icon} size={20} color={tone} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={19} color="#059669" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef4fb",
  },
  backgroundWash: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 14,
  },
  headerShell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 2,
  },
  headerTextBlock: {
    flex: 1,
  },
  kicker: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 2,
  },
  subtitle: {
    color: "#64748b",
    marginTop: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#64748b",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    padding: 16,
    gap: 16,
    overflow: "hidden",
    shadowColor: "#64748b",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  glassGlint: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.95)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,184,166,0.16)",
  },
  profileCopy: {
    flex: 1,
    gap: 5,
  },
  profileLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "800",
  },
  profileValue: {
    fontSize: 17,
    color: "#0f172a",
    fontWeight: "800",
    lineHeight: 22,
  },
  sessionPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.84)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#14b8a6",
  },
  sessionText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  infoTile: {
    flex: 1,
    minHeight: 104,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
    padding: 12,
    shadowColor: "#64748b",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tileValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  tileLabel: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionHint: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
    padding: 14,
    shadowColor: "#64748b",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },
  rowDetail: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  button: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0f172a",
    borderRadius: 18,
    paddingVertical: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});
