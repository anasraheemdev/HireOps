import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { streamInterviewReply } from "@/lib/services/interview-stream.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase } = await requirePermission("interviews.conduct", "interviews.write");
    const body = (await request.json()) as { content?: string };
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
