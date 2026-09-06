import { useEffect, useRef, useState } from 'react';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dropdown } from '@/components/ui/Dropdown';
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronDownIcon,
  CursorArrowIcon,
  DownloadIcon,
  MenuIcon,
  PaletteIcon,
  PlusIcon,
  SparklesIcon,
  SquaresIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/errors';
import { ChartPicker } from '@/features/tree/components/ChartPicker';
import { LevelLegend } from '@/features/tree/components/LevelLegend';
import { NodeForm } from '@/features/tree/components/NodeForm';
import { TreeCanvas } from '@/features/tree/components/TreeCanvas';
import {
  ChartExportStage,
  type ChartExportHandle,
} from '@/features/tree/export/ChartExportStage';
import { useTreeChart } from '@/hooks/useTreeChart';
import { AppearancePanel } from '@/features/tree/theme/AppearancePanel';
import { useTheme } from '@/features/tree/theme/ThemeProvider';
import type {
  ChartMode,
  NodePhotoDraft,
  TreeNode,
  TreeNodeInput,
} from '@/features/tree/types';

type FormMode = 'add' | 'edit' | null;

export function TreeChartPage() {
  const {
    chart,
    loading,
    error,
    reload,
    addNode,
    updateNode,
    setParent,
    setPartner,
    uploadPhoto,
    removePhoto,
    deleteNode,
    deleteNodes,
    applyAutoLayout,
    reset,
    setChartMode,
  } = useTreeChart();
  const { success: toastSuccess, error: toastError } = useToast();
  const { theme } = useTheme();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingNode, setEditingNode] = useState<TreeNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TreeNode | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const exportStageRef = useRef<ChartExportHandle>(null);
  const [exporting, setExporting] = useState(false);

  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  // Leave selection mode whenever the active chart changes.
  useEffect(() => {
    setSelectedId(null);
    setSelectedIds(new Set());
    setMultiSelect(false);
  }, [chart?.id]);

  const openAdd = () => {
    setEditingNode(null);
    setFormMode('add');
  };

  const openEdit = (node: TreeNode) => {
    setEditingNode(node);
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingNode(null);
  };

  const handleSubmitForm = async (
    input: TreeNodeInput,
    editingId: string | null,
    photo: NodePhotoDraft,
  ) => {
    try {
      if (editingId) {
        await updateNode(editingId, {
          name: input.name,
          role: input.role,
          level: input.level,
          notes: input.notes,
          photoUrl: input.photoUrl,
        });
        await setParent(editingId, input.parentId);
        if (input.partnerId !== editingNode?.partnerId) {
          await setPartner(editingId, input.partnerId);
        }
        if (photo.remove) {
          await removePhoto(editingId);
        } else if (photo.file) {
          await uploadPhoto(editingId, photo.file);
        }
        toastSuccess('Node updated');
      } else {
        const created = await addNode(input);
        if (photo.file) {
          await uploadPhoto(created.id, photo.file);
        }
        toastSuccess('Node created');
      }
      closeForm();
    } catch (err) {
      toastError(
        getErrorMessage(err, editingId ? 'Failed to update node' : 'Failed to create node'),
      );
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      await updateNode(id, { name });
      toastSuccess('Name updated');
    } catch {
      toastError('Failed to rename node');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startMultiSelect = () => {
    setSelectedId(null);
    setMultiSelect(true);
  };

  const stopMultiSelect = () => {
    setMultiSelect(false);
    setSelectedIds(new Set());
  };

  const confirmDeleteSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      await deleteNodes(ids);
      setSelectedIds(new Set());
      toastSuccess(`${ids.length} node${ids.length === 1 ? '' : 's'} deleted`);
      setDeleteSelectedOpen(false);
    } catch {
      toastError('Failed to delete nodes');
    }
  };

  const performReset = () => {
    setSelectedIds(new Set());
    setMultiSelect(false);
    void reset().catch(() => toastError('Failed to reset chart'));
  };

  /** Mounts the offscreen export stage, lets it paint, then rasterizes to PNG. */
  const runExport = (transparent: boolean) => {
    if (exporting) return;
    setExporting(true);
    window.setTimeout(() => {
      void exportStageRef.current
        ?.exportPng({ transparent })
        .then((url) => {
          if (url) toastSuccess('Image exported');
          else toastError('Nothing to export yet');
        })
        .catch(() => toastError('Export failed'))
        .finally(() => setExporting(false));
    }, 150);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteNode(deleteTarget.id);
      if (selectedId === deleteTarget.id) setSelectedId(null);
      toastSuccess('Node deleted');
      setDeleteTarget(null);
    } catch {
      toastError('Failed to delete node');
    }
  };

  if (loading && !chart) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-background)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!loading && error && !chart) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-background)]">
        <EmptyState
          message="Couldn't load charts"
          description={error}
          action={<Button onClick={() => void reload()}>Retry</Button>}
        />
      </div>
    );
  }

  if (!chart) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-background)]">
        <EmptyState
          message="No charts yet"
          description="Create your first chart to start building a tree."
          action={<Button onClick={() => setPickerOpen(true)}>Create chart</Button>}
        />
        <ChartPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: theme.appBackground }}>
      <header
        className="border-b px-4 py-3"
        style={{ backgroundColor: theme.surfaceBackground, borderColor: theme.borderColor }}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
              aria-hidden="true"
            >
              <UsersIcon className="h-4 w-4" />
            </span>
            <h1 className="truncate text-lg font-semibold" style={{ color: theme.textPrimary }}>
              {chart.name}
            </h1>
            <Dropdown
              variant="pill"
              ariaLabel="Chart type"
              value={chart.mode}
              trigger={
                <span
                  className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold"
                  style={{ color: theme.textPrimary }}
                >
                  {chart.mode === 'org' ? 'Org chart' : 'Family tree'}
                </span>
              }
              options={[
                {
                  id: 'org',
                  label: 'Org chart',
                  description: 'Managers, reports & job titles',
                },
                {
                  id: 'family',
                  label: 'Family tree',
                  description: 'Relationships, spouses & generations',
                },
              ]}
              onSelect={(id) => {
                const next = id as ChartMode;
                if (next === chart.mode) return;
                void setChartMode(next)
                  .then(() =>
                    toastSuccess(
                      next === 'org' ? 'Switched to org chart' : 'Switched to family tree',
                    ),
                  )
                  .catch(() => toastError('Failed to switch chart type'));
              }}
            />
            <span className="whitespace-nowrap text-xs" style={{ color: theme.textSecondary }}>
              {chart.nodes.length} nodes
            </span>
          </div>
          <div className="flex items-center border-l pl-2" style={{ borderColor: theme.borderColor }}>
            <div className="hidden items-center gap-1 lg:flex">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                style={{ borderRadius: 8 }}
                onClick={() => setPickerOpen(true)}
              >
                <SquaresIcon className="h-4 w-4" />
                Charts
              </Button>
              <Button
                variant={multiSelect ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-1.5"
                style={{ borderRadius: 8 }}
                onClick={multiSelect ? stopMultiSelect : startMultiSelect}
              >
                {multiSelect ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <CursorArrowIcon className="h-4 w-4" />
                )}
                {multiSelect ? 'Done' : 'Select'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                style={{ borderRadius: 8 }}
                onClick={() =>
                  void applyAutoLayout().catch(() => toastError('Failed to save layout'))
                }
              >
                <SparklesIcon className="h-4 w-4" />
                Auto layout
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                style={{ borderRadius: 8 }}
                onClick={() => setResetOpen(true)}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Reset
              </Button>
            </div>

            <span
              className="mx-1 hidden h-6 w-px lg:block"
              style={{ backgroundColor: theme.borderColor }}
            />

            <div className="hidden items-center gap-1 lg:flex">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                style={{
                  borderRadius: 8,
                  backgroundColor: theme.controlHover,
                  border: `1px solid ${theme.borderColor}`,
                }}
                onClick={() => setAppearanceOpen(true)}
                title="Appearance"
                aria-label="Change appearance theme"
              >
                <PaletteIcon className="h-4 w-4" />
                <span className="hidden xl:inline">Theme</span>
                <span className="font-semibold text-[var(--text-primary)]">{theme.label}</span>
                <ChevronDownIcon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              </Button>
              <Dropdown
                variant="pill"
                align="right"
                ariaLabel="Export chart as image"
                value=""
                trigger={
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <DownloadIcon className="h-4 w-4" />
                    Export
                  </span>
                }
                options={[
                  {
                    id: 'png-solid',
                    label: 'PNG — with background',
                    description: 'Framed card on the theme canvas colour',
                  },
                  {
                    id: 'png-transparent',
                    label: 'PNG — transparent',
                    description: 'Just the tree, ready to drop elsewhere',
                  },
                ]}
                onSelect={(id) => runExport(id === 'png-transparent')}
              />
              <Button size="sm" className="gap-1.5" style={{ borderRadius: 8 }} onClick={openAdd}>
                <PlusIcon className="h-4 w-4" />
                Add node
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setActionsOpen(true)}
              aria-label="Open actions menu"
              className="flex h-11 w-11 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 lg:hidden"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        <LevelLegend nodes={chart.nodes} mode={chart.mode} />
      </header>

      <main className="relative min-h-0 flex-1">
        <TreeCanvas
          nodes={chart.nodes}
          mode={chart.mode}
          selectedId={selectedId}
          selectionMode={multiSelect}
          multiSelectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelect={setSelectedId}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onRename={handleRename}
        />
        {multiSelect && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
            <div
              className="pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-2 shadow-md"
              style={{ backgroundColor: theme.surfaceBackground, border: `1px solid ${theme.borderColor}` }}
            >
              {selectedIds.size === 0 ? (
                <span className="text-sm" style={{ color: theme.textSecondary }}>
                  Click nodes to select
                </span>
              ) : (
                <>
                  <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>
                    {selectedIds.size} selected
                  </span>
                  <Button variant="danger" size="sm" onClick={() => setDeleteSelectedOpen(true)}>
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <NodeForm
        open={formMode !== null}
        mode={formMode === 'edit' ? 'edit' : 'add'}
        chartMode={chart.mode}
        node={editingNode}
        nodes={chart.nodes}
        defaultParentId={selectedId}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete node"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? Children will be detached (become root nodes) and spouse links removed.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={deleteSelectedOpen}
        title={`Delete ${selectedIds.size} node${selectedIds.size === 1 ? '' : 's'}`}
        message={`Delete ${selectedIds.size} selected node${selectedIds.size === 1 ? '' : 's'}? Children of deleted nodes will be detached.`}
        confirmLabel="Delete"
        onConfirm={() => void confirmDeleteSelected()}
        onCancel={() => setDeleteSelectedOpen(false)}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Reset chart?"
        message={`Clear all ${chart.nodes.length} node${chart.nodes.length === 1 ? '' : 's'} from "${chart.name}"? This cannot be undone.`}
        confirmLabel="Yes, reset"
        cancelLabel="No"
        onConfirm={() => {
          setResetOpen(false);
          performReset();
        }}
        onCancel={() => setResetOpen(false)}
      />

      <BottomSheet open={actionsOpen} onClose={() => setActionsOpen(false)}>
        <Button
          variant="ghost"
          size="lg"
          className="h-12"
          onClick={() => {
            setActionsOpen(false);
            setAppearanceOpen(true);
          }}
        >
          <PaletteIcon className="mr-2 h-5 w-5" />
          Theme
        </Button>
        <Button
          size="lg"
          className="h-12"
          onClick={() => {
            setActionsOpen(false);
            setPickerOpen(true);
          }}
        >
          <SquaresIcon className="mr-2 h-5 w-5" />
          Charts
        </Button>
        <Button
          size="lg"
          className="h-12"
          onClick={() => {
            setActionsOpen(false);
            openAdd();
          }}
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          Add node
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="h-12"
          onClick={() => {
            setActionsOpen(false);
            startMultiSelect();
          }}
        >
          <CursorArrowIcon className="mr-2 h-5 w-5" />
          Select nodes to delete
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="h-12"
          onClick={() => {
            setActionsOpen(false);
            void applyAutoLayout().catch(() => toastError('Failed to save layout'));
          }}
        >
          <SparklesIcon className="mr-2 h-5 w-5" />
          Auto layout
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="h-12"
          onClick={() => {
            setActionsOpen(false);
            runExport(false);
          }}
        >
          <DownloadIcon className="mr-2 h-5 w-5" />
          Export image
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="h-12"
          onClick={() => {
            setActionsOpen(false);
            setResetOpen(true);
          }}
        >
          <ArrowPathIcon className="mr-2 h-5 w-5" />
          Reset chart
        </Button>
      </BottomSheet>

      <ChartPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />

      <AppearancePanel open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />

      {exporting && <ChartExportStage ref={exportStageRef} chart={chart} />}
    </div>
  );
}

