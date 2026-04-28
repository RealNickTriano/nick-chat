export type ProviderId =
  | "OPEN_AI"
  | "ANTHROPIC"
  | "GOOGLE_AI_GEMINI"
  | "MISTRAL_AI"
  | (string & {});

export interface Model {
  id: string;
  label: string;
  provider: ProviderId;
  description: string | null;
  createdAt: string | null;
}
