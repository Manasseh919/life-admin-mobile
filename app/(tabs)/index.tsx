import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { FeedbackModal } from "@/components/feedback-modal";
import { useAuth } from "@/context/auth-context";
import {
  createObligation,
  deleteObligation,
  getObligations,
  updateObligation,
} from "@/lib/api";
import type { Obligation } from "@/lib/types";

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const { user, getValidAccessToken, logout } = useAuth();
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});

  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<Obligation["kind"]>("bill");
  const [newDueDate, setNewDueDate] = useState(new Date(Date.now() + 86400000));
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
      setBannerMessage(data.length ? `${data.length} obligations` : "No obligations yet");
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
    const completed = obligations.filter((item) => item.status === "completed").length;
    const overdue = obligations.filter((item) => item.status === "overdue").length;
    const pending = obligations.length - completed - overdue;
    return { pending, overdue, completed };
  }, [obligations]);

  const prettyDueLabel = useCallback((dueAt: string) => {
    const date = new Date(dueAt);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const dueDateLabel = useMemo(
    () =>
      newDueDate.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [newDueDate],
  );

  const resetComposer = useCallback(() => {
    setEditingId(null);
    setNewTitle("");
    setNewType("bill");
    setNewDueDate(new Date(Date.now() + 86400000));
    setShowDatePicker(false);
  }, []);

  const openCreateComposer = useCallback(() => {
    resetComposer();
    setShowComposer(true);
  }, [resetComposer]);

  const openEditComposer = useCallback((item: Obligation) => {
    setEditingId(item.id);
    setNewTitle(item.title);
    setNewType(item.kind);
    setNewDueDate(new Date(item.dueAt));
    setShowDatePicker(false);
    setShowComposer(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!newTitle.trim()) {
      setModal({
        visible: true,
        type: "error",
        title: "Missing title",
        message: "Enter a short title for this obligation.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const accessToken = await getValidAccessToken();
      if (editingId) {
        await updateObligation(accessToken, editingId, {
          title: newTitle.trim(),
          kind: newType,
          dueAt: newDueDate.toISOString(),
        });
      } else {
        await createObligation(accessToken, {
          type: newType,
          title: newTitle.trim(),
          dueAt: newDueDate.toISOString(),
        });
      }

      setShowComposer(false);
      resetComposer();
      setModal({
        visible: true,
        type: "success",
        title: editingId ? "Updated" : "Added",
        message: editingId
          ? "Obligation updated successfully."
          : "Obligation added to your timeline.",
      });
      await loadObligations();
    } catch (error) {
      setModal({
        visible: true,
        type: "error",
        title: editingId ? "Update failed" : "Create failed",
        message: error instanceof Error ? error.message : "Unable to save obligation.",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    editingId,
    getValidAccessToken,
    loadObligations,
    newDueDate,
    newTitle,
    newType,
    resetComposer,
  ]);

  const markCompleted = useCallback(
    async (id: string) => {
      try {
        const accessToken = await getValidAccessToken();
        await updateObligation(accessToken, id, { status: "completed" });
        await loadObligations();
      } catch (error) {
        setModal({
          visible: true,
          type: "error",
          title: "Update failed",
          message: error instanceof Error ? error.message : "Unable to update obligation.",
        });
      }
    },
    [getValidAccessToken, loadObligations],
  );

  const performDelete = useCallback(
    async (item: Obligation) => {
      try {
        const accessToken = await getValidAccessToken();
        await deleteObligation(accessToken, item.id);
        await loadObligations();
      } catch (error) {
        setModal({
          visible: true,
          type: "error",
          title: "Delete failed",
          message: error instanceof Error ? error.message : "Unable to delete obligation.",
        });
      }
    },
    [getValidAccessToken, loadObligations],
  );

  const requestDelete = useCallback(
    (item: Obligation) => {
      if (item.status !== "completed") {
        Alert.alert(
          "Delete this obligation?",
          "This obligation is not completed yet. Are you sure you want to delete it?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => void performDelete(item),
            },
          ],
        );
        return;
      }
      void performDelete(item);
    },
    [performDelete],
  );

  const closeSwipe = useCallback((id: string) => {
    swipeRefs.current[id]?.close();
  }, []);

  const renderSwipeActions = useCallback(
    (item: Obligation) => (
      <View style={styles.rowActions}>
        <Pressable
          style={[styles.rowActionButton, styles.rowActionEdit]}
          onPress={() => {
            closeSwipe(item.id);
            openEditComposer(item);
          }}
        >
          <Text style={styles.rowActionText}>Edit</Text>
        </Pressable>
        <Pressable
          style={[styles.rowActionButton, styles.rowActionDelete]}
          onPress={() => {
            closeSwipe(item.id);
            requestDelete(item);
          }}
        >
          <Text style={styles.rowActionText}>Delete</Text>
        </Pressable>
      </View>
    ),
    [closeSwipe, openEditComposer, requestDelete],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Timeline</Text>
        <Text style={styles.subheading}>{user?.email}</Text>

        {bannerMessage ? <Text style={styles.bannerText}>{bannerMessage}</Text> : null}

        <View style={styles.summaryRow}>
          <MetricCard label="Pending" value={summary.pending} />
          <MetricCard label="Overdue" value={summary.overdue} />
          <MetricCard label="Done" value={summary.completed} />
        </View>

        <Text style={styles.sectionTitle}>Obligations</Text>
        {isLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="small" color="#374151" />
            <Text style={styles.emptyText}>Loading timeline...</Text>
          </View>
        ) : obligations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No obligations yet</Text>
          </View>
        ) : (
          obligations.map((item) => (
            <Swipeable
              key={item.id}
              ref={(ref) => {
                swipeRefs.current[item.id] = ref;
              }}
              renderRightActions={() => renderSwipeActions(item)}
              overshootRight={false}
              containerStyle={styles.swipeContainer}
            >
              <View style={styles.itemCard}>
                <View style={styles.glassOverlay} />
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.itemMeta}>
                  {item.kind.toUpperCase()} • Due {prettyDueLabel(item.dueAt)}
                </Text>
                {item.status !== "completed" ? (
                  <Pressable
                    style={styles.completeButton}
                    onPress={() => void markCompleted(item.id)}
                  >
                    <Text style={styles.completeButtonText}>Mark completed</Text>
                  </Pressable>
                ) : null}
              </View>
            </Swipeable>
          ))
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: Math.max(insets.bottom + 12, 24) }]}
        onPress={openCreateComposer}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <Modal
        transparent
        animationType="slide"
        visible={showComposer}
        onRequestClose={() => setShowComposer(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 12, 18) }]}>
            <Text style={styles.sheetTitle}>
              {editingId ? "Update obligation" : "New obligation"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <Pressable style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateLabel}>Due date</Text>
              <Text style={styles.dateValue}>{dueDateLabel}</Text>
            </Pressable>
            {showDatePicker ? (
              <DateTimePicker
                value={newDueDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={(_, selectedDate) => {
                  if (Platform.OS !== "ios") {
                    setShowDatePicker(false);
                  }
                  if (selectedDate) {
                    setNewDueDate(selectedDate);
                  }
                }}
              />
            ) : null}

            <View style={styles.typeRow}>
              {(["bill", "subscription", "document", "other"] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setNewType(type)}
                  style={[styles.typeChip, newType === type && styles.typeChipActive]}
                >
                  <Text
                    style={[styles.typeChipText, newType === type && styles.typeChipTextActive]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sheetButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setShowComposer(false);
                  resetComposer();
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={() => void handleSave()}>
                <Text style={styles.saveText}>
                  {isSaving ? "Saving..." : editingId ? "Update" : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FeedbackModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: Obligation["status"] }) {
  const style =
    status === "completed"
      ? styles.badgeDone
      : status === "overdue"
        ? styles.badgeOverdue
        : styles.badgePending;
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#e9edf3" },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  heading: { fontSize: 30, fontWeight: "700", color: "#0f172a" },
  subheading: { color: "#64748b", marginTop: -2, marginBottom: 4 },
  bannerText: { color: "#475569", fontSize: 13 },
  summaryRow: { flexDirection: "row", gap: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.56)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    padding: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  metricValue: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  metricLabel: { marginTop: 4, color: "#64748b", fontSize: 12 },
  sectionTitle: { marginTop: 10, fontSize: 18, fontWeight: "600", color: "#0f172a" },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.56)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { color: "#64748b" },
  swipeContainer: { borderRadius: 16, marginBottom: 10 },
  rowActions: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "flex-end",
    gap: 8,
    paddingLeft: 12,
    marginBottom: 10,
  },
  rowActionButton: {
    width: 88,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  rowActionEdit: { backgroundColor: "#334155" },
  rowActionDelete: { backgroundColor: "#b91c1c" },
  rowActionText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.6)",
    padding: 14,
    gap: 8,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  itemTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: "#0f172a" },
  itemMeta: { color: "#64748b", fontSize: 12 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  badgePending: { backgroundColor: "#fef3c7" },
  badgeOverdue: { backgroundColor: "#fee2e2" },
  badgeDone: { backgroundColor: "#dcfce7" },
  completeButton: {
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  completeButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 30, fontWeight: "400" },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.28)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "rgba(248,250,252,0.94)",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    padding: 18,
    gap: 12,
  },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  dateRow: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.72)",
    gap: 2,
  },
  dateLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  dateValue: { fontSize: 15, color: "#0f172a", fontWeight: "600" },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  typeChipActive: {
    borderColor: "#0f172a",
    backgroundColor: "#0f172a",
  },
  typeChipText: { color: "#334155", fontSize: 12, textTransform: "capitalize" },
  typeChipTextActive: { color: "#fff" },
  sheetButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    paddingVertical: 11,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  cancelText: { color: "#334155", fontWeight: "600" },
  saveButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    alignItems: "center",
    paddingVertical: 11,
  },
  saveText: { color: "#fff", fontWeight: "700" },
});
