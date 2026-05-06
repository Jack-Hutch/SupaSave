import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { CashFlow } from './pages/CashFlow';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { ConnectBank } from './pages/ConnectBank';
import { Subscriptions } from './pages/Subscriptions';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { NotFound } from './pages/NotFound';
import { Landing } from './pages/Landing';

export function App() {
  return (
    <>
      <ToastProvider />
      <BrowserRouter>
        <AnimatePresence mode="wait">
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
              <Route path="connect" element={<ConnectBank />} />
            </Route>

            {/* Legacy redirects */}
            <Route path="/connect-bank" element={<Navigate to="/connect" replace />} />
            <Route path="/auth/login" element={<Navigate to="/login" replace />} />
            <Route path="/auth/signup" element={<Navigate to="/signup" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </>
  );
}
