import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { useDebounce } from '@/hooks/useDebounce';
import type { TreeNode } from '@/features/tree/types';

interface NodeSelectProps {
  nodes: TreeNode[];
  value: string | null;
  onChange: (id: string | null) => void;
  excludeId?: string;
  placeholder?: string;
  /** Label for the "clear selection" row shown inside the dropdown (default "No parent (root)"). */
  noneLabel?: string;
  /** Accessible label for the inline clear button (default "Clear parent"). */
  clearLabel?: string;
  label?: string;
  hint?: string;
  error?: string;
}

export function NodeSelect({
  nodes,
  value,
  onChange,
  excludeId,
  placeholder = 'Search nodes…',
  noneLabel = 'No parent (root)',
  clearLabel = 'Clear parent',
  label,
  hint,
  error,
}: NodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const selected = nodes.find((n) => n.id === value) ?? null;

  const setKeywordDebounced = useDebounce((next: string) => setKeyword(next), 300);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const candidates = nodes.filter((n) => n.id !== excludeId);
    if (!kw) return candidates.slice(0, 20);
    return candidates
      .filter(
        (n) => n.name.toLowerCase().includes(kw) || n.role.toLowerCase().includes(kw),
      )
      .slice(0, 20);
  }, [nodes, keyword, excludeId]);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  const select = (id: string | null) => {
    onChange(id);
    setOpen(false);
    setDraft('');
    setKeyword('');
  };

  const inputValue = open ? draft : (selected?.name ?? '');

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div ref={containerRef} className="relative">
        <input
          id={inputId}
          value={inputValue}
          onChange={(event) => {
            setDraft(event.target.value);
            setKeywordDebounced(event.target.value);
          }}
          onFocus={() => {
            setOpen(true);
            setDraft('');
          }}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-md border px-3 py-2 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-gray-300 focus:border-blue-400 focus:ring-blue-100'
          }`}
        />
        {selected && !open && (
          <button
            type="button"
            onClick={() => select(null)}
            aria-label={clearLabel}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {open && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          >
            <li role="option" aria-selected={value === null}>
              <button
                type="button"
                onClick={() => select(null)}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="font-medium">{noneLabel}</span>
              </button>
            </li>
            {filtered.map((n) => (
              <li key={n.id} role="option" aria-selected={value === n.id}>
                <button
                  type="button"
                  onClick={() => select(n.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span className="truncate font-medium">{n.name}</span>
                  {n.role && <span className="truncate text-xs text-gray-500">{n.role}</span>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">No matching nodes</li>
            )}
          </ul>
        )}
      </div>
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
