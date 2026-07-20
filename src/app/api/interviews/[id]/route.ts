import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { getInterviewSession, sendInterviewReply, finalizeInterview } from "@/lib/services/enterprise.service";

type Params = { params: Promise<{ id: string }> };

const sessionIdSchema = z.string().uuid("Invalid interview session id");

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id: rawId } = await params;
    const id = sessionIdSchema.parse(rawId);
    const { supabase } = await requirePermission("interviews.read", "interviews.conduct");
    const data = await getInterviewSession(supabase, id);
    if (!data) throw new ApiError(404, "Interview not found");
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: rawId } = await params;
    const id = sessionIdSchema.parse(rawId);
    const { supabase } = await requirePermission("interviews.conduct", "interviews.write");
    const body = z
      .object({
        action: z.enum(["message", "finalize"]),
        content: z.string().optional(),
      })
      .parse(await request.json());

    if (body.action === "finalize") {
      const data = await finalizeInterview(supabase, id);
      return NextResponse.json({ data });
    }

    if (!body.content?.trim()) throw new ApiError(400, "Message content required");
    const data = await sendInterviewReply(supabase, id, body.content.trim());
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
