export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      entries: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          type: 'creature' | 'adventure_note';
          title: string;
          tags: string[];
          source_text: string | null;
          parsed_json: Json | null;
          output_json: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          type: 'creature' | 'adventure_note';
          title: string;
          tags?: string[];
          source_text?: string | null;
          parsed_json?: Json | null;
          output_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          type?: 'creature' | 'adventure_note';
          title?: string;
          tags?: string[];
          source_text?: string | null;
          parsed_json?: Json | null;
          output_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      entry_versions: {
        Row: {
          id: string;
          entry_id: string;
          user_id: string;
          snapshot_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          entry_id: string;
          user_id: string;
          snapshot_json: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          entry_id?: string;
          user_id?: string;
          snapshot_json?: Json;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      entry_type: 'creature' | 'adventure_note';
    };
  };
};
