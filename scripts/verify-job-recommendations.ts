import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { calculateDetailedJobMatch } from "../src/lib/services/job-matching.service";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verifyJobRecommendations() {
  console.log("=== Specialized Solar EPC & Technical Procurement Job Recommendations Verification ===");

  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(` [PASS] ${description}`);
      passCount++;
    } else {
      console.error(` [FAIL] ${description}`);
      failCount++;
    }
  }

  // 1. Fetch OIA Org
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("name", "Oman Investment Authority")
    .maybeSingle();

  assert(!!org, "Oman Investment Authority organization exists");
  if (!org) process.exit(1);

  // 2. Fetch Open Jobs
  const { data: jobs, error: jobsErr } = await supabase
    .from("jobs")
    .select("*")
    .eq("organization_id", org.id)
    .eq("status", "open");

  assert(!jobsErr && !!jobs && jobs.length > 0, `Fetched ${jobs?.length || 0} open OIA jobs`);
  if (!jobs) process.exit(1);

  // 3. Create a fictional test candidate profile (Strictly synthetic data - NO PII)
  const fictionalCandidate = {
    id: `temp-solar-cand-${Date.now()}`,
    organizationId: org.id,
    fullName: "Synthetic Solar EPC Lead (Verification Fixture)",
    headline: "Senior Solar EPC Procurement & Electrical Systems Specialist",
    summary: "Experienced technical procurement engineer and electrical lead specializing in solar PV EPC projects, vendor evaluation, tendering, supply chain logistics, single-line diagrams, grid interconnection, and BOQ optimization.",
    experienceYears: 6,
    skills: [
      "Solar EPC",
      "Electrical Engineering",
      "Technical Procurement",
      "Tender Management",
      "Vendor Management",
      "Supply Chain Management",
      "PV System Design",
      "Single-Line Diagrams",
      "Solar Inverters",
      "Grid Interconnection",
      "Testing and Commissioning",
      "BOQ Preparation",
      "Contract Negotiation",
      "AutoCAD",
      "RFQs and RFPs",
      "Cost Optimization"
    ],
    education: [{ degree: "Bachelor of Science in Electrical Engineering", institution: "Sultan Qaboos University" }],
    certifications: [{ name: "Certified Solar PV Engineer", issuer: "RE-Cert Authority" }],
  };

  // Create temporary record in DB to test DB-backed candidate profile
  const { data: dbCand, error: candErr } = await supabase
    .from("candidates")
    .insert({
      organization_id: org.id,
      full_name: fictionalCandidate.fullName,
      email: `synthetic.solar.${Date.now()}@verification.internal`,
      headline: fictionalCandidate.headline,
      summary: fictionalCandidate.summary,
      experience_years: fictionalCandidate.experienceYears,
      is_confirmed: true,
    })
    .select("id")
    .single();

  assert(!candErr && !!dbCand, "Successfully created temporary synthetic candidate record");

  try {
    // 4. Calculate detailed job match against all open OIA jobs
    const matchResults = jobs.map((job) => {
      const match = calculateDetailedJobMatch(
        fictionalCandidate,
        {
          id: job.id,
          organizationId: job.organization_id,
          title: job.title,
          description: job.description,
          department: job.department_id || undefined,
          location: job.location || undefined,
          employmentType: job.employment_type,
          level: job.level,
          status: job.status,
          requiredSkills: Array.isArray(job.required_skills) ? (job.required_skills as string[]) : [],
          niceToHaveSkills: Array.isArray(job.nice_to_have_skills) ? (job.nice_to_have_skills as string[]) : [],
          minExperienceYears: job.min_experience_years || 0,
        }
      );
      return { job, match };
    });

    // Sort by overallScore descending
    matchResults.sort((a, b) => b.match.overallScore - a.match.overallScore);

    // Filter recommendations > 55%
    const highRecommendations = matchResults.filter((r) => r.match.overallScore >= 55);

    assert(
      highRecommendations.length >= 4,
      `Candidate received ${highRecommendations.length} recommendations above 55% threshold (expected >= 4)`
    );

    console.log("\n--- Top Solar EPC & Technical Procurement Job Recommendations (> 55%) ---");
    for (const rec of highRecommendations.slice(0, 8)) {
      console.log(
        ` [${rec.job.reference_code}] ${rec.job.title.padEnd(42)} Score: ${rec.match.overallScore}% (Req Skills Matched: ${rec.match.matchedRequiredSkills.length}/${rec.match.matchedRequiredSkills.length + rec.match.missingRequiredSkills.length})`
      );
    }

    // Verify key expected solar/procurement reference codes appear in recommendations > 55%
    const recRefCodes = new Set(highRecommendations.map((r) => r.job.reference_code));

    const expectedCodes = ["OIA-RENEW-001", "OIA-PROC-012", "OIA-RENEW-003", "OIA-RENEW-004", "OIA-PROC-013"];
    let matchedExpectedCount = 0;
    for (const code of expectedCodes) {
      if (recRefCodes.has(code)) matchedExpectedCount++;
    }

    assert(
      matchedExpectedCount >= 3,
      `Top solar & procurement target roles (${matchedExpectedCount}/${expectedCodes.length}) matched above 55%`
    );

  } finally {
    // Clean up temporary candidate
    if (dbCand) {
      await supabase.from("candidates").delete().eq("id", dbCand.id);
      console.log(" Cleaned up temporary synthetic test candidate profile.");
    }
  }

  console.log("\n==================================================");
  console.log(`VERIFICATION RECOMMENDATIONS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("==================================================\n");

  if (failCount > 0) process.exit(1);
}

verifyJobRecommendations().catch((err) => {
  console.error("Fatal verification error:", err);
  process.exit(1);
});
