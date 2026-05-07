import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  TrendingUp,
  Wallet,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Txns' },
  { to: '/subscriptions', icon: CreditCard, label: 'Subs' },
  { to: '/cashflow', icon: TrendingUp, label: 'Flow' },
  { to: '/income', icon: Wallet, label: 'Income' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

/*
  Bottom nav indicator spring — snappier than the sidebar (mobile taps
  need instant feedback) but slow enough to watch the line slide.
  ζ ≈ 0.71, ωn ≈ 20.4 rad/s → settles ≈ 0.28 s.
*/
const indicatorSpring = {
  type: 'spring' as const,
  stiffness: 420,
  damping:    30,
  mass:       0.72,
};

export function BottomNav() {
  const reducedMotion = useReducedMotion() ?? false;
  const spring = reducedMotion ? { duration: 0 } : indicatorSpring;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border-base bg-surface/90 backdrop-blur-md safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <LayoutGroup id="bottom-nav">
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="flex flex-1 outline-none"
            >
              {({ isActive }) => (
                <motion.div
                  className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 px-2 mx-0.5 rounded-xl min-h-[48px]"
                  // Tap feedback — punchy downscale
                  whileTap={reducedMotion ? {} : { scale: 0.86 }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 600, damping: 28 }
                  }
                >
                  {/*
                    Shared-element pill that slides between active items.
                    Uses layoutId so Framer Motion animates the single element
                    across the tree rather than fading in/out.
                  */}
                  {isActive && (
                    <motion.div
                      layoutId="bottom-pill"
                      className="absolute inset-0 rounded-xl bg-accent/14"
                      transition={spring}
                    />
                  )}

                  {/*
                    A thin accent line at the top of the pill — extra flair.
                    Shares the same layout animation as the pill.
                  */}
                  {isActive && (
                    <motion.div
                      layoutId="bottom-line"
                      className="absolute top-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-accent"
                      transition={spring}
                    />
                  )}

                  {/* Icon — scales up and lifts on active */}
                  <motion.div
                    className="relative z-10"
                    animate={
                      reducedMotion
                        ? {}
                        : { scale: isActive ? 1.18 : 1, y: isActive ? -1 : 0 }
                    }
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 420, damping: 26 }
                    }
                  >
                    <Icon
                      className={[
                        'h-5 w-5 transition-colors duration-200',
                        isActive ? 'text-accent' : 'text-foreground-subtle',
                      ].join(' ')}
                    />
                  </motion.div>

                  {/* Label — brightens on active */}
                  <span
                    className={[
                      'relative z-10 text-[10px] font-medium transition-colors duration-200',
                      isActive ? 'text-accent' : 'text-foreground-subtle',
                    ].join(' ')}
                    style={{ opacity: isActive ? 1 : 0.65 }}
                  >
                    {label}
                  </span>
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      </LayoutGroup>
    </nav>
  );
}
