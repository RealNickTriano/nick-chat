import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { Header } from "@/components/layout/Header";

export default function GatedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="flex w-full max-w-4xl flex-1 flex-col">
        <Header />
        {children}
      </div>
    </AuthGate>
  );
}
