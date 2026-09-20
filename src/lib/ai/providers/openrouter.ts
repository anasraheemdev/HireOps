import type { AIProvider, ChatMessage, ChatJSONOptions, ChatStreamOptions, AICategoryError } from "../types";
import { AIProviderError } from "../types";

const BASE_URL = "https://openrouter.ai/api/v1";

function mapHttpStatusToCategory(status: number): AICategoryError {
  if (status === 401) return "provider_authentication_failed";
  if (status === 402) return "provider_payment_required";
  if (status === 403) return "provider_forbidden";
  if (status === 404) return "provider_model_not_found";
  if (status === 429) return "provider_rate_limited";
  if (status >= 500) return "provider_upstream_error";
  return "provider_network_error";
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        // Continue to object extraction fallback below
      }
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // Failed object slice
      }
    }
    throw new Error("no json object");
  }
}

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";
  private apiKey: string;
  private chatModel: string;
  private embeddingModel: string;

  constructor(config?: { apiKey?: string; chatModel?: string; embeddingModel?: string }) {
    const apiKey =
      config?.apiKey ||
      process.env.OPENROUTER_API_KEY ||
      process.env.AI_PROVIDER_KEY ||
      process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      throw new AIProviderError(
        "openrouter",
        "OPENROUTER_API_KEY is not set in environment variables or app settings.",
        "missing_provider_key"
      );
    }
    this.apiKey = apiKey.trim();
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
          content: "Return a single valid JSON object only. Do not wrap in markdown or add conversational intro text.",
        },
      ],
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 2500,
      provider: {
        allow_fallbacks: true,
        ignore: ["Novita"],
      },
    };

    const post = (body: Record<string, unknown>, signal?: AbortSignal) =>
      fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        signal: signal || AbortSignal.timeout(35000),
        headers: this.headers(),
        body: JSON.stringify(body),
      });

    let res: Response;
    let lastStatus = 500;
    let lastErrorBody = "";

    try {
      res = await post({ ...bodyBase, response_format: { type: "json_object" } });
    } catch (err) {
      if (err instanceof Error && (err.name === "AbortError" || err.message.includes("timeout"))) {
        throw new AIProviderError("openrouter", "OpenRouter HTTP request timed out after 35 seconds", "provider_timeout");
      }
      throw new AIProviderError(
        "openrouter",
        `OpenRouter network fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        "provider_network_error"
      );
    }

    if (!res.ok) {
      lastStatus = res.status;
      lastErrorBody = await res.text().catch(() => "");

      // Try plain completion without response_format constraint
      try {
        res = await post(bodyBase);
      } catch {
        // Fallback fetch error
      }

      if (!res.ok) {
        const { provider: _ignored, ...loose } = bodyBase;
        void _ignored;
        try {
          res = await post(loose);
        } catch {
          // Fallback loose fetch error
        }
        if (!res.ok) lastErrorBody = await res.text().catch(() => lastErrorBody);
      }

      // Robust fallback model loop if primary model fails
      if (!res.ok) {
        const fallbackModels = [
          "meta-llama/llama-3.3-70b-instruct",
          "google/gemini-2.0-flash-001",
          "deepseek/deepseek-chat",
          "qwen/qwen-2.5-72b-instruct",
          "openai/gpt-4o-mini",
        ];
        for (const fallbackModel of fallbackModels) {
          if (fallbackModel === this.chatModel) continue;
          try {
            const retryRes = await post({ ...bodyBase, model: fallbackModel });
            if (retryRes.ok) {
              res = retryRes;
              break;
            }
          } catch {
            // Continue model fallback loop
          }
        }
      }

      if (!res.ok) {
        const cat = mapHttpStatusToCategory(res.status || lastStatus);
        throw new AIProviderError(
          "openrouter",
          `chat completion failed (${res.status || lastStatus}): ${lastErrorBody.slice(0, 300)}`,
          cat
        );
      }
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      throw new AIProviderError("openrouter", "Empty or missing content in chat completion response", "provider_empty_response");
    }

    // 1. Direct or regex JSON extraction
    try {
      return parseJsonContent(content);
    } catch {
      // 2. 1-Attempt Schema Repair Loop before declaring failure
      try {
        console.warn("[OpenRouter] Malformed JSON response detected. Running 1-attempt repair request...");
        const repairRes = await post({
          model: this.chatModel,
          messages: [
            ...messages,
            { role: "assistant", content },
            {
              role: "user",
              content:
                "CRITICAL REPAIR INSTRUCTION: Your previous output was not valid JSON. Return ONLY the corrected raw JSON object. Do not include markdown codeblocks or intro text.",
            },
          ],
          temperature: 0.0,
          max_tokens: 2500,
        });

        if (repairRes.ok) {
          const repairJson = await repairRes.json();
          const repairedContent = repairJson.choices?.[0]?.message?.content;
          if (repairedContent) {
            return parseJsonContent(repairedContent);
          }
        }
      } catch (repairErr) {
        console.warn("[OpenRouter] Schema repair attempt failed:", repairErr);
      }

      throw new AIProviderError(
        "openrouter",
        `Model did not return valid JSON: ${String(content).slice(0, 300)}`,
        "provider_invalid_json"
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
      signal: options?.signal || AbortSignal.timeout(60000),
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
      const cat = mapHttpStatusToCategory(res.status);
      throw new AIProviderError("openrouter", `chat stream failed (${res.status}): ${body.slice(0, 300)}`, cat);
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
      signal: AbortSignal.timeout(35000),
      headers: this.headers(),
      body: JSON.stringify({ model: this.embeddingModel, input: texts }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const cat = mapHttpStatusToCategory(res.status);
      throw new AIProviderError("openrouter", `embeddings failed (${res.status}): ${body.slice(0, 300)}`, cat);
    }

    const json = await res.json();
    const rows = [...json.data].sort((a, b) => a.index - b.index);
    return rows.map((r) => r.embedding as number[]);
  }
}
