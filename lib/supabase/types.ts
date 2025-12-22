export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      symbols: {
        Row: {
          id: string;
          code: string;
          name: string;
          sector: string | null;
          market: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          sector?: string | null;
          market?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          sector?: string | null;
          market?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      debate_sessions: {
        Row: {
          id: string;
          symbol_code: string;
          symbol_name: string;
          date: string;
          status: string;
          current_round: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          symbol_code: string;
          symbol_name: string;
          date?: string;
          status?: string;
          current_round?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          symbol_code?: string;
          symbol_name?: string;
          date?: string;
          status?: string;
          current_round?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      debate_messages: {
        Row: {
          id: string;
          session_id: string;
          character: string;
          content: string;
          score: number;
          risks: Json;
          sources: Json;
          round: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          character: string;
          content: string;
          score?: number;
          risks?: Json;
          sources?: Json;
          round?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          character?: string;
          content?: string;
          score?: number;
          risks?: Json;
          sources?: Json;
          round?: number;
          created_at?: string;
        };
      };
      verdicts: {
        Row: {
          id: string;
          date: string;
          top5: Json;
          consensus_summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date?: string;
          top5: Json;
          consensus_summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          top5?: Json;
          consensus_summary?: string | null;
          created_at?: string;
        };
      };
      predictions: {
        Row: {
          id: string;
          verdict_id: string;
          symbol_code: string;
          symbol_name: string;
          predicted_direction: string;
          avg_score: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          verdict_id: string;
          symbol_code: string;
          symbol_name: string;
          predicted_direction: string;
          avg_score?: number;
          date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          verdict_id?: string;
          symbol_code?: string;
          symbol_name?: string;
          predicted_direction?: string;
          avg_score?: number;
          date?: string;
          created_at?: string;
        };
      };
      outcomes: {
        Row: {
          id: string;
          prediction_id: string;
          actual_direction: string;
          actual_return: number;
          is_hit: boolean;
          evaluated_at: string;
        };
        Insert: {
          id?: string;
          prediction_id: string;
          actual_direction: string;
          actual_return?: number;
          is_hit?: boolean;
          evaluated_at?: string;
        };
        Update: {
          id?: string;
          prediction_id?: string;
          actual_direction?: string;
          actual_return?: number;
          is_hit?: boolean;
          evaluated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}





