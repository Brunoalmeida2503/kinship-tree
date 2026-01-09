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
  public: {
    Tables: {
      aura_conversations: {
        Row: {
          created_at: string
          id: string
          message: string
          response: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          response: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          response?: string
          user_id?: string
        }
        Relationships: []
      }
      aura_personality: {
        Row: {
          common_topics: Json
          id: string
          interactions_count: number
          interests: Json
          personality_traits: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          common_topics?: Json
          id?: string
          interactions_count?: number
          interests?: Json
          personality_traits?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          common_topics?: Json
          id?: string
          interactions_count?: number
          interests?: Json
          personality_traits?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_shares: {
        Row: {
          created_at: string
          id: string
          memory_id: string
          shared_by: string
          shared_with_group_id: string | null
          shared_with_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          memory_id: string
          shared_by: string
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          memory_id?: string
          shared_by?: string
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
        }
        Relationships: []
      }
      connections: {
        Row: {
          ancestor_confirmed_by: string[] | null
          connection_type: string
          created_at: string | null
          id: string
          is_ancestor: boolean | null
          receiver_id: string
          relationship_from_receiver: Database["public"]["Enums"]["relationship_type"]
          relationship_from_requester: Database["public"]["Enums"]["relationship_type"]
          requester_id: string
          status: Database["public"]["Enums"]["connection_status"] | null
          updated_at: string | null
        }
        Insert: {
          ancestor_confirmed_by?: string[] | null
          connection_type?: string
          created_at?: string | null
          id?: string
          is_ancestor?: boolean | null
          receiver_id: string
          relationship_from_receiver: Database["public"]["Enums"]["relationship_type"]
          relationship_from_requester: Database["public"]["Enums"]["relationship_type"]
          requester_id: string
          status?: Database["public"]["Enums"]["connection_status"] | null
          updated_at?: string | null
        }
        Update: {
          ancestor_confirmed_by?: string[] | null
          connection_type?: string
          created_at?: string | null
          id?: string
          is_ancestor?: boolean | null
          receiver_id?: string
          relationship_from_receiver?: Database["public"]["Enums"]["relationship_type"]
          relationship_from_requester?: Database["public"]["Enums"]["relationship_type"]
          requester_id?: string
          status?: Database["public"]["Enums"]["connection_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_comments: {
        Row: {
          content: string
          created_at: string
          group_post_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_post_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_post_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_requests: {
        Row: {
          created_at: string
          group_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memories: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          group_id: string
          id: string
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          group_id: string
          id?: string
          start_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          group_id?: string
          id?: string
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memory_media: {
        Row: {
          created_at: string
          display_order: number
          group_memory_id: string
          id: string
          media_type: string
          media_url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          group_memory_id: string
          id?: string
          media_type: string
          media_url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          group_memory_id?: string
          id?: string
          media_type?: string
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memory_media_group_memory_id_fkey"
            columns: ["group_memory_id"]
            isOneToOne: false
            referencedRelation: "group_memories"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_media: {
        Row: {
          created_at: string
          display_order: number
          group_post_id: string
          id: string
          media_type: string
          media_url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          group_post_id: string
          id?: string
          media_type: string
          media_url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          group_post_id?: string
          id?: string
          media_type?: string
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_media_group_post_id_fkey"
            columns: ["group_post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          allow_member_posts: boolean
          avatar_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_private: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          allow_member_posts?: boolean
          avatar_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          allow_member_posts?: boolean
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          share_with_tree: boolean | null
          start_date: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          share_with_tree?: boolean | null
          start_date: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          share_with_tree?: boolean | null
          start_date?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      memory_media: {
        Row: {
          created_at: string
          display_order: number
          id: string
          media_type: string
          media_url: string
          memory_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          media_type: string
          media_url: string
          memory_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          media_type?: string
          media_url?: string
          memory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_media_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_shares: {
        Row: {
          created_at: string
          id: string
          memory_id: string
          shared_by: string
          shared_with_group_id: string | null
          shared_with_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          memory_id: string
          shared_by: string
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          memory_id?: string
          shared_by?: string
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_shares_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_shares_shared_with_group_id_fkey"
            columns: ["shared_with_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_actions: {
        Row: {
          action_type: string
          created_at: string | null
          degree: number
          id: string
          metadata: Json | null
          mission_id: string
          target_user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          degree: number
          id?: string
          metadata?: Json | null
          mission_id: string
          target_user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          degree?: number
          id?: string
          metadata?: Json | null
          mission_id?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_actions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_suggestions: {
        Row: {
          common_connections: number | null
          connection_strength: number | null
          created_at: string | null
          degree: number
          id: string
          mission_id: string
          suggested_user_id: string
        }
        Insert: {
          common_connections?: number | null
          connection_strength?: number | null
          created_at?: string | null
          degree: number
          id?: string
          mission_id: string
          suggested_user_id: string
        }
        Update: {
          common_connections?: number | null
          connection_strength?: number | null
          created_at?: string | null
          degree?: number
          id?: string
          mission_id?: string
          suggested_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_suggestions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_degree: number
          id: string
          path: Json | null
          status: string
          target_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_degree?: number
          id?: string
          path?: Json | null
          status?: string
          target_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_degree?: number
          id?: string
          path?: Json | null
          status?: string
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_groups: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          post_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          post_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_groups_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          display_order: number
          id: string
          media_type: string
          media_url: string
          post_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          media_type: string
          media_url: string
          post_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          media_type?: string
          media_url?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          shared_by: string
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          shared_by: string
          shared_with_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          shared_by?: string
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          share_with_tree: boolean | null
          updated_at: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          share_with_tree?: boolean | null
          updated_at?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          share_with_tree?: boolean | null
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string | null
          full_name: string
          id: string
          language: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          state: string | null
          theme_color: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          full_name: string
          id: string
          language?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          state?: string | null
          theme_color?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          language?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          state?: string | null
          theme_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      notify_user: {
        Args: {
          _link?: string
          _message: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      connection_status: "pending" | "accepted" | "rejected"
      relationship_type:
        | "pai"
        | "mae"
        | "filho"
        | "filha"
        | "irmao"
        | "irma"
        | "avo"
        | "avó"
        | "neto"
        | "neta"
        | "tio"
        | "tia"
        | "sobrinho"
        | "sobrinha"
        | "primo"
        | "prima"
        | "conjuge"
        | "outro"
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
      connection_status: ["pending", "accepted", "rejected"],
      relationship_type: [
        "pai",
        "mae",
        "filho",
        "filha",
        "irmao",
        "irma",
        "avo",
        "avó",
        "neto",
        "neta",
        "tio",
        "tia",
        "sobrinho",
        "sobrinha",
        "primo",
        "prima",
        "conjuge",
        "outro",
      ],
    },
  },
} as const
