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

export type AICategoryError =
  | "missing_provider_key"
  | "unsupported_provider"
  | "provider_authentication_failed"
  | "provider_rate_limited"
  | "provider_timeout"
  | "provider_network_error"
  | "provider_invalid_model"
  | "provider_invalid_json"
  | "resume_schema_validation_failed"
  | "pdf_parser_import_failed"
  | "pdf_text_extraction_failed";

export class AIProviderError extends Error {
  provider: string;
  category: AICategoryError;
  constructor(provider: string, message: string, category: AICategoryError = "provider_network_error") {
    super(`[${provider}] ${message}`);
    this.provider = provider;
    this.category = category;
  }
}

