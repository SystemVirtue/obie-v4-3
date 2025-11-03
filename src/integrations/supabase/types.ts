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
    PostgrestVersion: "13.0.5"
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
      approved_devices: {
        Row: {
          approved_at: string | null
          device_id: string
          device_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          device_id: string
          device_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          device_id?: string
          device_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      jukebox_sessions: {
        Row: {
          created_at: string | null
          current_state: Json | null
          id: string
          is_active: boolean | null
          owner_id: string | null
          session_code: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_state?: Json | null
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
          session_code: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_state?: Json | null
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
          session_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      kiosk_settings: {
        Row: {
          credits: number
          id: string
          mode: string
          player_id: string
          updated_at: string | null
        }
        Insert: {
          credits?: number
          id?: string
          mode?: string
          player_id: string
          updated_at?: string | null
        }
        Update: {
          credits?: number
          id?: string
          mode?: string
          player_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_kiosk_player"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          device_name: string | null
          id: string
          is_active: boolean | null
          last_seen: string | null
          player_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_seen?: string | null
          player_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_seen?: string | null
          player_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      playlists: {
        Row: {
          artist: string | null
          created_at: string | null
          id: string
          position: number
          room_id: string | null
          title: string
          user_id: string
          video_id: string
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          id?: string
          position: number
          room_id?: string | null
          title: string
          user_id: string
          video_id: string
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          id?: string
          position?: number
          room_id?: string | null
          title?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          created_at: string | null
          id: string
          is_public: boolean | null
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      song_requests: {
        Row: {
          artist: string | null
          created_at: string | null
          id: string
          player_id: string
          processed_at: string | null
          status: string | null
          title: string | null
          video_id: string
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          id?: string
          player_id: string
          processed_at?: string | null
          status?: string | null
          title?: string | null
          video_id: string
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          id?: string
          player_id?: string
          processed_at?: string | null
          status?: string | null
          title?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deactivate_stale_players: { Args: never; Returns: undefined }
      generate_session_code: { Args: never; Returns: string }
      get_or_create_kiosk_settings: {
        Args: { p_player_id: string }
        Returns: {
          credits: number
          id: string
          mode: string
          player_id: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "kiosk_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
