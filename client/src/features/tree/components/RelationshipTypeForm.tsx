import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  RELATIONSHIP_ICON_KEYS,
  relationshipIdFromLabel,
} from '@/features/tree/chartTypes';
import type { RelationshipLink, RelationshipTypeDef } from '@/features/tree/types';

type Kind = 'hierarchy' | 'side' | 'sibling';

const KIND_OPTIONS: Array<{ value: Kind; label: string; hint: string }> = [
  {
    value: 'hierarchy',
    label: 'Above / Below',
    hint: 'One card sits above the other — e.g. Captain → Crew member',
  },
  {
    value: 'side',
    label: 'Side by side',
    hint: 'Same level, linked laterally — e.g. Spouse, Colleague',
  },
  {
    value: 'sibling',
    label: 'Same parent (siblings)',
    hint: 'Share a parent — e.g. Brother / Sister',
  },
];

function kindOf(def: RelationshipTypeDef | undefined): Kind {
  if (!def) return 'hierarchy';
  if (def.link === 'shared-parent') return 'sibling';
  return def.directional ? 'hierarchy' : 'side';
}

const LINK_BY_KIND: Record<Kind, RelationshipLink> = {
  hierarchy: 'parent',
  side: 'partner',
  sibling: 'shared-parent',
};

interface RelationshipTypeFormProps {
  initial?: RelationshipTypeDef;
  /** Existing relationship ids in the chart type, for slug collision handling. */
  existingIds: string[];
  onSave: (def: RelationshipTypeDef) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

/** Compact create/edit form for a single relationship type. */
export function RelationshipTypeForm({
  initial,
  existingIds,
  onSave,
  onCancel,
  saving = false,
}: RelationshipTypeFormProps) {
  const [kind, setKind] = useState<Kind>(kindOf(initial));
  const [upper, setUpper] = useState(initial?.forwardLabel ?? '');
  const [lower, setLower] = useState(initial?.backwardLabel ?? '');
  const [single, setSingle] = useState(
    initial && kindOf(initial) !== 'hierarchy'
      ? initial.label || initial.forwardLabel
      : '',
  );
  const [icon, setIcon] = useState(initial?.icon ?? 'user');
  const [error, setError] = useState('');

  const idsWithoutSelf = existingIds.filter((id) => id !== initial?.id);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let forwardLabel: string;
    let backwardLabel: string;
    let label: string;

    if (kind === 'hierarchy') {
      const up = upper.trim();
      const down = lower.trim();
      if (!up || !down) {
        setError('Give both an upper and a lower label');
        return;
      }
      forwardLabel = up;
      backwardLabel = down;
      label = up === down ? up : `${up} / ${down}`;
    } else {
      const value = single.trim();
      if (!value) {
        setError('Give the relationship a label');
        return;
      }
      forwardLabel = value;
      backwardLabel = value;
      label = value;
    }

    const id = initial?.id ?? relationshipIdFromLabel(label, idsWithoutSelf);
    setError('');
    await onSave({
      id,
      label,
      forwardLabel,
      backwardLabel,
      icon,
      directional: kind === 'hierarchy',
      link: LINK_BY_KIND[kind],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="space-y-1">
        <span className="block text-sm font-medium text-gray-700">How do cards connect?</span>
        <div className="grid gap-1.5">
          {KIND_OPTIONS.map((option) => {
            const active = kind === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setKind(option.value)}
                className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
                  active
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="block text-sm font-medium text-gray-800">{option.label}</span>
                <span className="block text-xs text-gray-500">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {kind === 'hierarchy' ? (
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Upper label"
            value={upper}
            autoFocus
            onChange={(event) => setUpper(event.target.value)}
            placeholder="e.g. Captain"
          />
          <Input
            label="Lower label"
            value={lower}
            onChange={(event) => setLower(event.target.value)}
            placeholder="e.g. Crew member"
          />
        </div>
      ) : (
        <Input
          label="Label"
          value={single}
          autoFocus
          onChange={(event) => setSingle(event.target.value)}
          placeholder={kind === 'sibling' ? 'e.g. Sibling' : 'e.g. Colleague'}
        />
      )}

      <label className="flex items-center gap-2 text-sm text-gray-700">
        Icon
        <select
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          {RELATIONSHIP_ICON_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={saving}>
          Save relationship
        </Button>
      </div>
    </form>
  );
}
