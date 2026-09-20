import type { AIProvider, ChatMessage, ChatJSONOptions } from "../types";
import { AIProviderError } from "../types";

/**
 * Generic client for OpenAI-compatible providers that host both chat and
 * embedding models on a single key: Together AI, Fireworks, DeepInfra.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;
  private apiKey: string;
  private baseUrl: string;
  private chatModel: string;
  private embeddingModel: string;

  constructor(opts: { name: string; baseUrl: string; apiKeyEnv: string; defaultChatModel: string; defaultEmbeddingModel: string; apiKey?:string; chatModel?:string; embeddingModel?:string }) {
    const apiKey = opts.apiKey || process.env[opts.apiKeyEnv];
    if (!apiKey) throw new AIProviderError(opts.name, `${opts.apiKeyEnv} is not set`);
    this.name = opts.name;
    this.apiKey = apiKey;
    this.baseUrl = opts.baseUrl;
    this.chatModel = opts.chatModel || process.env.AI_CHAT_MODEL || opts.defaultChatModel;
    this.embeddingModel = opts.embeddingModel || process.env.AI_EMBEDDING_MODEL || opts.defaultEmbeddingModel;
  }

  private headers() {
    return { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" };
  }

  async chatJSON(messages: ChatMessage[], options?: ChatJSONOptions): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(60000),
      headers: this.headers(),
      body: JSON.stringify({
        model: this.chatModel,
        messages,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 2000,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AIProviderError(this.name, `chat completion failed (${res.status}): ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new AIProviderError(this.name, "No content in chat completion response");
    try {
      return JSON.parse(content);
    } catch {
      throw new AIProviderError(this.name, `Model did not return valid JSON: ${content.slice(0, 300)}`);
    }
  }

  async chatStream(
    messages: ChatMessage[],
    onDelta: (text: string) => void,
    options?: ChatStreamOptions
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(60000),
      headers: this.headers(),
      body: JSON.stringify({
        model: this.chatModel,
        messages,
        temperature: options?.temperature ?? 0.4,
        max_tokens: options?.maxTokens ?? 1200,
        stream: true,
      }),

    });
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      throw new AIProviderError(this.name, `chat stream failed (${res.status}): ${body.slice(0, 300)}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            onDelta(delta);
          }
        } catch {
          /* ignore */
        }
      }
    }
    return full;
  }

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      signal: AbortSignal.timeout(60000),
      headers: this.headers(),
      body: JSON.stringify({ model: this.embeddingModel, input: texts }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AIProviderError(this.name, `embeddings failed (${res.status}): ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    const rows = [...json.data].sort((a, b) => a.index - b.index);
    return rows.map((r) => r.embedding as number[]);
  }
}
