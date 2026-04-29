import Constants from "expo-constants";

import type { AuthResponse, Obligation, TokenPair, UserMe } from "./types";

const fallbackUrl = "http://localhost:4000";
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  fallbackUrl;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(options?.headers ?? {}),
  };

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: mergedHeaders,
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

export async function createObligation(
  accessToken: string,
  payload: { type: Obligation["kind"]; title: string; dueAt: string },
): Promise<Obligation> {
  const result = await request<{ obligation: Obligation }>("/api/obligations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  return result.obligation;
}

export async function updateObligation(
  accessToken: string,
  id: string,
  payload: Partial<Pick<Obligation, "status" | "title" | "kind" | "dueAt">>,
): Promise<Obligation> {
  const { kind, ...rest } = payload;
  const body = kind ? { ...rest, type: kind } : rest;
  const result = await request<{ obligation: Obligation }>(`/api/obligations/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  return result.obligation;
}

export async function deleteObligation(accessToken: string, id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/obligations/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
