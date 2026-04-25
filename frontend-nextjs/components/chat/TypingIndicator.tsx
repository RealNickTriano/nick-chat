import type { ProviderId } from "@/types/model";
import { AgentAvatar } from "./AgentAvatar";

interface TypingIndicatorProps {
  providerId: ProviderId;
}

export function TypingIndicator({ providerId }: TypingIndicatorProps) {
  return (
    <div className="flex w-full items-start gap-2.5">
      <AgentAvatar providerId={providerId} />
      <div className="bg-[var(--bg2)] px-4 py-3" style={{ borderRadius: "4px 18px 18px 18px" }}>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[var(--text3)]"
              style={{
                animation: "typing-bounce 1.2s infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
