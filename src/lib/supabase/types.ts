/** Database type definitions for all Supabase tables. */
export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          type: "url" | "image" | "pdf";
          source_url: string | null;
          screenshot_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          type: "url" | "image" | "pdf";
          source_url?: string | null;
          screenshot_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          type?: "url" | "image" | "pdf";
          source_url?: string | null;
          screenshot_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          project_id: string;
          x_percent: number;
          y_percent: number;
          body: string;
          author_name: string;
          resolved: boolean;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          x_percent: number;
          y_percent: number;
          body: string;
          author_name: string;
          resolved?: boolean;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          x_percent?: number;
          y_percent?: number;
          body?: string;
          author_name?: string;
          resolved?: boolean;
          parent_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      share_tokens: {
        Row: {
          id: string;
          project_id: string;
          token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          token?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          token?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
