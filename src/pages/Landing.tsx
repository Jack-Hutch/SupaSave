import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  ElementType,
  SVGProps,
  ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import './landing.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevealOptions {
  threshold?: number;
  rootMargin?: string;
}

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

interface BarData {
  label: string;
  amt: number;
  pct: number;
  color: string;
}

interface Platform {
  Icon: React.FC<IconProps>;
  name: string;
  steps: string[];
}

interface InstallEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useReveal(opts: RevealOptions = {}): [React.RefObject<any>, boolean] {
  const ref = useRef<any>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) { setSeen(true); io.disconnect(); }
      },
      { threshold: opts.threshold ?? 0.15, rootMargin: opts.rootMargin ?? '0px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, seen];
}

// ─── CountUp ─────────────────────────────────────────────────────────────────

interface CountUpProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

function CountUp({ value, prefix = '', suffix = '', decimals = 0, className = '' }: CountUpProps) {
  const [ref, seen] = useReveal();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    const start = performance.now();
    const dur = 1600;
    let raf: number;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setN(value * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value]);
  const fmt = decimals
    ? n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(n).toLocaleString();
  return (
    <span ref={ref} className={className}>
      {prefix}{fmt}{suffix}
    </span>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grad-bg rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30"
        style={{ width: size, height: size, fontSize: size * 0.55 }}
      >
        S
      </div>
      <span className="text-white font-semibold tracking-tight" style={{ fontSize: size * 0.6 }}>
        Supa<span className="text-emerald-400">Save</span>
      </span>
    </div>
  );
}

// ─── Background FX ───────────────────────────────────────────────────────────

function BackgroundFX() {
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 6 + Math.random() * 8,
        size: 1 + Math.random() * 2.5,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 grid-overlay opacity-60" />
      <div
        className="anim-orb-a absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,.45), transparent 60%)' }}
      />
      <div
        className="anim-orb-b absolute top-40 -right-32 w-[460px] h-[460px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,.45), transparent 60%)' }}
      />
      <div
        className="anim-orb-c absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,.22), transparent 60%)' }}
      />
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-indigo-400"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animation: `particle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── SparkChart ───────────────────────────────────────────────────────────────

function SparkChart() {
  const [ref, seen] = useReveal({ threshold: 0.3 });
  const path = 'M 0 80 C 30 70, 50 60, 70 65 S 110 55, 140 40 S 200 30, 240 22 S 300 18, 360 8';
  const area = path + ' L 360 120 L 0 120 Z';
  return (
    <svg ref={ref} viewBox="0 0 360 120" className="w-full h-full">
      <defs>
        <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lgs" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path
        d={area}
        fill="url(#lg)"
        style={{ opacity: seen ? 1 : 0, transition: 'opacity .8s ease .6s' }}
      />
      <path
        d={path}
        fill="none"
        stroke="url(#lgs)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={`draw-path ${seen ? 'in' : ''}`}
      />
      <circle
        cx="360"
        cy="8"
        r="4"
        fill="#a78bfa"
        style={{
          opacity: seen ? 1 : 0,
          transform: seen ? 'scale(1)' : 'scale(0)',
          transformOrigin: '360px 8px',
          transition: 'all .5s ease 1.4s',
        }}
      />
    </svg>
  );
}

// ─── DashboardMock ────────────────────────────────────────────────────────────

function DashboardMock() {
  const txs = [
    { name: 'Coles Town Hall', cat: 'Groceries', amt: -42.18, time: 'Today, 5:42pm' },
    { name: 'Salary — Acme Co', cat: 'Income', amt: 2840.0, time: 'Today, 9:01am' },
    { name: 'Spotify', cat: 'Subscriptions', amt: -13.99, time: 'Yesterday' },
    { name: 'Uber', cat: 'Transport', amt: -18.4, time: 'Yesterday' },
    { name: 'Bondi Coffee', cat: 'Cafés', amt: -5.8, time: '2 days ago' },
  ];
  return (
    <div className="relative w-[360px] sm:w-[400px]">
      <div className="anim-float-y relative rounded-[28px] bg-gray-900/90 backdrop-blur-xl border border-white/10 p-5 shadow-2xl shadow-indigo-900/40">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 anim-pulse-soft" />
            <span>Up Bank · synced</span>
          </div>
          <span className="mono">9:41</span>
        </div>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-widest text-gray-500">Total balance</div>
          <div className="flex items-baseline gap-2 mt-1">
            <CountUp
              value={8429.42}
              className="mono text-4xl font-semibold text-white"
              prefix="$"
              decimals={2}
            />
            <span className="text-emerald-400 text-sm mono">+$214.06</span>
          </div>
        </div>

        <div className="mt-4 h-[120px] relative">
          <SparkChart />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { k: 'In', v: '+$3,120', c: 'text-emerald-400' },
            { k: 'Out', v: '-$1,847', c: 'text-red-400' },
            { k: 'Save', v: '$1,273', c: 'text-indigo-300' },
          ].map((s, i) => (
            <div
              key={s.k}
              className="anim-fade-up rounded-xl bg-white/5 border border-white/10 px-3 py-2"
              style={{ animationDelay: `${0.6 + i * 0.1}s` }}
            >
              <div className="text-[10px] uppercase text-gray-500 tracking-wider">{s.k}</div>
              <div className={`mono text-sm ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="uppercase tracking-widest">Recent</span>
            <span className="text-indigo-300">View all →</span>
          </div>
          <div className="flex flex-col gap-2">
            {txs.map((t, i) => (
              <div
                key={t.name}
                className="anim-fade-up flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5"
                style={{ animationDelay: `${0.7 + i * 0.12}s` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs text-white/90 font-semibold"
                    style={{
                      background:
                        t.amt > 0
                          ? 'linear-gradient(135deg,#10b981,#34d399)'
                          : 'linear-gradient(135deg,#6366f1,#7c3aed)',
                    }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-[13px] text-white">{t.name}</div>
                    <div className="text-[11px] text-gray-500">
                      {t.cat} · {t.time}
                    </div>
                  </div>
                </div>
                <div className={`mono text-sm ${t.amt > 0 ? 'text-emerald-400' : 'text-gray-200'}`}>
                  {t.amt > 0 ? '+' : ''}${Math.abs(t.amt).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="anim-tilt-a absolute -left-8 top-24 rounded-xl bg-gray-900/95 border border-emerald-400/40 px-3 py-2 shadow-xl">
        <div className="text-[10px] uppercase tracking-widest text-emerald-400">vs last month</div>
        <div className="mono text-sm text-white">+14.2%</div>
      </div>
      <div className="anim-tilt-b absolute -right-6 top-1/2 rounded-xl bg-gray-900/95 border border-indigo-400/40 px-3 py-2 shadow-xl">
        <div className="flex items-center gap-1.5 text-xs text-indigo-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 anim-pulse-soft" /> Up Bank synced
        </div>
      </div>
      <div className="anim-tilt-c absolute -right-10 -bottom-4 rounded-xl bg-gray-900/95 border border-violet-400/40 px-3 py-2 shadow-xl">
        <div className="text-[10px] uppercase tracking-widest text-violet-300">Saved this week</div>
        <div className="mono text-sm text-white">$312.40</div>
      </div>
    </div>
  );
}

// ─── Reveal wrapper ───────────────────────────────────────────────────────────

interface RevealProps {
  delay?: number;
  className?: string;
  children: ReactNode;
  as?: ElementType;
}

function Reveal({ delay = 0, className = '', children, as: As = 'div' }: RevealProps) {
  const [ref, seen] = useReveal();
  return (
    <As
      ref={ref}
      className={`reveal ${seen ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </As>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const strokeProps: IconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function DownloadIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...p}>
      <path d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14" />
    </svg>
  );
}
function CheckIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...p}>
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}
function SyncIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...p}>
      <path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M16 4v4h-4M8 20v-4h4" />
    </svg>
  );
}
function ChartIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...p}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
function RepeatIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...p}>
      <path d="M3 12a6 6 0 016-6h9l-3-3m3 3l-3 3M21 12a6 6 0 01-6 6H6l3 3m-3-3l3-3" />
    </svg>
  );
}
function BellIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...p}>
      <path d="M6 8a6 6 0 0112 0v5l2 3H4l2-3V8zM10 20a2 2 0 004 0" />
    </svg>
  );
}
function LockIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...p}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}
function DesktopIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...p}>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
function PhoneIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...p}>
      <rect x="7" y="2" width="10" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}
function AndroidIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...p}>
      <path d="M5 17h14v-5a7 7 0 00-14 0v5zM8 14v.01M16 14v.01M7 7l-1.5-2M17 7l1.5-2M5 17v3M19 17v3" />
    </svg>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

interface NavProps {
  onInstall: () => void;
  canInstall: boolean;
  installed: boolean;
}

function Nav({ onInstall, canInstall, installed }: NavProps) {
  return (
    <nav className="anim-fade fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-gray-950/70 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Logo />
        <div className="hidden md:flex items-center gap-7 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#analytics" className="hover:text-white transition">Analytics</a>
          <a href="#install" className="hover:text-white transition">Install</a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex text-sm text-gray-300 hover:text-white px-3 py-2"
          >
            Sign in
          </Link>
          <button
            onClick={onInstall}
            disabled={installed}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm text-white px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition cta-btn"
            title={canInstall ? 'Install app' : 'Open in Chrome / Edge to install'}
          >
            <DownloadIcon className="w-4 h-4" />
            {installed ? 'Installed' : 'Download'}
          </button>
          <Link
            to="/signup"
            className="grad-bg text-sm text-white px-3.5 py-2 rounded-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition cta-btn"
          >
            Get started →
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ onInstall, canInstall, installed }: NavProps) {
  return (
    <section className="relative min-h-screen pt-28 pb-20 overflow-hidden">
      <BackgroundFX />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="anim-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 anim-ping-soft" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            Built for Up Bank · Australia 🇦🇺
          </div>
          <h1
            className="anim-fade-up mt-5 text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-white leading-[1.02]"
            style={{ animationDelay: '0.1s' }}
          >
            Your money,
            <br />
            <span className="grad-text">finally</span> under control.
          </h1>
          <p
            className="anim-fade-up mt-6 text-lg text-gray-400 max-w-xl"
            style={{ animationDelay: '0.2s' }}
          >
            SupaSave syncs every transaction from your Up Bank in real time, tracks your
            subscriptions, and shows you exactly where the money goes — in a clean, fast,
            installable app.
          </p>
          <div
            className="anim-fade-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '0.3s' }}
          >
            <button
              onClick={onInstall}
              disabled={installed}
              className="cta-btn group grad-bg text-white px-5 py-3 rounded-xl font-medium shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/60 flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              {installed
                ? 'Installed ✓'
                : canInstall
                  ? 'Install app'
                  : 'Download for Mac / iOS / Android'}
            </button>
            <Link
              to="/signup"
              className="cta-btn px-5 py-3 rounded-xl border border-white/10 text-gray-200 hover:bg-white/5 transition flex items-center gap-2"
            >
              Sign up free <span aria-hidden>→</span>
            </Link>
          </div>
          <div
            className="anim-fade-up mt-8 flex flex-wrap items-center gap-5 text-xs text-gray-500"
            style={{ animationDelay: '0.5s' }}
          >
            <div className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> No card required
            </div>
            <div className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> End-to-end encrypted
            </div>
            <div className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> Works offline
            </div>
          </div>
        </div>
        <div
          className="flex justify-center lg:justify-end anim-fade"
          style={{ animationDelay: '0.2s' }}
        >
          <DashboardMock />
        </div>
      </div>
      <div className="anim-scroll-hint absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-500 text-xs flex flex-col items-center gap-1">
        Scroll
        <div className="w-px h-6 bg-gradient-to-b from-gray-500 to-transparent" />
      </div>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function Stats() {
  const items = [
    { v: 12400, suffix: '+', label: 'Transactions tracked' },
    { v: 24, suffix: '', label: 'Smart categories' },
    { v: 100, suffix: '%', label: 'Up Bank users' },
    { v: 0, suffix: '', label: 'Data breaches' },
  ];
  return (
    <section className="relative border-y border-white/5 bg-gray-950/60">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {items.map((it, i) => (
          <Reveal key={it.label} delay={i * 100}>
            <CountUp
              value={it.v}
              suffix={it.suffix}
              className="mono text-4xl sm:text-5xl text-white font-semibold"
            />
            <div className="text-xs uppercase tracking-widest text-gray-500 mt-2">{it.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  const features = [
    {
      Icon: SyncIcon,
      title: 'Auto-sync with Up Bank',
      desc: 'Transactions stream in the moment they hit your account. No CSVs, no clicking refresh.',
    },
    {
      Icon: ChartIcon,
      title: 'Spending analytics',
      desc: 'Beautiful charts that actually answer the question: where did my money go this month?',
    },
    {
      Icon: RepeatIcon,
      title: 'Subscription tracking',
      desc: 'Find every recurring charge, see what you forgot you were paying for, cancel with one tap.',
    },
    {
      Icon: BellIcon,
      title: 'Smart budget alerts',
      desc: "Set a category limit. Get a quiet nudge before you blow past it — never after.",
    },
    {
      Icon: LockIcon,
      title: 'Your data, your rules',
      desc: "End-to-end encrypted. Tokens stored per-user. We can't read your transactions, ever.",
    },
    {
      Icon: DownloadIcon,
      title: 'Installable app',
      desc: 'Add SupaSave to your home screen on iOS, Android, Mac and Windows. Works offline.',
    },
  ];
  return (
    <section id="features" className="relative py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-indigo-300">Features</div>
          <h2 className="mt-3 text-4xl sm:text-5xl font-semibold text-white tracking-tight">
            Everything you need.
            <br />
            <span className="text-gray-500">Nothing you don't.</span>
          </h2>
        </Reveal>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Reveal
              key={f.title}
              delay={(i % 3) * 80}
              className="feature-card relative rounded-2xl bg-gray-900/60 border border-white/5 p-6 overflow-hidden"
            >
              <div className="w-11 h-11 rounded-xl grad-bg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <f.Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────

interface BarRowProps {
  bar: BarData;
  delay: number;
}

function BarRow({ bar, delay }: BarRowProps) {
  const [ref, seen] = useReveal({ threshold: 0.3 });
  return (
    <div ref={ref}>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-gray-300">{bar.label}</span>
        <span className="mono text-gray-400">${bar.amt}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`bar-fill h-full rounded-full ${seen ? 'in' : ''}`}
          style={
            {
              background: `linear-gradient(90deg, ${bar.color}, ${bar.color}aa)`,
              '--w': `${bar.pct * 100}%`,
              transitionDelay: `${delay}ms`,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

function Analytics() {
  const tabs = [
    {
      k: 'categorise',
      label: 'Automatic categorisation',
      body: 'Every charge sorted into Groceries, Transport, Cafés, Subscriptions and more — adjustable, learnable, instant.',
    },
    {
      k: 'trends',
      label: 'Monthly trend charts',
      body: 'See six months of spending at a glance. Catch creeping costs before they become problems.',
    },
    {
      k: 'cashflow',
      label: 'Cash flow tracking',
      body: "Money in, money out, money saved. The simplest possible answer to 'am I doing okay?'",
    },
  ];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % tabs.length), 3500);
    return () => clearInterval(id);
  }, [tabs.length]);
  const bars: BarData[] = [
    { label: 'Groceries', amt: 612, pct: 0.92, color: '#6366f1' },
    { label: 'Transport', amt: 248, pct: 0.55, color: '#8b5cf6' },
    { label: 'Cafés', amt: 184, pct: 0.41, color: '#a78bfa' },
    { label: 'Subscriptions', amt: 142, pct: 0.34, color: '#c4b5fd' },
    { label: 'Eating out', amt: 96, pct: 0.22, color: '#34d399' },
    { label: 'Shopping', amt: 52, pct: 0.12, color: '#f87171' },
  ];
  return (
    <section id="analytics" className="relative py-28 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-14 items-center">
        <Reveal>
          <div className="text-xs uppercase tracking-widest text-indigo-300">Analytics</div>
          <h2 className="mt-3 text-4xl sm:text-5xl font-semibold text-white tracking-tight">
            Charts that
            <br />
            <span className="grad-text">actually</span> answer questions.
          </h2>
          <p className="mt-5 text-gray-400 max-w-md">
            SupaSave turns your raw Up Bank feed into clear, honest numbers — the kind that make you
            change behaviour, not just stare at them.
          </p>
          <div className="mt-8 flex flex-col gap-2">
            {tabs.map((t, i) => (
              <button
                key={t.k}
                onClick={() => setActive(i)}
                className={`relative text-left rounded-xl px-4 py-3 border transition overflow-hidden ${
                  active === i
                    ? 'bg-white/5 border-indigo-400/40'
                    : 'bg-transparent border-white/5 hover:border-white/10'
                }`}
              >
                {active === i && (
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(90deg, rgba(99,102,241,.12), transparent 60%)',
                    }}
                  />
                )}
                <div className="relative">
                  <div
                    className={`text-sm font-medium ${active === i ? 'text-white' : 'text-gray-300'}`}
                  >
                    {t.label}
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      active === i ? 'max-h-20 opacity-100 mt-1' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="text-sm text-gray-400">{t.body}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal
          delay={120}
          className="rounded-2xl bg-gray-900/70 border border-white/10 p-6 backdrop-blur-xl shadow-2xl shadow-indigo-900/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-gray-500">This month</div>
              <div className="mono text-3xl text-white mt-1">$1,334.00</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-gray-500">vs last</div>
              <div className="mono text-emerald-400">-12.4%</div>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-4">
            {bars.map((b, i) => (
              <BarRow key={b.label} bar={b} delay={i * 80} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Install ──────────────────────────────────────────────────────────────────

function Install({ onInstall, canInstall, installed }: NavProps) {
  const platforms: Platform[] = [
    {
      Icon: DesktopIcon,
      name: 'Chrome / Edge — Desktop',
      steps: [
        'Click the install ⤓ icon in the address bar',
        'Choose Install · SupaSave',
        'It opens like a native app',
      ],
    },
    {
      Icon: PhoneIcon,
      name: 'Safari — iOS',
      steps: [
        'Tap the Share icon at the bottom',
        "Scroll and tap 'Add to Home Screen'",
        'Tap Add — done',
      ],
    },
    {
      Icon: AndroidIcon,
      name: 'Chrome — Android',
      steps: [
        'Tap the ⋮ menu top-right',
        "Tap 'Install app'",
        'Open it from your home screen',
      ],
    },
  ];
  return (
    <section id="install" className="relative py-28 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 -z-0">
        <div
          className="anim-pulse-soft absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,.18), transparent 60%)' }}
        />
      </div>
      <div className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center">
        <Reveal className="relative inline-block">
          <div className="absolute inset-0 rounded-full grad-bg opacity-50 blur-xl anim-pulse-soft" />
          <div className="relative w-20 h-20 rounded-full grad-bg flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40">
            <DownloadIcon className="w-9 h-9" />
          </div>
        </Reveal>
        <Reveal delay={100}>
          <h2 className="mt-8 text-4xl sm:text-5xl font-semibold text-white tracking-tight">
            Add SupaSave to your <span className="grad-text">home screen</span>.
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <p className="mt-4 text-gray-400 max-w-xl mx-auto">
            One tap to install. No app store, no waiting, no 200MB download. SupaSave lives on your
            device and works offline.
          </p>
        </Reveal>
        <Reveal delay={300} className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={onInstall}
            disabled={installed}
            className="cta-btn grad-bg text-white px-6 py-3.5 rounded-xl font-medium shadow-xl shadow-indigo-500/40 hover:shadow-indigo-500/70 flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            {installed ? 'Installed ✓' : canInstall ? 'Install SupaSave now' : 'Download the app'}
          </button>
          <Link
            to="/"
            className="cta-btn px-6 py-3.5 rounded-xl border border-white/10 text-gray-200 hover:bg-white/5 transition"
          >
            Open in browser instead
          </Link>
        </Reveal>
        {!canInstall && !installed && (
          <div className="mt-3 text-xs text-gray-500">
            Tip: open this page in Chrome or Edge to enable one-click install.
          </div>
        )}
        <div className="mt-14 grid md:grid-cols-3 gap-4 text-left">
          {platforms.map((p, i) => (
            <Reveal
              key={p.name}
              delay={i * 80}
              className="rounded-2xl bg-gray-900/60 border border-white/10 p-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-indigo-300">
                  <p.Icon className="w-5 h-5" />
                </div>
                <div className="text-sm text-white font-medium">{p.name}</div>
              </div>
              <ol className="mt-4 flex flex-col gap-2.5 text-sm text-gray-400">
                {p.steps.map((s, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mono text-indigo-300 w-5 shrink-0">{j + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA({ onInstall, canInstall, installed }: NavProps) {
  return (
    <section className="relative py-24">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <Reveal className="grad-border rounded-3xl p-10 sm:p-14 text-center glow-violet relative overflow-hidden">
          <div
            className="anim-pulse-soft absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,.25), transparent 60%)' }}
          />
          <div className="relative">
            <div className="flex justify-center gap-1 text-amber-300">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="anim-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                  ★
                </span>
              ))}
            </div>
            <h2 className="mt-5 text-4xl sm:text-5xl font-semibold text-white tracking-tight">
              Stop guessing. Start saving.
            </h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto">
              Connect your Up Bank in 30 seconds. Install the app. Watch your money make sense again.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                onClick={onInstall}
                disabled={installed}
                className="cta-btn grad-bg text-white px-6 py-3.5 rounded-xl font-medium shadow-xl shadow-indigo-500/40 flex items-center gap-2"
              >
                <DownloadIcon className="w-4 h-4" />
                {installed ? 'Installed ✓' : canInstall ? 'Install app' : 'Download SupaSave'}
              </button>
              <Link
                to="/signup"
                className="cta-btn px-6 py-3.5 rounded-xl border border-white/10 text-gray-200 hover:bg-white/5 transition"
              >
                Create free account
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <Logo />
          <div className="text-xs text-gray-500 mt-3">Built for Up Bank users 🇦🇺</div>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <Link to="/login" className="hover:text-white transition">Sign in</Link>
          <Link to="/signup" className="hover:text-white transition">Sign up</Link>
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#install" className="hover:text-white transition">Install</a>
        </div>
        <div className="text-xs text-gray-600 mono">© 2026 SupaSave</div>
      </div>
    </footer>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export function Landing() {
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (window.matchMedia?.('(display-mode: standalone)').matches) setInstalled(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (installEvt) {
      installEvt.prompt();
      const { outcome } = await installEvt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setInstallEvt(null);
    } else {
      const el = document.getElementById('install');
      if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
    }
  }, [installEvt]);

  const canInstall = !!installEvt;

  return (
    <div className="landing-root relative min-h-screen bg-[#030712]">
      <Nav onInstall={handleInstall} canInstall={canInstall} installed={installed} />
      <Hero onInstall={handleInstall} canInstall={canInstall} installed={installed} />
      <Stats />
      <Features />
      <Analytics />
      <Install onInstall={handleInstall} canInstall={canInstall} installed={installed} />
      <FinalCTA onInstall={handleInstall} canInstall={canInstall} installed={installed} />
      <Footer />
    </div>
  );
}
