import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

const AMBIENT: Record<string, { x: number; y: number }> = {
  '/':              { x: 15, y: 25 },
  '/transactions':  { x: 50, y: 42 },
  '/subscriptions': { x: 60, y: 55 },
  '/cashflow':      { x: 80, y: 22 },
  '/analytics':     { x: 65, y: 68 },
  '/income':        { x: 40, y: 30 },
  '/connect':       { x: 25, y: 65 },
  '/settings':      { x: 12, y: 55 },
};

export function AppShell() {
  const location    = useLocation();
  const reducedMotion = useReducedMotion() ?? false;

  const glow = AMBIENT[location.pathname] ?? { x: 50, y: 40 };

  /*
    PAGE TRANSITION STRATEGY
    ─────────────────────────
    We use a SINGLE motion.div per page (no inner wrapper). Per-variant
    `transition` lets exit be fast and enter be slow without a nested div.

    Why this matters for shared elements (layoutId):
      The old spring was stiffness:340 → settled in ~0.25 s.
      The old enter had delay:0.08 + duration:0.22 → visible at 0.30 s.
      Result: element arrived before you could see it. Invisible travel.

    New approach:
      • Exit opacity: 0.12 s  (old content clears fast)
      • Enter opacity: 0.55 s, no delay  (page fades in slowly)
      • Spring: stiffness:110, damping:16  → settles ≈ 0.55 s

    Timeline for a shared element (e.g. stat card):
      t=0.00 s  Element begins traveling from old position; page at opacity:0
      t=0.05 s  Page at ~9% opacity — element already ~10% through journey
      t=0.15 s  Page at ~27% opacity — element ~30% through journey → visible!
      t=0.30 s  Page at ~55% opacity — element ~60% through journey
      t=0.55 s  Page fully visible   — element settling into final position
      t=0.60 s  Element fully settled. You watched the whole trip.
  */
  const pageVariants = reducedMotion
    ? {
        enter:  { opacity: 1 },
        center: { opacity: 1 },
        exit:   { opacity: 1 },
      }
    : {
        enter: { opacity: 0 },
        center: {
          opacity: 1,
          transition: {
            opacity: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] },
          },
        },
        exit: {
          opacity: 0,
          transition: {
            opacity: { duration: 0.12, ease: 'easeIn' },
          },
        },
      };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Ambient per-route glow — drifts to a unique position per tab */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div
          style={{
            position: 'absolute',
            width: '75vw',
            height: '75vw',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at center, rgb(var(--accent) / 0.10), transparent 65%)',
            left: `${glow.x}%`,
            top: `${glow.y}%`,
            transform: 'translate(-50%, -50%)',
            transition: reducedMotion
              ? 'none'
              : 'left 0.85s cubic-bezier(0.32, 0.72, 0, 1), top 0.85s cubic-bezier(0.32, 0.72, 0, 1)',
            willChange: 'left, top',
          }}
        />
      </div>

      <Sidebar />

      <div className="relative z-10 flex flex-1 flex-col min-w-0">
        <Header />
        {/*
          LayoutGroup at the page level means all layoutId elements across
          the entering and exiting pages are coordinated in one batch.
          They all receive their "snapshot before" and "target after" in the
          same frame, so the timing is perfectly synchronised.

          overflow-x-hidden clips elements mid-flight that temporarily
          sit outside the viewport boundary.
          position: relative gives popLayout a containing block for the
          absolute-positioned exiting child.
        */}
        <main className="relative flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-6">
          <LayoutGroup id="page-transitions">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                style={{ willChange: 'opacity' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </LayoutGroup>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
