import { createContext, useContext } from "react";

import { commands } from "@/types/tauri.gen";

export interface AuthContext {
  isAuthenticated(): Promise<boolean>;
}

const AuthContext = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = commands.isAuthenticated;

  return (
    <AuthContext.Provider value={{ isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
