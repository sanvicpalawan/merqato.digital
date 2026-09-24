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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      site_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          content: Json
          id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      workstation_attachments: {
        Row: {
          author_token: string
          content_type: string | null
          created_at: string
          created_by: string
          file_name: string
          id: string
          size_bytes: number | null
          storage_path: string
          subject_id: string
        }
        Insert: {
          author_token: string
          content_type?: string | null
          created_at?: string
          created_by: string
          file_name: string
          id?: string
          size_bytes?: number | null
          storage_path: string
          subject_id: string
        }
        Update: {
          author_token?: string
          content_type?: string | null
          created_at?: string
          created_by?: string
          file_name?: string
          id?: string
          size_bytes?: number | null
          storage_path?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workstation_attachments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "workstation_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      workstation_entries: {
        Row: {
          author_token: string
          body: string
          created_at: string
          created_by: string
          id: string
          kind: string
          priority: string | null
          subject_id: string
        }
        Insert: {
          author_token: string
          body: string
          created_at?: string
          created_by: string
          id?: string
          kind?: string
          priority?: string | null
          subject_id: string
        }
        Update: {
          author_token?: string
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          priority?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workstation_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "workstation_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      workstation_links: {
        Row: {
          author_token: string
          created_at: string
          created_by: string
          id: string
          kind: string
          label: string | null
          subject_id: string
          url: string
        }
        Insert: {
          author_token: string
          created_at?: string
          created_by: string
          id?: string
          kind: string
          label?: string | null
          subject_id: string
          url: string
        }
        Update: {
          author_token?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          label?: string | null
          subject_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "workstation_links_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "workstation_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      workstation_socials: {
        Row: {
          author_token: string
          created_at: string
          created_by: string
          id: string
          label: string | null
          platform: string
          subject_id: string
          url: string
        }
        Insert: {
          author_token: string
          created_at?: string
          created_by: string
          id?: string
          label?: string | null
          platform: string
          subject_id: string
          url: string
        }
        Update: {
          author_token?: string
          created_at?: string
          created_by?: string
          id?: string
          label?: string | null
          platform?: string
          subject_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "workstation_socials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "workstation_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      workstation_subjects: {
        Row: {
          author_token: string
          category: string | null
          contact_address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          cover_path: string | null
          created_at: string
          created_by: string
          id: string
          priority: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_token: string
          category?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_path?: string | null
          created_at?: string
          created_by: string
          id?: string
          priority?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_token?: string
          category?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string
          id?: string
          priority?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      workstation_author_token: { Args: never; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
