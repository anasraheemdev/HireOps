import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import {
  listNotifications,
  markNotificationRead,
  createNotification,
} from "@/lib/services/candidate-portal.service";

export async function GET() {
  try {
    const { supabase, user } = await requireProfile();
    const data = await listNotifications(supabase, user.id);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, profile } = await requireProfile();
    if (profile.portalRole === "candidate") throw new ApiError(403, "Candidates cannot broadcast notifications");
    const body = z
      .object({
        recipientId: z.string().uuid(),
        type: z.string().min(1),
        title: z.string().min(1),
        body: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(await request.json());
    const data = await createNotification(supabase, body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireProfile();
    const body = z.object({ id: z.string().uuid(), isRead: z.boolean().default(true) }).parse(await request.json());
    const data = await markNotificationRead(supabase, body.id, user.id);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
