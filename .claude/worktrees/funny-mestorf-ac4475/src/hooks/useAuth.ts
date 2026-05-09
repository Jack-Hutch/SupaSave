import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useFinanceStore } from '../store/financeStore';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateFromDatabase = useFinanceStore((s) => s.hydrateFromDatabase);
  const resetToGuest = useFinanceStore((s) => s.resetToGuest);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        hydrateFromDatabase(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes.
    //
    // We intentionally only re-hydrate on SIGNED_IN — NOT on TOKEN_REFRESHED,
    // INITIAL_SESSION, or USER_UPDATED:
    //
    //   • INITIAL_SESSION fires immediately when this listener is registered if
    //     there is already a session. getSession() above already handles the
    //     initial hydration, so responding here too causes a double-hydrate on
    //     every mount, which races any in-flight sync persist and can wipe
    //     freshly-synced transactions from memory.
    //
    //   • TOKEN_REFRESHED fires every ~60 min (Supabase JWT TTL). Triggering a
    //     full DB re-hydration on a token refresh would overwrite optimistic
    //     in-memory state (e.g. category changes not yet persisted) with stale
    //     DB rows and flash the loading skeleton on an otherwise idle page.
    //
    // SIGNED_IN covers the actual user-triggered login flow.
    // Any future !newUser branch correctly resets the store on sign-out.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        setSession(s);
        const newUser = s?.user ?? null;
        setUser(newUser);

        if (event === 'SIGNED_IN' && newUser) {
          hydrateFromDatabase(newUser.id);
        } else if (!newUser) {
          resetToGuest();
        }
        // TOKEN_REFRESHED / INITIAL_SESSION / USER_UPDATED → no re-hydration
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [hydrateFromDatabase, resetToGuest]);

  return { user, session, loading, isConfigured: isSupabaseConfigured };
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
