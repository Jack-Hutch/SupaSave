import type { CategoryDef, ColorKey } from '../types';

// ─── Colour palette ───────────────────────────────────────────────────────────

export const COLOR_KEYS: ColorKey[] = [
  'green', 'blue', 'orange', 'cyan', 'purple', 'violet',
  'amber', 'emerald', 'pink', 'sky', 'lime', 'indigo',
  'rose', 'teal', 'yellow', 'slate', 'gray',
];

/** Tailwind classes for each colour key — badge (bg+text+border) and swatch dot. */
export const COLOR_CLASSES: Record<ColorKey, { badge: string; swatch: string; text: string }> = {
  green:   { badge: 'bg-income/15 text-income border-income/20',                  swatch: 'bg-income',           text: 'text-income'        },
  blue:    { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',            swatch: 'bg-blue-400',         text: 'text-blue-400'      },
  orange:  { badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',      swatch: 'bg-orange-400',       text: 'text-orange-400'    },
  cyan:    { badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',            swatch: 'bg-cyan-400',         text: 'text-cyan-400'      },
  purple:  { badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',      swatch: 'bg-purple-400',       text: 'text-purple-400'    },
  violet:  { badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',      swatch: 'bg-violet-400',       text: 'text-violet-400'    },
  slate:   { badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',         swatch: 'bg-slate-400',        text: 'text-slate-400'     },
  amber:   { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',         swatch: 'bg-amber-400',        text: 'text-amber-400'     },
  emerald: { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',   swatch: 'bg-emerald-400',      text: 'text-emerald-400'   },
  pink:    { badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',            swatch: 'bg-pink-400',         text: 'text-pink-400'      },
  sky:     { badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',               swatch: 'bg-sky-400',          text: 'text-sky-400'       },
  lime:    { badge: 'bg-lime-500/10 text-lime-400 border-lime-500/20',            swatch: 'bg-lime-400',         text: 'text-lime-400'      },
  indigo:  { badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',      swatch: 'bg-indigo-400',       text: 'text-indigo-400'    },
  rose:    { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',            swatch: 'bg-rose-400',         text: 'text-rose-400'      },
  teal:    { badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',            swatch: 'bg-teal-400',         text: 'text-teal-400'      },
  yellow:  { badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',      swatch: 'bg-yellow-400',       text: 'text-yellow-400'    },
  gray:    { badge: 'bg-surface-raised text-foreground-muted border-border-base', swatch: 'bg-foreground-subtle', text: 'text-foreground-muted' },
};

// ─── Built-in categories ─────────────────────────────────────────────────────

export const BUILT_IN_CATEGORIES: CategoryDef[] = [
  {
    id: 'Income', name: 'Income', icon: '💰', color: 'green', isBuiltIn: true,
    subcategories: ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Other'],
  },
  {
    id: 'Groceries', name: 'Groceries', icon: '🛒', color: 'blue', isBuiltIn: true,
    subcategories: ['Supermarket', 'Butcher', 'Bakery', 'Markets', 'Online', 'Other'],
  },
  {
    id: 'Dining', name: 'Dining', icon: '🍽️', color: 'orange', isBuiltIn: true,
    subcategories: ['Café', 'Restaurant', 'Fast Food', 'Takeaway', 'Drinks', 'Other'],
  },
  {
    id: 'Transport', name: 'Transport', icon: '🚗', color: 'cyan', isBuiltIn: true,
    subcategories: ['Fuel', 'Public Transit', 'Rideshare', 'Parking', 'Toll', 'Flights', 'Other'],
  },
  {
    id: 'Entertainment', name: 'Entertainment', icon: '🎬', color: 'purple', isBuiltIn: true,
    subcategories: ['Movies', 'Concerts', 'Sports', 'Events', 'Streaming', 'Other'],
  },
  {
    id: 'Technology', name: 'Technology', icon: '💻', color: 'violet', isBuiltIn: true,
    subcategories: ['Hardware', 'Software', 'Subscriptions', 'Accessories', 'Other'],
  },
  {
    id: 'Utilities', name: 'Utilities', icon: '⚡', color: 'slate', isBuiltIn: true,
    subcategories: ['Electricity', 'Gas', 'Water', 'Internet', 'Phone', 'Other'],
  },
  {
    id: 'Housing', name: 'Housing', icon: '🏠', color: 'amber', isBuiltIn: true,
    subcategories: ['Rent', 'Mortgage', 'Insurance', 'Maintenance', 'Other'],
  },
  {
    id: 'Health & Fitness', name: 'Health & Fitness', icon: '💪', color: 'emerald', isBuiltIn: true,
    subcategories: ['Gym', 'Medical', 'Pharmacy', 'Sports', 'Wellness', 'Other'],
  },
  {
    id: 'Shopping', name: 'Shopping', icon: '🛍️', color: 'pink', isBuiltIn: true,
    subcategories: ['Clothing', 'Electronics', 'Online', 'Department', 'Other'],
  },
  {
    id: 'Travel', name: 'Travel', icon: '✈️', color: 'sky', isBuiltIn: true,
    subcategories: ['Flights', 'Hotels', 'Car Rental', 'Tours', 'Food', 'Other'],
  },
  {
    id: 'Home & Garden', name: 'Home & Garden', icon: '🌱', color: 'lime', isBuiltIn: true,
    subcategories: ['Furniture', 'Plants', 'Tools', 'Decor', 'Repairs', 'Other'],
  },
  {
    id: 'Education', name: 'Education', icon: '📚', color: 'indigo', isBuiltIn: true,
    subcategories: ['Tuition', 'Books', 'Courses', 'Stationery', 'Other'],
  },
  {
    id: 'Finance', name: 'Finance', icon: '💳', color: 'teal', isBuiltIn: true,
    subcategories: ['Fees', 'Interest', 'Investment', 'Insurance', 'Tax', 'Other'],
  },
  {
    id: 'Subscriptions', name: 'Subscriptions', icon: '🔁', color: 'rose', isBuiltIn: true,
    subcategories: ['Streaming', 'Music', 'Software', 'Gaming', 'News', 'Cloud Storage', 'Other'],
  },
  {
    id: 'Uncategorized', name: 'Uncategorized', icon: '📌', color: 'gray', isBuiltIn: true,
    subcategories: [],
  },
];

// ─── Hex colours (for Recharts / canvas contexts) ────────────────────────────
// Maps each ColorKey to a Tailwind-400 hex value so chart slices match the
// badge/swatch system without needing CSS class parsing.

export const COLOR_HEX: Record<ColorKey, string> = {
  green:   '#4ade80',
  blue:    '#60a5fa',
  orange:  '#fb923c',
  cyan:    '#22d3ee',
  purple:  '#c084fc',
  violet:  '#a78bfa',
  slate:   '#94a3b8',
  amber:   '#fbbf24',
  emerald: '#34d399',
  pink:    '#f472b6',
  sky:     '#38bdf8',
  lime:    '#a3e635',
  indigo:  '#818cf8',
  rose:    '#fb7185',
  teal:    '#2dd4bf',
  yellow:  '#facc15',
  gray:    '#9ca3af',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Merge built-in + custom categories into one ordered list, with hidden ones
 * filtered out. Custom rows that share an id with a built-in act as overrides.
 */
export function getAllCategories(customCategories?: CategoryDef[]): CategoryDef[] {
  return getAllCategoriesIncludingHidden(customCategories).filter((c) => !c.hidden);
}

/**
 * Same as getAllCategories but keeps hidden ones — for the manager UI where
 * the user needs to see hidden built-ins to restore them.
 */
export function getAllCategoriesIncludingHidden(customCategories?: CategoryDef[]): CategoryDef[] {
  const customs = customCategories ?? [];
  const builtIns = BUILT_IN_CATEGORIES.map((b) => {
    const override = customs.find((c) => c.id === b.id);
    return override ? { ...b, ...override } : b;
  });
  const newCustoms = customs.filter((c) => !BUILT_IN_CATEGORIES.some((b) => b.id === c.id));
  return [...builtIns, ...newCustoms];
}

/** Is this category id one of the built-in defaults? */
export function isBuiltInCategoryId(id: string): boolean {
  return BUILT_IN_CATEGORIES.some((b) => b.id === id);
}

/** Find a category by name or id. */
export function getCategoryDef(
  name: string,
  customCategories?: CategoryDef[],
): CategoryDef | undefined {
  return getAllCategories(customCategories).find((c) => c.name === name || c.id === name);
}

/** Badge class string for a given category name. */
export function getCategoryBadgeClass(
  categoryName: string,
  customCategories?: CategoryDef[],
): string {
  const cat = getCategoryDef(categoryName, customCategories);
  return cat ? COLOR_CLASSES[cat.color].badge : COLOR_CLASSES.gray.badge;
}

/** Swatch (dot) class for a given category. */
export function getCategorySwatchClass(
  categoryName: string,
  customCategories?: CategoryDef[],
): string {
  const cat = getCategoryDef(categoryName, customCategories);
  return cat ? COLOR_CLASSES[cat.color].swatch : COLOR_CLASSES.gray.swatch;
}

/** Hex colour for a given category — for use in Recharts / canvas contexts. */
export function getCategoryHex(
  categoryName: string,
  customCategories?: CategoryDef[],
): string {
  const cat = getCategoryDef(categoryName, customCategories);
  return cat ? COLOR_HEX[cat.color] : COLOR_HEX.gray;
}
