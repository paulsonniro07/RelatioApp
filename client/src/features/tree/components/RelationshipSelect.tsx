import { relationshipLabelForValue, relationshipOptions } from '@/features/tree/chartTypes';
import type { ChartType } from '@/features/tree/types';

interface RelationshipSelectProps {
  chartType: ChartType;
  value: string;
  onChange: (value: string) => void;
  /** When provided, adds a "+ Add relationship type" row at the bottom. */
  onAddRelationshipType?: () => void;
  /** A free-text role from a legacy/custom node, shown as the current value. */
  allowCustomValue?: string;
  label?: string;
  error?: string;
}

const ADD_VALUE = '__add__';

/** Relationship dropdown populated from the active chart type's vocabulary. */
export function RelationshipSelect({
  chartType,
  value,
  onChange,
  onAddRelationshipType,
  allowCustomValue,
  label,
  error,
}: RelationshipSelectProps) {
  const options = relationshipOptions(chartType);
  const hasValue = value !== '';
  const isKnown = options.some((option) => option.value === value);
  // A value that no longer matches an option (e.g. the chart type changed) is
  // shown by its human label — never the internal "<id>:<direction>" key.
  const unknownLabel = hasValue
    ? relationshipLabelForValue(chartType, value, allowCustomValue)
    : '';

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        value={value}
        onChange={(event) => {
          if (event.target.value === ADD_VALUE) {
            onAddRelationshipType?.();
            return;
          }
          onChange(event.target.value);
        }}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-gray-300 focus:border-blue-400 focus:ring-blue-100'
        }`}
      >
        <option value="">— none —</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {!isKnown && hasValue && <option value={value}>{unknownLabel}</option>}
        {onAddRelationshipType && <option value={ADD_VALUE}>+ Add relationship type…</option>}
      </select>
      {chartType.relationships.length === 0 && (
        <p className="text-xs text-gray-500">
          This chart type has no relationship types yet — add one below.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
