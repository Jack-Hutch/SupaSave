import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LogOut, User, Link as LinkIcon, Settings } from 'lucide-react';
import { CoinLogo } from '../ui/CoinLogo';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth, signOut } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/subscriptions': 'Subscriptions',
  '/cashflow': 'Cash Flow',
  '/analytics': 'Analytics',
  '/connect': 'Connect Bank',
  '/settings': 'Settings',
};

export function Header() {
  const location = useLocation();
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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-base bg-surface/90 backdrop-blur-md px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile logo mark */}
        <div className="flex lg:hidden items-center gap-2">
          <CoinLogo size={28} />
        </div>

        {/*
          Page title cross-fades with a small vertical offset when the route
          changes — "wait" mode ensures the exit finishes before enter begins,
          so both titles are never visible simultaneously.
        */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={pageTitle}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
            }
            className="text-sm font-semibold text-foreground"
          >
            {pageTitle}
          </motion.h1>
        </AnimatePresence>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
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
                  {/* Click-away backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />

                  {/* Dropdown — scales in from top-right origin */}
                  <motion.div
                    initial={
                      reducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.93, y: -8 }
                    }
                    animate={
                      reducedMotion
                        ? { opacity: 1 }
                        : { opacity: 1, scale: 1, y: 0 }
                    }
                    exit={
                      reducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.93, y: -8 }
                    }
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
