import { createClient } from '@supabase/supabase-js';

export type Database = {
  public: {
    Tables: {
      ad_shares: {
        Row: {
          accent_color: string;
          background_color: string;
          brand_name: string;
          business_name: string;
          created_at: string;
          cta_text: string;
          cta_url: string;
          headline: string;
          id: string;
          slug: string;
          subhead: string;
          video_path: string;
        };
        Insert: {
          accent_color?: string;
          background_color?: string;
          brand_name?: string;
          business_name?: string;
          created_at?: string;
          cta_text?: string;
          cta_url?: string;
          headline: string;
          id?: string;
          slug: string;
          subhead?: string;
          video_path: string;
        };
        Update: Partial<Database['public']['Tables']['ad_shares']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = Boolean(supabase);
