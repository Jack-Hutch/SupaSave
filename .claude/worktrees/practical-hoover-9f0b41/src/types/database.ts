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
      profiles: {
        Row: {
          id: string;
          settings: Json;
          budget_by_category: Json;
          ui_state: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          settings?: unknown;
          budget_by_category?: unknown;
          ui_state?: unknown;
          updated_at?: string;
        };
        Update: {
          id?: string;
          settings?: unknown;
          budget_by_category?: unknown;
          ui_state?: unknown;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_accounts: {
        Row: {
          id: string;
          user_id: string;
          external_id: string;
          display_name: string;
          balance: number;
          currency: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          external_id?: string;
          display_name?: string;
          balance?: number;
          currency?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          external_id?: string;
          display_name?: string;
          balance?: number;
          currency?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          description: string;
          category: string;
          date: string;
          created_at_tx: string | null;
          time_str: string | null;
          notes: string | null;
          is_income: boolean;
          direction: string;
          merchant_name: string | null;
          merchant_logo: string | null;
          is_round_up: boolean;
          raw_text: string | null;
          bank_ref: string | null;
          tags: string[] | null;
          source: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          description: string;
          category?: string;
          date: string;
          created_at_tx?: string | null;
          time_str?: string | null;
          notes?: string | null;
          is_income?: boolean;
          direction?: string;
          merchant_name?: string | null;
          merchant_logo?: string | null;
          is_round_up?: boolean;
          raw_text?: string | null;
          bank_ref?: string | null;
          tags?: string[] | null;
          source?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          description?: string;
          category?: string;
          date?: string;
          created_at_tx?: string | null;
          time_str?: string | null;
          notes?: string | null;
          is_income?: boolean;
          direction?: string;
          merchant_name?: string | null;
          merchant_logo?: string | null;
          is_round_up?: boolean;
          raw_text?: string | null;
          bank_ref?: string | null;
          tags?: string[] | null;
          source?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          cost: number;
          billing_cycle: string;
          start_date: string;
          next_billing_date: string;
          cancel_reminder: boolean;
          notes: string | null;
          category: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          cost: number;
          billing_cycle?: string;
          start_date?: string;
          next_billing_date?: string;
          cancel_reminder?: boolean;
          notes?: string | null;
          category?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          cost?: number;
          billing_cycle?: string;
          start_date?: string;
          next_billing_date?: string;
          cancel_reminder?: boolean;
          notes?: string | null;
          category?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bank_connections: {
        Row: {
          user_id: string;
          provider: string;
          connection_id: string;
          account_ids: string[];
          last_sync_at: string | null;
          status: string;
          error_message: string | null;
          payload: Json | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          provider: string;
          connection_id?: string;
          account_ids?: string[];
          last_sync_at?: string | null;
          status?: string;
          error_message?: string | null;
          payload?: unknown;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          provider?: string;
          connection_id?: string;
          account_ids?: string[];
          last_sync_at?: string | null;
          status?: string;
          error_message?: string | null;
          payload?: unknown;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
