"use client";

import { UserMenu } from "@/components/auth/UserMenu";

export function Header() {
  return (
    <header className="flex w-full max-w-4xl items-center justify-between px-4 py-4">
      <h1 className="text-lg font-semibold tracking-tight">All Chat</h1>
      <UserMenu />
    </header>
  );
}
