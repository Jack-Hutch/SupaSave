import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './hooks/useAuth';

/*
  Route-level code splitting.
  ───────────────────────────
  Each page is loaded on demand instead of bundled into one upfront chunk.
  This matters because Analytics / Dashboard / CashFlow pull in Recharts and
  every page pulls in Framer Motion — previously all of it shipped in a single
  ~1.1 MB bundle that had to download and parse before the first paint. Now the
  app shell loads fast and each route's code arrives when you navigate to it.
*/
const Dashboard    = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Transactions = lazy(() => import('./pages/Transactions').then((m) => ({ default: m.Transactions })));
const CashFlow     = lazy(() => import('./pages/CashFlow').then((m) => ({ default: m.CashFlow })));
const Analytics    = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const Settings     = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const ConnectBank  = lazy(() => import('./pages/ConnectBank').then((m) => ({ default: m.ConnectBank })));
const Subscriptions = lazy(() => import('./pages/Subscriptions').then((m) => ({ default: m.Subscriptions })));
const Work         = lazy(() => import('./pages/Work').then((m) => ({ default: m.Work })));
const Login        = lazy(() => import('./pages/auth/Login').then((m) => ({ default: m.Login })));
const Signup       = lazy(() => import('./pages/auth/Signup').then((m) => ({ default: m.Signup })));
const Landing      = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));
const NotFound     = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

/** Lightweight fallback shown while a route chunk loads. */
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary scope="app">
      <ToastProvider />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public landing page */}
              <Route path="/landing" element={<Landing />} />

              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected app routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="subscriptions" element={<Subscriptions />} />
                <Route path="cashflow" element={<CashFlow />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="settings" element={<Settings />} />
                <Route path="work" element={<Work />} />
                <Route path="connect" element={<ConnectBank />} />
              </Route>

              {/* Legacy redirects */}
              <Route path="/connect-bank" element={<Navigate to="/connect" replace />} />
              <Route path="/auth/login" element={<Navigate to="/login" replace />} />
              <Route path="/auth/signup" element={<Navigate to="/signup" replace />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
