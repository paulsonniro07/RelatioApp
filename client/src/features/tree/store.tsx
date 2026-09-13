import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { STARTER_CHART_TYPES, inferRelationshipId } from './chartTypes';
import { computeAutoLayout, computeDepths } from './layout';
import { createSampleChart } from './sampleData';
import { resolveApiPhotoUrl } from '@/lib/api';
import { treeDataSource } from './storage';
import type {
  Chart,
  ChartSummary,
  ChartType,
  ChartTypeInput,
  LinkedNodeRef,
  TreeNode,
  TreeNodeInput,
} from './types';

export interface TreeChartState {
  charts: ChartSummary[];
  chartTypes: ChartType[];
  chart: Chart | null;
  /** Node to select+highlight after a navigation link jumps charts. */
  focusNodeId: string | null;
  loading: boolean;
  error: string | null;
}

export type TreeNodePatch = Partial<
  Pick<TreeNode, 'name' | 'level' | 'role' | 'notes' | 'photoUrl' | 'relationshipTypeId'>
>;

/** Prevents cycles: returns true if setting node id's parent to parentId would loop. */
export function wouldCreateCycle(nodes: TreeNode[], id: string, parentId: string): boolean {
  if (parentId === id) return true;
  const byId = new Map<string, TreeNode>(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  let current: string | null = parentId;
  while (current) {
    if (current === id) return true;
    if (seen.has(current)) return false;
    seen.add(current);
    current = byId.get(current)?.parentId ?? null;
  }
  return false;
}

function replaceNode(nodes: TreeNode[], updated: TreeNode): TreeNode[] {
  return nodes.map((n) => (n.id === updated.id ? updated : n));
}

/**
 * Clears the reciprocal side of a cross-chart link if it still points back at
 * the given owner node. Silently ignores a target that has since been deleted.
 */
async function clearRemoteLink(
  ref: LinkedNodeRef,
  ownerChartId: string,
  ownerNodeId: string,
): Promise<void> {
  try {
    const remote = await treeDataSource.getChart(ref.chartId);
    const remoteNode = remote.nodes.find((n) => n.id === ref.nodeId);
    if (
      remoteNode?.linkedNodeRef &&
      remoteNode.linkedNodeRef.chartId === ownerChartId &&
      remoteNode.linkedNodeRef.nodeId === ownerNodeId
    ) {
      await treeDataSource.setNodeLink(ref.chartId, ref.nodeId, null);
    }
  } catch {
    // Target chart/node no longer exists — nothing to clear.
  }
}

function toSummary(chart: Chart): ChartSummary {
  return {
    id: chart.id,
    name: chart.name,
    chartTypeId: chart.chartTypeId,
    isExample: chart.isExample,
    createdAt: chart.createdAt,
    updatedAt: chart.updatedAt,
  };
}

/** Picks a sensible initial position for a new node near its parent (or in the top tier). */
function getInsertPosition(
  nodes: TreeNode[],
  parentId: string | null,
): { x: number; y: number } {
  if (parentId !== null) {
    const parent = nodes.find((n) => n.id === parentId);
    if (!parent) return { x: 0, y: 0 };
    const siblingCount = nodes.filter((n) => n.parentId === parentId).length;
    return { x: parent.positionX + siblingCount * 30, y: parent.positionY + 140 };
  }
  const rootCount = nodes.filter(
    (n) => n.parentId === null || !nodes.some((m) => m.id === n.parentId),
  ).length;
  return { x: rootCount * 50, y: 0 };
}

/** Appends " (2)", " (3)"... to `base` until it doesn't collide with an existing chart name. */
function uniqueName(charts: ChartSummary[], base: string): string {
  const taken = new Set(charts.map((c) => c.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let suffix = 2;
  while (taken.has(`${base} (${suffix})`.toLowerCase())) suffix += 1;
  return `${base} (${suffix})`;
}

/**
 * Loads the workspace chart types, seeding the starter presets on first run so
 * there is always at least one usable vocabulary.
 */
async function ensureChartTypes(): Promise<ChartType[]> {
  const existing = await treeDataSource.getChartTypes();
  if (existing.length > 0) return existing;

  const created: ChartType[] = [];
  for (const preset of STARTER_CHART_TYPES) {
    created.push(await treeDataSource.createChartType(preset));
  }
  return created;
}

/**
 * Creates one reference (example) chart — chart + nodes — and returns the full
 * chart. Node ids are mapped so parent/partner links reference the real ids.
 */
async function createSampleChartInDb(
  kind: 'org' | 'family',
  chartType: ChartType,
  isExample: boolean,
  reserveNames: ChartSummary[],
): Promise<Chart> {
  const sample = createSampleChart(kind);
  const positions = computeAutoLayout(sample.nodes);
  const depths = computeDepths(sample.nodes);
  const ordered = [...sample.nodes].sort(
    (a, b) => (depths.get(a.id) ?? 0) - (depths.get(b.id) ?? 0),
  );

  const chart = await treeDataSource.createChart({
    name: uniqueName(reserveNames, sample.name),
    chartTypeId: chartType.id,
    isExample,
  });

  const idMap = new Map<string, string>();
  for (const sampleNode of ordered) {
    const position = positions.get(sampleNode.id);
    const created = await treeDataSource.createNode(chart.id, {
      name: sampleNode.name,
      parentId: sampleNode.parentId ? (idMap.get(sampleNode.parentId) ?? null) : null,
      partnerId: sampleNode.partnerId ? (idMap.get(sampleNode.partnerId) ?? null) : null,
      level: sampleNode.level,
      role: sampleNode.role,
      relationshipTypeId: inferRelationshipId(chartType, sampleNode.role),
      notes: sampleNode.notes,
      photoUrl: sampleNode.photoUrl,
      positionX: position?.x ?? 0,
      positionY: position?.y ?? 0,
    });
    idMap.set(sampleNode.id, created.id);
  }

  return treeDataSource.getChart(chart.id);
}

/**
 * Keeps the reference examples available: re-creates any missing example chart
 * (IsExample marker per kind) so the app always has examples to view. User
 * charts are never touched. Failures are swallowed.
 */
async function seedExamples(
  charts: ChartSummary[],
  chartTypes: ChartType[],
): Promise<ChartSummary[]> {
  const created: ChartSummary[] = [];
  try {
    for (const kind of ['org', 'family'] as const) {
      const wantedName = kind === 'family' ? 'Family' : 'Organization';
      const chartType = chartTypes.find(
        (ct) => ct.name.toLowerCase() === wantedName.toLowerCase(),
      );
      // Only seed a kind when its starter chart type exists — never fall back to
      // an unrelated type (that would create a mislabelled duplicate).
      if (!chartType) continue;

      const sampleBaseName = createSampleChart(kind).name.replace(/\s*\(\d+\)$/, '');
      // An example already exists if a non-deleted example matches either the
      // target chart type OR the sample's base name (covers legacy rows whose
      // chartTypeId is missing/mismatched).
      const hasExample = [...charts, ...created].some(
        (c) =>
          c.isExample &&
          (c.chartTypeId === chartType.id ||
            c.name.replace(/\s*\(\d+\)$/, '') === sampleBaseName),
      );
      if (hasExample) continue;

      const full = await createSampleChartInDb(kind, chartType, true, [...charts, ...created]);
      created.push(toSummary(full));
    }
  } catch {
    return charts;
  }
  return created.length > 0 ? [...created, ...charts] : charts;
}

/**
 * Serializes the full workspace load (chart types + example seeding + charts).
 *
 * Seeding is a read-then-write sequence, so two overlapping loads (React
 * StrictMode double-invoked effects, rapid refreshes, an in-flight reload) could
 * both see "no example" and each create one. Sharing the in-flight promise
 * guarantees the workspace is seeded at most once per page load.
 */
let workspaceLoad:
  | Promise<{ charts: ChartSummary[]; chartTypes: ChartType[] }>
  | null = null;

function loadWorkspace(): Promise<{ charts: ChartSummary[]; chartTypes: ChartType[] }> {
  if (!workspaceLoad) {
    workspaceLoad = (async () => {
      const chartTypes = await ensureChartTypes();
      const charts = await seedExamples(await treeDataSource.getCharts(), chartTypes);
      return { charts, chartTypes };
    })().finally(() => {
      workspaceLoad = null;
    });
  }
  return workspaceLoad;
}

export interface TreeChartContextValue extends TreeChartState {
  /** Chart type driving the active chart's relationship vocabulary. */
  activeChartType: ChartType | null;
  reload: () => Promise<void>;
  selectChart: (chartId: string, focusNodeId?: string | null) => Promise<Chart>;
  loadChartNodes: (chartId: string) => Promise<TreeNode[]>;
  createChart: (name: string, chartTypeId: string) => Promise<void>;
  renameChart: (chartId: string, name: string) => Promise<void>;
  setChartType: (chartTypeId: string) => Promise<void>;
  deleteChart: (chartId: string) => Promise<void>;
  createChartType: (input: ChartTypeInput) => Promise<ChartType>;
  updateChartType: (chartTypeId: string, input: ChartTypeInput) => Promise<ChartType>;
  deleteChartType: (chartTypeId: string) => Promise<void>;
  /** Link this node to a node in another chart (sets both sides). */
  linkNode: (nodeId: string, targetChartId: string, targetNodeId: string) => Promise<void>;
  /** Remove this node's cross-chart link (clears both sides). */
  unlinkNode: (nodeId: string) => Promise<void>;
  /**
   * Adds a NEW node to this chart mirroring the linked node, and links the new
   * node to the target. The two nodes stay independent afterward.
   */
  copyLinkedNode: (nodeId: string) => Promise<void>;
  addNode: (input: TreeNodeInput) => Promise<TreeNode>;
  updateNode: (id: string, patch: TreeNodePatch) => Promise<void>;
  setPosition: (id: string, x: number, y: number) => Promise<void>;
  setParent: (id: string, parentId: string | null) => Promise<void>;
  setPartner: (id: string, partnerId: string | null) => Promise<void>;
  uploadPhoto: (nodeId: string, file: File) => Promise<void>;
  removePhoto: (nodeId: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  deleteNodes: (nodeIds: string[]) => Promise<void>;
  applyAutoLayout: () => Promise<void>;
  reset: () => Promise<void>;
}

export const TreeChartContext = createContext<TreeChartContextValue | null>(null);

export function TreeChartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TreeChartState>({
    charts: [],
    chartTypes: [],
    chart: null,
    focusNodeId: null,
    loading: true,
    error: null,
  });
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const requireChart = useCallback((): Chart => {
    const chart = stateRef.current.chart;
    if (!chart) throw new Error('No chart selected');
    return chart;
  }, []);

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { charts, chartTypes } = await loadWorkspace();
      const current = stateRef.current.chart;
      let chart: Chart | null = null;
      if (current) {
        try {
          chart = await treeDataSource.getChart(current.id);
        } catch {
          chart = null;
        }
      }
      if (!chart && charts.length > 0) {
        chart = await treeDataSource.getChart(charts[0].id);
      }
      setState((s) => ({ ...s, charts, chartTypes, chart, loading: false, error: null }));
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        error: 'Failed to load charts. Is the API running?',
      }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectChart = useCallback(
    async (chartId: string, focusNodeId: string | null = null): Promise<Chart> => {
      const chart = await treeDataSource.getChart(chartId);
      setState((s) => ({ ...s, chart, focusNodeId, error: null }));
      return chart;
    },
    [],
  );

  const loadChartNodes = useCallback(async (chartId: string): Promise<TreeNode[]> => {
    const chart = await treeDataSource.getChart(chartId);
    return chart.nodes;
  }, []);

  const linkNode = useCallback(
    async (nodeId: string, targetChartId: string, targetNodeId: string) => {
      const chart = requireChart();
      const node = chart.nodes.find((n) => n.id === nodeId);
      if (!node) throw new Error('Node not found');

      // Re-linking: clear this node's previous link (both sides) first.
      if (node.linkedNodeRef) {
        await clearRemoteLink(node.linkedNodeRef, chart.id, nodeId);
      }

      // Clear the target's previous link (both sides) too.
      const targetChart = await treeDataSource.getChart(targetChartId);
      const targetNode = targetChart.nodes.find((n) => n.id === targetNodeId);
      if (!targetNode) throw new Error('Target node not found');
      if (targetNode.linkedNodeRef) {
        await clearRemoteLink(targetNode.linkedNodeRef, targetChartId, targetNodeId);
      }

      const updated = await treeDataSource.setNodeLink(chart.id, nodeId, {
        chartId: targetChartId,
        nodeId: targetNodeId,
      });
      await treeDataSource.setNodeLink(targetChartId, targetNodeId, {
        chartId: chart.id,
        nodeId,
      });

      setState((s) =>
        s.chart
          ? { ...s, chart: { ...s.chart, nodes: replaceNode(s.chart.nodes, updated) } }
          : s,
      );
    },
    [requireChart],
  );

  const unlinkNode = useCallback(
    async (nodeId: string) => {
      const chart = requireChart();
      const node = chart.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      if (node.linkedNodeRef) {
        await clearRemoteLink(node.linkedNodeRef, chart.id, nodeId);
      }
      const updated = await treeDataSource.setNodeLink(chart.id, nodeId, null);
      setState((s) =>
        s.chart
          ? { ...s, chart: { ...s.chart, nodes: replaceNode(s.chart.nodes, updated) } }
          : s,
      );
    },
    [requireChart],
  );

  const copyLinkedNode = useCallback(
    async (nodeId: string) => {
      const chart = requireChart();
      const source = chart.nodes.find((n) => n.id === nodeId);
      const ref = source?.linkedNodeRef;
      if (!source || !ref) throw new Error('This node has no link to copy from');

      const targetChart = await treeDataSource.getChart(ref.chartId);
      const target = targetChart.nodes.find((n) => n.id === ref.nodeId);
      if (!target) throw new Error('Linked node no longer exists');

      const activeType =
        stateRef.current.chartTypes.find((ct) => ct.id === chart.chartTypeId) ?? null;

      // Add a NEW node to this chart that mirrors the linked node. It joins the
      // same generation as the node we copied from.
      const position = getInsertPosition(chart.nodes, source.parentId);
      const created = await treeDataSource.createNode(chart.id, {
        name: target.name,
        parentId: source.parentId,
        partnerId: null,
        level: activeType?.usesLevels ? target.level : '',
        role: target.role,
        relationshipTypeId: activeType
          ? inferRelationshipId(activeType, target.role)
          : null,
        notes: target.notes,
        photoUrl: null,
        positionX: position.x,
        positionY: position.y,
      });

      // Point the link at the new copy (v1 allows one link per node, so the
      // original source node is unlinked on both sides).
      if (target.linkedNodeRef) {
        await clearRemoteLink(target.linkedNodeRef, ref.chartId, ref.nodeId);
      }
      await treeDataSource.setNodeLink(chart.id, created.id, {
        chartId: ref.chartId,
        nodeId: ref.nodeId,
      });
      await treeDataSource.setNodeLink(ref.chartId, ref.nodeId, {
        chartId: chart.id,
        nodeId: created.id,
      });

      let finalNode: TreeNode = {
        ...created,
        linkedNodeRef: { chartId: ref.chartId, nodeId: ref.nodeId },
      };

      // Copy the photo as a fresh upload (never share the stored file).
      const photoUrl = resolveApiPhotoUrl(target.photoUrl);
      if (photoUrl) {
        try {
          const response = await fetch(photoUrl);
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], 'linked-photo', {
              type: blob.type || 'image/jpeg',
            });
            finalNode = await treeDataSource.uploadNodePhoto(chart.id, created.id, file);
          }
        } catch {
          // Photo copy is best-effort; the node is already created with text.
        }
      }

      setState((s) => {
        if (!s.chart) return s;
        const nodes = s.chart.nodes
          .map((n) => (n.id === nodeId ? { ...n, linkedNodeRef: null } : n))
          .concat(finalNode);
        return { ...s, chart: { ...s.chart, nodes } };
      });
    },
    [requireChart],
  );

  const createChart = useCallback(async (name: string, chartTypeId: string) => {
    const chart = await treeDataSource.createChart({ name, chartTypeId });
    setState((s) => ({ ...s, charts: [toSummary(chart), ...s.charts], chart }));
  }, []);

  const renameChart = useCallback(async (chartId: string, name: string) => {
    const updated = await treeDataSource.updateChart(chartId, { name });
    setState((s) => ({
      ...s,
      charts: s.charts.map((c) =>
        c.id === chartId ? { ...c, name: updated.name, updatedAt: updated.updatedAt } : c,
      ),
      chart:
        s.chart?.id === chartId
          ? { ...s.chart, name: updated.name, updatedAt: updated.updatedAt }
          : s.chart,
    }));
  }, []);

  const setChartType = useCallback(async (chartTypeId: string) => {
    const chart = requireChart();
    const updated = await treeDataSource.updateChart(chart.id, { chartTypeId });
    setState((s) => ({
      ...s,
      charts: s.charts.map((c) =>
        c.id === chart.id
          ? { ...c, chartTypeId: updated.chartTypeId, updatedAt: updated.updatedAt }
          : c,
      ),
      chart:
        s.chart?.id === chart.id
          ? { ...s.chart, chartTypeId: updated.chartTypeId, updatedAt: updated.updatedAt }
          : s.chart,
    }));
  }, [requireChart]);

  const createChartType = useCallback(async (input: ChartTypeInput) => {
    const created = await treeDataSource.createChartType(input);
    setState((s) => ({ ...s, chartTypes: [...s.chartTypes, created] }));
    return created;
  }, []);

  const updateChartType = useCallback(
    async (chartTypeId: string, input: ChartTypeInput) => {
      const updated = await treeDataSource.updateChartType(chartTypeId, input);
      setState((s) => ({
        ...s,
        chartTypes: s.chartTypes.map((ct) => (ct.id === chartTypeId ? updated : ct)),
      }));
      return updated;
    },
    [],
  );

  const deleteChartType = useCallback(async (chartTypeId: string) => {
    await treeDataSource.deleteChartType(chartTypeId);
    const current = stateRef.current;
    const remaining = current.chartTypes.filter((ct) => ct.id !== chartTypeId);
    const fallback = remaining[0]?.id;
    const repointActive =
      current.chart?.chartTypeId === chartTypeId && fallback !== undefined;
    if (repointActive && fallback) {
      await treeDataSource.updateChart(current.chart!.id, { chartTypeId: fallback });
    }
    setState((s) => ({
      ...s,
      chartTypes: remaining,
      // Re-point the active chart at a surviving type so it keeps working;
      // chart data itself is never touched.
      chart:
        repointActive && fallback && s.chart
          ? { ...s.chart, chartTypeId: fallback }
          : s.chart,
      charts: s.charts.map((c) =>
        c.chartTypeId === chartTypeId && fallback ? { ...c, chartTypeId: fallback } : c,
      ),
    }));
  }, []);

  const deleteChart = useCallback(async (chartId: string) => {
    await treeDataSource.deleteChart(chartId);
    const current = stateRef.current;
    const remaining = current.charts.filter((c) => c.id !== chartId);
    const wasActive = current.chart?.id === chartId;
    let nextChart: Chart | null = current.chart && !wasActive ? current.chart : null;
    if (wasActive && remaining.length > 0) {
      nextChart = await treeDataSource.getChart(remaining[0].id);
    }
    setState((s) => ({ ...s, charts: remaining, chart: nextChart }));
  }, []);

  const addNode = useCallback(
    async (input: TreeNodeInput): Promise<TreeNode> => {
      const chart = requireChart();
      const position = getInsertPosition(chart.nodes, input.parentId);
      const created = await treeDataSource.createNode(chart.id, {
        ...input,
        positionX: input.positionX ?? position.x,
        positionY: input.positionY ?? position.y,
      });
      setState((s) => {
        if (!s.chart) return s;
        let nodes = [...s.chart.nodes, created];
        // Mirror the partner back-link the API created so the couple appears
        // immediately (same behaviour as setPartner on the edit form).
        if (created.partnerId) {
          nodes = nodes.map((n) =>
            n.id === created.partnerId ? { ...n, partnerId: created.id } : n,
          );
        }
        return { ...s, chart: { ...s.chart, nodes } };
      });
      return created;
    },
    [requireChart],
  );

  const updateNode = useCallback(
    async (id: string, patch: TreeNodePatch) => {
      const chart = requireChart();
      const updated = await treeDataSource.updateNode(chart.id, id, patch);
      setState((s) =>
        s.chart
          ? { ...s, chart: { ...s.chart, nodes: replaceNode(s.chart.nodes, updated) } }
          : s,
      );
    },
    [requireChart],
  );

  const setPosition = useCallback(
    async (id: string, x: number, y: number) => {
      const chart = requireChart();
      const updated = await treeDataSource.setPosition(chart.id, id, x, y);
      setState((s) =>
        s.chart
          ? { ...s, chart: { ...s.chart, nodes: replaceNode(s.chart.nodes, updated) } }
          : s,
      );
    },
    [requireChart],
  );

  const setParent = useCallback(
    async (id: string, parentId: string | null) => {
      const chart = requireChart();
      const updated = await treeDataSource.setParent(chart.id, id, parentId);
      setState((s) =>
        s.chart
          ? { ...s, chart: { ...s.chart, nodes: replaceNode(s.chart.nodes, updated) } }
          : s,
      );
    },
    [requireChart],
  );

  const setPartner = useCallback(
    async (id: string, partnerId: string | null) => {
      const chart = requireChart();
      const updated = await treeDataSource.setPartner(chart.id, id, partnerId);
      setState((s) => {
        if (!s.chart) return s;
        let nodes = replaceNode(s.chart.nodes, updated);
        if (partnerId) {
          nodes = nodes.map((n) => (n.id === partnerId ? { ...n, partnerId: id } : n));
        } else {
          nodes = nodes.map((n) =>
            n.id !== id && n.partnerId === id ? { ...n, partnerId: null } : n,
          );
        }
        return { ...s, chart: { ...s.chart, nodes } };
      });
    },
    [requireChart],
  );

  const uploadPhoto = useCallback(
    async (id: string, file: File) => {
      const chart = requireChart();
      const updated = await treeDataSource.uploadNodePhoto(chart.id, id, file);
      setState((s) =>
        s.chart
          ? { ...s, chart: { ...s.chart, nodes: replaceNode(s.chart.nodes, updated) } }
          : s,
      );
    },
    [requireChart],
  );

  const removePhoto = useCallback(
    async (id: string) => {
      const chart = requireChart();
      const updated = await treeDataSource.deleteNodePhoto(chart.id, id);
      setState((s) =>
        s.chart
          ? { ...s, chart: { ...s.chart, nodes: replaceNode(s.chart.nodes, updated) } }
          : s,
      );
    },
    [requireChart],
  );

  const deleteNode = useCallback(
    async (id: string) => {
      const chart = requireChart();
      await treeDataSource.deleteNode(chart.id, id);
      setState((s) => {
        if (!s.chart) return s;
        const nodes = s.chart.nodes
          .filter((n) => n.id !== id)
          .map((n) => {
            if (n.parentId === id) return { ...n, parentId: null };
            if (n.partnerId === id) return { ...n, partnerId: null };
            return n;
          });
        return { ...s, chart: { ...s.chart, nodes } };
      });
    },
    [requireChart],
  );

  const applyAutoLayout = useCallback(async () => {
    const chart = requireChart();
    if (chart.nodes.length === 0) return;
    const positions = computeAutoLayout(chart.nodes);
    const updated = chart.nodes.map((n) => {
      const position = positions.get(n.id);
      return position ? { ...n, positionX: position.x, positionY: position.y } : n;
    });
    setState((s) => (s.chart ? { ...s, chart: { ...s.chart, nodes: updated } } : s));
    const results = await Promise.allSettled(
      updated.map((n) => treeDataSource.setPosition(chart.id, n.id, n.positionX, n.positionY)),
    );
    if (results.some((r) => r.status === 'rejected')) {
      throw new Error('Failed to save layout');
    }
  }, [requireChart]);

  const reset = useCallback(async () => {
    // Reset clears the CURRENT chart's nodes — it never creates a new chart.
    const chart = requireChart();
    await treeDataSource.clearChartNodes(chart.id);
    setState((s) => (s.chart ? { ...s, chart: { ...s.chart, nodes: [] } } : s));
  }, [requireChart]);

  const deleteNodes = useCallback(
    async (nodeIds: string[]) => {
      const chart = requireChart();
      await treeDataSource.deleteNodes(chart.id, nodeIds);
      const idSet = new Set(nodeIds);
      setState((s) => {
        if (!s.chart) return s;
        const nodes = s.chart.nodes
          .filter((n) => !idSet.has(n.id))
          .map((n) => {
            if (n.parentId && idSet.has(n.parentId)) return { ...n, parentId: null };
            if (n.partnerId && idSet.has(n.partnerId)) return { ...n, partnerId: null };
            return n;
          });
        return { ...s, chart: { ...s.chart, nodes } };
      });
    },
    [requireChart],
  );

  const activeChartType = useMemo<ChartType | null>(() => {
    if (!state.chart) return null;
    return (
      state.chartTypes.find((ct) => ct.id === state.chart?.chartTypeId) ??
      state.chartTypes[0] ??
      null
    );
  }, [state.chart, state.chartTypes]);

  const value = useMemo<TreeChartContextValue>(
    () => ({
      ...state,
      activeChartType,
      reload,
      selectChart,
      loadChartNodes,
      linkNode,
      unlinkNode,
      copyLinkedNode,
      createChart,
      renameChart,
      setChartType,
      deleteChart,
      createChartType,
      updateChartType,
      deleteChartType,
      addNode,
      updateNode,
      setPosition,
      setParent,
      setPartner,
      uploadPhoto,
      removePhoto,
      deleteNode,
      deleteNodes,
      applyAutoLayout,
      reset,
    }),
    [
      state,
      activeChartType,
      reload,
      selectChart,
      loadChartNodes,
      linkNode,
      unlinkNode,
      copyLinkedNode,
      createChart,
      renameChart,
      setChartType,
      deleteChart,
      createChartType,
      updateChartType,
      deleteChartType,
      addNode,
      updateNode,
      setPosition,
      setParent,
      setPartner,
      uploadPhoto,
      removePhoto,
      deleteNode,
      deleteNodes,
      applyAutoLayout,
      reset,
    ],
  );

  return <TreeChartContext.Provider value={value}>{children}</TreeChartContext.Provider>;
}
