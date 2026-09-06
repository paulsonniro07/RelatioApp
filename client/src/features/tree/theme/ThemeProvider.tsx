import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { DEFAULT_THEME_ID, THEMES, getTheme } from './themes';
import { RELATIONSHIP_TYPES } from './types';
import type { ChartTheme, ThemeId } from './types';

const STORAGE_KEY = 'relatio:theme';

/** Maps every ChartTheme field to the CSS custom property it feeds. */
const TOKEN_KEYS: ReadonlyArray<[string, keyof ChartTheme]> = [
  ['--app-background', 'appBackground'],
  ['--canvas-background', 'canvasBackground'],
  ['--surface-background', 'surfaceBackground'],
  ['--border-color', 'borderColor'],
  ['--control-hover', 'controlHover'],
  ['--node-background', 'nodeBackground'],
  ['--node-border', 'nodeBorder'],
  ['--node-radius', 'nodeRadius'],
  ['--node-shadow', 'nodeShadow'],
  ['--node-hover-shadow', 'nodeHoverShadow'],
  ['--text-primary', 'textPrimary'],
  ['--text-secondary', 'textSecondary'],
  ['--text-muted', 'textMuted'],
  ['--accent', 'accent'],
  ['--accent-text', 'accentText'],
  ['--accent-soft', 'accentSoft'],
  ['--selected-border', 'selectedBorder'],
  ['--selected-shadow', 'selectedShadow'],
  ['--connector-color', 'connectorColor'],
  ['--handle-color', 'handleColor'],
  ['--drag-preview-color', 'dragPreviewColor'],
  ['--badge-bg', 'badgeBackground'],
  ['--badge-text', 'badgeText'],
];

function readStoredThemeId(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return THEMES.some((theme) => theme.id === stored) ? (stored as ThemeId) : DEFAULT_THEME_ID;
}

interface ThemeContextValue {
  theme: ChartTheme;
  themeId: ThemeId;
  /** Every registered theme — used by the picker. */
  themeList: ChartTheme[];
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(readStoredThemeId);
  const theme = getTheme(themeId);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, themeId);
  }, [themeId]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.dataset.theme = theme.id;
    root.style.fontFamily = theme.fontFamily;
    root.style.backgroundColor = theme.appBackground;
    for (const [property, tokenKey] of TOKEN_KEYS) {
      root.style.setProperty(property, String(theme[tokenKey]));
    }

    // Connector widths/lines need CSS units; spouse + active strokes fall back
    // to the base connector color when a theme doesn't define its own.
    root.style.setProperty('--connector-width', `${theme.connectorWidth}px`);
    root.style.setProperty('--connector-color-spouse', theme.spouseConnectorColor ?? theme.connectorColor);
    root.style.setProperty('--connector-color-active', theme.connectorActiveColor ?? theme.connectorColor);

    // Relationship-type tints (fall back to the generic node background/accent).
    for (const type of RELATIONSHIP_TYPES) {
      const tone = theme.relationshipTones?.[type];
      root.style.setProperty(
        `--node-background-${type}`,
        tone?.background ?? theme.nodeBackground,
      );
      root.style.setProperty(`--node-accent-${type}`, tone?.accent ?? theme.accent);
    }
  }, [theme]);

  const setThemeId = useCallback((id: ThemeId) => setThemeIdState(id), []);

  return (
    <ThemeContext.Provider value={{ theme, themeId, themeList: THEMES, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return context;
}
