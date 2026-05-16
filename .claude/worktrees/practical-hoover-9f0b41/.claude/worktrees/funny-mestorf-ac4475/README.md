# SupaSave

A production-ready personal finance web app built with React, TypeScript, Supabase, and Tailwind CSS.

## Features

- **Dashboard** – Income/expense summary, spending donut chart, recent transactions, budget progress
- **Transactions** – Full transaction history with search, filters, add/edit/delete
- **Cash Flow** – P&L view with date range selector and trend charts
- **Analytics** – Spending by category, merchant stats, monthly comparisons, subscription tracking
- **Connect Bank** – Up Bank integration via Personal Access Token (stored in-memory only)
- **Settings** – Theme, budget by category, notifications, data management
- **Auth** – Email/password via Supabase Auth with Row Level Security

## Tech Stack

- React 18 + TypeScript + Vite
- Zustand (state management)
- React Router v6
- Framer Motion (animations)
- Recharts (charts)
- date-fns
- Tailwind CSS
- Lucide React (icons)
- Supabase (Auth + Postgres + RLS)
- Vitest (unit tests)

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd supasave
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration file:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Enable **Email Auth** in Authentication > Providers

### 4. Run Development Server

```bash
npm run dev
```

### 5. Run Tests

```bash
npm test
```

### 6. Build for Production

```bash
npm run build
```

## Security Notes

### Up Bank Personal Access Token

- **NEVER** hardcode your Up Bank PAT in code or environment files for production
- The `VITE_UP_API_TOKEN` env var is a **development-only** fallback
- In production, users enter their PAT in the UI — it is stored **in-memory only** and cleared on page refresh
- The token is never written to localStorage, sessionStorage, or any database
- Row Level Security (RLS) ensures users can only access their own data

### Supabase RLS

All database tables have Row Level Security enabled with policies that restrict access to the authenticated user's own rows. Never disable RLS in production.

### Environment Variables

- Never commit `.env` files
- Use `.env.example` as a template
- Rotate credentials if accidentally exposed

## Project Structure

```
src/
├── components/
│   ├── auth/          # Auth guards
│   ├── charts/        # Recharts wrappers
│   ├── dashboard/     # Dashboard widgets
│   ├── layout/        # AppShell, Sidebar, BottomNav
│   ├── subscriptions/ # Subscription cards/forms
│   ├── transactions/  # Transaction list/forms
│   └── ui/            # Reusable UI primitives
├── hooks/             # Custom React hooks
├── lib/               # Supabase client, utilities
├── pages/             # Route-level page components
├── providers/         # Bank provider implementations
├── services/          # API/data services
├── store/             # Zustand store
├── tests/             # Unit tests
├── types/             # TypeScript types
└── utils/             # Pure utility functions
supabase/
└── migrations/        # SQL migrations
```

## Up Bank Integration

SupaSave supports Up Bank via their [Personal Access Token API](https://developer.up.com.au/).

1. Go to **Connect Bank** in the app
2. Select **Up Bank**
3. Generate a PAT at [api.up.com.au](https://api.up.com.au/)
4. Paste it in the secure input field
5. Select accounts to sync
6. Click **Sync Transactions**

The token is stored only in memory for the session duration and is never persisted.

## License

MIT
