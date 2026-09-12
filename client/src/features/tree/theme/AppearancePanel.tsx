import { useEffect, useRef } from 'react';

import { CheckIcon } from '@/components/ui/icons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useTheme } from '@/features/tree/theme/ThemeProvider';
import type { ChartTheme, RelationshipType, ThemeId } from '@/features/tree/theme/types';

interface AppearancePanelProps {
  open: boolean;
  onClose: () => void;
}

/** Short stylistic tag shown under each theme name. */
const CATEGORY: Record<ThemeId, string> = {
  'cute-pastel': 'Cozy',
  professional: 'Clean',
  minimal: 'Minimal',
  school: 'Playful',
  'project-tech': 'Tech',
  'dark-neon': 'Bold & futuristic',
};

/** Tiny mock of a theme: parent + two children drawn with the theme's real tokens. */
function ThemePreview({ theme }: { theme: ChartTheme }) {
  const palette = theme.avatarPalette;
  const cardRadius = Math.min(Math.max(Number.parseFloat(theme.nodeRadius) || 8, 4), 16);
  const avatarRadius = theme.avatarStyle === 'circle' ? 9 : theme.avatarStyle === 'tile' ? 7 : 4;

  const Node = ({ cx, cy, depth }: { cx: number; cy: number; depth: number }) => {
    const entry = palette[depth % palette.length];
    const order: RelationshipType[] = ['grandparent', 'parent', 'child'];
    const tone = theme.relationshipTones?.[order[depth] ?? 'child'];
    const cardFill = tone?.background ?? theme.nodeBackground;
    const avatarFill = tone?.accent ?? entry.background;
    const avatarX = cx - 27;
    return (
      <g>
        <rect
          x={cx - 28}
          y={cy - 14}
          width={56}
          height={28}
          rx={cardRadius}
          fill={cardFill}
          stroke={theme.nodeBorder}
        />
        {theme.avatarStyle === 'circle' ? (
          <circle cx={avatarX} cy={cy} r={9} fill={avatarFill} />
        ) : (
          <rect
            x={avatarX - 9}
            y={cy - 9}
            width={18}
            height={18}
            rx={avatarRadius}
            fill={avatarFill}
          />
        )}
        <rect x={cx - 2} y={cy - 6} width={17} height={3.2} rx={1.6} fill={theme.textPrimary} />
        <rect x={cx - 2} y={cy + 1} width={11} height={2.6} rx={1.3} fill={theme.textMuted} />
      </g>
    );
  };

  return (
    <svg viewBox="0 0 132 84" className="block h-full w-full" aria-hidden="true">
      <rect width={132} height={84} fill={theme.canvasBackground} />
      <path
        d="M66 34 C66 42 36 42 36 50 M66 34 C66 42 96 42 96 50"
        fill="none"
        stroke={theme.connectorColor}
        strokeWidth={theme.connectorWidth}
      />
      <Node cx={66} cy={20} depth={0} />
      <Node cx={36} cy={64} depth={1} />
      <Node cx={96} cy={64} depth={2} />
    </svg>
  );
}
export function AppearancePanel({ open, onClose }: AppearancePanelProps) {
  const { theme: activeTheme, themeList, setThemeId } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(open);

  // Allow Escape to close while the panel is open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div
      className="fixed inset-0 z-50"
      aria-hidden={!open}
      style={{ pointerEvents: open ? 'auto' : 'none' }}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 transition-opacity duration-200"
        style={{ backgroundColor: 'rgba(20, 16, 8, 0.4)', opacity: open ? 1 : 0 }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Appearance"
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-[400px] max-w-[92vw] flex-col border-l shadow-2xl transition-transform duration-300 ease-out"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(105%)',
          backgroundColor: activeTheme.surfaceBackground,
          borderColor: activeTheme.borderColor,
        }}
      >
        <header
          className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4"
          style={{ borderColor: activeTheme.borderColor }}
        >
          <div className="min-w-0">
            <h2 className="text-lg font-bold" style={{ color: activeTheme.textPrimary }}>
              Appearance
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: activeTheme.textSecondary }}>
              Choose a theme to change the look of your chart.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close appearance panel"
            className="shrink-0 rounded-md p-1 transition-colors hover:bg-[var(--control-hover)]"
            style={{ color: activeTheme.textSecondary }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <ul className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
          {themeList.map((theme) => {
            const active = theme.id === activeTheme.id;
            return (
              <li key={theme.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setThemeId(theme.id)}
                  className="relative flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all hover:shadow-md"
                  style={{
                    borderColor: active ? theme.accent : activeTheme.borderColor,
                    boxShadow: active ? `0 0 0 3px ${theme.accentSoft}` : 'none',
                    backgroundColor: activeTheme.surfaceBackground,
                  }}
                >
                  <span
                    className="block h-[66px] w-[104px] shrink-0 overflow-hidden rounded-lg border"
                    style={{ borderColor: activeTheme.borderColor }}
                  >
                    <ThemePreview theme={theme} />
                  </span>

                  <span className="min-w-0 flex-1 pr-6">
                    <span
                      className="block truncate text-sm font-bold"
                      style={{ color: activeTheme.textPrimary }}
                    >
                      {theme.label}
                    </span>
                    <span
                      className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: activeTheme.accentSoft, color: activeTheme.accent }}
                    >
                      {CATEGORY[theme.id] ?? theme.label}
                    </span>
                    <span
                      className="mt-1 block text-xs leading-snug"
                      style={{ color: activeTheme.textSecondary }}
                    >
                      {theme.description}
                    </span>
                  </span>

                  {active && (
                    <span
                      className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.accent, color: theme.accentText }}
                    >
                      <CheckIcon className="h-3 w-3" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
