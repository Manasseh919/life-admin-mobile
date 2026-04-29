import Constants from "expo-constants";

import type { AuthResponse, Obligation, TokenPair, UserMe } from "./types";

const fallbackUrl = "http://localhost:4000";
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  fallbackUrl;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    [key: string]: unknown;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload as T;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(accessToken: string): Promise<UserMe> {
  const result = await request<{ user: UserMe }>("/api/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return result.user;
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  const result = await request<{ tokens: TokenPair }>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  return result.tokens;
}

export async function logout(refreshToken: string): Promise<void> {
  await request<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export async function getObligations(accessToken: string): Promise<Obligation[]> {
  const result = await request<{ obligations: Obligation[] }>("/api/obligations", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return result.obligations;
}
