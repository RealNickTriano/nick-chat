import type { ProviderId } from "@/types/model";

interface AgentAvatarProps {
  providerId: ProviderId;
  size?: number;
}

export function providerColor(providerId: ProviderId): string {
  switch (providerId) {
    case "OPEN_AI":
      return "var(--agent-a)";
    case "ANTHROPIC":
      return "var(--agent-b)";
    case "GOOGLE":
      return "var(--agent-c)";
    default:
      return "var(--text3)";
  }
}

function providerInitials(providerId: ProviderId): string {
  switch (providerId) {
    case "OPEN_AI":
      return "OA";
    case "ANTHROPIC":
      return "An";
    case "GOOGLE":
      return "Go";
    case "MISTRAL":
      return "Mi";
    default:
      return "?";
  }
}

export function AgentAvatar({ providerId, size = 28 }: AgentAvatarProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-mono font-medium text-white"
      style={{
        width: size,
        height: size,
        background: providerColor(providerId),
        fontSize: size * 0.36,
      }}
    >
      {providerInitials(providerId)}
    </div>
  );
}
