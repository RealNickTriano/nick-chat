"use client";

import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "@/components/auth/AuthProvider";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return ctx;
}
