export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatJSONOptions = {
  temperature?: number;
  maxTokens?: number;
};

export type ChatStreamOptions = {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export interface AIProvider {
  readonly name: string;
  /** Chat completion constrained to return valid JSON matching the caller's expectations. */
  chatJSON(messages: ChatMessage[], options?: ChatJSONOptions): Promise<unknown>;
  /** Streaming text chat completion (token deltas). */
  chatStream(
    messages: ChatMessage[],
    onDelta: (text: string) => void,
    options?: ChatStreamOptions
  ): Promise<string>;
  /** Single text embedding. */
  embed(text: string): Promise<number[]>;
  /** Batch text embeddings, one vector per input in order. */
  embedBatch(texts: string[]): Promise<number[][]>;
}

export class AIProviderError extends Error {
  provider: string;
  constructor(provider: string, message: string) {
    super(`[${provider}] ${message}`);
    this.provider = provider;
  }
}
