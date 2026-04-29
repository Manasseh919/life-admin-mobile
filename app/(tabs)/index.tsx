import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FeedbackModal } from "@/components/feedback-modal";
import { useAuth } from "@/context/auth-context";
import { getObligations } from "@/lib/api";
import type { Obligation } from "@/lib/types";

export default function TimelineScreen() {
  const { user, getValidAccessToken, logout } = useAuth();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    visible: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({
    visible: false,
    type: "success",
    title: "",
    message: "",
  });

  const loadObligations = useCallback(async () => {
    setIsLoading(true);
    setBannerMessage("Syncing obligations...");
    try {
      const accessToken = await getValidAccessToken();
      const data = await getObligations(accessToken);
      setObligations(data);
      setBannerMessage(`Loaded ${data.length} obligations.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load obligations.";
      setBannerMessage("Could not sync obligations.");
      setModal({
        visible: true,
        type: "error",
        title: "Sync failed",
        message,
      });
      if (message.includes("No active session")) {
        await logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [getValidAccessToken, logout]);

  useEffect(() => {
    void loadObligations();
  }, [loadObligations]);

  const summary = useMemo(() => {
    const overdue = obligations.filter((item) => item.status === "overdue").length;
    return {
      upcoming: obligations.length - overdue,
      overdue,
    };
  }, [obligations]);

  const prettyDueLabel = useCallback((dueAt: string) => {
    const date = new Date(dueAt);
    return `Due ${date.toLocaleDateString()}`;
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Life Admin Timeline</Text>
      <Text style={styles.subheading}>Welcome back, {user?.email}</Text>

      {bannerMessage ? (
        <View style={styles.banner}>
          {isLoading ? <ActivityIndicator size="small" color="#1d4ed8" /> : null}
          <Text style={styles.bannerText}>{bannerMessage}</Text>
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.upcoming}</Text>
          <Text style={styles.summaryLabel}>Upcoming</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.overdue}</Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>What needs attention</Text>
      {isLoading ? (
        <View style={styles.itemCard}>
          <Text style={styles.itemDue}>Loading obligations...</Text>
        </View>
      ) : obligations.length === 0 ? (
        <View style={styles.itemCard}>
          <Text style={styles.itemDue}>No obligations yet.</Text>
        </View>
      ) : (
        obligations.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <Text style={styles.itemKind}>{item.kind}</Text>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDue}>{prettyDueLabel(item.dueAt)}</Text>
          </View>
        ))
      )}

      <Pressable style={styles.reloadButton} onPress={() => void loadObligations()}>
        <Text style={styles.reloadButtonText}>Refresh timeline</Text>
      </Pressable>

      <FeedbackModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, gap: 12 },
  heading: { fontSize: 28, fontWeight: "700", color: "#111827" },
  subheading: { fontSize: 15, color: "#4b5563" },
  banner: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#dbeafe",
  },
  bannerText: {
    color: "#1f2937",
    fontSize: 14,
    fontWeight: "500",
  },
  summaryRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
  },
  summaryValue: { fontSize: 24, fontWeight: "700", color: "#111827" },
  summaryLabel: { marginTop: 2, color: "#6b7280" },
  sectionTitle: { marginTop: 14, fontSize: 18, fontWeight: "600", color: "#111827" },
  itemCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  itemKind: { fontSize: 12, color: "#6b7280", textTransform: "uppercase" },
  itemTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  itemDue: { fontSize: 14, color: "#374151" },
  reloadButton: {
    marginTop: 8,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  reloadButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
