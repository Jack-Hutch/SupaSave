/**
 * Shared motion constants for cross-page shared-element transitions.
 *
 * Elements with a matching `layoutId` on two different pages will physically
 * animate their position and size between the two pages — the border lines
 * literally reshape, the card expands or contracts to fit the new layout.
 *
 * Rules:
 *  - Every layout-animated element should set `style={{ borderRadius }}` so
 *    Framer Motion can interpolate rounded corners without distortion.
 *  - Use `layout="position"` inside a shared element to prevent its children
 *    from stretching as the outer container resizes.
 *
 * Spring math:
 *  ζ (damping ratio) = damping / (2 * sqrt(stiffness * mass))
 *  ωn (natural freq)  = sqrt(stiffness / mass)
 *  Settling time ≈ 4 / (ζ * ωn)
 *
 *  SHARED_SPRING: ζ ≈ 0.72, ωn ≈ 10 rad/s → settles ≈ 0.55 s
 *  This is slow enough to clearly watch cards fly between pages, but
 *  not so slow it feels laggy.
 */

/** Spring for cross-page shared-element travel — deliberately slow so you can watch elements move. */
export const SHARED_SPRING = {
  type: 'spring' as const,
  stiffness: 110,
  damping:    16,
  mass:       1.1,
} as const;

/** Transition object passed to `motion.div transition={}` on shared elements. */
export const sharedTransition = {
  layout: SHARED_SPRING,
} as const;

/** Spring for internal tab / pill indicators — snappy, intra-page only. */
export const TAB_SPRING = {
  type: 'spring' as const,
  stiffness: 500,
  damping:    38,
  mass:       0.7,
} as const;

/**
 * layoutId registry — keeps IDs in one place so pages always reference
 * the same strings. Two elements with the same layoutId on different pages
 * will physically travel between each other on navigation.
 *
 * Cross-page pairings:
 *   statIncome/statExpense/statNet  →  Dashboard ↔ CashFlow
 *   cardDonut                       →  Dashboard ↔ Analytics (Overview)
 *   cardTransactions                →  Dashboard ↔ Transactions
 *   cardBarMonthly                  →  CashFlow  ↔ Analytics (Performance)
 *   cardAreaTrend                   →  CashFlow  ↔ Analytics (Overview)
 */
export const SHARED_ID = {
  statIncome:       'stat-income',
  statExpense:      'stat-expense',
  statNet:          'stat-net',
  cardDonut:        'card-donut',
  cardTransactions: 'card-transactions',
  cardBarMonthly:   'card-bar-monthly',
  cardAreaTrend:    'card-area-trend',
} as const;
