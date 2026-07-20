import { NextResponse } from "next/server";
import { requireProfile, jsonError } from "@/lib/api/helpers";
import { listHelpArticles } from "@/lib/services/candidate-portal.service";

export async function GET() {
  try {
    const { supabase } = await requireProfile();
    const data = await listHelpArticles(supabase);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
