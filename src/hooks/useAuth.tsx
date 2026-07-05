import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useFinanceStore } from '../store/financeStore';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Single source of auth truth.
 *
 * Previously `useAuth()` was a standalone hook called from 7 components
 * (ProtectedRoute, Header, Sidebar, Dashboard, Transactions, Subscriptions…).
 * Each call site ran its own effect that fired `supabase.auth.getSession()` and
 * registered its own `onAuthStateChange` subscription — so a single page mount
 * meant up to 7 concurrent session fetches and 7 live listeners, all racing the
 * store's hydration guard. That was a real, measurable drag on load and a source
 * of flicker.
 *
 * Now exactly one effect runs here, at the provider. Every `useAuth()` call is a
 * cheap context read. The hook's return shape is unchanged, so no call site needs
 * to change.
 */
export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
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

    let active = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        hydrateFromDatabase(s.user.id).finally(() => active && setLoading(false));
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
    //     initial hydration, so responding here too causes a double-hydrate that
    //     races any in-flight sync persist and can wipe freshly-synced data.
    //
    //   • TOKEN_REFRESHED fires every ~60 min (Supabase JWT TTL). Triggering a
    //     full DB re-hydration on a token refresh would overwrite optimistic
    //     in-memory state with stale DB rows and flash the loading skeleton.
    //
    // SIGNED_IN covers the actual user-triggered login flow.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        if (!active) return;
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
      active = false;
      subscription.unsubscribe();
    };
  }, [hydrateFromDatabase, resetToGuest]);

  const value: AuthState = { user, session, loading, isConfigured: isSupabaseConfigured };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Read the shared auth state. Returns a safe default if rendered outside an
 * <AuthProvider> (e.g. in isolated tests) so it never throws.
 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;
  return { user: null, session: null, loading: false, isConfigured: isSupabaseConfigured };
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
