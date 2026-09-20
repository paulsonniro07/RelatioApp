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
import { ChartTypeManager } from '@/features/tree/components/ChartTypeManager';
import { ConnectNodeDialog } from '@/features/tree/components/ConnectNodeDialog';
import { LevelLegend } from '@/features/tree/components/LevelLegend';
import { LinkNodeDialog } from '@/features/tree/components/LinkNodeDialog';
import { NodeForm, type NodeFormSubmitOptions } from '@/features/tree/components/NodeForm';
import { TreeCanvas } from '@/features/tree/components/TreeCanvas';
import {
  ChartExportStage,
  type ChartExportHandle,
} from '@/features/tree/export/ChartExportStage';
import { findRelationshipOption, relationshipOptions } from '@/features/tree/chartTypes';
import { NODE_WIDTH } from '@/features/tree/layout';
import { wouldCreateCycle } from '@/features/tree/store';
import { useTreeChart } from '@/hooks/useTreeChart';
import { AppearancePanel } from '@/features/tree/theme/AppearancePanel';
import { useTheme } from '@/features/tree/theme/ThemeProvider';
import type {
  ChartType,
  NodePhotoDraft,
  RelationshipTypeDef,
  SortDir,
  SortKey,
  TreeNode,
  TreeNodeInput,
} from '@/features/tree/types';

type FormMode = 'add' | 'edit' | null;

/** Fallback vocabulary if a chart's type is missing (e.g. deleted). */
const EMPTY_CHART_TYPE: ChartType = {
  id: '',
  name: '',
  relationships: [],
  usesLevels: false,
  isExample: false,
  createdAt: '',
  updatedAt: '',
};

const SORT_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'name:asc', label: 'Name A→Z' },
  { id: 'name:desc', label: 'Name Z→A' },
  { id: 'birthday:asc', label: 'Birthday — oldest first' },
  { id: 'birthday:desc', label: 'Birthday — youngest first' },
  { id: 'sequence:asc', label: 'Sequence — 1 → 9 (manual order)' },
  { id: 'sequence:desc', label: 'Sequence — 9 → 1 (manual order)' },
  { id: 'level:asc', label: 'Level A→Z' },
  { id: 'level:desc', label: 'Level Z→A' },
];

const SORT_SHORT: Record<string, string> = {
  'name:asc': 'Name ↑',
  'name:desc': 'Name ↓',
  'birthday:asc': 'Birthday ↑',
  'birthday:desc': 'Birthday ↓',
  'sequence:asc': 'Sequence ↑',
  'sequence:desc': 'Sequence ↓',
  'level:asc': 'Level ↑',
  'level:desc': 'Level ↓',
};

export function TreeChartPage() {
  const {
    chart,
    charts,
    chartTypes,
    activeChartType,
    focusNodeId,
    loading,
    error,
    reload,
    selectChart,
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
    setChartType,
    setChartSort,
    updateChartType,
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
  const [chartTypeManagerOpen, setChartTypeManagerOpen] = useState(false);
  const [chartTypeManagerNew, setChartTypeManagerNew] = useState(false);

  const exportStageRef = useRef<ChartExportHandle>(null);
  const [exporting, setExporting] = useState(false);

  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [linkNodeTarget, setLinkNodeTarget] = useState<TreeNode | null>(null);
  const [connectDialog, setConnectDialog] = useState<{
    source: TreeNode;
    targetId: string | null;
    category: 'directional' | 'lateral' | null;
  } | null>(null);

  // Leave selection mode whenever the active chart changes; if the store set a
  // focus node (arriving via a cross-chart link), highlight it instead.
  useEffect(() => {
    setSelectedId(focusNodeId);
    setSelectedIds(new Set());
    setMultiSelect(false);
  }, [chart?.id, focusNodeId]);

  const effectiveChartType = activeChartType ?? EMPTY_CHART_TYPE;

  const chartNameFor = (chartId: string): string | null =>
    charts.find((c) => c.id === chartId)?.name ?? null;

  const handleNavigateLink = async (node: TreeNode) => {
    const ref = node.linkedNodeRef;
    if (!ref) return;
    try {
      const target = await selectChart(ref.chartId, ref.nodeId);
      if (!target.nodes.some((n) => n.id === ref.nodeId)) {
        toastError('Linked node no longer exists');
      }
    } catch {
      toastError('Linked chart no longer exists');
    }
  };

  /** Connects two existing cards in the active chart with a chosen relationship. */
  const applySameChartRelationship = async (
    sourceId: string,
    targetId: string,
    relationshipValue: string,
  ) => {
    if (!chart) return;
    const option = findRelationshipOption(effectiveChartType, relationshipValue);
    if (!option) throw new Error('Unknown relationship');
    const target = chart.nodes.find((n) => n.id === targetId);
    if (!target) throw new Error('Card not found');

    await updateNode(sourceId, {
      role: option.label,
      relationshipTypeId: option.relationshipId,
    });

    if (option.link === 'parent') {
      if (option.direction === 'forward') {
        // Source is the upper card; target moves below it.
        if (wouldCreateCycle(chart.nodes, targetId, sourceId)) {
          throw new Error('Cannot create a cycle');
        }
        await setParent(targetId, sourceId);
      } else {
        if (wouldCreateCycle(chart.nodes, sourceId, targetId)) {
          throw new Error('Cannot create a cycle');
        }
        await setParent(sourceId, targetId);
      }
    } else if (option.link === 'partner') {
      await setPartner(sourceId, targetId);
    } else {
      await setParent(sourceId, target.parentId);
    }
  };

  const handleQuickAdd = async (
    node: TreeNode,
    kind: 'below' | 'beside',
    name: string,
    relationshipValue: string,
  ) => {
    try {
      const option = findRelationshipOption(effectiveChartType, relationshipValue);
      let parentId: string | null = null;
      let partnerId: string | null = null;
      let positionX: number | undefined;
      let positionY: number | undefined;

      if (kind === 'below') {
        parentId = node.id;
      } else if (option?.link === 'shared-parent') {
        parentId = node.parentId;
      } else {
        partnerId = node.id;
        positionX = node.positionX + NODE_WIDTH + 60;
        positionY = node.positionY;
      }

      await addNode({
        name,
        parentId,
        partnerId,
        level: '',
        role: option?.label ?? '',
        relationshipTypeId: option?.relationshipId ?? null,
        birthDate: null,
        sequence: null,
        notes: '',
        photoUrl: null,
        positionX,
        positionY,
      });
      toastSuccess(`Added ${name}`);
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to add card'));
    }
  };

  /** Reorders same-parent siblings by moving `source` to `target`'s slot. */
  const handleReorder = async (source: TreeNode, target: TreeNode) => {
    if (!chart) return;
    const parentId = source.parentId ?? null;
    if ((target.parentId ?? null) !== parentId) return;

    const siblings = chart.nodes
      .filter((n) => (n.parentId ?? null) === parentId)
      .sort((a, b) => a.positionX - b.positionX);
    const fromIdx = siblings.findIndex((n) => n.id === source.id);
    const toIdx = siblings.findIndex((n) => n.id === target.id);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

    const reordered = [...siblings];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    try {
      await Promise.all(reordered.map((n, i) => updateNode(n.id, { sequence: i + 1 })));
      await setChartSort('sequence', 'asc');
      await applyAutoLayout('sequence', 'asc');
      toastSuccess('Order updated');
    } catch {
      toastError('Failed to reorder');
    }
  };

  const handleMoveSibling = async (node: TreeNode, delta: -1 | 1) => {
    if (!chart) return;
    const parentId = node.parentId ?? null;
    const siblings = chart.nodes
      .filter((n) => (n.parentId ?? null) === parentId)
      .sort((a, b) => a.positionX - b.positionX);
    const idx = siblings.findIndex((n) => n.id === node.id);
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    await handleReorder(node, siblings[targetIdx]);
  };

  const connectDefaultValue = (() => {
    if (!connectDialog) return '';
    const options = relationshipOptions(effectiveChartType);
    if (connectDialog.category === 'lateral') {
      return options.find((o) => o.direction === 'lateral')?.value ?? '';
    }
    if (connectDialog.category === 'directional') {
      return options.find((o) => o.direction === 'backward')?.value ?? '';
    }
    return '';
  })();

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
    options?: NodeFormSubmitOptions,
  ) => {
    try {
      if (editingId) {
        await updateNode(editingId, {
          name: input.name,
          role: input.role,
          level: input.level,
          notes: input.notes,
          photoUrl: input.photoUrl,
          relationshipTypeId: input.relationshipTypeId,
          birthDate: input.birthDate,
          sequence: input.sequence,
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
        // "Add as Parent/Manager of X": reparent X under the new node.
        if (options?.reparentNodeId) {
          await setParent(options.reparentNodeId, created.id);
        }
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

  const handleCreateRelationshipType = async (def: RelationshipTypeDef) => {
    if (!activeChartType) return;
    await updateChartType(activeChartType.id, {
      name: activeChartType.name,
      relationships: [...activeChartType.relationships, def],
    });
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
              value={chart.chartTypeId}
              trigger={
                <span
                  className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold"
                  style={{ color: theme.textPrimary }}
                >
                  {activeChartType?.name ?? 'Chart type'}
                </span>
              }
              options={[
                ...chartTypes.map((ct) => ({
                  id: ct.id,
                  label: ct.name,
                  description:
                    ct.relationships.length === 0
                      ? 'No relationship types yet'
                      : `${ct.relationships.length} relationship type${
                          ct.relationships.length === 1 ? '' : 's'
                        }`,
                })),
                { id: '__new__', label: '+ New chart type', description: 'Start blank or duplicate' },
                { id: '__manage__', label: 'Manage chart types…', description: 'Edit, rename or delete' },
              ]}
              onSelect={(id) => {
                if (id === '__new__') {
                  setChartTypeManagerNew(true);
                  setChartTypeManagerOpen(true);
                  return;
                }
                if (id === '__manage__') {
                  setChartTypeManagerNew(false);
                  setChartTypeManagerOpen(true);
                  return;
                }
                if (id === chart.chartTypeId) return;
                void setChartType(id)
                  .then(() => toastSuccess('Chart type switched'))
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
              <Dropdown
                variant="pill"
                ariaLabel="Sort order for auto layout"
                value={`${chart.sortKey}:${chart.sortDir}`}
                trigger={
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    Sort: {SORT_SHORT[`${chart.sortKey}:${chart.sortDir}`] ?? 'Name ↑'}
                  </span>
                }
                options={SORT_OPTIONS}
                onSelect={(id) => {
                  const [key, dir] = id.split(':') as [SortKey, SortDir];
                  void setChartSort(key, dir)
                    .then(() => toastSuccess('Sort set — click Auto layout to apply'))
                    .catch(() => toastError('Failed to save sort'));
                }}
              />
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
        {effectiveChartType.usesLevels && <LevelLegend nodes={chart.nodes} />}
      </header>

      <main className="relative min-h-0 flex-1">
        <TreeCanvas
          nodes={chart.nodes}
          chartType={effectiveChartType}
          selectedId={selectedId}
          selectionMode={multiSelect}
          multiSelectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelect={setSelectedId}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onRename={handleRename}
          chartNameFor={chartNameFor}
          onOpenLink={setLinkNodeTarget}
          onNavigateLink={(node) => void handleNavigateLink(node)}
          focusNodeId={focusNodeId}
          onQuickAdd={handleQuickAdd}
          onLinkExisting={(node) =>
            setConnectDialog({ source: node, targetId: null, category: null })
          }
          onConnectDrop={(source, target, category) =>
            setConnectDialog({ source, targetId: target.id, category })
          }
          onReorder={handleReorder}
          onMoveSibling={handleMoveSibling}
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
        chartType={effectiveChartType}
        node={editingNode}
        nodes={chart.nodes}
        defaultParentId={selectedId}
        onClose={closeForm}
        onCreateRelationshipType={handleCreateRelationshipType}
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
        <label className="flex h-12 items-center justify-between gap-3 rounded-md border border-gray-200 px-3 text-sm text-gray-700">
          <span className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            Sort order
          </span>
          <select
            value={`${chart.sortKey}:${chart.sortDir}`}
            onChange={(event) => {
              const [key, dir] = event.target.value.split(':') as [SortKey, SortDir];
              void setChartSort(key, dir)
                .then(() => toastSuccess('Sort set — tap Auto layout to apply'))
                .catch(() => toastError('Failed to save sort'));
            }}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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

      <ChartTypeManager
        open={chartTypeManagerOpen}
        startNew={chartTypeManagerNew}
        onClose={() => setChartTypeManagerOpen(false)}
      />

      <LinkNodeDialog
        open={linkNodeTarget !== null}
        node={linkNodeTarget}
        onClose={() => setLinkNodeTarget(null)}
      />

      <ConnectNodeDialog
        open={connectDialog !== null}
        source={connectDialog?.source ?? null}
        chartType={effectiveChartType}
        initialTargetId={connectDialog?.targetId ?? null}
        initialRelationshipValue={connectDefaultValue}
        onClose={() => setConnectDialog(null)}
        onConfirm={(targetId, relationshipValue) => {
          if (!connectDialog) return Promise.resolve();
          return applySameChartRelationship(
            connectDialog.source.id,
            targetId,
            relationshipValue,
          );
        }}
      />

      <AppearancePanel open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />

      {exporting && <ChartExportStage ref={exportStageRef} chart={chart} chartType={effectiveChartType} />}
    </div>
  );
}

