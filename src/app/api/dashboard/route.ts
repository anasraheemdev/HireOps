import { NextResponse } from "next/server";
import { requirePermission, jsonError } from "@/lib/api/helpers";
import { getDashboardSnapshot } from "@/lib/services/dashboard.service";

export async function GET() {
  try {
    const { supabase } = await requirePermission("reports.read", "portal.hr", "portal.admin");
    const snapshot = await getDashboardSnapshot(supabase);
    return NextResponse.json({ data: snapshot });
  } catch (err) {
    return jsonError(err);
  }
}
