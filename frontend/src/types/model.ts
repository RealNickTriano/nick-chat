export interface ModelDescription {
  name: string;
  displayName: string;
  description: string | null; //likely null
  provider: ModelProvider;
  type: ModelType | null; // likely null
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  createdAt: string; // ISO-8601 string from Java Instant
  owner: string;
}

// Supporting enums/types based on standard LangChain4j structures
export type ModelProvider = 'OPEN_AI' | 'ANTHROPIC' | 'GOOGLE' | 'MISTRAL' | string;

export type ModelType = 'CHAT' | 'EMBEDDING' | 'LANGUAGE' | string;