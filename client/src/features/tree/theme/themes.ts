import type { ChartTheme, ThemeId } from './types';

/** Warm rounded display stack — friendly but not childish. */
const ROUNDED_SANS =
  'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';

/** Neutral system stack used by the "serious" themes. */
const SYSTEM_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, sans-serif';

/** First implemented theme — exact token values from the reference spec. */
export const CUTE_PASTEL_THEME: ChartTheme = {
  id: 'cute-pastel',
  label: 'Cute Pastel',
  description: 'Warm cream canvas, pastel relationship tints, rounded friendly cards.',
  canvasDecor: 'botanical',
  fontFamily: ROUNDED_SANS,

  canvasBackground: '#f9f4ec',
  appBackground: '#f3ecdf',
  surfaceBackground: '#ffffff',
  borderColor: '#eae0cf',
  controlHover: '#f1eae0',

  nodeBackground: '#ffffff',
  nodeBorder: '#e8ddcc',
  nodeRadius: '16px',
  nodeShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  nodeHoverShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',

  textPrimary: '#2e2a24',
  textSecondary: '#8a8272',
  textMuted: '#b4ac9c',

  accent: '#97a3f9',
  accentText: '#2e2a24',
  accentSoft: 'rgba(151, 163, 249, 0.18)',
  selectedBorder: '#97a3f9',
  selectedShadow: '0 0 0 3px rgba(151, 163, 249, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08)',

  connectorColor: '#c9bfa8',
  connectorWidth: 1.5,
  connectorActiveColor: '#a39578',
  spouseConnectorColor: '#e8a0a0',
  handleColor: '#b7ac93',
  dragPreviewColor: '#97a3f9',

  badgeBackground: '#f1edfb',
  badgeText: '#8b7fe8',

  avatarStyle: 'circle',
  avatarPalette: [
    { background: '#f3f8ee', foreground: '#8fbf7f' },
    { background: '#e9f2fc', foreground: '#7fa8e8' },
    { background: '#fdedeb', foreground: '#e8a0a0' },
    { background: '#fdf2dc', foreground: '#e8b85f' },
    { background: '#e3f4f0', foreground: '#6fbfa8' },
    { background: '#edebfc', foreground: '#8b7fe8' },
  ],

  relationshipTones: {
    grandparent: { background: '#f3f8ee', accent: '#8fbf7f' },
    parent: { background: '#e9f2fc', accent: '#7fa8e8' },
    spouse: { background: '#fdedeb', accent: '#e8a0a0' },
    child: { background: '#fdf2dc', accent: '#e8b85f' },
    sibling: { background: '#e3f4f0', accent: '#6fbfa8' },
    manager: { background: '#edebfc', accent: '#8b7fe8' },
    report: { background: '#e3f0fc', accent: '#6fa8d9' },
  },
};

export const PROFESSIONAL_THEME: ChartTheme = {
  id: 'professional',
  label: 'Professional',
  description: 'Clean slate and measured blues — a calm corporate org-chart look.',
  canvasDecor: 'dots',
  fontFamily: SYSTEM_SANS,

  canvasBackground: '#f2f5f9',
  appBackground: '#e9edf3',
  surfaceBackground: '#ffffff',
  borderColor: '#e2e8f0',
  controlHover: '#f1f5f9',

  nodeBackground: '#ffffff',
  nodeBorder: '#dde3ec',
  nodeRadius: '8px',
  nodeShadow: '0 1px 2px rgba(15, 23, 42, 0.05), 0 2px 6px rgba(15, 23, 42, 0.05)',
  nodeHoverShadow: '0 1px 2px rgba(15, 23, 42, 0.05), 0 10px 20px rgba(15, 23, 42, 0.1)',

  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',

  accent: '#2563eb',
  accentText: '#ffffff',
  accentSoft: '#eff6ff',
  selectedBorder: '#2563eb',
  selectedShadow: '0 0 0 3px rgba(37, 99, 235, 0.18), 0 6px 16px rgba(15, 23, 42, 0.12)',

  connectorColor: '#94a3b8',
  connectorWidth: 1.5,
  handleColor: '#64748b',
  dragPreviewColor: '#2563eb',

  badgeBackground: '#eff6ff',
  badgeText: '#1d4ed8',

  avatarStyle: 'circle',
  avatarPalette: [
    { background: '#dbe7f7', foreground: '#2a4a7f' },
    { background: '#e2e9f2', foreground: '#3b4a63' },
    { background: '#dcebf2', foreground: '#1f6e8c' },
    { background: '#e7e1f0', foreground: '#5b3e82' },
    { background: '#d5ecdf', foreground: '#23653f' },
    { background: '#f2e6d9', foreground: '#8a5a2b' },
  ],
};

export const MINIMAL_THEME: ChartTheme = {
  id: 'minimal',
  label: 'Minimal',
  description: 'Monochrome and quiet — the chart recedes, the data leads.',
  canvasDecor: 'none',
  fontFamily: SYSTEM_SANS,

  canvasBackground: '#fafafa',
  appBackground: '#f4f4f5',
  surfaceBackground: '#ffffff',
  borderColor: '#ececee',
  controlHover: '#f4f4f5',

  nodeBackground: '#ffffff',
  nodeBorder: '#e4e4e7',
  nodeRadius: '6px',
  nodeShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  nodeHoverShadow: '0 1px 2px rgba(0, 0, 0, 0.04), 0 6px 14px rgba(0, 0, 0, 0.07)',

  textPrimary: '#18181b',
  textSecondary: '#52525b',
  textMuted: '#a1a1aa',

  accent: '#18181b',
  accentText: '#ffffff',
  accentSoft: '#f4f4f5',
  selectedBorder: '#18181b',
  selectedShadow: '0 0 0 3px rgba(24, 24, 27, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',

  connectorColor: '#d4d4d8',
  connectorWidth: 1.25,
  handleColor: '#a1a1aa',
  dragPreviewColor: '#18181b',

  badgeBackground: '#f4f4f5',
  badgeText: '#3f3f46',

  avatarStyle: 'square',
  avatarPalette: [
    { background: '#e4e4e7', foreground: '#3f3f46' },
    { background: '#ececee', foreground: '#52525b' },
    { background: '#f4f4f5', foreground: '#71717a' },
    { background: '#e4e4e7', foreground: '#3f3f46' },
    { background: '#ececee', foreground: '#52525b' },
    { background: '#f4f4f5', foreground: '#71717a' },
  ],
};

export const SCHOOL_THEME: ChartTheme = {
  id: 'school',
  label: 'School',
  description: 'Bright and bouncy pastels for classrooms and student charts.',
  canvasDecor: 'doodles',
  fontFamily: ROUNDED_SANS,

  canvasBackground:
    'radial-gradient(900px 600px at 15% -10%, rgba(255, 214, 140, 0.2), transparent 55%), radial-gradient(900px 600px at 110% 110%, rgba(190, 210, 255, 0.25), transparent 55%), #fffdf6',
  appBackground: '#f6f1e6',
  surfaceBackground: '#ffffff',
  borderColor: '#efe8d9',
  controlHover: '#f5efe3',

  nodeBackground: '#ffffff',
  nodeBorder: 'rgba(230, 219, 198, 0.7)',
  nodeRadius: '18px',
  nodeShadow: '0 1px 2px rgba(70, 50, 30, 0.05), 0 6px 16px rgba(70, 50, 30, 0.09)',
  nodeHoverShadow: '0 2px 4px rgba(70, 50, 30, 0.07), 0 12px 24px rgba(70, 50, 30, 0.15)',

  textPrimary: '#3a3347',
  textSecondary: '#75698b',
  textMuted: '#afa6bf',

  accent: '#ff8a5c',
  accentText: '#ffffff',
  accentSoft: '#fff1e9',
  selectedBorder: '#ff8a5c',
  selectedShadow: '0 0 0 3px rgba(255, 138, 92, 0.18), 0 10px 22px rgba(255, 138, 92, 0.22)',

  connectorColor: '#cbbfd5',
  connectorWidth: 1.6,
  handleColor: '#ad9cc0',
  dragPreviewColor: '#ff8a5c',

  badgeBackground: '#f3e8ff',
  badgeText: '#7c3aed',

  avatarStyle: 'tile',
  avatarPalette: [
    { background: '#fdf0bf', foreground: '#8a6102' },
    { background: '#d8f7e3', foreground: '#1f7a45' },
    { background: '#d8ebfe', foreground: '#1e4f9e' },
    { background: '#ffdfe2', foreground: '#b02e48' },
    { background: '#f1e4fc', foreground: '#6d2fae' },
    { background: '#ffecd2', foreground: '#c05a10' },
  ],
};

export const PROJECT_TECH_THEME: ChartTheme = {
  id: 'project-tech',
  label: 'Project Team',
  description: 'Teal and ink palette tuned for product and delivery teams.',
  canvasDecor: 'circuit',
  fontFamily: SYSTEM_SANS,

  canvasBackground: '#f6fafb',
  appBackground: '#edf3f5',
  surfaceBackground: '#ffffff',
  borderColor: '#dbe6ea',
  controlHover: '#eef5f6',

  nodeBackground: '#ffffff',
  nodeBorder: '#d5e2e6',
  nodeRadius: '10px',
  nodeShadow: '0 1px 2px rgba(15, 42, 51, 0.05), 0 3px 8px rgba(15, 42, 51, 0.05)',
  nodeHoverShadow: '0 1px 2px rgba(15, 42, 51, 0.05), 0 10px 20px rgba(15, 42, 51, 0.1)',

  textPrimary: '#12303a',
  textSecondary: '#4d6872',
  textMuted: '#8ba4ae',

  accent: '#0d9488',
  accentText: '#ffffff',
  accentSoft: '#e6f7f5',
  selectedBorder: '#0d9488',
  selectedShadow: '0 0 0 3px rgba(13, 148, 136, 0.18), 0 8px 18px rgba(13, 148, 136, 0.18)',

  connectorColor: '#9db6be',
  connectorWidth: 1.5,
  handleColor: '#7a97a2',
  dragPreviewColor: '#0d9488',

  badgeBackground: '#e0f2f1',
  badgeText: '#0f766e',

  avatarStyle: 'circle',
  avatarPalette: [
    { background: '#c5f1e5', foreground: '#115e59' },
    { background: '#d9ebfa', foreground: '#0b5a8f' },
    { background: '#e5ddf9', foreground: '#5b3fb0' },
    { background: '#ffdfe3', foreground: '#b23b56' },
    { background: '#fdebc8', foreground: '#a86a08' },
    { background: '#d9f0e0', foreground: '#22663f' },
  ],
};

export const DARK_NEON_THEME: ChartTheme = {
  id: 'dark-neon',
  label: 'Dark Neon',
  description: 'Deep space with electric accents — easy on the eyes after dark.',
  canvasDecor: 'glow',
  fontFamily: SYSTEM_SANS,

  canvasBackground: '#0b0e17',
  appBackground: '#070a12',
  surfaceBackground: '#161b2a',
  borderColor: '#242d45',
  controlHover: '#1d2437',

  nodeBackground: '#161b2a',
  nodeBorder: '#2b3553',
  nodeRadius: '12px',
  nodeShadow: '0 1px 2px rgba(0, 0, 0, 0.5), 0 10px 22px rgba(0, 0, 0, 0.4)',
  nodeHoverShadow: '0 2px 4px rgba(0, 0, 0, 0.55), 0 16px 32px rgba(0, 0, 0, 0.5)',

  textPrimary: '#edf1ff',
  textSecondary: '#a6afcb',
  textMuted: '#5f6a8e',

  accent: '#8b9cf9',
  accentText: '#0b0e17',
  accentSoft: 'rgba(124, 140, 248, 0.16)',
  selectedBorder: '#8b9cf9',
  selectedShadow: '0 0 0 3px rgba(139, 156, 249, 0.28), 0 12px 28px rgba(139, 156, 249, 0.22)',

  connectorColor: '#3a4565',
  connectorWidth: 1.5,
  handleColor: '#4a5678',
  dragPreviewColor: '#22d3ee',

  badgeBackground: '#252e4d',
  badgeText: '#a5b4fc',

  avatarStyle: 'circle',
  avatarPalette: [
    { background: '#2a2a55', foreground: '#a5b4fc' },
    { background: '#123047', foreground: '#7dd3fc' },
    { background: '#49223a', foreground: '#f9a8d4' },
    { background: '#18301f', foreground: '#86efac' },
    { background: '#40301a', foreground: '#fcd34d' },
    { background: '#3a1f45', foreground: '#d8b4fe' },
  ],
};

export const THEMES: ChartTheme[] = [
  CUTE_PASTEL_THEME,
  PROFESSIONAL_THEME,
  MINIMAL_THEME,
  SCHOOL_THEME,
  PROJECT_TECH_THEME,
  DARK_NEON_THEME,
];

export const DEFAULT_THEME_ID: ThemeId = 'cute-pastel';

export function getTheme(id: ThemeId): ChartTheme {
  return THEMES.find((theme) => theme.id === id) ?? CUTE_PASTEL_THEME;
}
