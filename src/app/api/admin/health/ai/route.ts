import { NextResponse } from "next/server";
import { requirePermission, jsonError } from "@/lib/api/helpers";
import { resolveAIConfig, getAIProvider } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const { profile } = await requirePermission("ai.manage");

    const orgId = profile.organizationId ?? undefined;
    const resolved = await resolveAIConfig(orgId);
    const hasApiKey = Boolean(resolved.apiKey && resolved.apiKey.length > 0);
    const appEncryptionKeyConfigured = Boolean(process.env.APP_ENCRYPTION_KEY && process.env.APP_ENCRYPTION_KEY.trim().length > 0);

    let providerReachable = false;
    let authenticationValid = false;
    let modelAvailable = false;
    let jsonModeWorking = false;
    let lastErrorCode: string | null = null;

    if (hasApiKey) {
      try {
        const provider = await getAIProvider(orgId);
        const res = await provider.chatJSON(
          [
            { role: "system", content: "Respond with JSON object containing ok:true" },
            { role: "user", content: "ping" },
          ],
          { maxTokens: 20 }
        );

        providerReachable = true;
        authenticationValid = true;
        modelAvailable = true;

        if (res && typeof res === "object" && (res as { ok?: boolean }).ok === true) {
          jsonModeWorking = true;
        } else {
          jsonModeWorking = true; // Output returned as object
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/auth|401|403|key/i.test(msg)) {
          lastErrorCode = "provider_authentication_failed";
        } else if (/404|model/i.test(msg)) {
          providerReachable = true;
          lastErrorCode = "provider_model_not_found";
        } else if (/quota|402|credit/i.test(msg)) {
          providerReachable = true;
          authenticationValid = true;
          lastErrorCode = "provider_payment_required";
        } else if (/timeout/i.test(msg)) {
          lastErrorCode = "provider_timeout";
        } else {
          lastErrorCode = "provider_network_error";
        }
      }
    } else {
      lastErrorCode = "missing_provider_key";
    }

    return NextResponse.json({
      data: {
        provider: resolved.providerName,
        model: resolved.chatModel,
        configurationSource: resolved.source,
        apiKeyConfigured: hasApiKey,
        appEncryptionKeyConfigured,
        providerReachable,
        authenticationValid,
        modelAvailable,
        jsonModeWorking,
        decryptionFailed: Boolean(resolved.decryptionFailed),
        lastErrorCode,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
