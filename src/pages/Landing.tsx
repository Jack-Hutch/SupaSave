import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import {
  Zap, BarChart3, CreditCard, Bell, Shield, Smartphone,
  ArrowRight, Download, ChevronDown, TrendingUp, TrendingDown,
  Wallet, RefreshCw, Check, Star,
} from 'lucide-react';

// ─── PWA Install hook ────────────────────────────────────────────────────────
function useInstallPrompt() {
  const [prompt, setPrompt] = useState<Event & { prompt: () => Promise<void> } | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    setPrompt(null);
  };

  return { canInstall: !!prompt, install, installed };
}

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, to]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── Floating orb ────────────────────────────────────────────────────────────
function Orb({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x, top: y, width: size, height: size, background: color, filter: 'blur(80px)', opacity: 0.18 }}
      animate={{ x: [0, 30, -20, 0], y: [0, -25, 20, 0], scale: [1, 1.1, 0.95, 1] }}
      transition={{ duration: 12 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

// ─── Animated transaction row ────────────────────────────────────────────────
function TxRow({ icon, name, category, amount, type, delay }: {
  icon: string; name: string; category: string; amount: string; type: 'income' | 'expense'; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-base shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-200 truncate">{name}</p>
        <p className="text-[10px] text-gray-500">{category}</p>
      </div>
      <span className={`text-xs font-semibold font-mono ${type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
        {type === 'income' ? '+' : '-'}{amount}
      </span>
    </motion.div>
  );
}

// ─── Feature card ────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, gradient, delay }: {
  icon: React.FC<{ className?: string }>; title: string; desc: string; gradient: string; delay: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.32, 0.72, 0, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="relative rounded-2xl border border-white/8 bg-white/3 p-5 overflow-hidden cursor-default group"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
      <div className="relative z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/20 mb-4">
          <Icon className="h-5 w-5 text-indigo-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-100 mb-1.5">{title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

// ─── App mockup ──────────────────────────────────────────────────────────────
function AppMockup() {
  const transactions = [
    { icon: '🛒', name: 'Woolworths', category: 'Groceries', amount: '$64.20', type: 'expense' as const },
    { icon: '☕', name: 'Seven Seeds', category: 'Dining', amount: '$6.50', type: 'expense' as const },
    { icon: '💼', name: 'Salary', category: 'Income', amount: '$2,450.00', type: 'income' as const },
    { icon: '🎵', name: 'Spotify', category: 'Entertainment', amount: '$11.99', type: 'expense' as const },
    { icon: '⛽', name: 'BP Fuel', category: 'Transport', amount: '$89.40', type: 'expense' as const },
  ];

  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      className="relative w-[320px] shrink-0"
    >
      {/* Glow behind mockup */}
      <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-3xl scale-110" />

      {/* Phone frame */}
      <div className="relative rounded-3xl border border-white/12 bg-gray-950/95 overflow-hidden shadow-2xl shadow-black/60 backdrop-blur-sm">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-[10px] text-gray-500 font-mono">9:41</span>
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-1 rounded-full bg-gray-400 ${i === 3 ? 'h-3' : i === 2 ? 'h-2.5' : i === 1 ? 'h-2' : 'h-1.5'}`} />
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div>
            <p className="text-[10px] text-gray-500">Total Balance</p>
            <motion.p
              className="text-xl font-bold font-mono text-gray-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              $12,483.50
            </motion.p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30">
            <Zap className="h-4 w-4 text-indigo-400" />
          </div>
        </div>

        {/* Mini chart */}
        <div className="px-4 py-3">
          <svg viewBox="0 0 280 50" className="w-full">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d="M0,40 C30,35 60,20 90,25 C120,30 150,10 180,15 C210,20 240,5 280,8 L280,50 L0,50 Z"
              fill="url(#chartGrad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            />
            <motion.path
              d="M0,40 C30,35 60,20 90,25 C120,30 150,10 180,15 C210,20 240,5 280,8"
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
            />
          </svg>
        </div>

        {/* Transactions */}
        <div className="px-4 pb-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent</p>
          {transactions.map((tx, i) => (
            <TxRow key={tx.name} {...tx} delay={0.8 + i * 0.1} />
          ))}
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        className="absolute -right-10 top-16 rounded-2xl border border-emerald-500/20 bg-gray-950/90 px-3 py-2 backdrop-blur shadow-xl"
        animate={{ x: [0, 6, 0], rotate: [0, 1, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">+14.2%</span>
        </div>
        <p className="text-[9px] text-gray-500 mt-0.5">vs last month</p>
      </motion.div>

      <motion.div
        className="absolute -left-10 bottom-20 rounded-2xl border border-indigo-500/20 bg-gray-950/90 px-3 py-2 backdrop-blur shadow-xl"
        animate={{ x: [0, -6, 0], rotate: [0, -1, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-[10px] text-gray-300">Up Bank synced</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Particle field ───────────────────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 6,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-indigo-400"
          style={{ left: p.x, top: p.y, width: p.size, height: p.size, opacity: 0.25 }}
          animate={{ opacity: [0.1, 0.4, 0.1], y: [0, -30, 0], scale: [1, 1.5, 1] }}
          transition={{ duration: p.duration, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
        />
      ))}
    </div>
  );
}

// ─── Main landing page ───────────────────────────────────────────────────────
export function Landing() {
  const { canInstall, install, installed } = useInstallPrompt();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  const [activeFeature, setActiveFeature] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActiveFeature((f) => (f + 1) % 3), 3000);
    return () => clearInterval(t);
  }, []);

  const features = [
    { icon: Zap, title: 'Auto-sync with Up Bank', desc: 'Transactions pull in automatically. No manual entry, ever.', gradient: 'bg-gradient-to-br from-indigo-500/5 to-transparent' },
    { icon: BarChart3, title: 'Spending analytics', desc: 'Category breakdowns, trends, and cash flow at a glance.', gradient: 'bg-gradient-to-br from-violet-500/5 to-transparent' },
    { icon: CreditCard, title: 'Subscription tracking', desc: 'Never forget a recurring charge. See what renews next.', gradient: 'bg-gradient-to-br from-blue-500/5 to-transparent' },
    { icon: Bell, title: 'Budget alerts', desc: 'Set limits per category and get warned before you overspend.', gradient: 'bg-gradient-to-br from-pink-500/5 to-transparent' },
    { icon: Shield, title: 'Your data, your rules', desc: 'Token stored locally per account. Nothing shared externally.', gradient: 'bg-gradient-to-br from-emerald-500/5 to-transparent' },
    { icon: Smartphone, title: 'Installable app', desc: 'Add to home screen on any device — works offline too.', gradient: 'bg-gradient-to-br from-amber-500/5 to-transparent' },
  ];

  const stats = [
    { label: 'Transactions tracked', value: 12400, suffix: '+' },
    { label: 'Categories', value: 24, suffix: '' },
    { label: 'Up Bank users', value: 100, suffix: '%', prefix: '' },
    { label: 'Data breaches', value: 0, suffix: '' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="font-semibold text-gray-100">Supa<span className="text-emerald-400">Save</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">Sign in</Link>
          <Link
            to="/signup"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20">
        {/* Background */}
        <div className="absolute inset-0">
          <Orb x="10%" y="20%" size={500} color="radial-gradient(circle, #6366f1, transparent)" delay={0} />
          <Orb x="60%" y="60%" size={400} color="radial-gradient(circle, #7c3aed, transparent)" delay={3} />
          <Orb x="80%" y="10%" size={300} color="radial-gradient(circle, #4f46e5, transparent)" delay={6} />
          <Particles />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 py-20"
        >
          {/* Left */}
          <div className="flex-1 max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-300 mb-6"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Built for Up Bank Australia
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
            >
              Your money,{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                finally
              </span>
              <br />under control.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-lg text-gray-400 leading-relaxed mb-8"
            >
              SupaSave connects to your Up Bank account and gives you instant spending insights, subscription tracking, and budget alerts — all in one clean dashboard.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                to="/signup"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5"
              >
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>

              {canInstall && !installed ? (
                <motion.button
                  onClick={install}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 hover:bg-white/8 px-6 py-3 text-sm font-medium text-gray-300 backdrop-blur transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Install app
                </motion.button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 hover:bg-white/8 px-6 py-3 text-sm font-medium text-gray-300 backdrop-blur transition-colors"
                >
                  Sign in
                </Link>
              )}
            </motion.div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center gap-4 mt-8"
            >
              {['Free forever', 'No card required', 'Up Bank only'].map((s) => (
                <div key={s} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  {s}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — app mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="flex-1 flex justify-center"
          >
            <AppMockup />
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-5 w-5 text-gray-600" />
        </motion.div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section className="relative py-10 border-y border-white/5 bg-white/2">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold font-mono text-gray-100">
                <Counter to={s.value} suffix={s.suffix} prefix={s.prefix} />
              </p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <Orb x="70%" y="30%" size={400} color="radial-gradient(circle, #7c3aed, transparent)" delay={2} />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3"
            >
              Everything you need
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl lg:text-4xl font-bold text-gray-100"
            >
              Powerful finance tools,<br />zero complexity.
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 0.08} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Animated showcase ────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3"
              >
                Real-time insights
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold text-gray-100 mb-5"
              >
                See where your money actually goes.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-gray-400 leading-relaxed mb-8"
              >
                Every Up Bank transaction is automatically categorised and visualised. Spot patterns, track trends, and budget smarter — without lifting a finger.
              </motion.p>

              {/* Animated feature tabs */}
              <div className="space-y-2">
                {['Automatic categorisation', 'Monthly trend charts', 'Cash flow tracking'].map((item, i) => (
                  <motion.button
                    key={item}
                    onClick={() => setActiveFeature(i)}
                    whileHover={{ x: 4 }}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all ${activeFeature === i ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    <div className={`h-2 w-2 rounded-full transition-colors ${activeFeature === i ? 'bg-indigo-400' : 'bg-gray-700'}`} />
                    {item}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Animated chart mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
              className="rounded-2xl border border-white/8 bg-gray-900/50 p-5 backdrop-blur"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-200">Spending by category</p>
                <span className="text-xs text-gray-500">May 2026</span>
              </div>

              {/* Bar chart */}
              <div className="space-y-3">
                {[
                  { label: 'Groceries', pct: 82, amount: '$480', color: 'bg-indigo-500' },
                  { label: 'Dining', pct: 55, amount: '$320', color: 'bg-violet-500' },
                  { label: 'Transport', pct: 38, amount: '$218', color: 'bg-blue-500' },
                  { label: 'Entertainment', pct: 24, amount: '$140', color: 'bg-pink-500' },
                  { label: 'Utilities', pct: 18, amount: '$105', color: 'bg-amber-500' },
                ].map((bar, i) => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{bar.label}</span>
                      <span className="text-gray-500 font-mono">{bar.amount}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${bar.color}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${bar.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: [0.32, 0.72, 0, 1] }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary row */}
              <div className="mt-5 pt-4 border-t border-white/5 flex justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-gray-400">Total spent</span>
                </div>
                <span className="text-sm font-bold font-mono text-gray-100">$1,263</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Install CTA ───────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5 relative overflow-hidden">
        <Orb x="20%" y="50%" size={500} color="radial-gradient(circle, #6366f1, transparent)" delay={1} />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
            className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/30 mb-6 mx-auto"
          >
            <Download className="h-7 w-7 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold text-gray-100 mb-4"
          >
            Add to your home screen
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 mb-8"
          >
            SupaSave is a Progressive Web App — install it directly from your browser. No App Store, no updates needed, works offline.
          </motion.p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            {canInstall && !installed ? (
              <motion.button
                onClick={install}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30"
              >
                <Download className="h-4 w-4" />
                Install SupaSave
              </motion.button>
            ) : installed ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-8 py-3.5 text-sm font-semibold text-emerald-400">
                <Check className="h-4 w-4" />
                Installed!
              </div>
            ) : (
              <Link
                to="/signup"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow"
              >
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Platform instructions */}
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {[
              { platform: '🌐 Chrome / Edge (Desktop)', steps: ['Open site in Chrome', 'Click ⬇ in address bar', 'Select "Install"'] },
              { platform: '📱 Safari (iOS)', steps: ['Open site in Safari', 'Tap Share button', 'Tap "Add to Home Screen"'] },
            ].map((p) => (
              <motion.div
                key={p.platform}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-xl border border-white/8 bg-white/3 p-4"
              >
                <p className="text-sm font-medium text-gray-300 mb-2">{p.platform}</p>
                <ol className="space-y-1">
                  {p.steps.map((s, i) => (
                    <li key={s} className="flex items-start gap-2 text-xs text-gray-500">
                      <span className="text-indigo-500 font-mono font-bold shrink-0">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/8 to-violet-600/8 p-12"
          >
            <div className="flex justify-center mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <h2 className="text-3xl font-bold text-gray-100 mb-4 mt-4">Ready to take control?</h2>
            <p className="text-gray-400 mb-8">Join Up Bank users who finally know where their money goes.</p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all"
            >
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <span className="text-xs font-bold text-white">S</span>
            </div>
            <span className="text-sm text-gray-500">Supa<span className="text-emerald-400">Save</span></span>
            <span className="text-gray-700 text-xs ml-2">Built for Up Bank users 🇦🇺</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <Link to="/login" className="hover:text-gray-400 transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-gray-400 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
