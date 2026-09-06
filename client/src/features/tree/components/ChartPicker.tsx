import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PencilIcon, TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { ModeToggle } from '@/features/tree/components/ModeToggle';
import { useTreeChart } from '@/hooks/useTreeChart';
import type { ChartMode, ChartSummary } from '@/features/tree/types';

interface ChartPickerProps {
  open: boolean;
  onClose: () => void;
}

function errorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
  return data?.message ?? 'Something went wrong';
}

export function ChartPicker({ open, onClose }: ChartPickerProps) {
  const { charts, chart, selectChart, createChart, renameChart, deleteChart } = useTreeChart();
  const { error: toastError } = useToast();

  const [name, setName] = useState('');
  const [mode, setMode] = useState<ChartMode>('org');
  const [error, setError] = useState('');

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  const [deletingChart, setDeletingChart] = useState<ChartSummary | null>(null);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    setError('');
    try {
      await createChart(trimmed, mode);
      setName('');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const startRename = (target: ChartSummary) => {
    setRenamingId(target.id);
    setRenameValue(target.name);
    setRenameError('');
  };

  const handleRenameSave = async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError('Name is required');
      return;
    }
    setRenameError('');
    try {
      await renameChart(renamingId, trimmed);
      setRenamingId(null);
    } catch (err) {
      setRenameError(errorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!deletingChart) return;
    try {
      await deleteChart(deletingChart.id);
      setDeletingChart(null);
      onClose();
    } catch {
      toastError('Failed to delete chart');
      setDeletingChart(null);
    }
  };

  return (
    <>
      <Modal open={open} title="Charts" onClose={onClose}>
        <div className="space-y-4">
          <div className="max-h-60 space-y-1 overflow-auto">
            {charts.map((c) => {
              const isRenaming = renamingId === c.id;
              const isActive = chart?.id === c.id;
              return (
                <div
                  key={c.id}
                  className={`flex items-center rounded-md ${
                    isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {isRenaming ? (
                    <div className="flex flex-1 flex-col px-2 py-1.5">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Enter') void handleRenameSave();
                          if (event.key === 'Escape') setRenamingId(null);
                        }}
                        aria-label="Chart name"
                        className="w-full rounded border border-blue-300 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      {renameError && <p className="mt-1 text-xs text-red-600">{renameError}</p>}
                      <div className="mt-1 flex gap-1">
                        <Button size="sm" onClick={() => void handleRenameSave()}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          void selectChart(c.id).catch(() => undefined);
                          onClose();
                        }}
                        className={`flex flex-1 items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          isActive ? 'font-medium text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                          <span className="truncate">{c.name}</span>
                          {c.isExample && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              Example
                            </span>
                          )}
                        </span>
                        <span className="ml-2 shrink-0 text-xs text-gray-400">
                          {c.mode === 'org' ? 'Org' : 'Family'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => startRename(c)}
                        aria-label={`Rename ${c.name}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingChart(c)}
                        aria-label={`Delete ${c.name}`}
                        className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
            {charts.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">
                No charts yet — create one below.
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="mb-3 text-sm font-medium text-gray-700">New chart</p>
            <div className="space-y-3">
              <Input
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                error={error}
                placeholder="e.g. My Org Chart"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-700">Type</span>
                <ModeToggle mode={mode} onChange={setMode} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={() => void handleCreate()}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deletingChart !== null}
        title="Delete chart"
        message={
          deletingChart
            ? deletingChart.isExample
              ? `Delete the example chart "${deletingChart.name}"? It will be re-created automatically so an Org + Family reference is always available.`
              : `Delete "${deletingChart.name}"? This removes the chart and all of its nodes.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeletingChart(null)}
      />
    </>
  );
}

