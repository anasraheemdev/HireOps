/**
 * Seeds the Supabase Postgres database. Idempotent: re-running is
 * a no-op unless the organization row has been removed first.
 *
 * Usage: npx tsx scripts/seed.ts
 */
import { Client } from "pg";
import dotenv from "dotenv";
import type { PipelineStage, LanguageSkill } from "../src/lib/types";

dotenv.config({ path: ".env.local" });

/** Minimal fixtures (mock-data.ts removed after production cutover). */
const mockJobs = [
  {
    id: "job-1",
    title: "Senior Investment Analyst",
    department: "Investments",
    location: "Muscat, Oman",
    type: "Full-time" as const,
    level: "Senior",
    status: "Open" as const,
    priority: "High" as const,
    postedDate: "2026-01-10",
    closingDate: "2026-08-01",
    description: "Lead investment analysis across portfolio companies.",
    requiredSkills: ["Financial Modeling", "Excel", "Valuation"],
    niceToHave: ["Python"],
    minExperience: 5,
  },
  {
    id: "job-2",
    title: "HR Business Partner",
    department: "People & Culture",
    location: "Muscat, Oman",
    type: "Full-time" as const,
    level: "Mid",
    status: "Open" as const,
    priority: "Medium" as const,
    postedDate: "2026-02-01",
    closingDate: "2026-07-30",
    description: "Partner with business units on talent strategy.",
    requiredSkills: ["HRBP", "Employee Relations"],
    niceToHave: ["Arabic"],
    minExperience: 3,
  },
];

const mockCandidates = [
  {
    id: "cand-1",
    name: "Elena Petrova",
    nameAr: null as string | null,
    email: "elena.petrova@example.com",
    phone: "+968 9000 0001",
    location: "Muscat",
    nationality: "Russian",
    title: "Investment Analyst",
    experienceYears: 6,
    source: "LinkedIn",
    avatarColor: "from-blue-500 to-indigo-600",
    jobId: "job-1",
    stage: "Screening" as PipelineStage,
    matchScore: 82,
    aiScore: 80,
    confidenceScore: 75,
    shortlisted: true,
    tags: ["Finance"],
    aiRecommendation: "Strong hire potential",
    strengths: ["Modeling"],
    weaknesses: ["Local market depth"],
    appliedDate: "2026-03-01",
    experience: [
      {
        role: "Analyst",
        company: "Global Cap",
        location: "Dubai",
        start: "2020-01",
        end: "Present",
        description: "Coverage of MENA equities.",
      },
    ],
    education: [
      {
        degree: "MSc Finance",
        institution: "LSE",
        start: "2017-09",
        end: "2018-06",
        grade: "Distinction",
      },
    ],
    certifications: [{ name: "CFA L2", issuer: "CFA Institute", year: 2022 }],
    languages: [{ name: "English", level: "Fluent" as LanguageSkill["level"] }],
    skills: ["Financial Modeling", "Excel", "Valuation"],
  },
];

const stageMap: Record<PipelineStage, string> = {
  Applied: "applied",
  Screening: "screening",
  Assessment: "assessment",
  "AI Interview": "ai_interview",
  "Final Interview": "final_interview",
  Offer: "offer",
  Hired: "hired",
  Rejected: "rejected",
};

const typeMap: Record<string, string> = {
  "Full-time": "full_time",
  "Part-time": "part_time",
  Contract: "contract",
};

const statusMap: Record<string, string> = {
  Open: "open",
  Closed: "closed",
  Draft: "draft",
  "On Hold": "on_hold",
};

const priorityMap: Record<string, string> = {
  Critical: "critical",
  High: "high",
  Medium: "medium",
  Low: "low",
};

const levelMap: Record<LanguageSkill["level"], string> = {
  Native: "native",
  Fluent: "fluent",
  Professional: "professional",
  Conversational: "conversational",
  Basic: "basic",
};

const PERMISSIONS = [
  ["candidates.read", "View candidate profiles and pipelines"],
  ["candidates.write", "Create, edit, shortlist, and reject candidates"],
  ["jobs.read", "View job postings"],
  ["jobs.write", "Create and edit job postings"],
  ["jobs.publish", "Publish or close job postings"],
  ["applications.read", "View applications and pipeline stages"],
  ["applications.write", "Move applications through pipeline stages"],
  ["admin.users.manage", "Invite, edit, and suspend platform users"],
  ["admin.roles.manage", "Edit roles and permission assignments"],
  ["admin.org.manage", "Edit organization profile and departments"],
  ["audit.read", "View audit logs"],
  ["reports.read", "View and export reports and analytics"],
  ["ai.configure", "Configure AI models, prompts, and thresholds"],
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "Super Admin": PERMISSIONS.map((p) => p[0]),
  "Hiring Manager": [
    "candidates.read", "candidates.write", "jobs.read", "jobs.write",
    "applications.read", "applications.write", "reports.read",
  ],
  Recruiter: [
    "candidates.read", "candidates.write", "jobs.read", "jobs.write",
    "applications.read", "applications.write",
  ],
  Interviewer: ["candidates.read", "applications.read", "applications.write"],
  "Compliance Officer": ["candidates.read", "jobs.read", "applications.read", "audit.read", "reports.read"],
};

const DEPARTMENTS = Array.from(new Set(mockJobs.map((j) => j.department)));

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const existing = await client.query("select id from organizations where name = any($1::text[])", [
    ["HireOps Demo Organization", "Oman Investment Authority"],
  ]);
  if ((existing.rowCount ?? 0) > 0) {
    await client.query(`update organizations set name = $1, registration_id = $2 where id = $3`, [
      "HireOps Demo Organization",
      "HIREOPS-DEMO",
      existing.rows[0].id,
    ]);
    console.log("Organization already seeded — updated branding to HireOps Demo Organization.");
    await client.end();
    return;
  }

  try {
    await client.query("begin");

    const orgRes = await client.query(
      `insert into organizations (name, registration_id, contact_email, headquarters, default_language, timezone)
       values ($1, $2, $3, $4, 'en', 'Asia/Muscat') returning id`,
      ["HireOps Demo Organization", "HIREOPS-DEMO", "hr@hireops.app", "Global"]
    );
    const orgId: string = orgRes.rows[0].id;
    console.log(`organization created: ${orgId}`);

    const deptIds = new Map<string, string>();
    for (const name of DEPARTMENTS) {
      const res = await client.query(
        "insert into departments (organization_id, name) values ($1, $2) returning id",
        [orgId, name]
      );
      deptIds.set(name, res.rows[0].id);
    }
    console.log(`departments created: ${deptIds.size}`);

    const permIds = new Map<string, string>();
    for (const [code, description] of PERMISSIONS) {
      const res = await client.query(
        `insert into permissions (code, description) values ($1, $2)
         on conflict (code) do update set description = excluded.description returning id`,
        [code, description]
      );
      permIds.set(code, res.rows[0].id);
    }
    console.log(`permissions created: ${permIds.size}`);

    const roleIds = new Map<string, string>();
    for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
      const res = await client.query(
        "insert into roles (organization_id, name, is_system) values ($1, $2, true) returning id",
        [orgId, roleName]
      );
      roleIds.set(roleName, res.rows[0].id);
      for (const code of ROLE_PERMISSIONS[roleName]) {
        await client.query(
          "insert into role_permissions (role_id, permission_id) values ($1, $2)",
          [res.rows[0].id, permIds.get(code)]
        );
      }
    }
    console.log(`roles created: ${roleIds.size}`);

    const jobIds = new Map<string, string>();
    for (const j of mockJobs) {
      const res = await client.query(
        `insert into jobs (
           organization_id, department_id, title, location, employment_type, level, status, priority,
           posted_date, closing_date, salary_min, salary_max, salary_currency, description,
           required_skills, nice_to_have_skills, min_experience_years
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         returning id`,
        [
          orgId,
          deptIds.get(j.department),
          j.title,
          j.location,
          typeMap[j.type],
          j.level,
          statusMap[j.status],
          priorityMap[j.priority],
          j.postedDate,
          j.closingDate,
          null,
          null,
          "OMR",
          j.description,
          j.requiredSkills,
          j.niceToHave,
          j.minExperience,
        ]
      );
      jobIds.set(j.id, res.rows[0].id);
    }
    console.log(`jobs created: ${jobIds.size}`);

    let candidateCount = 0;
    for (const c of mockCandidates) {
      const res = await client.query(
        `insert into candidates (
           organization_id, full_name, full_name_ar, email, phone, location, nationality,
           headline, experience_years, source, avatar_color
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         returning id`,
        [
          orgId, c.name, c.nameAr ?? null, c.email, c.phone, c.location, c.nationality,
          c.title, c.experienceYears, c.source, c.avatarColor,
        ]
      );
      const candidateId: string = res.rows[0].id;
      candidateCount++;

      for (let i = 0; i < c.experience.length; i++) {
        const e = c.experience[i];
        await client.query(
          `insert into candidate_experience (candidate_id, role, company, location, start_date, end_date, description, sort_order)
           values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [candidateId, e.role, e.company, e.location, toDate(e.start), e.end === "Present" ? null : toDate(e.end), e.description, i]
        );
      }
      for (let i = 0; i < c.education.length; i++) {
        const e = c.education[i];
        await client.query(
          `insert into candidate_education (candidate_id, degree, institution, start_date, end_date, grade, sort_order)
           values ($1,$2,$3,$4,$5,$6,$7)`,
          [candidateId, e.degree, e.institution, toDate(e.start), toDate(e.end), e.grade ?? null, i]
        );
      }
      for (const cert of c.certifications) {
        await client.query(
          "insert into candidate_certifications (candidate_id, name, issuer, year) values ($1,$2,$3,$4)",
          [candidateId, cert.name, cert.issuer, cert.year]
        );
      }
      for (const lang of c.languages) {
        await client.query(
          "insert into candidate_languages (candidate_id, name, level) values ($1,$2,$3)",
          [candidateId, lang.name, levelMap[lang.level]]
        );
      }
      for (const skill of c.skills) {
        await client.query(
          "insert into candidate_skills (candidate_id, skill) values ($1,$2) on conflict do nothing",
          [candidateId, skill]
        );
      }

      const jobId = jobIds.get(c.jobId);
      if (jobId) {
        await client.query(
          `insert into applications (
             candidate_id, job_id, stage, match_score, ai_score, confidence_score,
             shortlisted, tags, ai_recommendation, strengths, weaknesses, applied_date
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            candidateId, jobId, stageMap[c.stage], c.matchScore, c.aiScore, c.confidenceScore,
            c.shortlisted, c.tags, c.aiRecommendation, c.strengths, c.weaknesses, c.appliedDate,
          ]
        );
      }
    }
    console.log(`candidates created: ${candidateCount}`);

    await client.query("commit");
    console.log("Seed complete.");
  } catch (err) {
    await client.query("rollback");
    console.error("Seed FAILED, rolled back:", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

function toDate(yearLike: string): string | null {
  if (!yearLike) return null;
  // mock data stores years as plain strings like "2021" — normalize to Jan 1st of that year.
  const year = parseInt(yearLike, 10);
  if (Number.isNaN(year)) return null;
  return `${year}-01-01`;
}

main();
