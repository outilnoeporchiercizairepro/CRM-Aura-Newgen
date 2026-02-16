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
      client_installments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          due_date: string
          id: string
          status: string | null
          is_dispatched: boolean
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          status?: string | null
          is_dispatched?: boolean
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          status?: string | null
          is_dispatched?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "client_installments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          amount_paid: number | null
          closed_by: Database["public"]["Enums"]["team_member_enum"] | null
          commission_distribution: Json | null
          contact_id: string | null
          created_at: string | null
          deal_amount: number
          id: string
          payment_method:
          | Database["public"]["Enums"]["payment_method_enum"]
          | null
          setter_commission_percentage: number | null
          is_dispatched: boolean | null
          billing_platform: Database["public"]["Enums"]["billing_platform_enum"]
        }
        Insert: {
          amount_paid?: number | null
          closed_by?: Database["public"]["Enums"]["team_member_enum"] | null
          commission_distribution?: Json | null
          contact_id?: string | null
          created_at?: string | null
          deal_amount: number
          id?: string
          payment_method?:
          | Database["public"]["Enums"]["payment_method_enum"]
          | null
          setter_commission_percentage?: number | null
          is_dispatched?: boolean | null
          billing_platform?: Database["public"]["Enums"]["billing_platform_enum"]
        }
        Update: {
          amount_paid?: number | null
          closed_by?: Database["public"]["Enums"]["team_member_enum"] | null
          commission_distribution?: Json | null
          contact_id?: string | null
          created_at?: string | null
          deal_amount?: number
          id?: string
          payment_method?:
          | Database["public"]["Enums"]["payment_method_enum"]
          | null
          setter_commission_percentage?: number | null
          is_dispatched?: boolean | null
          billing_platform?: Database["public"]["Enums"]["billing_platform_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "clients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string
          id: string
          name: string
          type: string
          paid_by: Database["public"]["Enums"]["team_member_enum"] | null
          is_deducted: boolean | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          id?: string
          name: string
          type: string
          paid_by?: Database["public"]["Enums"]["team_member_enum"] | null
          is_deducted?: boolean | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          id?: string
          name?: string
          type?: string
          paid_by?: Database["public"]["Enums"]["team_member_enum"] | null
          is_deducted?: boolean | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string | null
          first_closing_date: string | null
          id: string
          job_status: Database["public"]["Enums"]["job_status_enum"] | null
          lead_id: string | null
          nom: string
          notes: string | null
          phone: string | null
          presentation: string | null
          status: Database["public"]["Enums"]["contact_status_enum"] | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_closing_date?: string | null
          id?: string
          job_status?: Database["public"]["Enums"]["job_status_enum"] | null
          lead_id?: string | null
          nom: string
          notes?: string | null
          phone?: string | null
          presentation?: string | null
          status?: Database["public"]["Enums"]["contact_status_enum"] | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_closing_date?: string | null
          id?: string
          job_status?: Database["public"]["Enums"]["job_status_enum"] | null
          lead_id?: string | null
          nom?: string
          notes?: string | null
          phone?: string | null
          presentation?: string | null
          status?: Database["public"]["Enums"]["contact_status_enum"] | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: Database["public"]["Enums"]["team_member_enum"] | null
          created_at: string | null
          email: string | null
          id: string
          nom: string
          prenom: string
          provenance: Database["public"]["Enums"]["provenance_enum"] | null
          social_media: Database["public"]["Enums"]["social_media_enum"] | null
        }
        Insert: {
          assigned_to?: Database["public"]["Enums"]["team_member_enum"] | null
          created_at?: string | null
          email?: string | null
          id?: string
          nom: string
          prenom: string
          provenance?: Database["public"]["Enums"]["provenance_enum"] | null
          social_media?: Database["public"]["Enums"]["social_media_enum"] | null
        }
        Update: {
          assigned_to?: Database["public"]["Enums"]["team_member_enum"] | null
          created_at?: string | null
          email?: string | null
          id?: string
          nom?: string
          prenom?: string
          provenance?: Database["public"]["Enums"]["provenance_enum"] | null
          social_media?: Database["public"]["Enums"]["social_media_enum"] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      contact_status_enum:
      | "Call planifié"
      | "A recontacter"
      | "Closé"
      | "Attente paiement"
      | "Attente retour"
      | "Pas venu"
      | "Pas budget"
      job_status_enum:
      | "Entrepreneur"
      | "Demandeur d'emploi"
      | "Etudiant"
      | "Salarié"
      payment_method_enum: "One shot" | "2x" | "3x" | "4x"
      provenance_enum: "Tally" | "DM" | "Skool"
      social_media_enum: "Youtube" | "Instagram" | "Linkedin" | "Tiktok"
      team_member_enum: "Noé" | "Baptiste" | "Imrane"
      billing_platform_enum: "Mollie" | "GoCardless" | "Revolut"
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
      contact_status_enum: [
        "Call planifié",
        "A recontacter",
        "Closé",
        "Attente paiement",
        "Attente retour",
        "Pas venu",
        "Pas budget",
      ],
      job_status_enum: [
        "Entrepreneur",
        "Demandeur d'emploi",
        "Etudiant",
        "Salarié",
      ],
      payment_method_enum: ["One shot", "2x", "3x", "4x"],
      provenance_enum: ["Tally", "DM", "Skool"],
      social_media_enum: ["Youtube", "Instagram", "Linkedin", "Tiktok"],
      team_member_enum: ["Noé", "Baptiste", "Imrane"],
    },
  },
} as const
