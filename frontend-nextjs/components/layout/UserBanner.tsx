"use client";

import { useAuth } from "@/hooks/use-auth";
import { UserIcon } from "@/components/svg/User";

interface UserBannerProps {
  onClick: () => void;
}

export function UserBanner({ onClick }: UserBannerProps) {
  const { user } = useAuth();

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2.5 border-t border-[var(--border)] bg-transparent px-3 pt-2.5 pb-3.5 text-left transition-colors duration-[120ms] ease-[ease] hover:bg-[var(--bg3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] text-[var(--text2)]">
        <UserIcon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{user?.displayName ?? "Guest"}</div>
        <div className="truncate text-[11px] text-[var(--text3)]">
          {user?.email ?? "Not signed in"}
        </div>
      </div>
    </button>
  );
}
