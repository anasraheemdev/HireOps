import "server-only";
import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { generateReportCsv } from "@/lib/services/reports.service";
import { BRAND } from "@/lib/brand";

type Client = SupabaseClient<Database>;

function parseCsv(csv: string): { headers: string[]; rows: string[][] } {
  const lines = csv.trim().split(/\r?\n/);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map(splitCsvLine);
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function loadLogoDataUrl(): string | null {
  try {
    const file = path.join(process.cwd(), "public", "logo-256.png");
    if (!fs.existsSync(file)) return null;
    const buf = fs.readFileSync(file);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function generateReportPdf(supabase: Client, type: string): Promise<Buffer> {
  const csv = await generateReportCsv(supabase, type);
  const { headers, rows } = parseCsv(csv);
  const doc = new jsPDF({ orientation: "landscape" });
  const logo = loadLogoDataUrl();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 14, 8, 12, 12);
    } catch {
      /* ignore logo embed failures */
    }
  }
  doc.setFontSize(14);
  doc.text(`${BRAND.name} Report — ${type}`, logo ? 30 : 14, 16);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`${BRAND.tagline} · Generated ${new Date().toISOString()}`, logo ? 30 : 14, 22);
  doc.setTextColor(0);

  let y = 32;
  const colW = Math.max(30, Math.floor(270 / Math.max(headers.length, 1)));
  doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => doc.text(h.slice(0, 28), 14 + i * colW, y));
  doc.setFont("helvetica", "normal");
  y += 6;
  for (const row of rows.slice(0, 40)) {
    if (y > 185) {
      doc.addPage();
      y = 20;
    }
    row.forEach((cell, i) => doc.text(String(cell).slice(0, 28), 14 + i * colW, y));
    y += 5;
  }
  if (rows.length > 40) {
    doc.text(`…and ${rows.length - 40} more rows (download CSV for full data)`, 14, y + 6);
  }
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(BRAND.copyrightFull, 14, 200);
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

export async function generateReportExcel(supabase: Client, type: string): Promise<Buffer> {
  const csv = await generateReportCsv(supabase, type);
  const { headers, rows } = parseCsv(csv);
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND.name;
  wb.company = BRAND.name;
  wb.description = BRAND.tagline;
  const sheet = wb.addWorksheet(type.slice(0, 28));
  sheet.addRow([`${BRAND.name} — ${type}`]);
  sheet.addRow([BRAND.tagline]);
  sheet.addRow([]);
  sheet.addRow(headers);
  sheet.getRow(4).font = { bold: true };
  for (const row of rows) sheet.addRow(row);
  sheet.columns.forEach((col) => {
    col.width = 18;
  });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
