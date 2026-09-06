import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { CheckIcon, ChevronDownIcon } from './icons';

export interface DropdownOption {
  id: string;
  label: ReactNode;
  /** Optional one-line hint shown under the label. */
  description?: string;
}

interface DropdownProps {
  /** Content rendered inside the trigger (before the chevron). */
  trigger: ReactNode;
  options: DropdownOption[];
  value: string;
  onSelect: (id: string) => void;
  align?: 'left' | 'right';
  ariaLabel: string;
  /** `pill` gives the trigger a visible bordered control look (toolbar selectors). */
  variant?: 'ghost' | 'pill';
  /** Extra style applied to the trigger button. */
  style?: CSSProperties;
}

/** Small themed dropdown used for toolbar selectors (mode, theme, …). */
export function Dropdown({
  trigger,
  options,
  value,
  onSelect,
  align = 'left',
  ariaLabel,
  variant = 'ghost',
  style,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const triggerClass =
    variant === 'pill'
      ? 'inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--control-hover)] px-2.5 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)]'
      : 'inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)]';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((openState) => !openState)}
        className={triggerClass}
        style={style}
      >
        {trigger}
        <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-50 mt-1 min-w-44 overflow-hidden rounded-lg border p-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ backgroundColor: 'var(--surface-background)', borderColor: 'var(--border-color)' }}
        >
          {options.map((option) => {
            const active = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onSelect(option.id);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--control-hover)]"
              >
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-sm font-medium text-[var(--text-primary)]"
                  >
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="block truncate text-xs text-[var(--text-muted)]">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {active ? (
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
