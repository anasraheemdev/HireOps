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
  | "invalid_provider_configuration"
  | "app_secret_decryption_failed"
  | "provider_authentication_failed"
  | "provider_payment_required"
  | "provider_forbidden"
  | "provider_model_not_found"
  | "provider_rate_limited"
  | "provider_timeout"
  | "provider_network_error"
  | "provider_upstream_error"
  | "provider_empty_response"
  | "provider_invalid_json"
  | "resume_schema_validation_failed"
  | "pdf_parser_import_failed"
  | "pdf_text_extraction_failed"
  | "storage_upload_failed"
  | "unknown_ai_error";

export type ResumeParseDiagnostics = {
  requestId: string;
  extraction: {
    succeeded: boolean;
    method: string;
    characterCount: number;
  };
  aiParsing: {
    succeeded: boolean;
    provider: string | null;
    model: string | null;
    fallbackUsed: boolean;
    errorCode: AICategoryError | string | null;
  };
  configurationSource?: "organization" | "environment";
  totalDurationMs?: number;
};

export class AIProviderError extends Error {
  provider: string;
  category: AICategoryError;
  constructor(provider: string, message: string, category: AICategoryError = "provider_network_error") {
    super(`[${provider}] ${message}`);
    this.provider = provider;
    this.category = category;
  }
}


