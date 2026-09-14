/**
 * Hand-authored mirror of the Supabase schema (supabase/migrations/*.sql).
 * Regenerate with `npx supabase gen types typescript` once the Supabase CLI
 * is linked to this project; until then, keep this in sync with migrations.
 */

export type ApplicationStage =
  | "applied"
  | "screening"
  | "assessment"
  | "ai_interview"
  | "final_interview"
  | "offer"
  | "hired"
  | "rejected";

export type JobStatus = "open" | "closed" | "draft" | "on_hold";
export type JobType = "full_time" | "part_time" | "contract";
export type JobPriority = "critical" | "high" | "medium" | "low";
export type UserStatus = "active" | "invited" | "suspended";
export type LanguageLevel = "native" | "fluent" | "professional" | "conversational" | "basic";
export type PortalRoleDb = "super_admin" | "hr" | "candidate";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          registration_id: string | null;
          contact_email: string | null;
          headquarters: string | null;
          logo_url: string | null;
          default_language: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
        Relationships: [];
      };
      departments: {
        Row: { id: string; organization_id: string; name: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["departments"]["Row"]> & { organization_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["departments"]["Row"]>;
        Relationships: [
          { foreignKeyName: "departments_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      roles: {
        Row: { id: string; organization_id: string; name: string; description: string | null; is_system: boolean; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["roles"]["Row"]> & { organization_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["roles"]["Row"]>;
        Relationships: [
          { foreignKeyName: "roles_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      permissions: {
        Row: { id: string; code: string; description: string | null };
        Insert: Partial<Database["public"]["Tables"]["permissions"]["Row"]> & { code: string };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Row"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: { role_id: string; permission_id: string };
        Insert: { role_id: string; permission_id: string };
        Update: Partial<{ role_id: string; permission_id: string }>;
        Relationships: [
          { foreignKeyName: "role_permissions_role_id_fkey"; columns: ["role_id"]; isOneToOne: false; referencedRelation: "roles"; referencedColumns: ["id"] },
          { foreignKeyName: "role_permissions_permission_id_fkey"; columns: ["permission_id"]; isOneToOne: false; referencedRelation: "permissions"; referencedColumns: ["id"] }
        ];
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          department_id: string | null;
          role_id: string | null;
          full_name: string | null;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          status: UserStatus;
          portal_role: PortalRoleDb | null;
          candidate_id: string | null;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; email: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [
          { foreignKeyName: "profiles_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "profiles_department_id_fkey"; columns: ["department_id"]; isOneToOne: false; referencedRelation: "departments"; referencedColumns: ["id"] },
          { foreignKeyName: "profiles_role_id_fkey"; columns: ["role_id"]; isOneToOne: false; referencedRelation: "roles"; referencedColumns: ["id"] },
          { foreignKeyName: "profiles_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidates"; referencedColumns: ["id"] }
        ];
      };
      jobs: {
        Row: {
          id: string;
          organization_id: string;
          department_id: string | null;
          title: string;
          location: string;
          employment_type: JobType;
          level: string | null;
          status: JobStatus;
          priority: JobPriority;
          posted_date: string;
          closing_date: string | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string;
          description: string | null;
          required_skills: string[];
          nice_to_have_skills: string[];
          min_experience_years: number;
          hiring_manager_id: string | null;
          created_by: string | null;
          embedding: number[] | string | null;
          embedding_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["jobs"]["Row"]> & { organization_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Row"]>;
        Relationships: [
          { foreignKeyName: "jobs_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "jobs_department_id_fkey"; columns: ["department_id"]; isOneToOne: false; referencedRelation: "departments"; referencedColumns: ["id"] }
        ];
      };
      candidates: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          full_name_ar: string | null;
          email: string;
          phone: string | null;
          location: string | null;
          nationality: string | null;
          headline: string | null;
          experience_years: number;
          source: string | null;
          avatar_color: string;
          resume_url: string | null;
          resume_file_path: string | null;
          resume_text: string | null;
          embedding: number[] | string | null;
          embedding_updated_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["candidates"]["Row"]> & { organization_id: string; full_name: string; email: string };
        Update: Partial<Database["public"]["Tables"]["candidates"]["Row"]>;
        Relationships: [
          { foreignKeyName: "candidates_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      candidate_experience: {
        Row: { id: string; candidate_id: string; role: string; company: string; location: string | null; start_date: string | null; end_date: string | null; description: string | null; sort_order: number };
        Insert: Partial<Database["public"]["Tables"]["candidate_experience"]["Row"]> & { candidate_id: string; role: string; company: string };
        Update: Partial<Database["public"]["Tables"]["candidate_experience"]["Row"]>;
        Relationships: [
          { foreignKeyName: "candidate_experience_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidates"; referencedColumns: ["id"] }
        ];
      };
      candidate_education: {
        Row: { id: string; candidate_id: string; degree: string; institution: string; start_date: string | null; end_date: string | null; grade: string | null; sort_order: number };
        Insert: Partial<Database["public"]["Tables"]["candidate_education"]["Row"]> & { candidate_id: string; degree: string; institution: string };
        Update: Partial<Database["public"]["Tables"]["candidate_education"]["Row"]>;
        Relationships: [
          { foreignKeyName: "candidate_education_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidates"; referencedColumns: ["id"] }
        ];
      };
      candidate_certifications: {
        Row: { id: string; candidate_id: string; name: string; issuer: string | null; year: string | null };
        Insert: Partial<Database["public"]["Tables"]["candidate_certifications"]["Row"]> & { candidate_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["candidate_certifications"]["Row"]>;
        Relationships: [
          { foreignKeyName: "candidate_certifications_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidates"; referencedColumns: ["id"] }
        ];
      };
      candidate_languages: {
        Row: { id: string; candidate_id: string; name: string; level: LanguageLevel };
        Insert: Partial<Database["public"]["Tables"]["candidate_languages"]["Row"]> & { candidate_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["candidate_languages"]["Row"]>;
        Relationships: [
          { foreignKeyName: "candidate_languages_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidates"; referencedColumns: ["id"] }
        ];
      };
      candidate_skills: {
        Row: { id: string; candidate_id: string; skill: string };
        Insert: Partial<Database["public"]["Tables"]["candidate_skills"]["Row"]> & { candidate_id: string; skill: string };
        Update: Partial<Database["public"]["Tables"]["candidate_skills"]["Row"]>;
        Relationships: [
          { foreignKeyName: "candidate_skills_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidates"; referencedColumns: ["id"] }
        ];
      };
      applications: {
        Row: {
          id: string;
          candidate_id: string;
          job_id: string;
          stage: ApplicationStage;
          match_score: number | null;
          ai_score: number | null;
          confidence_score: number | null;
          shortlisted: boolean;
          tags: string[];
          ai_recommendation: string | null;
          strengths: string[];
          weaknesses: string[];
          match_reasoning: Record<string, unknown> | null;
          applied_date: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["applications"]["Row"]> & { candidate_id: string; job_id: string };
        Update: Partial<Database["public"]["Tables"]["applications"]["Row"]>;
        Relationships: [
          { foreignKeyName: "applications_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidates"; referencedColumns: ["id"] },
          { foreignKeyName: "applications_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          actor_id: string | null;
          actor_label: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Record<string, unknown>;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & { action: string };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: { id: string; recipient_id: string; type: string; title: string; body: string | null; is_read: boolean; metadata: Record<string, unknown>; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & { recipient_id: string; type: string; title: string };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      assessments: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string | null;
          difficulty: string;
          duration_minutes: number;
          status: string;
          question_count: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["assessments"]["Row"]> & { organization_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["assessments"]["Row"]>;
        Relationships: [];
      };
      assessment_questions: {
        Row: {
          id: string;
          assessment_id: string;
          prompt: string;
          question_type: string;
          options: unknown;
          correct_answer: string | null;
          points: number;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["assessment_questions"]["Row"]> & { assessment_id: string; prompt: string };
        Update: Partial<Database["public"]["Tables"]["assessment_questions"]["Row"]>;
        Relationships: [];
      };
      assessment_assignments: {
        Row: {
          answers: Record<string, string>;
          grading_details: Record<string, unknown>;
          id: string;
          assessment_id: string;
          application_id: string;
          status: string;
          score: number | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["assessment_assignments"]["Row"]> & { assessment_id: string; application_id: string };
        Update: Partial<Database["public"]["Tables"]["assessment_assignments"]["Row"]>;
        Relationships: [];
      };
      interview_templates: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          mode: string;
          system_prompt: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["interview_templates"]["Row"]> & { organization_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["interview_templates"]["Row"]>;
        Relationships: [];
      };
      interview_sessions: {
        Row: {
          id: string;
          organization_id: string;
          application_id: string | null;
          candidate_id: string;
          job_id: string | null;
          template_id: string | null;
          mode: string;
          status: string;
          scheduled_at: string | null;
          started_at: string | null;
          ended_at: string | null;
          summary: string | null;
          recommendation: string | null;
          scores: Record<string, unknown>;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["interview_sessions"]["Row"]> & { organization_id: string; candidate_id: string };
        Update: Partial<Database["public"]["Tables"]["interview_sessions"]["Row"]>;
        Relationships: [];
      };
      interview_messages: {
        Row: {
          id: string;
          session_id: string;
          role: "system" | "assistant" | "user";
          content: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["interview_messages"]["Row"]> & { session_id: string; role: "system" | "assistant" | "user"; content: string };
        Update: Partial<Database["public"]["Tables"]["interview_messages"]["Row"]>;
        Relationships: [];
      };
      internal_notes: {
        Row: {
          id: string;
          organization_id: string;
          entity_type: string;
          entity_id: string;
          author_id: string | null;
          body: string;
          mentions: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["internal_notes"]["Row"]> & { organization_id: string; entity_type: string; entity_id: string; body: string };
        Update: Partial<Database["public"]["Tables"]["internal_notes"]["Row"]>;
        Relationships: [];
      };
      ai_usage_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          actor_id: string | null;
          provider: string;
          model: string | null;
          operation: string;
          prompt_tokens: number;
          completion_tokens: number;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_usage_logs"]["Row"]> & { provider: string; operation: string };
        Update: Partial<Database["public"]["Tables"]["ai_usage_logs"]["Row"]>;
        Relationships: [];
      };
      feature_flags: {
        Row: {
          id: string;
          organization_id: string;
          key: string;
          enabled: boolean;
          description: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["feature_flags"]["Row"]> & { organization_id: string; key: string };
        Update: Partial<Database["public"]["Tables"]["feature_flags"]["Row"]>;
        Relationships: [];
      };
      offers: {
        Row: {
          id: string;
          organization_id: string;
          application_id: string;
          candidate_id: string;
          salary_text: string | null;
          start_date: string | null;
          status: string;
          document_path: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["offers"]["Row"]> & { organization_id: string; application_id: string; candidate_id: string };
        Update: Partial<Database["public"]["Tables"]["offers"]["Row"]>;
        Relationships: [];
      };
      workflow_stages: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          label: string;
          sort_order: number;
          requires_approval: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["workflow_stages"]["Row"]> & { organization_id: string; code: string; label: string };
        Update: Partial<Database["public"]["Tables"]["workflow_stages"]["Row"]>;
        Relationships: [];
      };
      app_secrets: {
        Row: {
          id: string;
          organization_id: string;
          key: string;
          value_encrypted: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["app_secrets"]["Row"]> & { organization_id: string; key: string; value_encrypted: string };
        Update: Partial<Database["public"]["Tables"]["app_secrets"]["Row"]>;
        Relationships: [];
      };
      saved_jobs: {
        Row: { id: string; candidate_id: string; job_id: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["saved_jobs"]["Row"]> & { candidate_id: string; job_id: string };
        Update: Partial<Database["public"]["Tables"]["saved_jobs"]["Row"]>;
        Relationships: [];
      };
      candidate_documents: {
        Row: {
          id: string;
          organization_id: string;
          candidate_id: string;
          label: string;
          file_path: string;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["candidate_documents"]["Row"]> & { organization_id: string; candidate_id: string; label: string; file_path: string };
        Update: Partial<Database["public"]["Tables"]["candidate_documents"]["Row"]>;
        Relationships: [];
      };
      portal_messages: {
        Row: {
          id: string;
          organization_id: string;
          candidate_id: string;
          application_id: string | null;
          sender_id: string | null;
          sender_role: string;
          subject: string | null;
          body: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["portal_messages"]["Row"]> & { organization_id: string; candidate_id: string; body: string };
        Update: Partial<Database["public"]["Tables"]["portal_messages"]["Row"]>;
        Relationships: [];
      };
      help_articles: {
        Row: {
          id: string;
          organization_id: string | null;
          slug: string;
          title: string;
          body: string;
          category: string;
          sort_order: number;
          published: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["help_articles"]["Row"]> & { slug: string; title: string; body: string };
        Update: Partial<Database["public"]["Tables"]["help_articles"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      v_job_pipeline_stats: {
        Row: {
          job_id: string;
          organization_id: string;
          title: string;
          applicant_count: number;
          shortlisted_count: number;
          interviewing_count: number;
          offer_count: number;
          hired_count: number;
        };
        Relationships: [];
      };
      v_candidate_latest_application: {
        Row: {
          candidate_id: string;
          application_id: string;
          job_id: string;
          job_title: string;
          department_id: string | null;
          stage: ApplicationStage;
          match_score: number | null;
          ai_score: number | null;
          confidence_score: number | null;
          shortlisted: boolean;
          applied_date: string;
        };
        Relationships: [
          { foreignKeyName: "applications_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] },
          { foreignKeyName: "applications_candidate_id_fkey"; columns: ["candidate_id"]; isOneToOne: false; referencedRelation: "candidates"; referencedColumns: ["id"] }
        ];
      };
      v_organization_kpis: {
        Row: {
          organization_id: string;
          total_candidates: number;
          open_positions: number;
          shortlisted_count: number;
          avg_match_score: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      has_permission: { Args: { perm_code: string }; Returns: boolean };
      current_org_id: { Args: Record<string, never>; Returns: string };
      current_role_name: { Args: Record<string, never>; Returns: string };
      match_candidates_for_job: {
        Args: { p_job_id: string; p_limit?: number };
        Returns: { candidate_id: string; similarity: number };
      };
      search_org_entities: {
        Args: { p_query: string; p_limit?: number };
        Returns: { entity_type: string; entity_id: string; title: string; subtitle: string; rank: number };
      };
    };
    Enums: {
      application_stage: ApplicationStage;
      job_status: JobStatus;
      job_type: JobType;
      job_priority: JobPriority;
      user_status: UserStatus;
      language_level: LanguageLevel;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
