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
      audit_logs: {
        Row: {
          action: string
          employer_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_at: string
          performed_by: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          employer_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          employer_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_notes: string | null
          created_at: string
          employment_record_id: string
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          employment_record_id: string
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          employment_record_id?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_employment_record_id_fkey"
            columns: ["employment_record_id"]
            isOneToOne: false
            referencedRelation: "employment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          address: string | null
          company_name: string
          country: string | null
          created_at: string
          employer_id: string | null
          id: string
          industry: string | null
          is_verified: boolean | null
          logo_url: string | null
          phone: string | null
          registration_number: string | null
          updated_at: string
          user_id: string
          verification_notes: string | null
          verification_status: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          employer_id?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          phone?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id: string
          verification_notes?: string | null
          verification_status?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          employer_id?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          phone?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id?: string
          verification_notes?: string | null
          verification_status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      employment_records: {
        Row: {
          created_at: string
          department: string | null
          employer_id: string
          employment_type: string | null
          end_date: string | null
          id: string
          job_title: string
          start_date: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          employer_id: string
          employment_type?: string | null
          end_date?: string | null
          id?: string
          job_title: string
          start_date: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          employer_id?: string
          employment_type?: string | null
          end_date?: string | null
          id?: string
          job_title?: string
          start_date?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employment_records_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_on_record_added: boolean
          email_on_record_ended: boolean
          email_on_record_updated: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_on_record_added?: boolean
          email_on_record_ended?: boolean
          email_on_record_updated?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_on_record_added?: boolean
          email_on_record_ended?: boolean
          email_on_record_updated?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_profiles: {
        Row: {
          address: string | null
          company_name: string
          country: string | null
          created_at: string
          id: string
          industry: string | null
          is_verified: boolean
          logo_url: string | null
          organization_id: string
          phone: string | null
          registration_number: string | null
          updated_at: string
          user_id: string
          verification_notes: string | null
          verification_status: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          is_verified?: boolean
          logo_url?: string | null
          organization_id?: string
          phone?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id: string
          verification_notes?: string | null
          verification_status?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          is_verified?: boolean
          logo_url?: string | null
          organization_id?: string
          phone?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id?: string
          verification_notes?: string | null
          verification_status?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          availability: string | null
          bio: string | null
          citizenship: string | null
          country: string | null
          created_at: string
          email: string
          experience_level: string | null
          first_name: string
          id: string
          last_name: string
          location: string | null
          phone: string | null
          profile_id: string
          skills: string[] | null
          updated_at: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          account_type?: string
          availability?: string | null
          bio?: string | null
          citizenship?: string | null
          country?: string | null
          created_at?: string
          email: string
          experience_level?: string | null
          first_name: string
          id?: string
          last_name: string
          location?: string | null
          phone?: string | null
          profile_id: string
          skills?: string[] | null
          updated_at?: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          account_type?: string
          availability?: string | null
          bio?: string | null
          citizenship?: string | null
          country?: string | null
          created_at?: string
          email?: string
          experience_level?: string | null
          first_name?: string
          id?: string
          last_name?: string
          location?: string | null
          phone?: string | null
          profile_id?: string
          skills?: string[] | null
          updated_at?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          created_at: string
          file_name: string | null
          file_url: string
          id: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          work_history_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          work_history_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          work_history_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_work_history_id_fkey"
            columns: ["work_history_id"]
            isOneToOne: false
            referencedRelation: "work_history"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          created_at: string
          employer_email: string
          expires_at: string
          id: string
          status: string
          token: string
          work_history_id: string
        }
        Insert: {
          created_at?: string
          employer_email: string
          expires_at: string
          id?: string
          status?: string
          token: string
          work_history_id: string
        }
        Update: {
          created_at?: string
          employer_email?: string
          expires_at?: string
          id?: string
          status?: string
          token?: string
          work_history_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_work_history_id_fkey"
            columns: ["work_history_id"]
            isOneToOne: false
            referencedRelation: "work_history"
            referencedColumns: ["id"]
          },
        ]
      }
      work_history: {
        Row: {
          company_name: string
          created_at: string
          department: string | null
          employment_type: string | null
          end_date: string | null
          id: string
          role: string
          start_date: string
          updated_at: string
          user_id: string
          verification_method: string | null
          verification_requested_at: string | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          department?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          role: string
          start_date: string
          updated_at?: string
          user_id: string
          verification_method?: string | null
          verification_requested_at?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          department?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          role?: string
          start_date?: string
          updated_at?: string
          user_id?: string
          verification_method?: string | null
          verification_requested_at?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          event_type_param: string
          max_attempts: number
          user_id_param: string
          window_minutes: number
        }
        Returns: boolean
      }
      generate_employer_id: { Args: never; Returns: string }
      generate_profile_id: { Args: never; Returns: string }
      get_admin_disputes: {
        Args: never
        Returns: {
          admin_notes: string
          created_at: string
          employment_record_id: string
          id: string
          reason: string
          resolved_at: string
          resolved_by: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_employer_audit_logs: {
        Args: { employer_id_param: string }
        Returns: {
          action: string
          id: string
          new_data: Json
          old_data: Json
          performed_at: string
          performed_by: string
          performer_name: string
        }[]
      }
      get_employer_disputes: {
        Args: { employer_id_param: string }
        Returns: {
          created_at: string
          employment_record_id: string
          id: string
          reason: string
          resolved_at: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_employer_employee_details: {
        Args: { employer_id_param: string }
        Returns: {
          department: string
          employment_type: string
          end_date: string
          first_name: string
          job_title: string
          last_name: string
          profile_id: string
          record_id: string
          start_date: string
          status: string
          user_id: string
        }[]
      }
      get_employment_by_profile_id: {
        Args: { profile_id_param: string }
        Returns: {
          department: string
          employer_id: string
          employer_name: string
          employer_verified: boolean
          employment_type: string
          end_date: string
          id: string
          job_title: string
          start_date: string
          status: string
        }[]
      }
      get_notification_preferences: {
        Args: { target_user_id: string }
        Returns: {
          email_on_record_added: boolean
          email_on_record_ended: boolean
          email_on_record_updated: boolean
        }[]
      }
      get_public_employer_info: {
        Args: { employer_id_param: string }
        Returns: {
          company_name: string
          country: string
          id: string
          industry: string
          is_verified: boolean
        }[]
      }
      get_public_profile_by_id: {
        Args: { profile_id_param: string }
        Returns: {
          availability: string
          bio: string
          created_at: string
          experience_level: string
          first_name: string
          id: string
          last_name: string
          location: string
          profile_id: string
          skills: string[]
          updated_at: string
          user_id: string
          visibility: string
        }[]
      }
      get_public_profile_fields: {
        Args: { target_user_id: string }
        Returns: {
          availability: string
          bio: string
          created_at: string
          experience_level: string
          first_name: string
          id: string
          last_name: string
          location: string
          profile_id: string
          skills: string[]
          updated_at: string
          visibility: string
        }[]
      }
      get_public_profile_limited: {
        Args: { profile_id_param: string }
        Returns: {
          availability: string
          bio: string
          experience_level: string
          first_name: string
          last_name: string
          location: string
          profile_id: string
          skills: string[]
        }[]
      }
      get_user_disputes: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string
          employment_record_id: string
          id: string
          reason: string
          resolved_at: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_disputes_safe: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string
          employment_record_id: string
          id: string
          reason: string
          resolved_at: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_employed_by: {
        Args: { employer_id_param: string; user_id_param: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          event_type_param: string
          metadata_param?: Json
          user_id_param: string
        }
        Returns: undefined
      }
      search_public_profiles: {
        Args: {
          availability_filter?: string
          experience_filter?: string
          skill_filter?: string[]
        }
        Returns: {
          availability: string
          experience_level: string
          first_name: string
          last_name: string
          location: string
          profile_id: string
          skills: string[]
          visibility: string
        }[]
      }
      verify_recovery_code: {
        Args: { input_code_hash: string; target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "job_seeker" | "employer"
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
    Enums: {
      app_role: ["admin", "job_seeker", "employer"],
    },
  },
} as const
