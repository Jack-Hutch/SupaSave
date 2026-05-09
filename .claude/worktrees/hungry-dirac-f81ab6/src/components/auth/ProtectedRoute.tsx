import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Sparkles } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (!isConfigured) {
    // Supabase not configured — show setup instructions
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">SupaSave</h1>
          <p className="text-gray-400 mb-6">Supabase is not configured yet.</p>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-left space-y-3">
            <p className="text-sm font-semibold text-gray-200">Setup Instructions:</p>
            <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
              <li>
                Create a project at{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  supabase.com
                </a>
              </li>
              <li>
                Copy <code className="text-xs bg-gray-800 px-1 rounded">.env.example</code> to{' '}
                <code className="text-xs bg-gray-800 px-1 rounded">.env</code>
              </li>
              <li>Set your Supabase URL and anon key</li>
              <li>
                Run the SQL migration from{' '}
                <code className="text-xs bg-gray-800 px-1 rounded">
                  supabase/migrations/001_initial_schema.sql
                </code>
              </li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0ms]" />
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
