"use client";

import { useAuth } from "@/hooks/use-auth";
import { SettingsIcon } from "@/components/svg/Settings";
import { UserIcon } from "@/components/svg/User";

const iconButton =
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[var(--text2)] transition-colors hover:bg-[var(--bg3)]";

export function UserBanner() {
  const { user } = useAuth();

  return (
    <div className="flex items-center gap-2.5 border-t border-[var(--border)] px-3 pt-2.5 pb-3.5">
      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] text-[var(--text2)]">
        <UserIcon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{user?.displayName ?? "Guest"}</div>
        <div className="truncate text-[11px] text-[var(--text3)]">
          {user?.email ?? "Not signed in"}
        </div>
      </div>
      {/* <button
        type="button"
        className={iconButton}
        aria-label="Settings"
        title="Settings"
      >
        <SettingsIcon size={14} />
      </button> */}
    </div>
  );
}
