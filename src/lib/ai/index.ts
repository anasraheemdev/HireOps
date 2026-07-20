import "server-only";
import type { AIProvider } from "./types";
import { OpenRouterProvider } from "./providers/openrouter";
import { GroqProvider } from "./providers/groq";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";

export type { AIProvider, ChatMessage } from "./types";
export { AIProviderError } from "./types";

let cachedProvider: AIProvider | null = null;

function buildProvider(name: string): AIProvider {
  switch (name) {
    case "openrouter":
      return new OpenRouterProvider();
    case "groq":
      return new GroqProvider();
    case "together":
      return new OpenAICompatibleProvider({
        name: "together",
        baseUrl: "https://api.together.xyz/v1",
        apiKeyEnv: "TOGETHER_API_KEY",
        defaultChatModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        defaultEmbeddingModel: "BAAI/bge-large-en-v1.5",
      });
    case "fireworks":
      return new OpenAICompatibleProvider({
        name: "fireworks",
        baseUrl: "https://api.fireworks.ai/inference/v1",
        apiKeyEnv: "FIREWORKS_API_KEY",
        defaultChatModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
        defaultEmbeddingModel: "nomic-ai/nomic-embed-text-v1.5",
      });
    case "deepinfra":
      return new OpenAICompatibleProvider({
        name: "deepinfra",
        baseUrl: "https://api.deepinfra.com/v1/openai",
        apiKeyEnv: "DEEPINFRA_API_KEY",
        defaultChatModel: "meta-llama/Llama-3.3-70B-Instruct",
        defaultEmbeddingModel: "BAAI/bge-large-en-v1.5",
      });
    default:
      throw new Error(`Unknown AI_PROVIDER "${name}". Supported: openrouter, groq, together, fireworks, deepinfra.`);
  }
}

/** Chat + embeddings provider, selected via AI_PROVIDER env var. Cached per server instance. */
export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;
  const name = process.env.AI_PROVIDER || "openrouter";
  cachedProvider = buildProvider(name);
  return cachedProvider;
}

/**
 * Embeddings provider, selected via AI_EMBEDDING_PROVIDER (falls back to
 * AI_PROVIDER). Lets you pair a fast chat-only provider like Groq with an
 * embeddings-capable provider like OpenRouter or Together.
 */
export function getEmbeddingProvider(): AIProvider {
  const name = process.env.AI_EMBEDDING_PROVIDER || process.env.AI_PROVIDER || "openrouter";
  if (name === (process.env.AI_PROVIDER || "openrouter")) return getAIProvider();
  return buildProvider(name);
}
