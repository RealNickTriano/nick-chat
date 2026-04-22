"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignInButton } from "@/components/auth/SignInButton";
import { useAuth } from "@/hooks/use-auth";

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "Your sign-in attempt expired. Please try again.",
  email_unverified: "Verify your email address with Google, then try again.",
  provider_error: "Sign-in was cancelled or failed. Please try again.",
  server_error: "Something went wrong on our side. Please try again.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const { status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("auth_error");
  const error = code ? (ERROR_MESSAGES[code] ?? ERROR_MESSAGES.server_error) : null;

  useEffect(() => {
    if (!code) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("auth_error");
    window.history.replaceState({}, "", url.toString());
  }, [code]);

  useEffect(() => {
    if (status === "authed") {
      router.replace("/");
    }
  }, [status, router]);

  return <LoginShell error={error} />;
}

function LoginShell({ error = null }: { error?: string | null }) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">All Chat</h1>
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {error}
          </div>
        )}
        <SignInButton />
      </div>
    </main>
  );
}
