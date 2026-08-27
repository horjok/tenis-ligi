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
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      availability_slots: {
        Row: {
          created_at: string
          id: string
          league_id: string
          slot_start: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          slot_start: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          slot_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          league_id: string
          max_uses: number
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          league_id: string
          max_uses?: number
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          league_id?: string
          max_uses?: number
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          id: string
          joined_at: string | null
          league_id: string
          role: Database["public"]["Enums"]["league_role"]
          status: Database["public"]["Enums"]["league_member_status"]
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          league_id: string
          role?: Database["public"]["Enums"]["league_role"]
          status?: Database["public"]["Enums"]["league_member_status"]
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          league_id?: string
          role?: Database["public"]["Enums"]["league_role"]
          status?: Database["public"]["Enums"]["league_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      match_participants: {
        Row: {
          accepted_at: string | null
          match_id: string
          team_no: number
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          match_id: string
          team_no: number
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          match_id?: string
          team_no?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "mac_gecmisi"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "oneri_listesi"
            referencedColumns: ["match_id"]
          },
        ]
      }
      match_sets: {
        Row: {
          id: string
          match_id: string
          set_no: number
          team1_games: number
          team2_games: number
        }
        Insert: {
          id?: string
          match_id: string
          set_no: number
          team1_games: number
          team2_games: number
        }
        Update: {
          id?: string
          match_id?: string
          set_no?: number
          team1_games?: number
          team2_games?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "mac_gecmisi"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "match_sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "oneri_listesi"
            referencedColumns: ["match_id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          league_id: string
          location: string | null
          match_type: Database["public"]["Enums"]["match_type"]
          played_at: string
          status: Database["public"]["Enums"]["match_status"]
          winner_team: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          league_id: string
          location?: string | null
          match_type?: Database["public"]["Enums"]["match_type"]
          played_at: string
          status?: Database["public"]["Enums"]["match_status"]
          winner_team?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          league_id?: string
          location?: string | null
          match_type?: Database["public"]["Enums"]["match_type"]
          played_at?: string
          status?: Database["public"]["Enums"]["match_status"]
          winner_team?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      rating_history: {
        Row: {
          created_at: string
          id: string
          match_id: string
          rating_after: number
          rating_before: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          rating_after: number
          rating_before: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          rating_after?: number
          rating_before?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "mac_gecmisi"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "rating_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "oneri_listesi"
            referencedColumns: ["match_id"]
          },
        ]
      }
      ratings: {
        Row: {
          league_id: string
          match_type: Database["public"]["Enums"]["match_type"]
          matches_played: number
          rating: number
          user_id: string
        }
        Insert: {
          league_id: string
          match_type: Database["public"]["Enums"]["match_type"]
          matches_played?: number
          rating?: number
          user_id: string
        }
        Update: {
          league_id?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          matches_played?: number
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      lig_oyunculari: {
        Row: {
          display_name: string | null
          joined_at: string | null
          league_id: string | null
          role: Database["public"]["Enums"]["league_role"] | null
          status: Database["public"]["Enums"]["league_member_status"] | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      mac_gecmisi: {
        Row: {
          kaydeden_ad: string | null
          league_id: string | null
          location: string | null
          match_id: string | null
          oyuncu1_ad: string | null
          oyuncu1_elo_degisim: number | null
          oyuncu1_id: string | null
          oyuncu2_ad: string | null
          oyuncu2_elo_degisim: number | null
          oyuncu2_id: string | null
          played_at: string | null
          setler: Json | null
          winner_team: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      oneri_listesi: {
        Row: {
          league_id: string | null
          match_id: string | null
          oyuncu1_ad: string | null
          oyuncu1_id: string | null
          oyuncu1_kabul: string | null
          oyuncu2_ad: string | null
          oyuncu2_id: string | null
          oyuncu2_kabul: string | null
          played_at: string | null
          status: Database["public"]["Enums"]["match_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      puan_tablosu: {
        Row: {
          display_name: string | null
          galibiyet: number | null
          league_id: string | null
          maglubiyet: number | null
          match_type: Database["public"]["Enums"]["match_type"] | null
          matches_played: number | null
          rating: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      kullanici_adi_musait_mi: {
        Args: { p_username: string }
        Returns: boolean
      }
      oneriyi_kabul_et: { Args: { p_match_id: string }; Returns: string }
      oneriyi_reddet: { Args: { p_match_id: string }; Returns: undefined }
      recalculate_ratings: { Args: { p_league_id: string }; Returns: number }
      record_match: {
        Args: {
          p_league_id: string
          p_location?: string
          p_opponent_id: string
          p_played_at: string
          p_sets?: Json
          p_winner_id: string
        }
        Returns: string
      }
      sonuc_gir: {
        Args: {
          p_location?: string
          p_match_id: string
          p_sets?: Json
          p_winner_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      league_member_status: "pending" | "active" | "left"
      league_role: "player" | "admin"
      match_status: "proposed" | "accepted" | "played" | "cancelled" | "expired"
      match_type: "singles" | "doubles"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      league_member_status: ["pending", "active", "left"],
      league_role: ["player", "admin"],
      match_status: ["proposed", "accepted", "played", "cancelled", "expired"],
      match_type: ["singles", "doubles"],
    },
  },
} as const
