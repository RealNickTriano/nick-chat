"use client";

import { loginUrl } from "@/lib/auth";
import Image from "next/image";
import GoogleLogo from "../../assets/google/google-icon-logo.svg";

export function SignInButton() {
  return (
    <a
      href={loginUrl()}
      className="inline-flex items-center gap-3 rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-medium text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:outline-white"
    >
      <Image src={GoogleLogo} alt="Google Logo" width={20} height={20} />
      Sign in with Google
    </a>
  );
}
