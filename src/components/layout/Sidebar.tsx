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
  Briefcase,
} from 'lucide-react';
import { CoinLogo } from '../ui/CoinLogo';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
      { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/cashflow', icon: TrendingUp, label: 'Cash Flow' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/work', icon: Briefcase, label: 'Work Shifts' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/connect', icon: LinkIcon, label: 'Connect Bank' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
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
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border-base">
        <CoinLogo size={30} />
        <div>
          <span className="text-[15px] font-bold tracking-tight text-foreground leading-none">
            Supa<span className="text-accent">Save</span>
          </span>
          <p className="text-[10px] text-foreground-subtle leading-none mt-0.5">Personal Finance</p>
        </div>
      </div>

      {/*
        LayoutGroup namespaces the layoutId values so the sidebar indicator
        never accidentally cross-animates with other layoutId consumers.
      */}
      <LayoutGroup id="sidebar-nav">
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {navSections.map((section, si) => (
            <div key={si}>
              {section.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground-subtle/70">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} end={to === '/'} className="block outline-none">
                    {({ isActive }) => (
                      <motion.div
                        className={[
                          'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-accent',
                          isActive ? 'text-accent' : 'text-foreground-muted',
                        ].join(' ')}
                        whileHover={{ x: isActive ? 0 : 3 }}
                        whileTap={{ scale: 0.97 }}
                        transition={
                          reducedMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 400, damping: 28 }
                        }
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-pill"
                            className="absolute inset-0 rounded-lg bg-accent/12 border border-accent/20"
                            transition={spring}
                          />
                        )}
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-bar"
                            className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-accent"
                            transition={spring}
                          />
                        )}
                        <motion.span
                          className="relative z-10 shrink-0"
                          animate={reducedMotion ? {} : { scale: isActive ? 1.08 : 1 }}
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
              </div>
            </div>
          ))}
        </nav>
      </LayoutGroup>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border-base">
        <p className="text-[10px] text-foreground-subtle/60">SupaSave v1.0 · Personal Finance</p>
      </div>
    </aside>
  );
}
