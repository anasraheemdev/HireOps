import type { AIProvider, ChatMessage, ChatJSONOptions, ChatStreamOptions } from "../types";
import { AIProviderError } from "../types";

const BASE_URL = "https://openrouter.ai/api/v1";

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("no json object");
  }
}

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";
  private apiKey: string;
  private chatModel: string;
  private embeddingModel: string;

  constructor(config?: {apiKey?:string; chatModel?:string; embeddingModel?:string}) {
    const apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY || process.env.AI_PROVIDER_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(
        "openrouter",
        "OPENROUTER_API_KEY is not set in environment variables or app settings. Please set OPENROUTER_API_KEY in AWS Amplify Console."
      );
    }
    this.apiKey = apiKey;
    this.chatModel = config?.chatModel || process.env.AI_CHAT_MODEL || "qwen/qwen-2.5-72b-instruct";
    this.embeddingModel = config?.embeddingModel || process.env.AI_EMBEDDING_MODEL || "openai/text-embedding-3-small";
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://hireops.app",
      "X-Title": "HireOps",
    };
  }

  async chatJSON(messages: ChatMessage[], options?: ChatJSONOptions): Promise<unknown> {
    const bodyBase = {
      model: this.chatModel,
      messages: [
        ...messages,
        {
          role: "system" as const,
          content: "Return a single valid JSON object only. No markdown fences.",
        },
      ],
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 2000,
      // Prefer providers that honor chat/completions + JSON; skip flaky routes.
      provider: {
        allow_fallbacks: true,
        require_parameters: true,
        ignore: ["Novita"],
      },
    };

    const post = (body: Record<string, unknown>) =>
      fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
      signal: AbortSignal.timeout(60000),
        headers: this.headers(),
        body: JSON.stringify(body),
      });

    // Prefer json_object when supported; fall back for providers that reject it.
    let res = await post({ ...bodyBase, response_format: { type: "json_object" } });

    if (!res.ok) {
      let errBody = await res.text().catch(() => "");
      const needsPlain =
        res.status === 400 &&
        /json_object|response format|not supported|INVALID_REQUEST|require_parameters/i.test(errBody);

      if (needsPlain) {
        res = await post(bodyBase);
        if (!res.ok) {
          errBody = await res.text().catch(() => "");
          const { provider: _ignored, ...loose } = bodyBase;
          void _ignored;
          res = await post(loose);
          if (!res.ok) errBody = await res.text().catch(() => errBody);
        }
      }

      if (!res.ok) {
        // If 429 rate limit or 503 upstream error, retry with fallback models
        if (res.status === 429 || res.status === 503) {
          const fallbackModels = [
            "meta-llama/llama-3.3-70b-instruct",
            "google/gemini-2.0-flash-001",
            "deepseek/deepseek-chat",
          ];
          for (const fallbackModel of fallbackModels) {
            if (fallbackModel === this.chatModel) continue;
            await new Promise((r) => setTimeout(r, 1000));
            const retryRes = await post({ ...bodyBase, model: fallbackModel });
            if (retryRes.ok) {
              res = retryRes;
              break;
            }
          }
        }
      }

      if (!res.ok) {
        throw new AIProviderError(
          "openrouter",
          `chat completion failed (${res.status}): ${errBody.slice(0, 300)}`
        );
      }
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new AIProviderError("openrouter", "No content in chat completion response");

    try {
      return parseJsonContent(content);
    } catch {
      throw new AIProviderError(
        "openrouter",
        `Model did not return valid JSON: ${String(content).slice(0, 300)}`
      );
    }
  }

  async chatStream(
    messages: ChatMessage[],
    onDelta: (text: string) => void,
    options?: ChatStreamOptions
  ): Promise<string> {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
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
      throw new AIProviderError("openrouter", `chat stream failed (${res.status}): ${body.slice(0, 300)}`);
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
          const json = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            onDelta(delta);
          }
        } catch {
          // ignore malformed SSE chunks
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
    const res = await fetch(`${BASE_URL}/embeddings`, {
      method: "POST",
      signal: AbortSignal.timeout(60000),
      headers: this.headers(),
      body: JSON.stringify({ model: this.embeddingModel, input: texts }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AIProviderError("openrouter", `embeddings failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const json = await res.json();
    const rows = [...json.data].sort((a, b) => a.index - b.index);
    return rows.map((r) => r.embedding as number[]);
  }
}
