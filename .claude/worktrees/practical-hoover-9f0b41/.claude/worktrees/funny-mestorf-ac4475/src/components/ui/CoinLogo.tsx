import React from 'react';

interface CoinLogoProps {
  size?: number;
  className?: string;
}

/**
 * SupaSave coin logo — a premium coin with an ascending bar-chart stamped
 * into it, symbolising growing savings and financial analytics.
 *
 * Every fill that uses `rgb(var(--accent))` automatically recolours when the
 * user picks a new accent colour in Settings, because it reads from the live
 * CSS custom property rather than a hardcoded hex value.
 *
 * Each instance gets a unique gradient ID via React.useId() to avoid SVG
 * id-collision when the logo appears in both Sidebar and Header.
 */
export function CoinLogo({ size = 32, className = '' }: CoinLogoProps) {
  // React.useId returns ":r0:" style strings — strip colons so they're
  // valid as SVG gradient IDs.
  const uid = React.useId().replace(/:/g, '');
  const glowId   = `cg_glow_${uid}`;
  const shineId  = `cg_shine_${uid}`;
  const ringId   = `cg_ring_${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Soft radial glow behind the coin — accent-coloured halo */}
        <radialGradient id={glowId} cx="50%" cy="55%" r="50%">
          <stop offset="0%"   stopColor="rgb(var(--accent))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0"    />
        </radialGradient>

        {/*
          Top-left specular highlight — makes the coin look pressed/metallic.
          Gradient goes from soft white to transparent as it moves to the
          bottom-right of the coin face.
        */}
        <radialGradient id={shineId} cx="32%" cy="28%" r="60%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.22" />
          <stop offset="70%"  stopColor="white" stopOpacity="0.04" />
          <stop offset="100%" stopColor="white" stopOpacity="0"    />
        </radialGradient>

        {/* Subtle inner-ring gradient for edge depth */}
        <radialGradient id={ringId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="0.08" />
        </radialGradient>
      </defs>

      {/* ── Halo / ambient glow ── */}
      <circle
        cx="16" cy="17"
        r="15"
        fill={`url(#${glowId})`}
      />

      {/* ── Coin depth shadow (offset slightly down-right) ── */}
      <circle
        cx="16.6" cy="17.2"
        r="12.4"
        fill="rgb(var(--accent))"
        opacity="0.22"
      />

      {/* ── Main coin body ── */}
      <circle cx="16" cy="16" r="13" fill="rgb(var(--accent))" />

      {/* ── Specular shine overlay ── */}
      <circle cx="16" cy="16" r="13" fill={`url(#${shineId})`} />

      {/* ── Coin edge ring — gives the face a bevelled feel ── */}
      <circle
        cx="16" cy="16" r="11.25"
        stroke="white" strokeOpacity="0.12" strokeWidth="0.75"
        fill={`url(#${ringId})`}
      />

      {/*
        ── Ascending bar chart stamp ──
        Three bars of increasing height (left = short, right = tall).
        All bars share the same baseline at y = 22.5.
        The bars are rendered in accent-fg colour (typically white on a
        coloured coin) so they're always legible whatever accent is active.
      */}

      {/* Bar 1 — shortest */}
      <rect
        x="10" y="19" width="2.8" height="3.5"
        rx="0.8"
        fill="rgb(var(--accent-fg))" fillOpacity="0.92"
      />
      {/* Bar 2 — medium */}
      <rect
        x="14.6" y="15" width="2.8" height="7.5"
        rx="0.8"
        fill="rgb(var(--accent-fg))" fillOpacity="0.92"
      />
      {/* Bar 3 — tallest */}
      <rect
        x="19.2" y="10.5" width="2.8" height="12"
        rx="0.8"
        fill="rgb(var(--accent-fg))" fillOpacity="0.92"
      />

      {/*
        Trend line connecting the tops of the three bars —
        adds a subtle "line chart" overlay that reads as financial growth.
      */}
      <polyline
        points="11.4,19  16,15  20.6,10.5"
        stroke="rgb(var(--accent-fg))"
        strokeOpacity="0.35"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Tiny dot at the peak of the trend line */}
      <circle
        cx="20.6" cy="10.5" r="1.1"
        fill="rgb(var(--accent-fg))" fillOpacity="0.70"
      />
    </svg>
  );
}
