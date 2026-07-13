export type MockUser = {
  id: number;
  name: string;
  email: string | null;
  role: "user" | "admin";
  openId: string;
};

export type TrpcContext = {
  user: MockUser;
};

// The hardcoded admin user used across all procedures.
export const ADMIN_USER: MockUser = {
  id: 1,
  name: "Administrator",
  email: null,
  role: "admin",
  openId: "local-admin",
};

export function createContext(): TrpcContext {
  return { user: ADMIN_USER };
}
