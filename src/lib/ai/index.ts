import type { AIProvider } from "./types";
import { OpenRouterProvider } from "./providers/openrouter";
import { GroqProvider } from "./providers/groq";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";

export type { AIProvider, ChatMessage } from "./types";
export { AIProviderError } from "./types";

import { cache } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { decryptSecret } from './secrets';
type ProviderConfig = {apiKey?:string;chatModel?:string;embeddingModel?:string};

const configuration = cache(async () => {
  const client = await createServerSupabaseClient();
  const {data:{user}} = await client.auth.getUser();
  if(!user) throw new Error('Authentication required for AI');
  const {data:profile} = await client.from('profiles').select('organization_id,status').eq('id',user.id).single();
  if(!profile?.organization_id || profile.status!=='active') throw new Error('Active organization account required');
  const {data,error} = await createAdminSupabaseClient().from('app_secrets').select('key,value_encrypted').eq('organization_id',profile.organization_id);
  if(error) throw error;
  return Object.fromEntries((data??[]).map(s=>[s.key,decryptSecret(s.value_encrypted)]));
});

function buildProvider(name: string, config: ProviderConfig = {}): AIProvider {
  switch (name) {
    case "openrouter":
      return new OpenRouterProvider(config);
    case "groq":
      return new GroqProvider(config);
    case "together":
      return new OpenAICompatibleProvider({
        ...config,
        name: "together",
        baseUrl: "https://api.together.xyz/v1",
        apiKeyEnv: "TOGETHER_API_KEY",
        defaultChatModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        defaultEmbeddingModel: "BAAI/bge-large-en-v1.5",
      });
    case "fireworks":
      return new OpenAICompatibleProvider({
        ...config,
        name: "fireworks",
        baseUrl: "https://api.fireworks.ai/inference/v1",
        apiKeyEnv: "FIREWORKS_API_KEY",
        defaultChatModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
        defaultEmbeddingModel: "nomic-ai/nomic-embed-text-v1.5",
      });
    case "deepinfra":
      return new OpenAICompatibleProvider({
        ...config,
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

/** Resolve organization settings on each request; gracefully fall back to process.env if app_secrets fails. */
export async function getAIProvider(): Promise<AIProvider> {
  let config: Record<string, string> = {};
  try {
    config = await configuration();
  } catch (err) {
    console.warn("[getAIProvider] Could not load organization app_secrets (using process.env fallback):", err instanceof Error ? err.message : err);
  }
  const providerName = config.ai_provider || process.env.AI_PROVIDER || 'openrouter';
  const apiKey = config.ai_api_key || process.env.OPENROUTER_API_KEY || process.env.AI_PROVIDER_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  const chatModel = config.ai_chat_model || process.env.AI_CHAT_MODEL;
  return buildProvider(providerName, { apiKey, chatModel });
}

export async function getEmbeddingProvider(): Promise<AIProvider> {
  let config: Record<string, string> = {};
  try {
    config = await configuration();
  } catch (err) {
    console.warn("[getEmbeddingProvider] Could not load organization app_secrets (using process.env fallback):", err instanceof Error ? err.message : err);
  }
  const providerName = process.env.AI_EMBEDDING_PROVIDER || config.ai_provider || process.env.AI_PROVIDER || 'openrouter';
  const apiKey = config.ai_api_key || process.env.OPENROUTER_API_KEY || process.env.AI_PROVIDER_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  const embeddingModel = config.ai_embed_model || process.env.AI_EMBEDDING_MODEL;
  return buildProvider(providerName, { apiKey, embeddingModel });
}
