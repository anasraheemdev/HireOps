import type { AIProvider } from "./types";
import { OpenRouterProvider } from "./providers/openrouter";
import { GroqProvider } from "./providers/groq";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";

export type { AIProvider, ChatMessage } from "./types";
export { AIProviderError } from "./types";

import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { decryptSecret } from "./secrets";

type ProviderConfig = { apiKey?: string; chatModel?: string; embeddingModel?: string };

export type ResolvedAIConfig = {
  providerName: string;
  apiKey: string | undefined;
  chatModel: string | undefined;
  embeddingModel: string | undefined;
  source: "organization" | "environment";
  decryptionFailed?: boolean;
};

const configuration = cache(async () => {
  const client = await createServerSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Authentication required for AI");
  const { data: profile } = await client
    .from("profiles")
    .select("organization_id,status")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id || profile.status !== "active") {
    throw new Error("Active organization account required");
  }
  const { data, error } = await createAdminSupabaseClient()
    .from("app_secrets")
    .select("key,value_encrypted")
    .eq("organization_id", profile.organization_id);
  if (error) throw error;
  const entries: [string, string][] = [];
  for (const s of data ?? []) {
    try {
      entries.push([s.key, decryptSecret(s.value_encrypted)]);
    } catch {
      console.warn(`[app_secret_decryption_failed] Could not decrypt app_secret "${s.key}" for organization ${profile.organization_id}`);
    }
  }
  return Object.fromEntries(entries);
});

function buildProvider(name: string, config: ProviderConfig = {}): AIProvider {
  switch (name.toLowerCase()) {
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

async function fetchOrgSecrets(organizationId: string): Promise<{ secrets: Record<string, string>; decryptionFailed: boolean }> {
  let decryptionFailed = false;
  try {
    const { data, error } = await createAdminSupabaseClient()
      .from("app_secrets")
      .select("key,value_encrypted")
      .eq("organization_id", organizationId);
    if (error || !data) return { secrets: {}, decryptionFailed: false };
    const entries: [string, string][] = [];
    for (const s of data) {
      try {
        entries.push([s.key, decryptSecret(s.value_encrypted)]);
      } catch {
        decryptionFailed = true;
        console.warn(`[app_secret_decryption_failed] Could not decrypt app_secret "${s.key}" for organization ${organizationId}`);
      }
    }
    return { secrets: Object.fromEntries(entries), decryptionFailed };
  } catch {
    return { secrets: {}, decryptionFailed: true };
  }
}

/** Precedence resolution: Organization secrets override environment ONLY if valid & non-empty. */
export async function resolveAIConfig(organizationId?: string): Promise<ResolvedAIConfig> {
  let orgSecrets: Record<string, string> = {};
  let decryptionFailed = false;

  if (organizationId) {
    const orgRes = await fetchOrgSecrets(organizationId);
    orgSecrets = orgRes.secrets;
    decryptionFailed = orgRes.decryptionFailed;
  } else {
    try {
      orgSecrets = await configuration();
    } catch {
      // Ignore authentication/context error when resolving without organization
    }
  }

  const orgApiKey = orgSecrets.ai_api_key?.trim();
  const orgProvider = orgSecrets.ai_provider?.trim();
  const orgChatModel = orgSecrets.ai_chat_model?.trim();
  const orgEmbedModel = orgSecrets.ai_embed_model?.trim();

  // Valid org config requires present API key
  const hasValidOrgConfig = Boolean(orgApiKey && orgApiKey.length > 0);

  if (hasValidOrgConfig) {
    return {
      providerName: orgProvider || process.env.AI_PROVIDER || "openrouter",
      apiKey: orgApiKey,
      chatModel: orgChatModel || process.env.AI_CHAT_MODEL || "qwen/qwen-2.5-72b-instruct",
      embeddingModel: orgEmbedModel || process.env.AI_EMBEDDING_MODEL,
      source: "organization",
      decryptionFailed,
    };
  }

  const envApiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.AI_PROVIDER_KEY ||
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.TOGETHER_API_KEY ||
    process.env.FIREWORKS_API_KEY ||
    process.env.DEEPINFRA_API_KEY;

  return {
    providerName: process.env.AI_PROVIDER || "openrouter",
    apiKey: envApiKey?.trim(),
    chatModel: process.env.AI_CHAT_MODEL || "qwen/qwen-2.5-72b-instruct",
    embeddingModel: process.env.AI_EMBEDDING_MODEL || "openai/text-embedding-3-small",
    source: "environment",
    decryptionFailed,
  };
}

/** Server-only validation utility to verify AI provider keys, chat model, and configuration source */
export async function validateAIConfiguration(organizationId?: string) {
  const resolved = await resolveAIConfig(organizationId);
  const hasApiKey = Boolean(resolved.apiKey && resolved.apiKey.length > 0);

  return {
    valid: hasApiKey,
    provider: resolved.providerName,
    chatModel: resolved.chatModel,
    hasApiKey,
    source: resolved.source,
    decryptionFailed: Boolean(resolved.decryptionFailed),
    category: hasApiKey ? undefined : ("missing_provider_key" as const),
    error: hasApiKey ? undefined : `No API key found for provider "${resolved.providerName}" in ${resolved.source} configuration`,
  };
}

/** Resolve organization settings on each request; gracefully fall back to process.env if app_secrets fails. */
export async function getAIProvider(organizationId?: string): Promise<AIProvider & { configurationSource?: "organization" | "environment" }> {
  const resolved = await resolveAIConfig(organizationId);
  const provider = buildProvider(resolved.providerName, {
    apiKey: resolved.apiKey,
    chatModel: resolved.chatModel,
  });
  Object.defineProperty(provider, "configurationSource", { value: resolved.source, writable: false, enumerable: true });
  return provider as AIProvider & { configurationSource: "organization" | "environment" };
}

export async function getEmbeddingProvider(organizationId?: string): Promise<AIProvider> {
  const resolved = await resolveAIConfig(organizationId);
  const providerName = process.env.AI_EMBEDDING_PROVIDER || resolved.providerName;
  return buildProvider(providerName, {
    apiKey: resolved.apiKey,
    embeddingModel: resolved.embeddingModel,
  });
}
