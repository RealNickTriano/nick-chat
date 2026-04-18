export type ProviderId = "OPEN_AI" | "ANTHROPIC" | "GOOGLE" | "MISTRAL" | (string & {});

export interface Model {
  id: string;
  label: string;
  provider: ProviderId;
  description: string | null;
  createdAt: string | null;
}
