import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  TrendingUp,
  BarChart3,
  Settings,
  Link as LinkIcon,
} from 'lucide-react';
import { CoinLogo } from '../ui/CoinLogo';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/cashflow', icon: TrendingUp, label: 'Cash Flow' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/connect', icon: LinkIcon, label: 'Connect Bank' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

/*
  Nav indicator spring — slower than the old 500/38 so you can actually
  watch the pill travel between items. Still feels responsive (< 0.35 s).
  ζ ≈ 0.72, ωn ≈ 18.7 rad/s → settles ≈ 0.30 s with slight overshoot.
*/
const indicatorSpring = {
  type: 'spring' as const,
  stiffness: 350,
  damping:    28,
  mass:       0.85,
};

export function Sidebar() {
  const reducedMotion = useReducedMotion() ?? false;
  const spring = reducedMotion ? { duration: 0 } : indicatorSpring;

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border-base bg-surface/80 backdrop-blur-sm min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border-base">
        <CoinLogo size={32} />
        <span className="text-base font-bold tracking-tight text-foreground">
          Supa<span className="text-accent">Save</span>
        </span>
      </div>

      {/*
        LayoutGroup namespaces the layoutId values so the sidebar indicator
        never accidentally cross-animates with other layoutId consumers.
      */}
      <LayoutGroup id="sidebar-nav">
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className="block outline-none">
              {({ isActive }) => (
                <motion.div
                  className={[
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-accent',
                    isActive ? 'text-accent' : 'text-foreground-muted',
                  ].join(' ')}
                  // Micro-interaction: inactive items nudge right on hover
                  whileHover={{ x: isActive ? 0 : 3 }}
                  whileTap={{ scale: 0.97 }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 400, damping: 28 }
                  }
                >
                  {/*
                    Shared-element background pill.
                    Only one is mounted at a time (the active item).
                    Framer Motion animates its position between items via layoutId.
                  */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-pill"
                      className="absolute inset-0 rounded-lg bg-accent/12 border border-accent/20"
                      transition={spring}
                    />
                  )}

                  {/*
                    Left accent bar — separate layoutId for independent motion.
                    It can "lag" slightly behind the pill for a layered feel.
                  */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-bar"
                      className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-accent"
                      transition={spring}
                    />
                  )}

                  {/* Icon scales up when active */}
                  <motion.span
                    className="relative z-10 shrink-0"
                    animate={
                      reducedMotion ? {} : { scale: isActive ? 1.08 : 1 }
                    }
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 400, damping: 25 }
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </motion.span>

                  <span className="relative z-10">{label}</span>
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>
      </LayoutGroup>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border-base">
        <p className="text-xs text-foreground-subtle">SupaSave v1.0</p>
      </div>
    </aside>
  );
}
