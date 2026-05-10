import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Link as LinkIcon, Settings, Bell, Plus, Search } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth, signOut } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/subscriptions': 'Subscriptions',
  '/cashflow': 'Cash Flow',
  '/analytics': 'Analytics',
  '/work': 'Work Shifts',
  '/connect': 'Connect Bank',
  '/settings': 'Settings',
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;

  const pageTitle = pageTitles[location.pathname] || 'SupaSave';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toastError('Failed to sign out');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-[54px] items-center border-b border-border-base px-8 gap-4"
      style={{ background: 'rgba(8,9,12,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
    >
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[13px] text-foreground-muted">
        <span>SupaSave</span>
        <span className="text-foreground-subtle">/</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={pageTitle}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="font-medium text-foreground"
          >
            {pageTitle}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Global search */}
      <div
        className="flex items-center gap-2 h-8 px-3 rounded-lg text-[13px] text-foreground-subtle cursor-text transition-colors"
        style={{
          width: 300,
          background: 'rgb(var(--surface))',
          border: '1px solid rgb(var(--border-default))',
        }}
        onClick={() => {/* could open a search modal */}}
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-foreground-subtle text-[13px]">Search transactions…</span>
        <span
          className="font-mono text-[10.5px] rounded px-1.5 py-0.5"
          style={{
            background: 'rgb(var(--surface-sunken))',
            border: '1px solid rgb(var(--border-default))',
            color: 'rgb(var(--foreground-subtle))',
          }}
        >
          ⌘K
        </span>
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Notification bell */}
        <button
          className="flex items-center justify-center h-8 w-8 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* Add transaction */}
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium text-white transition-colors"
          style={{
            background: 'rgb(var(--accent))',
            boxShadow: '0 0 0 1px rgb(var(--accent)), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add transaction
        </button>

        {/* User menu */}
        {user && (
          <div className="relative">
            <motion.button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors"
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              title={user.email}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 border border-accent/30">
                <User className="h-3.5 w-3.5 text-accent" />
              </div>
              <span className="hidden sm:block text-xs">
                {user.email?.split('@')[0]}
              </span>
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <motion.div
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.93, y: -8 }}
                    animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.93, y: -8 }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 500, damping: 36, mass: 0.7 }
                    }
                    style={{ transformOrigin: 'top right' }}
                    className="absolute right-0 top-full mt-1.5 z-20 w-52 rounded-xl border border-border-base bg-surface shadow-float py-1"
                    role="menu"
                  >
                    <div className="px-3 py-2 border-b border-border-base">
                      <p className="text-xs text-foreground-subtle truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-raised transition-colors"
                      role="menuitem"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </Link>
                    <Link
                      to="/connect"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-raised transition-colors"
                      role="menuitem"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      Connect Bank
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-raised transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
}
