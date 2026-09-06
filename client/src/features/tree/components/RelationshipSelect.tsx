import { RELATIONSHIP_OPTIONS } from '@/features/tree/relationshipOptions';
import type { ChartMode } from '@/features/tree/types';

interface RelationshipSelectProps {
  chartMode: ChartMode;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

export function RelationshipSelect({
  chartMode,
  value,
  onChange,
  label,
  error,
}: RelationshipSelectProps) {
  const options = RELATIONSHIP_OPTIONS[chartMode];
  const hasCustomValue = value !== '' && !options.includes(value);

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-gray-300 focus:border-blue-400 focus:ring-blue-100'
        }`}
      >
        <option value="">— none —</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {hasCustomValue && (
          <option value={value}>
            {value} (current)
          </option>
        )}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
