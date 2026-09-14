import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError } from "@/lib/api/helpers";
import { getDashboardSnapshot } from "@/lib/services/dashboard.service";
import { getAIProvider } from "@/lib/ai";

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(12)
    .optional(),
});

export async function POST(request: Request) {
  try {
    const { supabase, profile } = await requirePermission("reports.read", "portal.hr", "portal.admin");
    const { message, history } = bodySchema.parse(await request.json());

    const snapshot = await getDashboardSnapshot(supabase);
    const topJobs = snapshot.recentApplications.slice(0, 5).map((a) => `${a.candidateName} → ${a.jobTitle} (${a.stage}, ${a.matchScore}% match)`);

    const systemPrompt = `You are Amina, the AI recruitment copilot for ${profile.organizationName ?? "the organization"}'s HR team.
You have access to the current live recruitment snapshot:
- Total candidates: ${snapshot.kpis.totalCandidates}
- Open positions: ${snapshot.kpis.openPositions}
- Shortlisted candidates: ${snapshot.kpis.shortlisted}
- Average AI match score: ${snapshot.kpis.avgMatchPercent}%
- Interviews in progress: ${snapshot.kpis.aiInterviewsToday}
- Hiring funnel: ${snapshot.funnel.map((f) => `${f.stage}: ${f.count}`).join(", ")}
- Interview stats: ${snapshot.interviewStats.total} total (${snapshot.interviewStats.scheduled} scheduled, ${snapshot.interviewStats.inProgress} in progress, ${snapshot.interviewStats.completed} completed)
- Pending final-stage reviews: ${snapshot.pendingReviews}
- Recent applications: ${topJobs.join("; ") || "none yet"}

Answer the HR user's question concisely and helpfully using this data when relevant. If data isn't available, say so rather than inventing numbers.
Return ONLY JSON: { "reply": string, "suggestions": string[] }. Keep "reply" under 120 words. "suggestions" should be 0-3 short, relevant follow-up questions the user could ask next.`;

    const provider = await getAIProvider();
    const raw = (await provider.chatJSON(
      [
        { role: "system", content: systemPrompt },
        ...(history ?? []),
        { role: "user", content: message },
      ],
      { temperature: 0.4, maxTokens: 700 }
    )) as { reply?: string; suggestions?: string[] };

    return NextResponse.json({
      data: {
        reply: raw.reply ?? "I wasn't able to generate a response — please try rephrasing your question.",
        suggestions: raw.suggestions ?? [],
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
