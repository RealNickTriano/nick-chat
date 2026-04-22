"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anon") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "authed") {
    return <>{children}</>;
  }

  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="flex flex-1 items-center justify-center"
    />
  );
}
