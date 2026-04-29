import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

type IconName = ComponentProps<typeof Ionicons>["name"];

const KIND_META: Record<
  Obligation["kind"],
  { icon: IconName; label: string; tint: string; wash: string }
> = {
  bill: { icon: "receipt-outline", label: "Bill", tint: "#0f766e", wash: "rgba(20,184,166,0.16)" },
  subscription: {
    icon: "repeat-outline",
    label: "Subscription",
    tint: "#7c3aed",
    wash: "rgba(124,58,237,0.14)",
  },
  document: {
    icon: "document-text-outline",
    label: "Document",
    tint: "#2563eb",
    wash: "rgba(37,99,235,0.14)",
  },
  other: {
    icon: "sparkles-outline",
    label: "Other",
    tint: "#b45309",
    wash: "rgba(245,158,11,0.18)",
  },
};

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
        <LinearGradient
          colors={["rgba(255,255,255,0.96)", "rgba(226,232,240,0.86)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionTray}
        >
          <Pressable
            style={[styles.rowActionButton, styles.rowActionEdit]}
            onPress={() => {
              closeSwipe(item.id);
              openEditComposer(item);
            }}
          >
            <Ionicons name="create-outline" size={20} color="#0f172a" />
            <Text style={styles.rowActionText}>Edit</Text>
          </Pressable>
          <Pressable
            style={[styles.rowActionButton, styles.rowActionDelete]}
            onPress={() => {
              closeSwipe(item.id);
              requestDelete(item);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#ffffff" />
            <Text style={[styles.rowActionText, styles.rowActionDeleteText]}>Delete</Text>
          </Pressable>
        </LinearGradient>
      </View>
    ),
    [closeSwipe, openEditComposer, requestDelete],
  );

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
            <Text style={styles.kicker}>Personal timeline</Text>
            <Text style={styles.heading}>Obligations</Text>
            <Text style={styles.subheading}>{user?.email}</Text>
          </View>
          <Pressable style={styles.headerButton} onPress={() => void loadObligations()}>
            <Ionicons name="sync-outline" size={19} color="#0f172a" />
          </Pressable>
        </View>

        {bannerMessage ? (
          <View style={styles.bannerPill}>
            <View style={styles.liveDot} />
            <Text style={styles.bannerText}>{bannerMessage}</Text>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <MetricCard label="Pending" value={summary.pending} tone="#2563eb" icon="time-outline" />
          <MetricCard label="Overdue" value={summary.overdue} tone="#dc2626" icon="alert-circle-outline" />
          <MetricCard label="Done" value={summary.completed} tone="#059669" icon="checkmark-done-outline" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <Text style={styles.sectionHint}>Swipe left for actions</Text>
        </View>
        {isLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="small" color="#0f766e" />
            <Text style={styles.emptyText}>Loading timeline...</Text>
          </View>
        ) : obligations.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-clear-outline" size={24} color="#0f766e" />
            </View>
            <Text style={styles.emptyText}>No obligations yet</Text>
          </View>
        ) : (
          obligations.map((item) => {
            const meta = KIND_META[item.kind];
            return (
              <Swipeable
                key={item.id}
                ref={(ref) => {
                  swipeRefs.current[item.id] = ref;
                }}
                renderRightActions={() => renderSwipeActions(item)}
                overshootRight={false}
                friction={2}
                rightThreshold={42}
                containerStyle={styles.swipeContainer}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.92)", "rgba(255,255,255,0.58)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.itemCard}
                >
                  <View style={styles.glassGlint} />
                  <View style={styles.itemTopRow}>
                    <View style={[styles.kindIcon, { backgroundColor: meta.wash }]}>
                      <Ionicons name={meta.icon} size={20} color={meta.tint} />
                    </View>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.kindText}>{meta.label}</Text>
                        <View style={styles.metaDot} />
                        <Text style={styles.itemMeta}>Due {prettyDueLabel(item.dueAt)}</Text>
                      </View>
                    </View>
                    <StatusBadge status={item.status} />
                  </View>
                  <View style={styles.itemFooter}>
                    <View style={styles.swipeCue}>
                      <Ionicons name="chevron-back" size={13} color="#64748b" />
                      <Text style={styles.swipeCueText}>Swipe</Text>
                    </View>
                    {item.status !== "completed" ? (
                      <Pressable
                        style={styles.completeButton}
                        onPress={() => void markCompleted(item.id)}
                      >
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                        <Text style={styles.completeButtonText}>Done</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.completedMark}>
                        <Ionicons name="checkmark-circle" size={16} color="#059669" />
                        <Text style={styles.completedText}>Completed</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </Swipeable>
            );
          })
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: Math.max(insets.bottom + 12, 24) }]}
        onPress={openCreateComposer}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.96)", "rgba(220,238,255,0.72)"]}
          style={styles.fabGlass}
        >
          <Ionicons name="add" size={30} color="#0f172a" />
        </LinearGradient>
      </Pressable>

      <Modal
        transparent
        animationType="slide"
        visible={showComposer}
        onRequestClose={() => setShowComposer(false)}
      >
        <View style={styles.sheetBackdrop}>
          <LinearGradient
            colors={["rgba(255,255,255,0.98)", "rgba(244,248,252,0.92)"]}
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 12, 18) }]}
          >
            <View style={styles.sheetGrabber} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editingId ? "Update obligation" : "New obligation"}
              </Text>
              <Pressable
                style={styles.sheetClose}
                onPress={() => {
                  setShowComposer(false);
                  resetComposer();
                }}
              >
                <Ionicons name="close" size={18} color="#334155" />
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor="#94a3b8"
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <Pressable style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
              <View>
                <Text style={styles.dateLabel}>Due date</Text>
                <Text style={styles.dateValue}>{dueDateLabel}</Text>
              </View>
              <Ionicons name="calendar-outline" size={20} color="#0f766e" />
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
                  <Ionicons
                    name={KIND_META[type].icon}
                    size={15}
                    color={newType === type ? "#ffffff" : KIND_META[type].tint}
                  />
                  <Text
                    style={[styles.typeChipText, newType === type && styles.typeChipTextActive]}
                  >
                    {KIND_META[type].label}
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
                <Ionicons name="checkmark" size={17} color="#ffffff" />
                <Text style={styles.saveText}>
                  {isSaving ? "Saving..." : editingId ? "Update" : "Save"}
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
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

function MetricCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: string;
  icon: IconName;
}) {
  return (
    <LinearGradient
      colors={["rgba(255,255,255,0.88)", "rgba(255,255,255,0.5)"]}
      style={styles.metricCard}
    >
      <View style={[styles.metricIcon, { backgroundColor: `${tone}18` }]}>
        <Ionicons name={icon} size={17} color={tone} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </LinearGradient>
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
  screen: { flex: 1, backgroundColor: "#eef4fb" },
  backgroundWash: {
    ...StyleSheet.absoluteFillObject,
  },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 128, gap: 14 },
  headerShell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 2,
  },
  headerTextBlock: { flex: 1 },
  kicker: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heading: { fontSize: 34, fontWeight: "800", color: "#0f172a", marginTop: 2 },
  subheading: { color: "#64748b", marginTop: 2 },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#64748b",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  bannerPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#14b8a6",
  },
  bannerText: { color: "#475569", fontSize: 12, fontWeight: "600" },
  summaryRow: { flexDirection: "row", gap: 10, marginTop: 2 },
  metricCard: {
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
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: { fontSize: 27, fontWeight: "800", color: "#0f172a" },
  metricLabel: { marginTop: 3, color: "#64748b", fontSize: 12, fontWeight: "600" },
  sectionHeader: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  sectionHint: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.64)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.86)",
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#64748b",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,184,166,0.14)",
  },
  emptyText: { color: "#64748b", fontWeight: "600" },
  swipeContainer: { borderRadius: 24, marginBottom: 12, overflow: "visible" },
  rowActions: {
    width: 176,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  actionTray: {
    flex: 1,
    width: 164,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "flex-end",
    gap: 8,
    borderRadius: 24,
    padding: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.86)",
    overflow: "hidden",
    shadowColor: "#64748b",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  rowActionButton: {
    flex: 1,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.58)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  rowActionEdit: { backgroundColor: "rgba(255,255,255,0.74)" },
  rowActionDelete: { backgroundColor: "#dc2626" },
  rowActionText: { color: "#0f172a", fontWeight: "800", fontSize: 12 },
  rowActionDeleteText: { color: "#ffffff" },
  itemCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    padding: 14,
    gap: 14,
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
  itemTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  kindIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCopy: { flex: 1, gap: 7 },
  itemTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", lineHeight: 21 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  kindText: { color: "#334155", fontSize: 12, fontWeight: "800" },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#94a3b8" },
  itemMeta: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  swipeCue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    opacity: 0.84,
  },
  swipeCueText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", color: "#0f172a" },
  badgePending: { backgroundColor: "rgba(254,243,199,0.82)", borderColor: "rgba(245,158,11,0.22)" },
  badgeOverdue: { backgroundColor: "rgba(254,226,226,0.88)", borderColor: "rgba(220,38,38,0.2)" },
  badgeDone: { backgroundColor: "rgba(220,252,231,0.86)", borderColor: "rgba(5,150,105,0.18)" },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0f172a",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  completeButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  completedMark: { flexDirection: "row", alignItems: "center", gap: 5 },
  completedText: { color: "#047857", fontSize: 12, fontWeight: "800" },
  fab: {
    position: "absolute",
    right: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  fabGlass: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.34)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
    padding: 20,
    gap: 14,
  },
  sheetGrabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(100,116,139,0.3)",
    marginBottom: 2,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(226,232,240,0.74)",
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(203,213,225,0.78)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    backgroundColor: "rgba(255,255,255,0.74)",
    color: "#0f172a",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(203,213,225,0.78)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.74)",
    gap: 2,
  },
  dateLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  dateValue: { fontSize: 16, color: "#0f172a", fontWeight: "800", marginTop: 3 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(203,213,225,0.8)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.74)",
  },
  typeChipActive: {
    borderColor: "#0f172a",
    backgroundColor: "#0f172a",
  },
  typeChipText: { color: "#334155", fontSize: 12, fontWeight: "800" },
  typeChipTextActive: { color: "#fff" },
  sheetButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(203,213,225,0.86)",
    alignItems: "center",
    paddingVertical: 13,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  cancelText: { color: "#334155", fontWeight: "800" },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 16,
    backgroundColor: "#0f172a",
    paddingVertical: 13,
  },
  saveText: { color: "#fff", fontWeight: "800" },
});
