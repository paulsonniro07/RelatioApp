import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/errors';
import { useTreeChart } from '@/hooks/useTreeChart';
import type { ChartType, TreeNode } from '@/features/tree/types';

import { NodeSelect } from './NodeSelect';
import { RelationshipSelect } from './RelationshipSelect';

interface ConnectNodeDialogProps {
  open: boolean;
  /** The card being connected (in the active chart). */
  source: TreeNode | null;
  chartType: ChartType;
  /** Preselected target (e.g. when opened by dropping onto a card). */
  initialTargetId?: string | null;
  /** Preselected relationship option value. */
  initialRelationshipValue?: string;
  onClose: () => void;
  onConfirm: (targetId: string, relationshipValue: string) => Promise<void>;
}

/** Connects two cards in the same chart with a chosen relationship. */
export function ConnectNodeDialog({
  open,
  source,
  chartType,
  initialTargetId = null,
  initialRelationshipValue = '',
  onClose,
  onConfirm,
}: ConnectNodeDialogProps) {
  const { chart } = useTreeChart();

  const [targetId, setTargetId] = useState<string | null>(null);
  const [relationshipValue, setRelationshipValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTargetId(initialTargetId);
    setRelationshipValue(initialRelationshipValue);
    setError('');
    setSaving(false);
  }, [open, initialTargetId, initialRelationshipValue]);

  const candidates = (chart?.nodes ?? []).filter((n) => n.id !== source?.id);

  const handleConfirm = async () => {
    if (!targetId || !relationshipValue) {
      setError('Choose a card and a relationship');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onConfirm(targetId, relationshipValue);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to connect'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={`Connect ${source?.name ?? 'card'}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Link <span className="font-medium text-gray-700">{source?.name}</span> to another
          card in this chart and choose how they relate.
        </p>

        {candidates.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500">
            There are no other cards in this chart to connect to.
          </p>
        ) : (
          <>
            <NodeSelect
              label="Connect to"
              nodes={candidates}
              value={targetId}
              onChange={setTargetId}
              noneLabel="— select a card —"
              clearLabel="Clear card"
              placeholder="Search cards…"
            />
            <RelationshipSelect
              label="Relationship"
              chartType={chartType}
              value={relationshipValue}
              onChange={setRelationshipValue}
            />
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={saving}
            disabled={candidates.length === 0}
            onClick={() => void handleConfirm()}
          >
            Connect
          </Button>
        </div>
      </div>
    </Modal>
  );
}
