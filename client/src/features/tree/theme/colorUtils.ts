import type { ChartTheme } from './types';

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function paletteOf(theme: ChartTheme) {
  return theme.avatarPalette.length > 0
    ? theme.avatarPalette
    : [{ background: theme.badgeBackground, foreground: theme.badgeText }];
}

/** Deterministic color for a manual level label — same level always maps to the same color. */
export function levelBadgeStyle(level: string, theme: ChartTheme) {
  const palette = paletteOf(theme);
  return palette[hashString(level) % palette.length];
}

/** Avatar color by hierarchy depth (generation), cycling past the end of the palette. */
export function avatarEntryForDepth(depth: number, theme: ChartTheme) {
  const palette = paletteOf(theme);
  return palette[Math.max(0, depth) % palette.length];
}

/** Avatar container border-radius for a theme's avatar style. */
export function avatarRadiusForStyle(style: ChartTheme['avatarStyle']): string {
  if (style === 'circle') return '9999px';
  if (style === 'tile') return '14px';
  return '6px';
}
