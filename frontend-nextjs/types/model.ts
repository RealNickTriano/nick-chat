export type ProviderId =
  | "OPEN_AI"
  | "ANTHROPIC"
  | "GOOGLE_AI_GEMINI"
  | "MISTRAL_AI"
  | (string & {});

export type ModelType =
  | "CHAT"
  | "EMBEDDING"
  | "IMAGE_GENERATION"
  | "AUDIO_TRANSCRIPTION"
  | "AUDIO_GENERATION"
  | "MODERATION"
  | "SCORING"
  | "OTHER"
  | (string & {});

export interface Model {
  id: string;
  displayName: string;
  description: string | null;
  provider: ProviderId;
  type: ModelType | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  createdAt: string | null;
  owner: string | null;
}
