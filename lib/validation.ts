export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) {
    return "Email is required.";
  }
  if (!/\S+@\S+\.\S+/.test(value)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}
