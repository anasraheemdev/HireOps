import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, JobStatus, JobType, JobPriority } from "../src/lib/supabase/database.types";

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

// Zod validation schema for seed job definitions
const jobSeedSchema = z.object({
  referenceCode: z.string().min(5),
  title: z.string().min(3),
  department: z.string().min(2),
  location: z.string().min(3),
  employmentType: z.enum(["full_time", "part_time", "contract"]),
  level: z.enum(["Graduate", "Junior", "Mid", "Senior", "Lead", "Manager", "Entry"]),
  status: z.enum(["open", "closed", "draft", "on_hold"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  postedDate: z.string(),
  closingDate: z.string(),
  salaryMin: z.number().positive(),
  salaryMax: z.number().positive(),
  salaryCurrency: z.string().default("OMR"),
  description: z.string().min(50),
  requiredSkills: z.array(z.string()).min(5).max(12),
  niceToHaveSkills: z.array(z.string()),
  minExperienceYears: z.number().nonnegative(),
});

type JobSeedDefinition = z.infer<typeof jobSeedSchema>;

// Required 20 department domains
const DEPARTMENTS = [
  "Information Technology",
  "Artificial Intelligence and Data",
  "Cybersecurity",
  "Electrical Engineering",
  "Civil Engineering",
  "Mechanical Engineering",
  "Industrial Engineering",
  "Project Management",
  "Procurement",
  "Supply Chain and Logistics",
  "Finance and Investment",
  "Accounting and Audit",
  "Human Resources",
  "Legal and Compliance",
  "Risk Management",
  "Sustainability and ESG",
  "Corporate Strategy",
  "Operations and Facilities",
  "Communications and Public Relations",
  "Administration",
] as const;

// 53 Detailed Realistic Job Seed Definitions
const JOBS: JobSeedDefinition[] = [
  // --- Renewable Energy, Solar EPC & Technical Procurement (8 specialized jobs) ---
  {
    referenceCode: "OIA-RENEW-001",
    title: "Solar EPC Procurement Specialist",
    department: "Procurement",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "high",
    postedDate: "2026-03-01",
    closingDate: "2026-11-30",
    salaryMin: 2200,
    salaryMax: 3200,
    salaryCurrency: "OMR",
    description:
      "Join Oman Investment Authority's renewable energy infrastructure team as a Solar EPC Procurement Specialist. You will lead end-to-end strategic procurement for utility-scale solar photovoltaic (PV) engineering, procurement, and construction (EPC) projects. Responsibilities include managing complex tender processes, conducting vendor evaluations, negotiating high-value equipment supply agreements for PV modules, solar inverters, and balance of system components, managing RFQs and RFPs, reviewing BOQs, and enforcing strict cost optimization and contract compliance across sovereign clean energy investments.",
    requiredSkills: ["Solar EPC", "Strategic Sourcing", "Technical Procurement", "Vendor Management", "RFQs and RFPs", "Tender Management", "Contract Negotiation", "BOQ Preparation", "Cost Optimization"],
    niceToHaveSkills: ["PV Modules", "Solar Inverters", "Balance of System Components", "ERP Purchase Order Tracking"],
    minExperienceYears: 6,
  },
  {
    referenceCode: "OIA-PROC-012",
    title: "Technical Procurement Engineer",
    department: "Procurement",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-05",
    closingDate: "2026-12-15",
    salaryMin: 1800,
    salaryMax: 2600,
    salaryCurrency: "OMR",
    description:
      "Oman Investment Authority is seeking a Technical Procurement Engineer to bridge engineering specifications and commercial procurement processes for major energy and infrastructure assets. You will review technical bid documentation, prepare Bill of Quantities (BOQ), manage technical vendor qualifications, issue comprehensive RFQs and RFPs, evaluate supplier proposals against strict engineering standards, and coordinate PO tracking in ERP systems while optimizing procurement costs.",
    requiredSkills: ["Technical Procurement", "BOQ Preparation", "RFQs and RFPs", "Vendor Management", "Strategic Sourcing", "Cost Optimization", "Contract Negotiation"],
    niceToHaveSkills: ["AutoCAD", "Single-Line Diagrams", "ERP Purchase Order Tracking", "Procurement Planning"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-RENEW-002",
    title: "Renewable Energy Project Coordinator",
    department: "Project Management",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-03-01",
    closingDate: "2026-12-31",
    salaryMin: 1600,
    salaryMax: 2400,
    salaryCurrency: "OMR",
    description:
      "Coordinate sovereign clean energy initiatives as a Renewable Energy Project Coordinator within Oman Investment Authority. You will support solar and wind project managers across engineering, procurement, and site construction phases. Key tasks include managing project schedules in MS Project, tracking milestone deliverables, facilitating stakeholder communications, ensuring HSE and QA/QC compliance, and coordinating logistics for balance of system equipment delivery.",
    requiredSkills: ["Project Coordination", "Renewable Energy", "MS Project", "Logistics Coordination", "QA/QC", "HSE", "Procurement Planning"],
    niceToHaveSkills: ["Solar EPC", "Vendor Management", "Inventory Management", "BOQ Preparation"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-RENEW-003",
    title: "Solar Electrical Engineer",
    department: "Electrical Engineering",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "high",
    postedDate: "2026-02-20",
    closingDate: "2026-11-15",
    salaryMin: 2000,
    salaryMax: 3000,
    salaryCurrency: "OMR",
    description:
      "Design and oversee electrical systems for utility-scale solar PV installations. As a Solar Electrical Engineer at Oman Investment Authority, you will develop detailed PV system layouts, produce single-line diagrams (SLDs), perform string sizing using PVsyst and HelioScope, select grid-tied central/string inverters and step-up transformers, evaluate grid interconnection requirements, and ensure full compliance with utility grid codes and international standards.",
    requiredSkills: ["PV System Design", "PVsyst", "HelioScope", "Single-Line Diagrams", "Solar Inverters", "Grid Interconnection", "Transformers", "AutoCAD"],
    niceToHaveSkills: ["PV Modules", "Testing and Commissioning", "Balance of System Components", "BOQ Preparation"],
    minExperienceYears: 5,
  },
  {
    referenceCode: "OIA-RENEW-004",
    title: "Solar EPC Project Engineer",
    department: "Electrical Engineering",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "critical",
    postedDate: "2026-03-10",
    closingDate: "2026-12-20",
    salaryMin: 1900,
    salaryMax: 2800,
    salaryCurrency: "OMR",
    description:
      "Supervise engineering execution, technical submittals, and site construction activities for large-scale solar EPC projects under Oman Investment Authority portfolio companies. You will interface between EPC contractors, equipment vendors, and grid authorities; review technical designs, single-line diagrams, and BOQs; monitor installation quality, HSE standards, and testing and commissioning procedures.",
    requiredSkills: ["Solar EPC", "PV System Design", "Project Coordination", "AutoCAD", "Single-Line Diagrams", "QA/QC", "Testing and Commissioning"],
    niceToHaveSkills: ["PV Modules", "Solar Inverters", "HelioScope", "MS Project"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-PROC-013",
    title: "Procurement and Contracts Engineer",
    department: "Procurement",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "high",
    postedDate: "2026-03-01",
    closingDate: "2026-11-30",
    salaryMin: 2100,
    salaryMax: 3100,
    salaryCurrency: "OMR",
    description:
      "Manage high-value capital expenditure procurement contracts and EPC agreements for major strategic investments at Oman Investment Authority. Responsibilities include drafting tender conditions, managing pre-qualification, evaluating technical and commercial bids, administering FIDIC/EPC contracts, negotiating variation orders and claims, and tracking PO fulfillment using enterprise ERP systems.",
    requiredSkills: ["Contract Negotiation", "Tender Management", "Strategic Sourcing", "Technical Procurement", "Vendor Management", "Cost Optimization", "Procurement Planning"],
    niceToHaveSkills: ["BOQ Preparation", "ERP Purchase Order Tracking", "RFQs and RFPs", "Legal and Compliance"],
    minExperienceYears: 6,
  },
  {
    referenceCode: "OIA-RENEW-005",
    title: "Solar Supply Chain Specialist",
    department: "Supply Chain and Logistics",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-05",
    closingDate: "2026-12-15",
    salaryMin: 1700,
    salaryMax: 2500,
    salaryCurrency: "OMR",
    description:
      "Manage the international supply chain and site logistics for solar power projects within Oman Investment Authority's infrastructure portfolio. You will oversee global shipping schedules, customs clearance for imported PV modules and inverters, warehousing, inventory management, purchase order tracking in ERP, and vendor performance management to eliminate supply chain bottlenecks and project delays.",
    requiredSkills: ["Supply Chain Management", "Inventory Management", "Logistics Coordination", "ERP Purchase Order Tracking", "Vendor Management", "PV Modules", "Solar Inverters"],
    niceToHaveSkills: ["Strategic Sourcing", "Cost Optimization", "Balance of System Components", "Procurement Planning"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-ENG-013",
    title: "Electrical Testing and Commissioning Engineer",
    department: "Electrical Engineering",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "critical",
    postedDate: "2026-02-15",
    closingDate: "2026-11-30",
    salaryMin: 2200,
    salaryMax: 3300,
    salaryCurrency: "OMR",
    description:
      "Lead pre-commissioning and full energization testing for solar PV plants, high-voltage sub-stations, transformers, and grid switchgear under Oman Investment Authority assets. You will execute relay testing, insulation resistance testing, primary/secondary injection, grid synchronization, performance ratio checks, and enforce stringent QA/QC and HSE procedures during plant takeover.",
    requiredSkills: ["Testing and Commissioning", "Grid Interconnection", "Transformers", "Single-Line Diagrams", "QA/QC", "HSE", "Solar Inverters", "PV System Design"],
    niceToHaveSkills: ["Solar EPC", "AutoCAD", "PV Modules", "Project Coordination"],
    minExperienceYears: 6,
  },
  // --- Technology and AI (12 jobs) ---
  {
    referenceCode: "OIA-TECH-001",
    title: "Software Engineer",
    department: "Information Technology",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-03-01",
    closingDate: "2026-11-30",
    salaryMin: 1800,
    salaryMax: 2600,
    salaryCurrency: "OMR",
    description:
      "Join the digital enterprise team at Oman Investment Authority to design, build, and maintain scalable web applications and microservices. You will collaborate with cross-functional sovereign asset managers, data analysts, and solution architects to digitize investment operations, streamline internal workflows, and deliver secure APIs. We value robust clean code practices, automated testing, continuous integration, and cloud-native architecture.",
    requiredSkills: ["TypeScript", "React", "Node.js", "PostgreSQL", "REST APIs", "Git", "Docker"],
    niceToHaveSkills: ["GraphQL", "Next.js", "Tailwind CSS", "Redis"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-TECH-002",
    title: "Senior Full-Stack Developer",
    department: "Information Technology",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "critical",
    postedDate: "2026-02-15",
    closingDate: "2026-12-15",
    salaryMin: 2800,
    salaryMax: 4000,
    salaryCurrency: "OMR",
    description:
      "We are seeking an experienced Senior Full-Stack Developer to lead frontend and backend software initiatives supporting OIA's sovereign portfolio management platform. In this high-impact role, you will architect resilient distributed applications, drive architectural standards, optimize complex database queries, and mentor junior engineers. Your work will directly empower investment committees with real-time decision dashboards.",
    requiredSkills: ["TypeScript", "Next.js", "Node.js", "PostgreSQL", "System Architecture", "GraphQL", "CI/CD"],
    niceToHaveSkills: ["Microservices", "Kafka", "AWS", "Kubernetes"],
    minExperienceYears: 6,
  },
  {
    referenceCode: "OIA-TECH-003",
    title: "Data Analyst",
    department: "Artificial Intelligence and Data",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-03-05",
    closingDate: "2026-11-15",
    salaryMin: 1600,
    salaryMax: 2400,
    salaryCurrency: "OMR",
    description:
      "The Data Analyst transforms complex financial, operational, and macroeconomic datasets into actionable strategic insights for OIA leadership. You will design, build, and maintain interactive Power BI and Tableau dashboards, conduct exploratory SQL analysis, validate data pipelines, and present evidence-based recommendations to portfolio managers and strategic planners across sovereign assets.",
    requiredSkills: ["SQL", "Power BI", "Python", "Data Analysis", "Advanced Excel", "Data Visualization", "ETL"],
    niceToHaveSkills: ["R", "BigQuery", "Statistical Analysis", "Financial Data"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-TECH-004",
    title: "Data Scientist",
    department: "Artificial Intelligence and Data",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-10",
    closingDate: "2026-12-01",
    salaryMin: 2200,
    salaryMax: 3200,
    salaryCurrency: "OMR",
    description:
      "Develop predictive statistical models, machine learning pipelines, and quantitative algorithms to evaluate asset valuation, market trends, and risk exposure for sovereign investments. As a Data Scientist within OIA's AI Center of Excellence, you will work closely with domain experts to build NLP text analysis tools, time-series forecasts, and risk scoring models.",
    requiredSkills: ["Python", "Machine Learning", "SQL", "Pandas", "Scikit-Learn", "Statistical Modeling", "Data Analysis"],
    niceToHaveSkills: ["TensorFlow", "PyTorch", "NLP", "Time-Series Analysis"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-TECH-005",
    title: "AI/ML Engineer",
    department: "Artificial Intelligence and Data",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "critical",
    postedDate: "2026-02-20",
    closingDate: "2026-12-30",
    salaryMin: 3000,
    salaryMax: 4500,
    salaryCurrency: "OMR",
    description:
      "Architect and deploy production-grade Large Language Model (LLM) agents, vector search indices, and deep learning pipelines across OIA enterprise platforms. The AI/ML Engineer will design MLOps frameworks, fine-tune domain-specific AI models, manage vector embeddings with pgvector, and ensure safe, compliant, high-speed inference for executive decision support systems.",
    requiredSkills: ["Python", "PyTorch", "Machine Learning", "MLOps", "LLMs", "Vector Databases", "Docker", "API Integration"],
    niceToHaveSkills: ["LangChain", "FastAPI", "Kubernetes", "ONNX"],
    minExperienceYears: 5,
  },
  {
    referenceCode: "OIA-TECH-006",
    title: "Business Intelligence Analyst",
    department: "Artificial Intelligence and Data",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-12",
    closingDate: "2026-11-20",
    salaryMin: 1700,
    salaryMax: 2500,
    salaryCurrency: "OMR",
    description:
      "The Business Intelligence Analyst partners with executive stakeholders and department heads to define key performance indicators, model enterprise data warehouses, and generate automated reporting packages. You will streamline data ingestion from ERP systems, build executive scorecards, and provide actionable analytics on operational efficiency and financial performance.",
    requiredSkills: ["SQL", "Power BI", "Data Modeling", "Business Intelligence", "Advanced Excel", "Data Warehousing", "ETL"],
    niceToHaveSkills: ["Tableau", "DAX", "SSIS", "Snowflake"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-TECH-007",
    title: "Database Administrator",
    department: "Information Technology",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-28",
    closingDate: "2026-11-10",
    salaryMin: 1900,
    salaryMax: 2800,
    salaryCurrency: "OMR",
    description:
      "Oversee the administration, performance tuning, security, and high availability of PostgreSQL and Oracle relational database clusters at OIA. The Database Administrator will implement automated backup and disaster recovery plans, enforce fine-grained access control, monitor query performance, and perform database migrations to ensure zero-downtime operations.",
    requiredSkills: ["PostgreSQL", "Database Administration", "SQL", "Performance Tuning", "Backup & Recovery", "Linux", "Security Compliance"],
    niceToHaveSkills: ["Oracle Database", "pgvector", "Replication", "Shell Scripting"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-TECH-008",
    title: "Cloud and DevOps Engineer",
    department: "Information Technology",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "critical",
    postedDate: "2026-01-20",
    closingDate: "2026-12-10",
    salaryMin: 2700,
    salaryMax: 3800,
    salaryCurrency: "OMR",
    description:
      "Design and maintain secure cloud infrastructure, automated deployment pipelines, and container orchestration platforms for OIA software assets. The Cloud and DevOps Engineer will implement Infrastructure-as-Code using Terraform, configure Kubernetes clusters, maintain CI/CD pipelines, and enforce cloud security baselines aligned with national cybersecurity standards.",
    requiredSkills: ["Docker", "Kubernetes", "Terraform", "CI/CD", "AWS", "Linux", "Cloud Security", "Git"],
    niceToHaveSkills: ["Ansible", "Helm", "Prometheus", "Grafana"],
    minExperienceYears: 5,
  },
  {
    referenceCode: "OIA-TECH-009",
    title: "IT Support Specialist",
    department: "Information Technology",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Graduate",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-01",
    closingDate: "2026-10-31",
    salaryMin: 900,
    salaryMax: 1300,
    salaryCurrency: "OMR",
    description:
      "Provide technical helpdesk support, hardware provisioning, network troubleshooting, and user onboarding for OIA staff. As an IT Support Specialist, you will manage service requests through an ITSM ticketing platform, configure Windows/Mac workstations, support office video conferencing systems, and assist in enforcing corporate IT security policies.",
    requiredSkills: ["Helpdesk Support", "Windows OS", "Active Directory", "Hardware Troubleshooting", "Network Administration", "Customer Service"],
    niceToHaveSkills: ["ITIL", "Office 365 Admin", "macOS", "VPN Configuration"],
    minExperienceYears: 0,
  },
  {
    referenceCode: "OIA-TECH-010",
    title: "Cybersecurity Analyst",
    department: "Cybersecurity",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-10",
    closingDate: "2026-11-30",
    salaryMin: 2000,
    salaryMax: 2900,
    salaryCurrency: "OMR",
    description:
      "Monitor, detect, and respond to security threats across OIA's digital infrastructure. The Cybersecurity Analyst conducts security log analysis, manages SIEM alerting platforms, conducts vulnerability assessments, investigates security incidents, and enforces organizational compliance with national cyber defense frameworks.",
    requiredSkills: ["Cybersecurity", "SIEM", "Vulnerability Assessment", "Incident Response", "Network Security", "Threat Intelligence", "Firewalls"],
    niceToHaveSkills: ["CompTIA Security+", "CEH", "Splunk", "Penetration Testing"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-TECH-011",
    title: "Information Security Engineer",
    department: "Cybersecurity",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "draft",
    priority: "medium",
    postedDate: "2026-03-15",
    closingDate: "2026-12-31",
    salaryMin: 2800,
    salaryMax: 3900,
    salaryCurrency: "OMR",
    description:
      "Architect and enforce robust cybersecurity controls, identity management architectures, and encryption standards across enterprise systems. In this senior role, you will conduct security risk assessments for new software applications, review cloud security configurations, and establish zero-trust architecture blueprints for sovereign fund digital assets.",
    requiredSkills: ["Cybersecurity", "Identity & Access Management", "Encryption", "Security Architecture", "Network Security", "Zero Trust", "Risk Assessment"],
    niceToHaveSkills: ["CISSP", "CISM", "ISO 27001", "Cloud Security Architecture"],
    minExperienceYears: 6,
  },
  {
    referenceCode: "OIA-TECH-012",
    title: "Digital Transformation Specialist",
    department: "Information Technology",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Lead",
    status: "open",
    priority: "high",
    postedDate: "2026-01-15",
    closingDate: "2026-11-30",
    salaryMin: 3200,
    salaryMax: 4800,
    salaryCurrency: "OMR",
    description:
      "Lead cross-departmental digital transformation initiatives to modernize legacy operations, automate business processes, and adopt AI technologies across OIA asset portfolios. You will define digital roadmaps, manage vendor technology contracts, align digital strategies with Oman Vision 2040, and champion organizational change management.",
    requiredSkills: ["Digital Transformation", "Business Process Optimization", "Change Management", "Project Management", "IT Strategy", "Enterprise Architecture", "Stakeholder Management"],
    niceToHaveSkills: ["TOGAF", "Agile Leadership", "AI Strategy", "Innovation Management"],
    minExperienceYears: 8,
  },

  // --- Engineering (12 jobs) ---
  {
    referenceCode: "OIA-ENG-001",
    title: "Graduate Electrical Engineer",
    department: "Electrical Engineering",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Graduate",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-01",
    closingDate: "2026-11-30",
    salaryMin: 1000,
    salaryMax: 1400,
    salaryCurrency: "OMR",
    description:
      "An exciting entry-level opportunity for a recent Omani engineering graduate to join OIA's infrastructure project engineering team. Under senior mentorship, you will participate in electrical system design reviews, power distribution calculations, single-line diagram analysis, site inspections, and compliance checks against IEC standards.",
    requiredSkills: ["Electrical Engineering", "AutoCAD Electrical", "Power Systems", "Single-Line Diagrams", "Technical Drawings", "Engineering Mathematics"],
    niceToHaveSkills: ["MATLAB", "ETAP", "PLC Basics", "IEC Standards"],
    minExperienceYears: 0,
  },
  {
    referenceCode: "OIA-ENG-002",
    title: "Electrical Maintenance Engineer",
    department: "Electrical Engineering",
    location: "Duqm, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-01",
    closingDate: "2026-11-15",
    salaryMin: 1800,
    salaryMax: 2600,
    salaryCurrency: "OMR",
    description:
      "Oversee preventive and corrective electrical maintenance operations for industrial asset facilities in the Special Economic Zone at Duqm. The Electrical Maintenance Engineer will supervise high-voltage switchgear, transformers, motor control centers, and backup generators, ensuring maximum equipment uptime and strict compliance with health, safety, and environment regulations.",
    requiredSkills: ["Electrical Engineering", "Preventive Maintenance", "High-Voltage Switchgear", "Power Distribution", "Root-Cause Analysis", "AutoCAD Electrical", "HSE Compliance"],
    niceToHaveSkills: ["CMMS", "SCADA", "Transformer Testing", "Infrared Thermography"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-ENG-003",
    title: "Senior Electrical Engineer",
    department: "Electrical Engineering",
    location: "Sohar, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "critical",
    postedDate: "2026-01-25",
    closingDate: "2026-12-15",
    salaryMin: 2800,
    salaryMax: 3900,
    salaryCurrency: "OMR",
    description:
      "Lead major electrical infrastructure engineering design, load calculations, and commissioning for OIA portfolio industrial plants in Sohar. In this senior capacity, you will evaluate technical contractor proposals, manage EPC vendor deliverables, perform protection relay coordination studies, and ensure international quality standards across power systems projects.",
    requiredSkills: ["Electrical Engineering", "Power Distribution", "Protection Systems", "IEC Standards", "AutoCAD Electrical", "Root-Cause Analysis", "Technical Drawings", "Project Management"],
    niceToHaveSkills: ["ETAP", "Relay Coordination", "Substation Automation", "Project Contracting"],
    minExperienceYears: 7,
  },
  {
    referenceCode: "OIA-ENG-004",
    title: "Graduate Civil Engineer",
    department: "Civil Engineering",
    location: "Salalah, Oman",
    employmentType: "full_time",
    level: "Graduate",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-01",
    closingDate: "2026-11-30",
    salaryMin: 1000,
    salaryMax: 1400,
    salaryCurrency: "OMR",
    description:
      "Entry-level role for a civil engineering graduate to assist in site supervision, structural inspection, and quantity surveying for commercial and industrial asset developments in Salalah. You will review engineering drawings, monitor contractor progress, support site safety compliance, and prepare weekly field reports for senior project engineers.",
    requiredSkills: ["Civil Construction", "Structural Drawings", "AutoCAD", "Site Supervision", "Quantity Surveying", "Technical Reports"],
    niceToHaveSkills: ["Primavera P6", "MS Project", "Concrete Technology", "Land Surveying"],
    minExperienceYears: 0,
  },
  {
    referenceCode: "OIA-ENG-005",
    title: "Civil Project Engineer",
    department: "Civil Engineering",
    location: "Duqm, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-15",
    closingDate: "2026-12-01",
    salaryMin: 1900,
    salaryMax: 2700,
    salaryCurrency: "OMR",
    description:
      "Direct civil construction engineering operations, contractor execution, and quality control for port, logistics, and infrastructure developments in Duqm. The Civil Project Engineer manages structural execution against approved specifications, inspects foundation work, verifies contractor invoices, and resolves technical site issues promptly.",
    requiredSkills: ["Civil Construction", "Structural Drawings", "Quantity Surveying", "AutoCAD", "Project Planning", "Site Supervision", "Contract Administration", "Health and Safety Compliance"],
    niceToHaveSkills: ["Primavera P6", "FIDIC Contracts", "Quality Control", "Geotechnical Engineering"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-ENG-006",
    title: "Senior Civil Engineer",
    department: "Civil Engineering",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "critical",
    postedDate: "2026-01-10",
    closingDate: "2026-12-30",
    salaryMin: 2900,
    salaryMax: 4200,
    salaryCurrency: "OMR",
    description:
      "Lead civil engineering oversight, master planning, structural integrity reviews, and capital project technical audits for sovereign real estate and infrastructure portfolios across Oman. The Senior Civil Engineer will approve contractor design submittals, manage consultant contracts, conduct risk assessments, and represent OIA in major project steering meetings.",
    requiredSkills: ["Civil Construction", "Structural Drawings", "Contract Administration", "AutoCAD", "Project Planning", "Site Supervision", "FIDIC Contracts", "Risk Management"],
    niceToHaveSkills: ["BIM / Revit", "Structural Analysis", "Value Engineering", "Chartered Engineer"],
    minExperienceYears: 8,
  },
  {
    referenceCode: "OIA-ENG-007",
    title: "Mechanical Engineer",
    department: "Mechanical Engineering",
    location: "Sur, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-20",
    closingDate: "2026-11-25",
    salaryMin: 1800,
    salaryMax: 2600,
    salaryCurrency: "OMR",
    description:
      "Perform mechanical design evaluation, HVAC, piping systems, and rotating equipment engineering for industrial facilities located in Sur. As a Mechanical Engineer, you will verify mechanical equipment specifications, perform thermal dynamics modeling, supervise installation, and participate in pre-commissioning asset trials.",
    requiredSkills: ["Mechanical Engineering", "Piping Systems", "HVAC", "AutoCAD", "Thermodynamics", "Rotating Equipment", "Technical Drawings", "Root-Cause Analysis"],
    niceToHaveSkills: ["SolidWorks", "ANSYS", "ASME Codes", "P&ID Review"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-ENG-008",
    title: "Mechanical Maintenance Engineer",
    department: "Mechanical Engineering",
    location: "Sohar, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-05",
    closingDate: "2026-11-20",
    salaryMin: 1800,
    salaryMax: 2500,
    salaryCurrency: "OMR",
    description:
      "Responsible for mechanical asset reliability, turnarounds, pumps, turbines, and preventive maintenance plans at OIA manufacturing portfolio assets in Sohar. The Mechanical Maintenance Engineer conducts vibration analysis, manages spare parts inventories, directs maintenance technicians, and implements reliability-centered maintenance (RCM) practices.",
    requiredSkills: ["Mechanical Engineering", "Preventive Maintenance", "Rotating Equipment", "Vibration Analysis", "Root-Cause Analysis", "Pumps & Turbines", "HSE Compliance"],
    niceToHaveSkills: ["Reliability-Centered Maintenance", "CMMS", "Lubrication Management", "Failure Mode Analysis"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-ENG-009",
    title: "Industrial Engineer",
    department: "Industrial Engineering",
    location: "Duqm, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "medium",
    postedDate: "2026-02-25",
    closingDate: "2026-12-01",
    salaryMin: 1700,
    salaryMax: 2400,
    salaryCurrency: "OMR",
    description:
      "Optimize operational workflows, plant layout design, throughput efficiency, and resource utilization across OIA manufacturing and logistics operating entities in Duqm. The Industrial Engineer applies Lean Six Sigma techniques, conducts time-and-motion studies, minimizes waste, and establishes baseline standard operating procedures.",
    requiredSkills: ["Industrial Engineering", "Process Optimization", "Lean Manufacturing", "Workflow Analysis", "Six Sigma", "Operations Research", "Standard Operating Procedures"],
    niceToHaveSkills: ["Arena Simulation", "Value Stream Mapping", "Minitab", "Kaizen"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-ENG-010",
    title: "Quality Assurance Engineer",
    department: "Mechanical Engineering",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-03-01",
    closingDate: "2026-11-30",
    salaryMin: 1750,
    salaryMax: 2500,
    salaryCurrency: "OMR",
    description:
      "Develop quality management systems, conduct vendor quality audits, review inspection test plans, and enforce ISO 9001 compliance for major sovereign engineering contracts. The QA Engineer will inspect materials delivery, investigate non-conformance reports, and ensure all capital projects meet approved quality standards.",
    requiredSkills: ["Quality Assurance", "ISO 9001", "Quality Control", "Audit & Inspection", "Process Optimization", "Technical Documentation", "Root-Cause Analysis"],
    niceToHaveSkills: ["Six Sigma Green Belt", "Non-Destructive Testing", "Vendor Audit", "Statistical Process Control"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-ENG-011",
    title: "Health, Safety and Environment Engineer",
    department: "Operations and Facilities",
    location: "Sohar, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "critical",
    postedDate: "2026-02-05",
    closingDate: "2026-11-15",
    salaryMin: 1850,
    salaryMax: 2700,
    salaryCurrency: "OMR",
    description:
      "Champion health, safety, and environmental compliance across OIA industrial facilities and construction sites. The HSE Engineer establishes safety protocols, conducts risk assessments and HAZOP studies, conducts site safety training, leads incident investigations, and ensures strict adherence to Omani environmental protection laws.",
    requiredSkills: ["Health and Safety Compliance", "HSE Engineering", "Risk Assessment", "Hazard Identification", "Incident Investigation", "ISO 14001", "ISO 45001"],
    niceToHaveSkills: ["NEBOSH IGC", "HAZOP Leadership", "Environmental Impact Assessment", "Fire Safety"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-ENG-012",
    title: "Facilities Engineer",
    department: "Operations and Facilities",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "closed",
    priority: "low",
    postedDate: "2025-10-01",
    closingDate: "2026-01-30",
    salaryMin: 1500,
    salaryMax: 2200,
    salaryCurrency: "OMR",
    description:
      "Manage real estate building management systems, electromechanical facility assets, space planning, and contractor maintenance services for OIA corporate headquarters. The Facilities Engineer maintains HVAC, fire protection, security systems, and energy management programs to ensure safe, sustainable facility operations.",
    requiredSkills: ["Facilities Management", "Building Management Systems", "HVAC", "Preventive Maintenance", "Contractor Supervision", "Energy Management", "Health and Safety Compliance"],
    niceToHaveSkills: ["IFMA Certification", "CAD Space Planning", "Fire Alarm Systems", "Green Building"],
    minExperienceYears: 3,
  },

  // --- Procurement and Supply Chain (11 jobs) ---
  {
    referenceCode: "OIA-PROC-001",
    title: "Procurement Officer",
    department: "Procurement",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Entry",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-01",
    closingDate: "2026-11-30",
    salaryMin: 950,
    salaryMax: 1350,
    salaryCurrency: "OMR",
    description:
      "Entry-level procurement role responsible for processing purchase requisitions, issuing requests for quotations (RFQs), tracking purchase orders, and supporting tendering procedures within OIA. You will work closely with internal departments, log supplier bids, verify delivery documentation, and maintain transparent procurement records in accordance with sovereign governance guidelines.",
    requiredSkills: ["Procurement", "Purchase Orders", "Vendor Evaluation", "ERP Systems", "Microsoft Excel", "Tender Management", "Cost Analysis"],
    niceToHaveSkills: ["Oracle ERP", "CIPS Student", "Commercial Law Basics", "Negotiation"],
    minExperienceYears: 1,
  },
  {
    referenceCode: "OIA-PROC-002",
    title: "Procurement Specialist",
    department: "Procurement",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-10",
    closingDate: "2026-11-20",
    salaryMin: 1700,
    salaryMax: 2500,
    salaryCurrency: "OMR",
    description:
      "Manage end-to-end strategic sourcing, commercial tender evaluations, and vendor contract negotiations for corporate services, IT, and consulting contracts. The Procurement Specialist conducts spend analysis, prepares tender documentation, manages tender committee reviews, and enforces strict ethical procurement compliance aligned with national regulations.",
    requiredSkills: ["Strategic Sourcing", "Tender Management", "Vendor Evaluation", "Contract Negotiation", "Cost Analysis", "Purchase Orders", "ERP Systems", "Procurement Governance"],
    niceToHaveSkills: ["CIPS Certification", "SAP Procurement", "Legal Contract Terms", "Supplier Risk Management"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-PROC-003",
    title: "Senior Procurement Specialist",
    department: "Procurement",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "critical",
    postedDate: "2026-01-15",
    closingDate: "2026-12-10",
    salaryMin: 2600,
    salaryMax: 3700,
    salaryCurrency: "OMR",
    description:
      "Lead high-value capital expenditure (CAPEX) procurement initiatives, major EPC contract negotiations, and strategic supplier partnerships for OIA portfolio developments. In this senior role, you will establish category strategies, chair tender evaluation panels, mitigate commercial supply risks, and drive In-Country Value (ICV) contribution across procurement portfolios.",
    requiredSkills: ["Strategic Sourcing", "Tender Management", "Vendor Evaluation", "Contract Negotiation", "Procurement Governance", "Cost Analysis", "In-Country Value (ICV)", "ERP Systems"],
    niceToHaveSkills: ["MCIPS", "EPC Contracting", "FIDIC Contracts", "Supply Chain Risk"],
    minExperienceYears: 7,
  },
  {
    referenceCode: "OIA-PROC-004",
    title: "Contracts and Tendering Specialist",
    department: "Procurement",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-28",
    closingDate: "2026-11-30",
    salaryMin: 1800,
    salaryMax: 2600,
    salaryCurrency: "OMR",
    description:
      "Structure, draft, review, and administer commercial contracts, SLAs, and formal tender packages for OIA capital operations. The Contracts and Tendering Specialist ensures all tendering activities strictly conform to public procurement law, manages contract variations, resolves contractor claims, and maintains robust audit-ready contract documentation.",
    requiredSkills: ["Tender Management", "Contract Negotiation", "Procurement Governance", "Vendor Evaluation", "Legal Compliance", "Claims Management", "Drafting Contracts"],
    niceToHaveSkills: ["FIDIC", "Commercial Law", "Arbitration Basics", "ERP Procurement"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-PROC-005",
    title: "Vendor Management Specialist",
    department: "Procurement",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "closed",
    priority: "low",
    postedDate: "2025-11-01",
    closingDate: "2026-02-15",
    salaryMin: 1600,
    salaryMax: 2300,
    salaryCurrency: "OMR",
    description:
      "Manage supplier pre-qualification, vendor performance scorecards, supplier risk profiling, and relationship management for OIA approved vendor registries. The Vendor Management Specialist conducts vendor audits, tracks KPI compliance, resolves supplier performance disputes, and fosters sustainable Omani SME participation.",
    requiredSkills: ["Vendor Evaluation", "Supplier Performance", "Procurement Governance", "Contract Negotiation", "Vendor Onboarding", "Cost Analysis", "ERP Systems"],
    niceToHaveSkills: ["Supplier Relationship Management", "ICV Audit", "Risk Profiling", "CIPS"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-PROC-006",
    title: "Supply Chain Analyst",
    department: "Supply Chain and Logistics",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-03-01",
    closingDate: "2026-11-30",
    salaryMin: 1600,
    salaryMax: 2400,
    salaryCurrency: "OMR",
    description:
      "Analyze supply chain network performance, inventory turnover metrics, demand forecasts, and logistics expenditures for OIA asset entities. The Supply Chain Analyst develops optimization models, builds Power BI dashboards, tracks inbound/outbound shipment timelines, and identifies cost-saving opportunities in storage and transport.",
    requiredSkills: ["Supply Chain Analytics", "Demand Forecasting", "Inventory Optimization", "Logistics Analysis", "Supplier Performance", "Advanced Excel", "Power BI", "ERP Systems"],
    niceToHaveSkills: ["SQL", "Python", "Landed Cost Modeling", "CPIM"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-PROC-007",
    title: "Supply Chain Specialist",
    department: "Supply Chain and Logistics",
    location: "Duqm, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-18",
    closingDate: "2026-12-05",
    salaryMin: 1800,
    salaryMax: 2600,
    salaryCurrency: "OMR",
    description:
      "Coordinate end-to-end materials management, port customs clearance, transportation routing, and supply chain operations for industrial operating companies in Duqm. The Supply Chain Specialist aligns supplier delivery schedules with project construction timelines, minimizes supply bottlenecks, and manages local warehouse staging.",
    requiredSkills: ["Supply Chain Specialist", "Logistics Operations", "Inventory Optimization", "Customs Clearance", "Materials Management", "ERP Systems", "Vendor Evaluation"],
    niceToHaveSkills: ["Port Operations", "Dangerous Goods Handling", "Freight Forwarding", "CSCP"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-PROC-008",
    title: "Logistics Coordinator",
    department: "Supply Chain and Logistics",
    location: "Salalah, Oman",
    employmentType: "full_time",
    level: "Entry",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-05",
    closingDate: "2026-11-25",
    salaryMin: 900,
    salaryMax: 1300,
    salaryCurrency: "OMR",
    description:
      "Manage shipping documentation, freight tracking, customs documentation, and warehouse dispatch coordination for maritime and land cargo in Salalah. As a Logistics Coordinator, you will liaise with shipping agents, port authorities, transportation contractors, and internal warehouse teams to ensure timely receipt and dispatch of materials.",
    requiredSkills: ["Logistics Coordination", "Freight Tracking", "Customs Clearance", "Shipping Documentation", "Inventory Management", "Microsoft Excel", "Communication"],
    niceToHaveSkills: ["Port Operations", "WMS Software", "Incoterms 2020", "Arabic/English Fluency"],
    minExperienceYears: 1,
  },
  {
    referenceCode: "OIA-PROC-009",
    title: "Inventory and Warehouse Specialist",
    department: "Supply Chain and Logistics",
    location: "Sohar, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "medium",
    postedDate: "2026-02-25",
    closingDate: "2026-11-30",
    salaryMin: 1500,
    salaryMax: 2200,
    salaryCurrency: "OMR",
    description:
      "Supervise warehouse inventory audits, stock classification (ABC analysis), cycle counting, and material handling systems at industrial storage facilities in Sohar. The Inventory Specialist maintains accurate ERP stock levels, enforces safety standards, and optimizes storage space utilization.",
    requiredSkills: ["Inventory Optimization", "Warehouse Management", "ERP Systems", "Stock Auditing", "Materials Management", "Safety Compliance", "Data Analysis"],
    niceToHaveSkills: ["Barcode/RFID Systems", "Forklift Safety", "Lean 5S", "WMS Administration"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-PROC-010",
    title: "Category Manager",
    department: "Procurement",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "high",
    postedDate: "2026-01-20",
    closingDate: "2026-12-15",
    salaryMin: 2800,
    salaryMax: 4000,
    salaryCurrency: "OMR",
    description:
      "Develop and execute strategic procurement category plans for industrial equipment, technology, and engineering services across OIA portfolios. The Category Manager analyzes global market trends, conducts supplier total-cost-of-ownership (TCO) modeling, builds long-term supplier alliances, and delivers annual procurement cost optimization goals.",
    requiredSkills: ["Strategic Sourcing", "Category Management", "Tender Management", "Contract Negotiation", "Total Cost of Ownership", "Supplier Relationship Management", "Procurement Governance"],
    niceToHaveSkills: ["MCIPS", "Global Sourcing", "Market Intelligence", "Executive Presentation"],
    minExperienceYears: 7,
  },
  {
    referenceCode: "OIA-PROC-011",
    title: "Strategic Sourcing Manager",
    department: "Procurement",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Manager",
    status: "draft",
    priority: "medium",
    postedDate: "2026-03-10",
    closingDate: "2026-12-31",
    salaryMin: 3400,
    salaryMax: 5000,
    salaryCurrency: "OMR",
    description:
      "Lead sovereign strategic sourcing policies, enterprise vendor management strategies, and large-scale procurement transformations for OIA holdings. The Strategic Sourcing Manager directs a team of senior procurement professionals, establishes governance frameworks, oversees ICV strategy execution, and advises executive committees on major commercial commitments.",
    requiredSkills: ["Strategic Sourcing", "Procurement Governance", "Category Management", "Contract Negotiation", "Leadership", "In-Country Value (ICV)", "Executive Stakeholder Management"],
    niceToHaveSkills: ["FCIPS / MCIPS", "Government Procurement Law", "Supply Chain Transformation"],
    minExperienceYears: 10,
  },

  // --- Business and Corporate Functions (10 jobs) ---
  {
    referenceCode: "OIA-CORP-001",
    title: "Investment Analyst",
    department: "Finance and Investment",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "critical",
    postedDate: "2026-02-01",
    closingDate: "2026-12-01",
    salaryMin: 2200,
    salaryMax: 3300,
    salaryCurrency: "OMR",
    description:
      "Conduct financial valuation, discounted cash flow (DCF) modeling, market research, and investment due diligence for potential sovereign private equity and infrastructure acquisitions. The Investment Analyst prepares investment committee memos, monitors portfolio company financial performance, and evaluates capital allocation proposals.",
    requiredSkills: ["Financial Modeling", "Valuation", "DCF Modeling", "Financial Analysis", "Due Diligence", "Investment Analysis", "Advanced Excel"],
    niceToHaveSkills: ["CFA Candidate / Charterholder", "M&A Execution", "Bloomberg Terminal", "Corporate Finance"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-CORP-002",
    title: "Financial Analyst",
    department: "Finance and Investment",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-15",
    closingDate: "2026-11-30",
    salaryMin: 1800,
    salaryMax: 2700,
    salaryCurrency: "OMR",
    description:
      "Perform financial planning and analysis (FP&A), budget forecasting, variance analysis, and cash flow monitoring for OIA operating budgets and asset subsidiaries. The Financial Analyst builds financial models, prepares monthly management accounts, tracks key financial ratios, and assists in annual budget preparation.",
    requiredSkills: ["Financial Analysis", "Financial Modeling", "Budget Forecasting", "Variance Analysis", "Advanced Excel", "ERP Systems", "Financial Reporting"],
    niceToHaveSkills: ["CPA / CMA", "IFRS", "Power BI", "Corporate Planning"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-CORP-003",
    title: "Internal Auditor",
    department: "Accounting and Audit",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-20",
    closingDate: "2026-11-20",
    salaryMin: 1900,
    salaryMax: 2800,
    salaryCurrency: "OMR",
    description:
      "Plan and conduct operational, financial, and compliance internal audits across OIA departments and portfolio companies. The Internal Auditor evaluates internal control effectiveness, identifies operational risk exposures, drafts audit reports, and monitors implementation of audit recommendations.",
    requiredSkills: ["Internal Audit", "Risk Assessment", "Internal Controls", "Financial Auditing", "Compliance Audit", "Report Writing", "IIA Standards"],
    niceToHaveSkills: ["CIA", "CPA", "ACCA", "ACL Data Analytics"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-CORP-004",
    title: "Risk Analyst",
    department: "Risk Management",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-03-01",
    closingDate: "2026-12-01",
    salaryMin: 1900,
    salaryMax: 2800,
    salaryCurrency: "OMR",
    description:
      "Identify, measure, monitor, and report on market, credit, operational, and liquidity risks across OIA investment asset portfolios. The Risk Analyst builds risk evaluation frameworks, performs stress testing, maintains the enterprise risk register, and prepares monthly risk dashboard reports for executive risk committees.",
    requiredSkills: ["Risk Analysis", "Enterprise Risk Management", "Stress Testing", "Financial Modeling", "Operational Risk", "Market Risk", "Risk Reporting"],
    niceToHaveSkills: ["FRM", "PRM", "Monte Carlo Simulation", "VaR Modeling"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-CORP-005",
    title: "Compliance Officer",
    department: "Legal and Compliance",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-28",
    closingDate: "2026-11-30",
    salaryMin: 2000,
    salaryMax: 2900,
    salaryCurrency: "OMR",
    description:
      "Ensure OIA business operations, asset investments, and corporate policies strictly comply with Omani laws, anti-money laundering (AML) regulations, governance codes, and international sanctions. The Compliance Officer conducts compliance reviews, manages regulatory filings, updates policy manuals, and conducts employee compliance training.",
    requiredSkills: ["Compliance", "Regulatory Affairs", "Anti-Money Laundering (AML)", "Corporate Governance", "Policy Drafting", "Legal Risk", "Ethical Governance"],
    niceToHaveSkills: ["ACAMS", "Certified Compliance Officer", "Omani Corporate Law"],
    minExperienceYears: 4,
  },
  {
    referenceCode: "OIA-CORP-006",
    title: "HR Recruitment Specialist",
    department: "Human Resources",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-05",
    closingDate: "2026-11-25",
    salaryMin: 1600,
    salaryMax: 2400,
    salaryCurrency: "OMR",
    description:
      "Manage end-to-end talent acquisition, executive hiring campaigns, and Omanization recruitment programs for OIA. The HR Recruitment Specialist collaborates with hiring managers to draft job descriptions, screen candidates, conduct competency interviews, manage applicant tracking systems (ATS), and facilitate candidate onboarding.",
    requiredSkills: ["Talent Acquisition", "Recruitment", "Applicant Tracking Systems", "Competency Interviewing", "Omanization Planning", "Candidate Screening", "HR Generalist"],
    niceToHaveSkills: ["SHRM-CP", "CIPD Level 5", "Executive Search", "Employer Branding"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-CORP-007",
    title: "Project Manager",
    department: "Project Management",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Senior",
    status: "open",
    priority: "critical",
    postedDate: "2026-01-25",
    closingDate: "2026-12-15",
    salaryMin: 2900,
    salaryMax: 4100,
    salaryCurrency: "OMR",
    description:
      "Direct cross-functional strategic projects, IT transformations, and infrastructure initiatives from initiation through handover. The Senior Project Manager defines project scopes, manages project budgets, controls project schedules using MS Project or Primavera P6, manages risk registers, and reports progress to executive project boards.",
    requiredSkills: ["Project Management", "PMP", "Project Planning", "Risk Management", "Budget Control", "Stakeholder Management", "Resource Allocation", "MS Project"],
    niceToHaveSkills: ["Agile / Scrum", "Primavera P6", "PRINCE2", "Executive Governance"],
    minExperienceYears: 7,
  },
  {
    referenceCode: "OIA-CORP-008",
    title: "Business Process Analyst",
    department: "Corporate Strategy",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "medium",
    postedDate: "2026-03-02",
    closingDate: "2026-11-30",
    salaryMin: 1700,
    salaryMax: 2500,
    salaryCurrency: "OMR",
    description:
      "Map, evaluate, and re-engineer corporate operational workflows to enhance efficiency, eliminate red tape, and integrate digital automation tools. The Business Process Analyst documents AS-IS and TO-BE process architectures using BPMN 2.0, calculates operational efficiency gains, and facilitates process optimization workshops.",
    requiredSkills: ["Business Process Optimization", "Workflow Analysis", "BPMN", "Process Mapping", "Data Analysis", "Change Management", "Requirement Gathering"],
    niceToHaveSkills: ["CBPP", "Visio / Signavio", "Lean Six Sigma", "RPA Analysis"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-CORP-009",
    title: "ESG and Sustainability Analyst",
    department: "Sustainability and ESG",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "open",
    priority: "high",
    postedDate: "2026-02-15",
    closingDate: "2026-12-01",
    salaryMin: 1800,
    salaryMax: 2700,
    salaryCurrency: "OMR",
    description:
      "Evaluate Environmental, Social, and Governance (ESG) performance metrics across OIA investment portfolios and green energy assets. The ESG Analyst tracks carbon footprint data, develops sustainability disclosure reports aligned with GRI and ISSB standards, conducts ESG due diligence for new acquisitions, and promotes green initiatives.",
    requiredSkills: ["ESG Analysis", "Sustainability Reporting", "GRI Standards", "Carbon Accounting", "Environmental Compliance", "Data Analysis", "Stakeholder Engagement"],
    niceToHaveSkills: ["CFA ESG Investing", "ISSB Framework", "Net Zero Strategy", "Renewable Energy"],
    minExperienceYears: 3,
  },
  {
    referenceCode: "OIA-CORP-010",
    title: "Corporate Communications Specialist",
    department: "Communications and Public Relations",
    location: "Muscat, Oman",
    employmentType: "full_time",
    level: "Mid",
    status: "closed",
    priority: "low",
    postedDate: "2025-09-01",
    closingDate: "2026-01-15",
    salaryMin: 1500,
    salaryMax: 2200,
    salaryCurrency: "OMR",
    description:
      "Draft press releases, annual report content, executive speeches, and social media announcements for Oman Investment Authority. The Corporate Communications Specialist manages media relations, maintains brand guidelines, coordinates official events, and produces high-quality bilingual public relations content.",
    requiredSkills: ["Corporate Communications", "Public Relations", "Content Writing", "Media Relations", "Bilingual (Arabic/English)", "Brand Management", "Press Releases"],
    niceToHaveSkills: ["Crisis Communications", "Graphic Design", "Speechwriting", "Social Media Management"],
    minExperienceYears: 3,
  },
];

async function seedOiaJobs() {
  console.log("=== Oman Investment Authority (OIA) Production Job Seeding ===");

  // 1. Resolve Organization ID
  let orgId: string;
  const { data: existingOrgs } = await supabase
    .from("organizations")
    .select("id, name")
    .in("name", ["Oman Investment Authority", "HireOps Demo Organization"]);

  const oiaOrg = existingOrgs?.find((o) => o.name === "Oman Investment Authority");
  const demoOrg = existingOrgs?.find((o) => o.name === "HireOps Demo Organization");

  if (oiaOrg) {
    orgId = oiaOrg.id;
    console.log(`Using existing 'Oman Investment Authority' org: ${orgId}`);
  } else if (demoOrg) {
    // Update existing default demo org to OIA
    orgId = demoOrg.id;
    await supabase.from("organizations").update({ name: "Oman Investment Authority" }).eq("id", orgId);
    console.log(`Updated existing org '${demoOrg.name}' to 'Oman Investment Authority': ${orgId}`);
  } else {
    // Create OIA org
    const { data: newOrg, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name: "Oman Investment Authority",
        registration_id: "OIA-OMAN-001",
        contact_email: "careers@oia.gov.om",
        headquarters: "Muscat, Sultanate of Oman",
        default_language: "en",
        timezone: "Asia/Muscat",
      })
      .select("id")
      .single();

    if (orgErr || !newOrg) {
      console.error("Failed to create OIA organization:", orgErr?.message);
      process.exit(1);
    }
    orgId = newOrg.id;
    console.log(`Created new 'Oman Investment Authority' org: ${orgId}`);
  }

  // 2. Resolve Created By User Profile ID
  let createdByUserId: string | null = null;
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (adminProfile) {
    createdByUserId = adminProfile.id;
  }

  // 3. Ensure all 20 required departments exist
  const deptMap = new Map<string, string>();
  const { data: existingDepts } = await supabase
    .from("departments")
    .select("id, name")
    .eq("organization_id", orgId);

  if (existingDepts) {
    for (const d of existingDepts) {
      deptMap.set(d.name, d.id);
    }
  }

  let deptsCreatedCount = 0;
  let deptsReusedCount = 0;

  for (const deptName of DEPARTMENTS) {
    if (deptMap.has(deptName)) {
      deptsReusedCount++;
      continue;
    }
    const { data: newDept, error: deptErr } = await supabase
      .from("departments")
      .insert({ organization_id: orgId, name: deptName })
      .select("id")
      .single();

    if (deptErr || !newDept) {
      console.error(`Failed to create department '${deptName}':`, deptErr?.message);
    } else {
      deptMap.set(deptName, newDept.id);
      deptsCreatedCount++;
    }
  }

  console.log(`Departments: ${deptsCreatedCount} created, ${deptsReusedCount} reused (${deptMap.size} total active).`);

  // 4. Validate & Upsert Jobs Idempotently
  let createdJobsCount = 0;
  let updatedJobsCount = 0;
  const unchangedJobsCount = 0;
  let failedJobsCount = 0;
  let embeddingsGeneratedCount = 0;

  const domainStats: Record<string, number> = {};

  for (const seedDef of JOBS) {
    // Validate with Zod
    const valRes = jobSeedSchema.safeParse(seedDef);
    if (!valRes.success) {
      console.error(`Validation error for seed ${seedDef.referenceCode}:`, valRes.error.format());
      failedJobsCount++;
      continue;
    }

    const jobData = valRes.data;
    const deptId = deptMap.get(jobData.department) || null;

    // Check if job exists by reference_code first, then by title+orgId
    let existingJob: { id: string } | null = null;
    const { data: byRef } = await supabase
      .from("jobs")
      .select("id")
      .eq("organization_id", orgId)
      .eq("reference_code", jobData.referenceCode)
      .maybeSingle();

    if (byRef) {
      existingJob = byRef;
    } else {
      const { data: byTitle } = await supabase
        .from("jobs")
        .select("id")
        .eq("organization_id", orgId)
        .eq("title", jobData.title)
        .limit(1)
        .maybeSingle();
      if (byTitle) existingJob = byTitle;
    }

    const insertPayload = {
      organization_id: orgId,
      department_id: deptId,
      reference_code: jobData.referenceCode,
      title: jobData.title,
      location: jobData.location,
      employment_type: jobData.employmentType as JobType,
      level: jobData.level,
      status: jobData.status as JobStatus,
      priority: jobData.priority as JobPriority,
      posted_date: jobData.postedDate,
      closing_date: jobData.closingDate,
      salary_min: jobData.salaryMin,
      salary_max: jobData.salaryMax,
      salary_currency: jobData.salaryCurrency,
      description: jobData.description,
      required_skills: jobData.requiredSkills,
      nice_to_have_skills: jobData.niceToHaveSkills,
      min_experience_years: jobData.minExperienceYears,
      created_by: createdByUserId,
    };

    let targetJobId: string;

    if (!existingJob) {
      const { data: newJob, error: insertErr } = await supabase
        .from("jobs")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertErr || !newJob) {
        console.error(`Failed to insert job ${jobData.referenceCode}:`, insertErr?.message);
        failedJobsCount++;
        continue;
      }
      targetJobId = newJob.id;
      createdJobsCount++;
    } else {
      targetJobId = existingJob.id;
      const { error: updateErr } = await supabase
        .from("jobs")
        .update(insertPayload)
        .eq("id", existingJob.id);

      if (updateErr) {
        console.error(`Failed to update job ${jobData.referenceCode}:`, updateErr.message);
        failedJobsCount++;
        continue;
      }
      updatedJobsCount++;
    }

    // Try embedding generation if available
    try {
      const { embedAndStoreJob, buildJobEmbeddingText } = await import("../src/lib/services/embeddings.service");
      const embedText = buildJobEmbeddingText({
        title: jobData.title,
        level: jobData.level,
        requiredSkills: jobData.requiredSkills,
        niceToHaveSkills: jobData.niceToHaveSkills,
        description: jobData.description,
      });
      await embedAndStoreJob(supabase, targetJobId, embedText);
      embeddingsGeneratedCount++;
    } catch {
      // Graceful fallback if AI provider is not active or key missing
    }

    // Record domain stats
    domainStats[jobData.department] = (domainStats[jobData.department] || 0) + 1;
  }

  // 5. Final Summary Output
  console.log("\n==================================================");
  console.log("             SEEDING COMPLETED SUMMARY            ");
  console.log("==================================================");
  console.log(`Organization ID:        ${orgId}`);
  console.log(`Departments Handled:    ${deptMap.size} (${deptsCreatedCount} created, ${deptsReusedCount} reused)`);
  console.log(`Jobs Created:           ${createdJobsCount}`);
  console.log(`Jobs Updated:           ${updatedJobsCount}`);
  console.log(`Jobs Unchanged/Failed:  ${unchangedJobsCount} unchanged / ${failedJobsCount} failed`);
  console.log(`Total Active Seed Jobs: ${createdJobsCount + updatedJobsCount}`);
  console.log(`Embeddings Generated:   ${embeddingsGeneratedCount}`);
  console.log("\nJobs Grouped by Domain:");
  for (const [domain, count] of Object.entries(domainStats)) {
    console.log(`  - ${domain.padEnd(36)}: ${count} jobs`);
  }

  const { data: statusCounts } = await supabase
    .from("jobs")
    .select("status")
    .eq("organization_id", orgId);

  const openCount = statusCounts?.filter((j) => j.status === "open").length || 0;
  const draftCount = statusCounts?.filter((j) => j.status === "draft").length || 0;
  const closedCount = statusCounts?.filter((j) => j.status === "closed").length || 0;

  console.log("\nJob Status Distribution:");
  console.log(`  - Open:   ${openCount}`);
  console.log(`  - Draft:  ${draftCount}`);
  console.log(`  - Closed: ${closedCount}`);
  console.log("==================================================\n");
}

seedOiaJobs().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
