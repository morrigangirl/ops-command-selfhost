export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meeting_action_items: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          meeting_id: string
          owner_id: string | null
          project_id: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          meeting_id: string
          owner_id?: string | null
          project_id?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          meeting_id?: string
          owner_id?: string | null
          project_id?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_decisions: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          summary: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string
          person_id: string
          scheduled_date: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          agenda?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string
          person_id: string
          scheduled_date: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          agenda?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string
          person_id?: string
          scheduled_date?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_entries: {
        Row: {
          confidence_override: string | null
          created_at: string
          entry_date: string
          id: string
          metric_id: string
          note: string | null
          source_note_override: string | null
          user_id: string
          value: number
        }
        Insert: {
          confidence_override?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          metric_id: string
          note?: string | null
          source_note_override?: string | null
          user_id: string
          value: number
        }
        Update: {
          confidence_override?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          metric_id?: string
          note?: string | null
          source_note_override?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_entries_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_targets: {
        Row: {
          created_at: string
          id: string
          metric_id: string
          period: string
          target_note: string | null
          target_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_id: string
          period: string
          target_note?: string | null
          target_value: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_id?: string
          period?: string
          target_note?: string | null
          target_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_targets_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          category: string
          confidence: string
          confidence_note: string | null
          created_at: string
          current_value: number | null
          definition: string
          external_ref: string | null
          id: string
          last_updated_at: string
          name: string
          owner_id: string | null
          related_project_id: string | null
          source_note: string | null
          status: string
          unit: string
          user_id: string
        }
        Insert: {
          category: string
          confidence?: string
          confidence_note?: string | null
          created_at?: string
          current_value?: number | null
          definition?: string
          external_ref?: string | null
          id?: string
          last_updated_at?: string
          name: string
          owner_id?: string | null
          related_project_id?: string | null
          source_note?: string | null
          status?: string
          unit?: string
          user_id: string
        }
        Update: {
          category?: string
          confidence?: string
          confidence_note?: string | null
          created_at?: string
          current_value?: number | null
          definition?: string
          external_ref?: string | null
          id?: string
          last_updated_at?: string
          name?: string
          owner_id?: string | null
          related_project_id?: string | null
          source_note?: string | null
          status?: string
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          completed: boolean
          completed_date: string | null
          created_at: string
          id: string
          name: string
          project_id: string
          sort_order: number
          target_date: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_date?: string | null
          created_at?: string
          id?: string
          name: string
          project_id: string
          sort_order?: number
          target_date?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_date?: string | null
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          target_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          active: boolean
          created_at: string
          default_1on1_cadence_days: number
          default_checkin_cadence_days: number
          default_strategy_cadence_days: number
          id: string
          last_1on1: string | null
          last_human_checkin: string | null
          last_strategic_deep_dive: string | null
          manager_id: string | null
          name: string
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_1on1_cadence_days?: number
          default_checkin_cadence_days?: number
          default_strategy_cadence_days?: number
          id?: string
          last_1on1?: string | null
          last_human_checkin?: string | null
          last_strategic_deep_dive?: string | null
          manager_id?: string | null
          name: string
          role?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_1on1_cadence_days?: number
          default_checkin_cadence_days?: number
          default_strategy_cadence_days?: number
          id?: string
          last_1on1?: string | null
          last_human_checkin?: string | null
          last_strategic_deep_dive?: string | null
          manager_id?: string | null
          name?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          external_ref: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          target_end_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          external_ref?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          external_ref?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          created_date: string
          deleted_at: string | null
          external_ref: string | null
          id: string
          last_reviewed: string | null
          name: string
          owner_id: string | null
          phase: string | null
          problem_statement: string
          refined_brief: string | null
          review_cadence: string
          risk: string
          risk_statement: string
          status: string
          strategic_goal: string
          success_metric: string
          tags: string[]
          target_date: string
          user_id: string
          workstream_id: string | null
        }
        Insert: {
          created_at?: string
          created_date?: string
          deleted_at?: string | null
          external_ref?: string | null
          id?: string
          last_reviewed?: string | null
          name: string
          owner_id?: string | null
          phase?: string | null
          problem_statement?: string
          refined_brief?: string | null
          review_cadence?: string
          risk?: string
          risk_statement?: string
          status?: string
          strategic_goal?: string
          success_metric?: string
          tags?: string[]
          target_date: string
          user_id: string
          workstream_id?: string | null
        }
        Update: {
          created_at?: string
          created_date?: string
          deleted_at?: string | null
          external_ref?: string | null
          id?: string
          last_reviewed?: string | null
          name?: string
          owner_id?: string | null
          phase?: string | null
          problem_statement?: string
          refined_brief?: string | null
          review_cadence?: string
          risk?: string
          risk_statement?: string
          status?: string
          strategic_goal?: string
          success_metric?: string
          tags?: string[]
          target_date?: string
          user_id?: string
          workstream_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workstream_id_fkey"
            columns: ["workstream_id"]
            isOneToOne: false
            referencedRelation: "workstreams"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          call_count: number
          function_name: string
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          call_count?: number
          function_name: string
          id?: string
          user_id: string
          window_start?: string
        }
        Update: {
          call_count?: number
          function_name?: string
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      review_entries: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      token_usage: {
        Row: {
          completion_tokens: number
          created_at: string
          function_name: string
          id: string
          model: string | null
          prompt_tokens: number
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          function_name: string
          id?: string
          model?: string | null
          prompt_tokens?: number
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          function_name?: string
          id?: string
          model?: string | null
          prompt_tokens?: number
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_name: string
          expires_at: string
          id: string
          trusted_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_name?: string
          expires_at?: string
          id?: string
          trusted_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_name?: string
          expires_at?: string
          id?: string
          trusted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_items: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          milestone_id: string | null
          parent_id: string | null
          project_id: string
          sort_order: number
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          parent_id?: string | null
          project_id: string
          sort_order?: number
          status?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          parent_id?: string | null
          project_id?: string
          sort_order?: number
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_items_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workstreams: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          external_ref: string | null
          id: string
          lead_id: string | null
          name: string
          program_id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          external_ref?: string | null
          id?: string
          lead_id?: string | null
          name: string
          program_id: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          external_ref?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          program_id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workstreams_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workstreams_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_function_name: string
          p_max_calls?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      meets_mfa_requirement: { Args: never; Returns: boolean }
      purge_soft_deleted_items: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
