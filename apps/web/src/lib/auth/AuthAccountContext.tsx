import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { AuthUser } from "./client";

type AuthAccountValue = {
  user: AuthUser;
};

const AuthAccountContext = createContext<AuthAccountValue | null>(null);

export function AuthAccountProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ user }), [user]);
  return (
    <AuthAccountContext.Provider value={value}>
      {children}
    </AuthAccountContext.Provider>
  );
}

export function useAuthAccount(): AuthAccountValue {
  const ctx = useContext(AuthAccountContext);
  if (!ctx) {
    throw new Error("useAuthAccount must be used within AuthAccountProvider");
  }
  return ctx;
}

export function useAuthAccountOptional(): AuthAccountValue | null {
  return useContext(AuthAccountContext);
}
