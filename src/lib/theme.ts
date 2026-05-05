/**
 * SupaSave Theme Engine
 *
 * Themes are applied by writing CSS custom property values onto <html>
 * via data-theme and data-mode attributes, then reading them through
 * Tailwind's semantic color tokens (see tailwind.config.ts).
 *
 * GPU-friendly transitions are handled with a brief `data-theme-changing`
 * attribute that enables cross-element background/color transitions without
 * interfering with Framer Motion animations (which use transform/opacity).
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeVariant = 'default' | 'earth' | 'noir' | 'extended';

export interface ThemeConfig {
  mode: ThemeMode;
  variant: ThemeVariant;
  primaryColor?: string; // optional hex override for --accent
}

// ─── Theme metadata (for the picker UI) ──────────────────────────────────────

export interface ThemeMeta {
  id: ThemeVariant;
  label: string;
  description: string;
  previewDark: string;  // hex bg
  previewLight: string; // hex bg
  accentDark: string;
  accentLight: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Clean neutral dark/light',
    previewDark: '#030712',
    previewLight: '#f9fafb',
    accentDark: '#6366f1',
    accentLight: '#4f46e5',
  },
  {
    id: 'earth',
    label: 'Earth',
    description: 'Warm, natural amber tones',
    previewDark: '#0f0a06',
    previewLight: '#fdf6ec',
    accentDark: '#d97706',
    accentLight: '#b45309',
  },
  {
    id: 'noir',
    label: 'Noir',
    description: 'Minimal high-contrast B&W',
    previewDark: '#000000',
    previewLight: '#ffffff',
    accentDark: '#ffffff',
    accentLight: '#000000',
  },
  {
    id: 'extended',
    label: 'Extended',
    description: 'Vibrant deep violet palette',
    previewDark: '#0a0618',
    previewLight: '#f5f0ff',
    accentDark: '#8b5cf6',
    accentLight: '#7c3aed',
  },
];

// ─── CSS variable definitions per theme × mode ───────────────────────────────
// Values are space-separated R G B (Tailwind opacity modifier syntax)

type VarMap = Record<string, string>;

const vars: Record<ThemeVariant, { dark: VarMap; light: VarMap }> = {
  default: {
    dark: {
      '--canvas':          '3 7 18',
      '--surface':         '17 24 39',
      '--surface-raised':  '31 41 55',
      '--surface-hover':   '55 65 81',
      '--border-default':  '31 41 55',
      '--border-subtle':   '55 65 81',
      '--foreground':      '243 244 246',
      '--foreground-muted':'156 163 175',
      '--foreground-subtle':'107 114 128',
      '--accent':          '99 102 241',
      '--accent-dim':      '79 70 229',
      '--accent-fg':       '255 255 255',
      '--income':          '52 211 153',
      '--expense':         '248 113 113',
    },
    light: {
      '--canvas':          '249 250 251',
      '--surface':         '255 255 255',
      '--surface-raised':  '243 244 246',
      '--surface-hover':   '229 231 235',
      '--border-default':  '229 231 235',
      '--border-subtle':   '243 244 246',
      '--foreground':      '17 24 39',
      '--foreground-muted':'107 114 128',
      '--foreground-subtle':'156 163 175',
      '--accent':          '79 70 229',
      '--accent-dim':      '67 56 202',
      '--accent-fg':       '255 255 255',
      '--income':          '5 150 105',
      '--expense':         '220 38 38',
    },
  },

  earth: {
    dark: {
      '--canvas':          '15 10 6',
      '--surface':         '28 18 8',
      '--surface-raised':  '44 29 14',
      '--surface-hover':   '61 42 20',
      '--border-default':  '61 42 20',
      '--border-subtle':   '80 56 28',
      '--foreground':      '253 244 231',
      '--foreground-muted':'196 149 106',
      '--foreground-subtle':'138 102 69',
      '--accent':          '217 119 6',
      '--accent-dim':      '180 83 9',
      '--accent-fg':       '255 255 255',
      '--income':          '134 197 85',
      '--expense':         '240 108 81',
    },
    light: {
      '--canvas':          '253 246 236',
      '--surface':         '255 250 240',
      '--surface-raised':  '250 235 210',
      '--surface-hover':   '240 220 192',
      '--border-default':  '232 213 183',
      '--border-subtle':   '245 230 206',
      '--foreground':      '44 24 16',
      '--foreground-muted':'138 102 69',
      '--foreground-subtle':'167 130 90',
      '--accent':          '180 83 9',
      '--accent-dim':      '146 64 14',
      '--accent-fg':       '255 255 255',
      '--income':          '77 124 15',
      '--expense':         '185 28 28',
    },
  },

  noir: {
    dark: {
      '--canvas':          '0 0 0',
      '--surface':         '10 10 10',
      '--surface-raised':  '20 20 20',
      '--surface-hover':   '32 32 32',
      '--border-default':  '42 42 42',
      '--border-subtle':   '28 28 28',
      '--foreground':      '255 255 255',
      '--foreground-muted':'160 160 160',
      '--foreground-subtle':'100 100 100',
      '--accent':          '255 255 255',
      '--accent-dim':      '200 200 200',
      '--accent-fg':       '0 0 0',
      '--income':          '180 220 140',
      '--expense':         '220 120 120',
    },
    light: {
      '--canvas':          '255 255 255',
      '--surface':         '250 250 250',
      '--surface-raised':  '240 240 240',
      '--surface-hover':   '228 228 228',
      '--border-default':  '218 218 218',
      '--border-subtle':   '235 235 235',
      '--foreground':      '0 0 0',
      '--foreground-muted':'80 80 80',
      '--foreground-subtle':'130 130 130',
      '--accent':          '0 0 0',
      '--accent-dim':      '40 40 40',
      '--accent-fg':       '255 255 255',
      '--income':          '22 101 52',
      '--expense':         '153 27 27',
    },
  },

  extended: {
    dark: {
      '--canvas':          '10 6 24',
      '--surface':         '18 13 36',
      '--surface-raised':  '29 21 53',
      '--surface-hover':   '45 33 78',
      '--border-default':  '45 32 80',
      '--border-subtle':   '34 24 60',
      '--foreground':      '240 237 255',
      '--foreground-muted':'160 148 212',
      '--foreground-subtle':'110 98 158',
      '--accent':          '139 92 246',
      '--accent-dim':      '124 58 237',
      '--accent-fg':       '255 255 255',
      '--income':          '94 234 212',
      '--expense':         '251 113 133',
    },
    light: {
      '--canvas':          '245 240 255',
      '--surface':         '237 232 255',
      '--surface-raised':  '224 216 255',
      '--surface-hover':   '210 198 255',
      '--border-default':  '196 181 253',
      '--border-subtle':   '220 210 255',
      '--foreground':      '30 16 64',
      '--foreground-muted':'109 93 168',
      '--foreground-subtle':'139 120 198',
      '--accent':          '124 58 237',
      '--accent-dim':      '109 40 217',
      '--accent-fg':       '255 255 255',
      '--income':          '15 118 110',
      '--expense':         '190 18 60',
    },
  },
};

// ─── Apply function ───────────────────────────────────────────────────────────

export function applyTheme(config: ThemeConfig): void {
  const root = document.documentElement;

  // Resolve actual mode
  const effectiveMode: 'light' | 'dark' =
    config.mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : config.mode;

  // Enable smooth cross-element transitions while swapping vars
  root.setAttribute('data-theme-changing', '');

  // Write CSS variables
  const themeVars = vars[config.variant][effectiveMode];
  for (const [key, value] of Object.entries(themeVars)) {
    root.style.setProperty(key, value);
  }

  // Override accent with custom color if provided
  if (config.primaryColor) {
    const rgb = hexToRgbSpace(config.primaryColor);
    if (rgb) root.style.setProperty('--accent', rgb);
  }

  // Set data attributes so CSS :has() / attr selectors can target theme
  root.setAttribute('data-theme', config.variant);
  root.setAttribute('data-mode', effectiveMode);

  // Keep dark class in sync for any Tailwind dark: variants
  root.classList.toggle('dark', effectiveMode === 'dark');

  // Remove transition flag after paint
  requestAnimationFrame(() => {
    setTimeout(() => root.removeAttribute('data-theme-changing'), 320);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function hexToRgbSpace(hex: string): string | null {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full);
  return result
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : null;
}

export function rgbSpaceToHex(rgb: string): string {
  const parts = rgb.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '#6366f1';
  return (
    '#' +
    parts
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Resolve the effective theme mode (handles 'system') */
export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return mode;
}

/** Read the current --accent variable as a hex string */
export function getCurrentAccentHex(): string {
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent')
    .trim();
  return val ? rgbSpaceToHex(val) : '#6366f1';
}
