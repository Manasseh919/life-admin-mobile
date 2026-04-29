import { Link, Redirect, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { FeedbackModal } from "@/components/feedback-modal";
import { useAuth } from "@/context/auth-context";
import { validateEmail, validatePassword } from "@/lib/validation";

export default function LoginScreen() {
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  async function handleSubmit() {
    setBannerMessage(null);
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      return;
    }

    setIsSubmitting(true);
    setBannerMessage("Signing you in...");
    try {
      await login(email, password);
      setModal({
        visible: true,
        type: "success",
        title: "Welcome back",
        message: "You are now signed in.",
      });
      router.replace("/(tabs)");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : "Login failed.";
      setBannerMessage("Sign in failed.");
      setModal({
        visible: true,
        type: "error",
        title: "Sign in failed",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Life Admin Autopilot</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>

      {bannerMessage ? (
        <View style={[styles.banner, isSubmitting ? styles.bannerInfo : styles.bannerError]}>
          {isSubmitting ? <ActivityIndicator size="small" color="#1d4ed8" /> : null}
          <Text style={styles.bannerText}>{bannerMessage}</Text>
        </View>
      ) : null}

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setEmailError(validateEmail(value));
        }}
      />
      {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
      <TextInput
        secureTextEntry
        placeholder="Password"
        style={styles.input}
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setPasswordError(validatePassword(value));
        }}
      />
      {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}

      <Pressable
        disabled={isSubmitting}
        onPress={handleSubmit}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>{isSubmitting ? "Signing in..." : "Sign in"}</Text>
      </Pressable>

      <Link href="/register" style={styles.link}>
        Create account
      </Link>

      <FeedbackModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 16, color: "#4b5563", marginBottom: 8 },
  banner: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  bannerInfo: {
    backgroundColor: "#dbeafe",
  },
  bannerError: {
    backgroundColor: "#fee2e2",
  },
  bannerText: {
    color: "#1f2937",
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 4,
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
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#b91c1c",
  },
  link: {
    marginTop: 4,
    color: "#2563eb",
    fontSize: 15,
  },
});
