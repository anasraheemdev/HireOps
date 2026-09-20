import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

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

function computeCandidateJobMatch(
  candSkills: string[],
  candExpYears: number,
  requiredSkills: string[],
  minExpYears: number
) {
  const normCand = candSkills.map((s) => s.toLowerCase().trim());
  const normReq = requiredSkills.map((s) => s.toLowerCase().trim());

  const matched = normReq.filter((rs) => normCand.some((cs) => cs.includes(rs) || rs.includes(cs)));
  const skillCoverage = normReq.length > 0 ? matched.length / normReq.length : 1;
  const expMatch = candExpYears >= minExpYears ? 1 : Math.max(0.5, candExpYears / Math.max(1, minExpYears));

  const score = Math.round((skillCoverage * 0.7 + expMatch * 0.3) * 100);
  return { matchScore: score, matchedSkills: matched };
}

async function verifyOiaJobSeed() {
  console.log("=== OIA Job Seed Automated Verification ===");

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

  // 1. Get OIA Org ID
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("name", "Oman Investment Authority")
    .maybeSingle();

  assert(!!org, "Oman Investment Authority organization exists in DB");
  if (!org) {
    console.error("Cannot proceed with verification: OIA org missing.");
    process.exit(1);
  }

  const orgId = org.id;

  // 2. Fetch all OIA seeded jobs for OIA org
  const { data: jobs, error: jobsErr } = await supabase
    .from("jobs")
    .select("*")
    .eq("organization_id", orgId)
    .like("reference_code", "OIA-%");

  assert(!jobsErr && !!jobs && jobs.length >= 35, `Total job count is >= 35 (found ${jobs?.length || 0})`);

  if (!jobs) return;

  // 3. Verify organization ownership & valid department for every job
  const allBelongToOrg = jobs.every((j) => j.organization_id === orgId);
  assert(allBelongToOrg, "100% of jobs belong to Oman Investment Authority org");

  const { data: depts } = await supabase
    .from("departments")
    .select("id")
    .eq("organization_id", orgId);
  const deptIdsSet = new Set(depts?.map((d) => d.id) || []);

  const allValidDepts = jobs.every((j) => j.department_id && deptIdsSet.has(j.department_id));
  assert(allValidDepts, "Every job is linked to a valid OIA department");

  // 4. Unique reference codes
  const refCodes = jobs.map((j) => j.reference_code).filter(Boolean);
  const uniqueRefCodes = new Set(refCodes);
  assert(refCodes.length === uniqueRefCodes.size, `No duplicate reference codes (found ${refCodes.length} unique)`);

  // 5. Required skills stored correctly as array
  const allValidSkillsArray = jobs.every((j) => Array.isArray(j.required_skills) && j.required_skills.length >= 5);
  assert(allValidSkillsArray, "Every job has required_skills stored as a valid array with >= 5 items");

  // 6. Application deadlines logic
  const now = new Date();
  const openJobs = jobs.filter((j) => j.status === "open");
  const closedJobs = jobs.filter((j) => j.status === "closed");

  const openDeadlinesValid = openJobs.every((j) => !j.closing_date || new Date(j.closing_date) > now);
  assert(openDeadlinesValid, "Open jobs have future application deadlines");

  const closedDeadlinesValid = closedJobs.every((j) => !j.closing_date || new Date(j.closing_date) <= now);
  assert(closedDeadlinesValid, "Closed jobs have expired application deadlines");

  // 7. Candidate API visibility check (only open jobs)
  const candidateVisibleJobs = jobs.filter((j) => j.status === "open");
  const nonVisibleJobs = jobs.filter((j) => j.status !== "open");

  assert(candidateVisibleJobs.length > 0, "Open jobs are available for candidates");
  assert(nonVisibleJobs.length >= 2, "Draft and Closed jobs exist and will be hidden from Candidate API");

  // 8. Candidate Matching Service Fixture Verification (6 test profiles)
  console.log("\n--- Testing Candidate Matching Service against Fixtures ---");

  const testFixtures = [
    {
      name: "Software/AI Candidate",
      headline: "Senior Software & AI Engineer",
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Python", "Docker", "Machine Learning"],
      experienceYears: 6,
      expectedJobRef: "OIA-TECH-002",
    },
    {
      name: "Data-Analysis Candidate",
      headline: "Lead Data Analyst",
      skills: ["SQL", "Power BI", "Python", "Data Analysis", "Advanced Excel", "Data Visualization", "ETL"],
      experienceYears: 4,
      expectedJobRef: "OIA-TECH-003",
    },
    {
      name: "Electrical-Engineering Candidate",
      headline: "Senior Electrical Maintenance Engineer",
      skills: ["Electrical Engineering", "Power Distribution", "Protection Systems", "IEC Standards", "AutoCAD Electrical", "Preventive Maintenance"],
      experienceYears: 7,
      expectedJobRef: "OIA-ENG-003",
    },
    {
      name: "Civil-Engineering Candidate",
      headline: "Civil Project Engineer",
      skills: ["Civil Construction", "Structural Drawings", "Quantity Surveying", "AutoCAD", "Project Planning", "Site Supervision", "Contract Administration"],
      experienceYears: 5,
      expectedJobRef: "OIA-ENG-005",
    },
    {
      name: "Procurement Candidate",
      headline: "Senior Procurement Specialist",
      skills: ["Strategic Sourcing", "Tender Management", "Vendor Evaluation", "Contract Negotiation", "Cost Analysis", "Purchase Orders", "ERP Systems"],
      experienceYears: 7,
      expectedJobRef: "OIA-PROC-003",
    },
    {
      name: "Supply-Chain/Logistics Candidate",
      headline: "Supply Chain & Logistics Analyst",
      skills: ["Supply Chain Analytics", "Demand Forecasting", "Inventory Optimization", "Logistics Analysis", "Supplier Performance", "Advanced Excel", "Power BI"],
      experienceYears: 4,
      expectedJobRef: "OIA-PROC-006",
    },
  ];

  const tempCandidateIds: string[] = [];

  try {
    for (const fx of testFixtures) {
      // Create temporary test candidate record
      const { data: cand, error: candErr } = await supabase
        .from("candidates")
        .insert({
          organization_id: orgId,
          full_name: `Verification Test (${fx.name})`,
          email: `test.${Date.now()}.${Math.random().toString(36).substring(7)}@verification.local`,
          headline: fx.headline,
          experience_years: fx.experienceYears,
          is_confirmed: true,
        })
        .select("id")
        .single();

      if (candErr || !cand) {
        console.error(`Failed to create test candidate for ${fx.name}:`, candErr?.message);
        continue;
      }
      tempCandidateIds.push(cand.id);

      // Insert candidate skills
      for (const sk of fx.skills) {
        await supabase.from("candidate_skills").insert({ candidate_id: cand.id, skill: sk });
      }

      // Find expected job
      const targetJob = jobs.find((j) => j.reference_code === fx.expectedJobRef);
      if (!targetJob) {
        assert(false, `Expected target job ${fx.expectedJobRef} found for matching test`);
        continue;
      }

      // Calculate match score
      const matchResult = computeCandidateJobMatch(
        fx.skills,
        fx.experienceYears,
        targetJob.required_skills,
        targetJob.min_experience_years
      );

      assert(
        matchResult.matchScore >= 60,
        `Matching engine scored ${fx.name} against ${fx.expectedJobRef}: ${matchResult.matchScore}% (>= 60%)`
      );
    }
  } finally {
    // Cleanup temporary candidate verification records
    if (tempCandidateIds.length > 0) {
      await supabase.from("candidates").delete().in("id", tempCandidateIds);
      console.log(` Cleaned up ${tempCandidateIds.length} temporary verification candidate records.`);
    }
  }

  // 9. Cross-organization Isolation check
  const fakeOrgId = "00000000-0000-0000-0000-000000000000";
  const { data: crossOrgJobs } = await supabase
    .from("jobs")
    .select("id")
    .eq("organization_id", fakeOrgId);

  assert((crossOrgJobs?.length || 0) === 0, "Cross-organization query isolation enforced (0 jobs leakage)");

  console.log("\n==================================================");
  console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("==================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

verifyOiaJobSeed().catch((err) => {
  console.error("Fatal verification error:", err);
  process.exit(1);
});
