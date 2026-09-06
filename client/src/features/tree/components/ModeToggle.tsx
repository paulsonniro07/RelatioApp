import type { ChartMode } from '@/features/tree/types';

interface ModeToggleProps {
  mode: ChartMode;
  onChange: (mode: ChartMode) => void;
}

const options: Array<{ value: ChartMode; label: string }> = [
  { value: 'org', label: 'Org chart' },
  { value: 'family', label: 'Family tree' },
];

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Chart type"
      className="inline-flex rounded-md border border-gray-200 bg-gray-100 p-0.5"
    >
      {options.map((option) => {
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded px-4 text-sm font-medium transition-colors sm:min-h-8 sm:px-3 ${
              active
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
