import "server-only";
import type { AIProvider, ChatMessage, ChatJSONOptions, ChatStreamOptions } from "../types";
import { AIProviderError } from "../types";

/**
 * Groq serves fast Llama/Mixtral-class chat completions but does not host
 * embedding models. embed()/embedBatch() intentionally throw so callers get
 * a clear error instead of silently falling back to something fake.
 */
export class GroqProvider implements AIProvider {
  readonly name = "groq";
  private apiKey: string;
  private chatModel: string;

  constructor(config?: {apiKey?:string; chatModel?:string}) {
    const apiKey = config?.apiKey || process.env.GROQ_API_KEY;
    if (!apiKey) throw new AIProviderError("groq", "GROQ_API_KEY is not set");
    this.apiKey = apiKey;
    this.chatModel = config?.chatModel || process.env.AI_CHAT_MODEL || "llama-3.3-70b-versatile";
  }

  async chatJSON(messages: ChatMessage[], options?: ChatJSONOptions): Promise<unknown> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(60000),
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
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
      throw new AIProviderError("groq", `chat completion failed (${res.status}): ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new AIProviderError("groq", "No content in chat completion response");
    try {
      return JSON.parse(content);
    } catch {
      throw new AIProviderError("groq", `Model did not return valid JSON: ${content.slice(0, 300)}`);
    }
  }

  async chatStream(
    messages: ChatMessage[],
    onDelta: (text: string) => void,
    options?: ChatStreamOptions
  ): Promise<string> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(60000),
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
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
      throw new AIProviderError("groq", `chat stream failed (${res.status}): ${body.slice(0, 300)}`);
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

  async embed(): Promise<number[]> {
    throw new AIProviderError("groq", "Groq does not serve embedding models — set AI_EMBEDDING_PROVIDER to another provider");
  }

  async embedBatch(): Promise<number[][]> {
    throw new AIProviderError("groq", "Groq does not serve embedding models — set AI_EMBEDDING_PROVIDER to another provider");
  }
}
