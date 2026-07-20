import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { generateReportCsv, REPORT_TYPES } from "@/lib/services/reports.service";
import { generateReportExcel, generateReportPdf } from "@/lib/reports/export-binary";

type Params = { params: Promise<{ type: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { type } = await params;
    if (!REPORT_TYPES.includes(type as (typeof REPORT_TYPES)[number])) {
      throw new ApiError(404, `Unknown report type "${type}"`);
    }

    const { supabase } = await requirePermission("reports.read", "portal.hr", "portal.admin");
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") || "csv").toLowerCase();
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const csv = await generateReportCsv(supabase, type);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${type}-report-${stamp}.csv"`,
        },
      });
    }

    if (format === "pdf") {
      const pdf = await generateReportPdf(supabase, type);
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${type}-report-${stamp}.pdf"`,
        },
      });
    }

    if (format === "xlsx" || format === "excel") {
      const xlsx = await generateReportExcel(supabase, type);
      return new NextResponse(new Uint8Array(xlsx), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${type}-report-${stamp}.xlsx"`,
        },
      });
    }

    throw new ApiError(400, `Unsupported format "${format}"`);
  } catch (err) {
    return jsonError(err);
  }
}
