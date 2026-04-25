import { PlusIcon } from "@/components/svg/Plus";

interface NewChatButtonProps {
  onClick: () => void;
}

export function NewChatButton({ onClick }: NewChatButtonProps) {
  return (
    <div className="px-2.5 pb-2.5">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-[var(--accent)] px-2.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <PlusIcon size={14} />
        <span>New chat</span>
      </button>
    </div>
  );
}
