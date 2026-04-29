import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type FeedbackModalProps = {
  visible: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  onClose: () => void;
};

export function FeedbackModal({
  visible,
  type,
  title,
  message,
  onClose,
}: FeedbackModalProps) {
  const accentColor = type === "success" ? "#059669" : "#dc2626";
  const buttonColor = type === "success" ? "#10b981" : "#ef4444";

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: `${accentColor}20` }]}>
            <Text style={[styles.badgeText, { color: accentColor }]}>
              {type === "success" ? "Success" : "Error"}
            </Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable onPress={onClose} style={[styles.button, { backgroundColor: buttonColor }]}>
            <Text style={styles.buttonText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    gap: 10,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  message: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
