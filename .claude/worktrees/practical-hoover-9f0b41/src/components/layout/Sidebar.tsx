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
import { useAuth } from '../../hooks/useAuth';

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

const indicatorSpring = {
  type: 'spring' as const,
  stiffness: 350,
  damping:    28,
  mass:       0.85,
};

export function Sidebar() {
  const reducedMotion = useReducedMotion() ?? false;
  const spring = reducedMotion ? { duration: 0 } : indicatorSpring;
  const { user } = useAuth();

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';
  const userHandle = user?.email?.split('@')[0] ?? 'User';

  return (
    <aside
      className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border-base min-h-screen"
      style={{ background: 'rgb(var(--surface-sunken))' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pt-[22px] pb-[22px] border-b border-border-base">
        {/* Brand mark */}
        <div
          className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] font-mono font-bold text-[13px] text-white shrink-0"
          style={{
            background: 'linear-gradient(140deg, rgb(var(--accent)) 0%, #4d3fcc 100%)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
          }}
        >
          S
        </div>
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground leading-none">
          SupaSave<span style={{ color: 'rgb(var(--accent))' }}>.</span>
        </span>
      </div>

      <LayoutGroup id="sidebar-nav">
        <nav className="flex-1 px-3.5 py-4 space-y-4 overflow-y-auto">
          {navSections.map((section, si) => (
            <div key={si}>
              {section.label && (
                <p className="px-2.5 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-foreground-subtle">
                  {section.label}
                </p>
              )}
              <div className="space-y-[1px]">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} end={to === '/'} className="block outline-none">
                    {({ isActive }) => (
                      <motion.div
                        className={[
                          'relative flex items-center gap-[11px] rounded-lg px-2.5 py-[7px] text-[13.5px] font-medium cursor-pointer select-none',
                          isActive
                            ? 'text-foreground'
                            : 'text-foreground-muted hover:text-foreground',
                        ].join(' ')}
                        whileHover={isActive ? {} : { x: 2 }}
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
                            className="absolute inset-0 rounded-lg"
                            style={{
                              background: 'rgb(var(--surface))',
                              boxShadow: 'inset 0 0 0 1px rgb(var(--border-default))',
                            }}
                            transition={spring}
                          />
                        )}
                        <motion.span
                          className="relative z-10 shrink-0"
                          style={isActive ? { color: 'rgb(var(--accent))' } : {}}
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

      {/* Footer — user info */}
      <div
        className="flex items-center gap-2.5 px-2.5 py-2.5 border-t border-border-base"
        style={{ marginTop: 'auto' }}
      >
        {/* Avatar */}
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-semibold text-[12px] text-foreground"
          style={{ background: 'linear-gradient(135deg, #2f3441, #4a5163)' }}
        >
          {userInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground leading-none truncate">{userHandle}</p>
          <p className="text-[11px] text-foreground-subtle leading-none mt-[3px] truncate">{user?.email ?? ''}</p>
        </div>
        <NavLink
          to="/settings"
          className="flex items-center justify-center h-7 w-7 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface transition-colors shrink-0"
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </NavLink>
      </div>
    </aside>
  );
}
