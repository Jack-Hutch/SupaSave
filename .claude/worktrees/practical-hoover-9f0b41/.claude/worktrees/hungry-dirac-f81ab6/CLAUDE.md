# SupaSave — Claude Code Context

Personal finance app. React 18 + TypeScript + Zustand + Framer Motion + Supabase + Up Bank API.
Dev path: `/Users/jackhutchings/Desktop/Projets/SupaSave`
Deployment: Vercel (production)
CI/CD: GitHub (pushes to main trigger Vercel deploys)

---

## Project Structure

```
src/
├── pages/           — Route-level pages (Dashboard, Transactions, Subscriptions, Analytics, Settings, ConnectBank)
├── components/
│   ├── transactions/ — TransactionItem, TransactionList, TransactionSheet, CategoryPickerPopover, CategoryManager
│   ├── subscriptions/ — SubscriptionSheet, SubscriptionCard, SubscriptionList
│   ├── charts/       — DonutChart, BarChart, AreaChart (all Recharts)
│   ├── dashboard/    — SummaryCard, BudgetCard
│   └── ui/           — Button, Card, Input, Select, Modal, Toast, Badge, ConfirmDialog, EmptyState
├── store/
│   └── financeStore.ts   — Zustand store; single source of truth for all state
├── providers/
│   ├── upProvider.ts     — Up Bank API integration
│   └── mockProvider.ts   — Demo data provider
├── services/
│   └── financeService.ts — Supabase CRUD layer
├── lib/
│   ├── categories.ts     — Category definitions, COLOR_CLASSES, COLOR_HEX, helpers
│   ├── utils.ts          — formatCurrency, formatRelativeDate, etc.
│   ├── motion.ts         — Shared animation constants (SHARED_ID, sharedTransition, TAB_SPRING)
│   ├── theme.ts          — Theme variants
│   └── upTokenSession.ts — In-memory Up Bank token; reads VITE_UP_API_TOKEN in dev
└── utils/
    ├── subscriptionUtils.ts — Tag helpers, renewal candidates, billing calculations, advanceByOneCycle
    ├── analyticsUtils.ts    — Dashboard stats, category totals, chart series
    └── dateUtils.ts         — Date helpers
```

---

## TypeScript Standards

- All new code must be type-clean — no `any`, no implicit `any`
- Run `npx tsc --noEmit` after multi-file changes before considering work complete
- Prefer explicit return types on all exported functions
- Use `as const` on tuple types (e.g. `ease: [0.32, 0.72, 0, 1] as const`)
- Supabase errors are `PostgrestError`, NOT `instanceof Error` — extract messages with:
  ```ts
  (err as { message?: string })?.message || 'Fallback message'
  ```
- Never use `err instanceof Error` to check Supabase errors — it will always be false

---

## Key Patterns

### State management
- Zustand store in `financeStore.ts` — always use selectors (`useFinanceStore((s) => s.field)`)
- Optimistic updates: apply locally first, persist to Supabase, rollback on error
- `updateTransaction(id, updates, { silent: true })` — keeps optimistic update even if Supabase fails (used for category changes)
- Fire-and-forget pattern for non-critical Supabase persists (bank connection, sync)

### Animation
- All page transitions use Framer Motion
- Height animations: use tween `[0.32, 0.72, 0, 1]` not spring — springs overshoot on `height: 0`
- `AnimatePresence mode="popLayout"` for lists — prevents "all items collapse simultaneously" flash
- Shared element animations: use `layoutId` from `lib/motion.ts` constants (SHARED_ID)
- Exit animations should only animate `opacity` for list items — `height: 0` causes flashes
- Never put `layout` prop on list row children unless they genuinely need it — it cascades spring to all siblings

### Popovers
- Always use `createPortal(content, document.body)` for popovers/dropdowns
- Anchor position via `getBoundingClientRect()` + viewport boundary check
- Close on: outside click (overlay div), Escape key, item selection
- Z-index: overlay `z-40`, popover `z-50`

### Categories
- `getCategoryBadgeClass(name, customCategories)` → Tailwind badge class string
- `getCategoryHex(name, customCategories)` → hex for Recharts
- `getAllCategories(customCategories)` → merged built-in + custom
- Custom categories stored in `settings.customCategories` in Supabase

### Subscription-transaction linking
- Transactions linked via `tags: string[]` using `sub-link:<membershipId>` prefix
- Helpers in `subscriptionUtils.ts`: `addSubLink`, `getSubLinkId`, `isLinkedToSubscription`, `isLinkedTo`
- `findRenewalCandidates(transactions, membership)` — matches on name + amount ±10%
- `advanceByOneCycle(date, cycle)` — advances a date string by one billing period

### Up Bank token
- Dev: `getUpToken()` reads `VITE_UP_API_TOKEN` from env (never stored in DB)
- Prod: user enters token via UI form, stored in memory only
- `ENV_UP_TOKEN_READY` in `ConnectBank.tsx` — if env token valid, skips the form entirely

---

## Workflow

- After completing a feature or bugfix, do a `tsc --noEmit` check
- For multi-file changes (3+ files), describe what was changed and why before finishing
- Commit after each logical unit: fix → one commit, feat → one commit
- Never mix bugfixes and new features in the same uncommitted state
- Check the `supabase/migrations/` folder before adding new fields — schema changes need a migration

---

## Common Gotchas

| Issue | Cause | Fix |
|---|---|---|
| "Connection failed" on bank connect | Single try/catch covers API + Supabase persist | Separate into fire-and-forget `.catch()` |
| Category change reverting | Store rolls back on Supabase error | Pass `{ silent: true }` to `updateTransaction` |
| Popover clipped or wrong z-index | Rendered inside Framer Motion parent | Use `createPortal(content, document.body)` |
| GroupBy switch makes all transactions disappear | Stale `collapsed` Set + `height: 0` exit on all groups | Reset state on groupBy change; exit with `opacity` only; use `mode="popLayout"` |
| Spring bounce on expand/collapse | Springs overshoot `height: 0` | Use `duration: 0.22, ease: [0.32,0.72,0,1]` tween |
| DonutChart wrong colours | Recharts needs hex; system uses Tailwind class names | Use `getCategoryHex()` → `COLOR_HEX` map in `categories.ts` |
| Supabase error message hidden | `PostgrestError` not `instanceof Error` | Use `(err as {message?:string})?.message` |

---

## Running the project

```bash
npm run dev        # Vite dev server
npm run build      # Production build
npx tsc --noEmit   # Type check without building
npm test           # Vitest unit tests
```

---

## Environment variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_UP_API_TOKEN=    # optional — if set, skips Up Bank token form
```
