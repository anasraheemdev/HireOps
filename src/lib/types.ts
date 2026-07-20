export type PipelineStage =
  | "Applied"
  | "Screening"
  | "Assessment"
  | "AI Interview"
  | "Final Interview"
  | "Offer"
  | "Hired"
  | "Rejected";

export type ExperienceEntry = {
  role: string;
  company: string;
  start: string;
  end: string;
  location: string;
  description: string;
};

export type EducationEntry = {
  degree: string;
  institution: string;
  start: string;
  end: string;
  grade?: string;
};

export type CertificationEntry = {
  name: string;
  issuer: string;
  year: string;
};

export type LanguageSkill = {
  name: string;
  level: "Native" | "Fluent" | "Professional" | "Conversational" | "Basic";
};

export type Candidate = {
  id: string;
  applicationId?: string;
  name: string;
  nameAr?: string;
  initials: string;
  avatarColor: string;
  title: string;
  location: string;
  nationality: string;
  email: string;
  phone: string;
  appliedFor: string;
  jobId: string;
  department: string;
  stage: PipelineStage;
  matchScore: number;
  aiScore: number;
  confidenceScore: number;
  experienceYears: number;
  skills: string[];
  missingSkills: string[];
  languages: LanguageSkill[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  strengths: string[];
  weaknesses: string[];
  aiRecommendation: string;
  appliedDate: string;
  tags: string[];
  shortlisted: boolean;
  source: string;
};

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract";
  level: string;
  status: "Open" | "Closed" | "Draft" | "On Hold";
  postedDate: string;
  closingDate: string;
  applicants: number;
  shortlisted: number;
  inInterview: number;
  offers: number;
  hired: number;
  salaryRange: string;
  description: string;
  requiredSkills: string[];
  niceToHave: string[];
  minExperience: number;
  hiringManager: string;
  priority: "Critical" | "High" | "Medium" | "Low";
};

export type FunnelStage = {
  stage: string;
  count: number;
};

export type TimelinePoint = {
  month: string;
  applications: number;
  interviews: number;
  hires: number;
};

export type DepartmentHiring = {
  department: string;
  open: number;
  filled: number;
};

export type SkillDemand = {
  skill: string;
  demand: number;
};

export type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  candidateInitials?: string;
  avatarColor?: string;
};

export type RecentApplication = {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateInitials: string;
  avatarColor: string;
  jobTitle: string;
  stage: string;
  matchScore: number;
  appliedDate: string;
};

export type InterviewStats = {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
};

export type UpcomingInterview = {
  id: string;
  candidateName: string;
  initials: string;
  avatarColor: string;
  role: string;
  scheduledAt: string | null;
  status: string;
};

export type InterviewSlot = {
  id: string;
  candidateName: string;
  initials: string;
  avatarColor: string;
  role: string;
  time: string;
  date: string;
  type: "AI Interview" | "Panel Interview" | "Technical Round";
  status: "Scheduled" | "In Progress" | "Completed";
};

export type TranscriptLine = {
  speaker: "AI" | "Candidate";
  text: string;
  time: string;
  emotion?: "confident" | "neutral" | "nervous" | "engaged" | "thoughtful";
};

export type QuestionBankItem = {
  id: string;
  question: string;
  type: "MCQ" | "Coding" | "Essay" | "Case Study" | "IQ Test";
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  usageCount: number;
};

export type Assessment = {
  id: string;
  title: string;
  type: "MCQ" | "Coding" | "Essay" | "Case Study" | "IQ Test" | "Mixed";
  department: string;
  questions: number;
  duration: number;
  avgScore: number;
  passRate: number;
  attempts: number;
  status: "Active" | "Draft" | "Archived";
};
