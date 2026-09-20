import { jsonError, ApiError } from "@/lib/api/helpers";
import { interviewAccess } from '@/lib/services/interview-access';
import { z } from 'zod';
import { streamInterviewReply } from "@/lib/services/interview-stream.service";

type Params = { params: Promise<{ id: string }> };

const messageRateMap = new Map<string, number[]>();

function checkRateLimit(sessionId: string) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 20;
  const timestamps = (messageRateMap.get(sessionId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    throw new ApiError(429, "Rate limit exceeded. Please wait a moment before sending another message.");
  }
  timestamps.push(now);
  messageRateMap.set(sessionId, timestamps);
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase } = await interviewAccess(id, true);
    checkRateLimit(id);
    const body = z.object({content:z.string().trim().min(1).max(12000)}).parse(await request.json());
    if (!body.content?.trim()) throw new ApiError(400, "Message content required");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        try {
          send("status", { thinking: true });
          const result = await streamInterviewReply(
            supabase,
            id,
            body.content!.trim(),
            (delta) => send("delta", { text: delta }),
            request.signal
          );
          send("done", { reply: result.reply, meta: result.meta, message: result.message });
        } catch (err) {
          send("error", { message: err instanceof Error ? err.message : "Stream failed" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
