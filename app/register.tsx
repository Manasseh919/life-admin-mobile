import { Link, Redirect, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { FeedbackModal } from "@/components/feedback-modal";
import { useAuth } from "@/context/auth-context";
import { validateEmail, validatePassword } from "@/lib/validation";

export default function RegisterScreen() {
  const { isAuthenticated, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
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
    const nextConfirmError =
      confirmPassword !== password ? "Passwords do not match." : null;
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmError);
    if (nextEmailError || nextPasswordError || nextConfirmError) {
      return;
    }

    setIsSubmitting(true);
    setBannerMessage("Creating your account...");
    try {
      await register(email, password);
      setModal({
        visible: true,
        type: "success",
        title: "Account created",
        message: "Your account is ready. Welcome to Life Admin Autopilot.",
      });
      router.replace("/(tabs)");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : "Registration failed.";
      setBannerMessage("Account creation failed.");
      setModal({
        visible: true,
        type: "error",
        title: "Registration failed",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Get started with your life admin dashboard</Text>

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
          setConfirmPasswordError(
            confirmPassword && confirmPassword !== value ? "Passwords do not match." : null,
          );
        }}
      />
      {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
      <TextInput
        secureTextEntry
        placeholder="Confirm password"
        style={styles.input}
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          setConfirmPasswordError(value !== password ? "Passwords do not match." : null);
        }}
      />
      {confirmPasswordError ? <Text style={styles.error}>{confirmPasswordError}</Text> : null}

      <Pressable
        disabled={isSubmitting}
        onPress={handleSubmit}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>{isSubmitting ? "Creating account..." : "Create account"}</Text>
      </Pressable>

      <Link href="/login" style={styles.link}>
        Already have an account? Sign in
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
