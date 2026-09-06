import { useTheme } from '@/features/tree/theme/ThemeProvider';

interface CanvasControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
}

export function CanvasControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
}: CanvasControlsProps) {
  const { theme } = useTheme();

  const iconButton =
    'flex h-11 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)] sm:h-8 sm:w-8';

  return (
    <div
      className="absolute bottom-4 right-4 z-30 flex items-center gap-0.5 rounded-full p-1"
      style={{
        backgroundColor: theme.surfaceBackground,
        border: `1px solid ${theme.borderColor}`,
        boxShadow: '0 8px 24px rgba(60, 50, 30, 0.14)',
      }}
    >
      <button type="button" onClick={onZoomOut} aria-label="Zoom out" className={`${iconButton} w-11 sm:w-8`}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset zoom to 100%"
        className="flex h-11 min-w-11 items-center justify-center rounded-full px-1 text-xs font-medium tabular-nums text-[var(--text-secondary)] transition-colors hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)] sm:h-8 sm:min-w-9"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" onClick={onZoomIn} aria-label="Zoom in" className={`${iconButton} w-11 sm:w-8`}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <div className="mx-0.5 hidden h-5 w-px sm:block" style={{ backgroundColor: theme.borderColor }} />
      <button
        type="button"
        onClick={onFit}
        aria-label="Fit chart to view"
        className="flex h-11 items-center justify-center rounded-full px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)] sm:h-8"
      >
        Fit
      </button>
    </div>
  );
}
