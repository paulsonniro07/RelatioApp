import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PencilIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/errors';
import { relationshipKindLabel } from '@/features/tree/chartTypes';
import { useTreeChart } from '@/hooks/useTreeChart';
import type { ChartType, ChartTypeInput, RelationshipTypeDef } from '@/features/tree/types';

import { RelationshipTypeForm } from './RelationshipTypeForm';

interface ChartTypeManagerProps {
  open: boolean;
  /** Start on a blank new chart type rather than the list. */
  startNew?: boolean;
  onClose: () => void;
}

interface Draft {
  id: string | null;
  name: string;
  relationships: RelationshipTypeDef[];
  usesLevels: boolean;
}

function toDraft(chartType: ChartType): Draft {
  return {
    id: chartType.id,
    name: chartType.name,
    relationships: chartType.relationships.map((def) => ({ ...def })),
    usesLevels: chartType.usesLevels,
  };
}

/** Create / rename / duplicate / delete chart types and edit their vocabulary. */
export function ChartTypeManager({ open, startNew = false, onClose }: ChartTypeManagerProps) {
  const {
    chartTypes,
    chart,
    activeChartType,
    createChartType,
    updateChartType,
    deleteChartType,
    setChartType,
  } = useTreeChart();
  const { success: toastSuccess, error: toastError } = useToast();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [relEditing, setRelEditing] = useState<number | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<ChartType | null>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setRelEditing(null);
    if (startNew) {
      setDraft({ id: null, name: '', relationships: [], usesLevels: false });
    } else {
      const source = activeChartType ?? chartTypes[0] ?? null;
      setDraft(
        source
          ? toDraft(source)
          : { id: null, name: '', relationships: [], usesLevels: false },
      );
    }
  }, [open, startNew, activeChartType, chartTypes]);

  const startNewDraft = () =>
    setDraft({ id: null, name: '', relationships: [], usesLevels: false });

  const duplicate = (source: ChartType) => {
    setDraft({
      id: null,
      name: `${source.name} copy`,
      relationships: source.relationships.map((def) => ({
        ...def,
        id: `${def.id}-copy`,
      })),
      usesLevels: source.usesLevels,
    });
    setRelEditing(null);
  };

  const saveRelationship = (def: RelationshipTypeDef) => {
    setDraft((current) => {
      if (!current) return current;
      if (relEditing === 'new' || relEditing === null) {
        return { ...current, relationships: [...current.relationships, def] };
      }
      const next = [...current.relationships];
      next[relEditing] = def;
      return { ...current, relationships: next };
    });
    setRelEditing(null);
  };

  const removeRelationship = (index: number) => {
    setDraft((current) =>
      current
        ? { ...current, relationships: current.relationships.filter((_, i) => i !== index) }
        : current,
    );
    setRelEditing(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setError('Name is required');
      return;
    }
    setError('');
    setSaving(true);
    const input: ChartTypeInput = {
      name,
      relationships: draft.relationships,
      usesLevels: draft.usesLevels,
    };
    try {
      if (draft.id) {
        await updateChartType(draft.id, input);
        toastSuccess('Chart type updated');
      } else {
        const created = await createChartType(input);
        // Make the newly created chart type active so the user sees it.
        if (chart) await setChartType(created.id);
        setDraft(toDraft(created));
        toastSuccess('Chart type created');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save chart type'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteChartType(deleting.id);
      setDeleting(null);
      const remaining = chartTypes.filter((ct) => ct.id !== deleting.id);
      setDraft(remaining[0] ? toDraft(remaining[0]) : null);
      toastSuccess('Chart type deleted');
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to delete chart type'));
      setDeleting(null);
    }
  };

  return (
    <>
      <Modal open={open} title="Chart types" onClose={onClose} wide>
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Your chart types</span>
              <button
                type="button"
                onClick={startNewDraft}
                aria-label="New chart type"
                className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-72 space-y-1 overflow-auto">
              {chartTypes.map((ct) => {
                const active = draft?.id === ct.id && draft.id !== null;
                return (
                  <div
                    key={ct.id}
                    className={`flex items-center rounded-md ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(toDraft(ct));
                        setRelEditing(null);
                      }}
                      className={`flex-1 truncate rounded px-2 py-1.5 text-left text-sm ${
                        active ? 'font-medium text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {ct.name}
                      {ct.isExample && (
                        <span className="ml-1.5 text-[10px] uppercase tracking-wide text-amber-600">
                          preset
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicate(ct)}
                      aria-label={`Duplicate ${ct.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(ct)}
                      aria-label={`Delete ${ct.name}`}
                      className="mr-0.5 flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
              {chartTypes.length === 0 && (
                <p className="px-2 py-1 text-sm text-gray-400">No chart types yet.</p>
              )}
            </div>
          </div>

          {draft ? (
            <div className="space-y-4">
              <Input
                label="Chart type name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
                error={error}
                placeholder="e.g. Clan, D&D Party, Book Club"
              />

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.usesLevels}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, usesLevels: event.target.checked } : current,
                    )
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                Show a manual “Rank / tier” field and legend
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Relationship types</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setRelEditing('new')}
                  >
                    <PlusIcon className="mr-1 h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>

                <div className="space-y-1">
                  {draft.relationships.map((def, index) => (
                    <div
                      key={def.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-2 py-1.5"
                    >
                      <span className="min-w-0 truncate text-sm text-gray-700">
                        {def.label || def.forwardLabel}
                        <span className="ml-1 text-xs text-gray-400">
                          {relationshipKindLabel(def)}
                        </span>
                      </span>
                      <span className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setRelEditing(index)}
                          aria-label={`Edit ${def.label}`}
                          className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRelationship(index)}
                          aria-label={`Remove ${def.label}`}
                          className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                  {draft.relationships.length === 0 && relEditing !== 'new' && (
                    <p className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400">
                      No relationship types yet — add one to give the chart a vocabulary.
                    </p>
                  )}
                </div>

                {relEditing !== null && (
                  <div className="mt-2">
                    <RelationshipTypeForm
                      initial={
                        relEditing === 'new' ? undefined : draft.relationships[relEditing]
                      }
                      existingIds={draft.relationships.map((def) => def.id)}
                      onSave={saveRelationship}
                      onCancel={() => setRelEditing(null)}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
                <Button loading={saving} onClick={() => void handleSave()}>
                  {draft.id ? 'Save changes' : 'Create chart type'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              Select a chart type or create a new one.
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete chart type"
        message={
          deleting
            ? `Delete "${deleting.name}"? Charts using it keep their data and fall back to your first chart type.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
