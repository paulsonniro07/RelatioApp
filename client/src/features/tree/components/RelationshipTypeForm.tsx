import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  RELATIONSHIP_ICON_KEYS,
  relationshipIdFromLabel,
} from '@/features/tree/chartTypes';
import type { RelationshipLink, RelationshipTypeDef } from '@/features/tree/types';

const LINK_OPTIONS: Array<{ value: RelationshipLink; label: string }> = [
  { value: 'parent', label: 'Hierarchy — sets parent / child' },
  { value: 'partner', label: 'Lateral — links beside (spouse, colleague)' },
  { value: 'shared-parent', label: 'Shared parent — same generation (sibling)' },
];

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
  const [forwardLabel, setForwardLabel] = useState(initial?.forwardLabel ?? '');
  const [backwardLabel, setBackwardLabel] = useState(initial?.backwardLabel ?? '');
  const [directional, setDirectional] = useState(initial?.directional ?? true);
  const [link, setLink] = useState<RelationshipLink>(initial?.link ?? 'parent');
  const [icon, setIcon] = useState(initial?.icon ?? 'user');
  const [error, setError] = useState('');

  const idsWithoutSelf = existingIds.filter((id) => id !== initial?.id);

  const handleDirectionalChange = (next: boolean) => {
    setDirectional(next);
    if (next && link === 'shared-parent') setLink('parent');
    if (!next && link === 'parent') setLink('partner');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const forward = forwardLabel.trim();
    const backward = backwardLabel.trim();
    if (!forward && !backward) {
      setError('Provide at least one label');
      return;
    }
    const resolvedForward = forward || backward;
    const resolvedBackward = backward || forward;
    const label =
      resolvedForward === resolvedBackward
        ? resolvedForward
        : `${resolvedForward} / ${resolvedBackward}`;
    const id = initial?.id ?? relationshipIdFromLabel(label, idsWithoutSelf);

    setError('');
    await onSave({
      id,
      label,
      forwardLabel: resolvedForward,
      backwardLabel: resolvedBackward,
      icon,
      directional,
      link,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="From label"
          value={forwardLabel}
          autoFocus
          onChange={(event) => setForwardLabel(event.target.value)}
          placeholder="e.g. Parent"
        />
        <Input
          label="To label"
          value={backwardLabel}
          onChange={(event) => setBackwardLabel(event.target.value)}
          placeholder="e.g. Child"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={directional}
            onChange={(event) => handleDirectionalChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Directional (hierarchy)
        </label>
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
      </div>
      <label className="block text-sm text-gray-700">
        Wiring
        <select
          value={link}
          onChange={(event) => setLink(event.target.value as RelationshipLink)}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        >
          {LINK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
