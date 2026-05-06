import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, Link2Off, CheckCircle, RefreshCw,
  Eye, EyeOff, ArrowLeft, AlertTriangle, Database, Zap,
} from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { validateUpToken } from '../lib/upTokenSession';
import { formatCurrency } from '../lib/utils';
import type { BankProvider } from '../types';

// ─── Env token detection ──────────────────────────────────────────────────────
// If VITE_UP_API_TOKEN is set and valid we can skip the manual entry form
// entirely — the Up provider reads it automatically via getUpToken().
// Only skip the form in local dev — in production every user enters their own token.
const ENV_UP_TOKEN_READY =
  import.meta.env.DEV &&
  !!import.meta.env.VITE_UP_API_TOKEN &&
  validateUpToken(import.meta.env.VITE_UP_API_TOKEN);

// ─── Types ────────────────────────────────────────────────────────────────────

type ConfigureTarget = 'up' | null;

// ─── Main component ───────────────────────────────────────────────────────────

export function ConnectBank() {
  const bankConnection       = useFinanceStore((s) => s.bankConnection);
  const accounts             = useFinanceStore((s) => s.accounts);
  const syncing              = useFinanceStore((s) => s.syncing);
  const connectBank          = useFinanceStore((s) => s.connectBank);
  const disconnectBank       = useFinanceStore((s) => s.disconnectBank);
  const syncBankTransactions = useFinanceStore((s) => s.syncBankTransactions);
  const settings             = useFinanceStore((s) => s.settings);
  const { success, error: toastError } = useToast();

  const [configuring, setConfiguring]   = useState<ConfigureTarget>(null);
  const [upToken, setUpToken]           = useState('');
  const [showToken, setShowToken]       = useState(false);
  const [connecting, setConnecting]     = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [disconnectOpen, setDiscoOpen]  = useState(false);

  const currency = settings.currency || 'AUD';

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleConnect = async (provider: BankProvider) => {
    setConnecting(true);
    setConnectError(null);
    try {
      // For Up Bank: prefer manually entered token, then fall back to the
      // env token (dev only). Always pass explicitly so the provider doesn't
      // rely on getUpToken() which blocks env reads in production builds.
      const opts: Record<string, unknown> = {};
      if (provider === 'up') {
        const tok = upToken.trim() || import.meta.env.VITE_UP_API_TOKEN || '';
        if (tok) opts.upPersonalAccessToken = tok;
      }
      await connectBank(provider, opts);
      setConfiguring(null);
      setUpToken('');
      success(provider === 'mock' ? 'Demo data loaded!' : 'Up Bank connected!');
      // Auto-sync transactions immediately after connecting — don't make the
      // user press Sync manually. Errors here are non-fatal (connection succeeded).
      try {
        await syncBankTransactions();
      } catch {
        // swallow — the bank is connected; sync can be retried with the Sync button
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setConnectError(msg);
      toastError(msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectBank();
      setConfiguring(null);
      setUpToken('');
      setConnectError(null);
      success('Disconnected');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setDiscoOpen(false);
    }
  };

  // ── Connected view ─────────────────────────────────────────────────────────

  if (bankConnection) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-5 lg:px-6 space-y-5">

        {/* Status */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/25 shrink-0">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-emerald-300">
              {bankConnection.provider === 'mock' ? 'Demo data' : 'Up Bank'} connected
            </p>
            {bankConnection.last_sync_at && (
              <p className="text-xs text-foreground-subtle mt-0.5">
                Last sync: {new Date(bankConnection.last_sync_at).toLocaleString()}
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={syncBankTransactions} loading={syncing}>
            <RefreshCw className="h-3.5 w-3.5" />
            Sync
          </Button>
        </motion.div>

        {/* Accounts */}
        {accounts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              Accounts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {accounts.map((acc, i) => (
                <motion.div
                  key={acc.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border-base bg-surface p-4"
                >
                  <p className="text-sm font-medium text-foreground truncate">{acc.display_name}</p>
                  <p className="font-mono text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(acc.balance, acc.currency || currency)}
                  </p>
                  <p className="text-xs text-foreground-subtle mt-0.5">{acc.currency}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Disconnect */}
        <div className="flex items-center justify-between rounded-xl border border-red-900/30 bg-red-500/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Disconnect</p>
            <p className="text-xs text-foreground-subtle mt-0.5">
              Removes the connection and clears synced accounts
            </p>
          </div>
          <Button size="sm" variant="destructive" onClick={() => setDiscoOpen(true)}>
            <Link2Off className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>

        <ConfirmDialog
          isOpen={disconnectOpen}
          onClose={() => setDiscoOpen(false)}
          onConfirm={handleDisconnect}
          title="Disconnect?"
          message="Removes the bank connection and clears synced accounts. Manually added transactions stay."
          confirmLabel="Disconnect"
          variant="destructive"
        />
      </div>
    );
  }

  // ── Not connected view ─────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:px-6 space-y-4">

      <AnimatePresence mode="wait" initial={false}>

        {/* ── Option picker ── */}
        {!configuring && (
          <motion.div
            key="pick"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="space-y-3"
          >
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">Connect a data source</h2>
              <p className="text-sm text-foreground-subtle mt-1">
                Pick Up Bank to pull in real transactions, or load demo data to have a look around.
              </p>
            </div>

            {/* Up Bank */}
            {ENV_UP_TOKEN_READY ? (
              /*
                Env token is configured — skip the form entirely.
                One click connects using the token from .env automatically.
              */
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleConnect('up')}
                disabled={connecting}
                className="w-full flex items-center gap-4 rounded-2xl border border-border-base bg-surface hover:border-orange-500/40 hover:bg-surface-raised p-4 text-left transition-colors disabled:opacity-50"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400 shrink-0">
                  {connecting ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Up Bank</p>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {connecting ? 'Connecting…' : 'Personal Access Token configured in .env'}
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-400 border border-emerald-500/20 shrink-0">
                  Ready
                </span>
              </motion.button>
            ) : (
              /*
                No env token — show the manual entry form option.
              */
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => { setConnectError(null); setConfiguring('up'); }}
                className="w-full flex items-center gap-4 rounded-2xl border border-border-base bg-surface hover:border-accent/40 hover:bg-surface-raised p-4 text-left transition-colors"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400 shrink-0">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Up Bank</p>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    Paste your Personal Access Token — transactions sync automatically
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/12 text-accent border border-accent/20 shrink-0">
                  Connect
                </span>
              </motion.button>
            )}

            {/* Demo data */}
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleConnect('mock')}
              disabled={connecting}
              className="w-full flex items-center gap-4 rounded-2xl border border-border-base bg-surface hover:border-accent/40 hover:bg-surface-raised p-4 text-left transition-colors disabled:opacity-50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent shrink-0">
                <Database className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Demo data</p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Load a set of sample transactions to explore the app
                </p>
              </div>
              {connecting && (
                <RefreshCw className="h-4 w-4 text-foreground-subtle animate-spin shrink-0" />
              )}
            </motion.button>
          </motion.div>
        )}

        {/* ── Manual Up Bank token form (only shown when no env token) ── */}
        {configuring === 'up' && (
          <motion.div
            key="up-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="space-y-4"
          >
            <button
              onClick={() => { setConfiguring(null); setConnectError(null); }}
              className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <div>
              <h2 className="text-lg font-semibold text-foreground">Up Bank</h2>
              <p className="text-sm text-foreground-subtle mt-1">
                Get your token from the Up app: <span className="text-foreground">Settings → Personal Access Token</span>.
                It starts with <code className="text-xs bg-surface-raised px-1 py-0.5 rounded">up:yeah:</code>
              </p>
            </div>

            <Card>
              <div className="space-y-4">
                <Input
                  label="Personal Access Token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="up:yeah:••••••••••••"
                  value={upToken}
                  onChange={(e) => { setUpToken(e.target.value); setConnectError(null); }}
                  leftIcon={<Link2 className="h-4 w-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="text-foreground-subtle hover:text-foreground transition-colors"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                {connectError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{connectError}</p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => handleConnect('up')}
                  disabled={!upToken.trim() || connecting}
                  loading={connecting}
                >
                  <Link2 className="h-4 w-4" />
                  {connecting ? 'Connecting…' : 'Connect'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
