import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, ApiError } from "@/lib/api/helpers";
import { interviewAccess } from '@/lib/services/interview-access';
import { getInterviewSession, sendInterviewReply, finalizeInterview } from "@/lib/services/enterprise.service";
import { initializeInterviewSession } from "@/lib/services/interview-stream.service";

type Params = { params: Promise<{ id: string }> };

const sessionIdSchema = z.string().uuid("Invalid interview session id");

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id: rawId } = await params;
    const id = sessionIdSchema.parse(rawId);
    const { supabase } = await interviewAccess(id);
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
    const { supabase } = await interviewAccess(id, true);
    const body = z
      .object({
        action: z.enum(["message", "finalize", "start"]),
        content: z.string().max(12000).optional(),
      })
      .parse(await request.json());

    if (body.action === "start") {
      const data = await initializeInterviewSession(supabase, id);
      return NextResponse.json({ data });
    }

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
