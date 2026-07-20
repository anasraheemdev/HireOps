"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Bot,
  Globe2,
  Target,
  Building2,
  LineChart as LineChartIcon,
  CalendarClock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FetchError } from "@/lib/api/fetcher";

const reports = [
  {
    id: "recruitment",
    title: "Executive Hiring Summary",
    description: "Every application with candidate, role, stage, and match score.",
    icon: TrendingUp,
    color: "text-blue-400 bg-blue-500/15",
  },
  {
    id: "ai-performance",
    title: "AI Performance Report",
    description: "Interview sessions, modes, statuses, and AI recommendations.",
    icon: Bot,
    color: "text-cyan-400 bg-cyan-500/15",
  },
  {
    id: "diversity",
    title: "Diversity Report",
    description: "Candidate pool composition by nationality.",
    icon: Globe2,
    color: "text-amber-400 bg-amber-500/15",
  },
  {
    id: "kpi",
    title: "Recruitment KPI Report",
    description: "Pipeline volume, match quality, offers, and acceptance rate.",
    icon: Target,
    color: "text-emerald-400 bg-emerald-500/15",
  },
  {
    id: "department",
    title: "Department Hiring Comparison",
    description: "Open vs filled roles by department.",
    icon: Building2,
    color: "text-violet-400 bg-violet-500/15",
  },
  {
    id: "trends",
    title: "Hiring Trends",
    description: "Monthly applications, interviews, and hires (7 months).",
    icon: LineChartIcon,
    color: "text-rose-400 bg-rose-500/15",
  },
];

async function downloadReport(type: string, format: "csv" | "pdf") {
  const res = await fetch(`/api/reports/${type}?format=${format}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new FetchError(res.status, json.error ?? `Failed to generate ${format.toUpperCase()} report`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `${type}-report.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [pending, setPending] = useState<string | null>(null);

  const handleDownload = async (id: string, title: string, format: "csv" | "pdf") => {
    const key = `${id}-${format}`;
    setPending(key);
    try {
      await downloadReport(id, format);
      toast.success(`${title} exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to export ${title}`);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-3 max-w-[1100px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Reports</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Export live recruitment data as PDF or CSV
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[12px] gap-1.5 border-white/10 bg-white/[0.03] cursor-pointer"
          onClick={() => toast.success("Report schedule saved — weekly digest every Monday 8:00 AM")}
        >
          <CalendarClock className="h-3.5 w-3.5" /> Schedule
        </Button>
      </div>

      <div className="ws-panel rounded-xl overflow-hidden divide-y divide-white/[0.05]">
        {reports.map((r) => (
          <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-3.5 py-3 hover:bg-white/[0.025] transition-colors">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${r.color}`}>
              <r.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{r.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{r.description}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1 border-white/10 bg-white/[0.03] cursor-pointer px-2.5"
                disabled={pending === `${r.id}-pdf`}
                onClick={() => handleDownload(r.id, r.title, "pdf")}
              >
                {pending === `${r.id}-pdf` ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1 border-white/10 bg-white/[0.03] cursor-pointer px-2.5"
                disabled={pending === `${r.id}-csv`}
                onClick={() => handleDownload(r.id, r.title, "csv")}
              >
                {pending === `${r.id}-csv` ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />}
                CSV
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 cursor-pointer text-muted-foreground"
                disabled={pending === `${r.id}-csv`}
                onClick={() => handleDownload(r.id, r.title, "csv")}
                title="Download CSV"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
