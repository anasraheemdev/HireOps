import { NextResponse } from "next/server";
import { requirePermission, jsonError } from "@/lib/api/helpers";

export async function GET() {
  try {
    const { supabase } = await requirePermission("workflows.manage", "portal.hr", "portal.admin");
    const { data, error } = await (supabase as any)
      .from("workflow_stages")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return jsonError(err);
  }
}
