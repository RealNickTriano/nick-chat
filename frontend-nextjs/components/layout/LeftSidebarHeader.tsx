import { ChevronLeftIcon } from "@/components/svg/ChevronLeft";

interface LeftSidebarHeaderProps {
  onCollapse: () => void;
}

const iconButton =
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[var(--text2)] transition-colors hover:bg-[var(--bg3)]";

export function LeftSidebarHeader({ onCollapse }: LeftSidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3.5 pt-4 pb-2.5">
      <span className="text-[15px] font-semibold tracking-[-0.02em]">AllChat</span>
      <button
        type="button"
        onClick={onCollapse}
        className={iconButton}
        aria-label="Collapse sidebar"
        title="Collapse"
      >
        <ChevronLeftIcon size={15} />
      </button>
    </div>
  );
}
