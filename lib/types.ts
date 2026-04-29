export type UserMe = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: UserMe;
  tokens: TokenPair;
};

export type Obligation = {
  id: string;
  kind: "bill" | "subscription" | "document" | "other";
  title: string;
  dueAt: string;
  status: "pending" | "completed" | "overdue";
};
