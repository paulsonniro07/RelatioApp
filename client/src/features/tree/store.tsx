import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { computeAutoLayout, computeDepths } from './layout';
import { createSampleChart } from './sampleData';
import { treeDataSource } from './storage';
import type { Chart, ChartMode, ChartSummary, TreeNode, TreeNodeInput } from './types';

export interface TreeChartState {
  charts: ChartSummary[];
  chart: Chart | null;
  loading: boolean;
  error: string | null;
}

export type TreeNodePatch = Partial<
  Pick<TreeNode, 'name' | 'level' | 'role' | 'notes' | 'photoUrl'>
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

function toSummary(chart: Chart): ChartSummary {
  return {
    id: chart.id,
    name: chart.name,
    mode: chart.mode,
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
 * Creates one reference (example) chart — chart + nodes — and returns the full
 * chart. Node ids are mapped so parent/partner links reference the real ids.
 * `reserveNames` is the list of charts that must not collide on name.
 */
async function createSampleChartInDb(
  kind: 'org' | 'family',
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
    mode: sample.mode,
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
      notes: sampleNode.notes,
      photoUrl: sampleNode.photoUrl,
      positionX: position?.x ?? 0,
      positionY: position?.y ?? 0,
    });
    idMap.set(sampleNode.id, created.id);
  }

  const full = await treeDataSource.getChart(chart.id);
  return full;
}

/**
 * Keeps the reference examples available: re-creates any missing example chart
 * (IsExample marker per mode) so the app always has an Org + Family example to
 * view. User charts are never touched. Failures are swallowed — a seeding hiccup
 * must never block the app from loading.
 */
async function seedExamples(charts: ChartSummary[]): Promise<ChartSummary[]> {
  const created: ChartSummary[] = [];
  try {
    for (const kind of ['org', 'family'] as const) {
      const hasExample = [...charts, ...created].some(
        (c) => c.isExample && c.mode === kind,
      );
      if (hasExample) continue;
      const full = await createSampleChartInDb(kind, true, [...charts, ...created]);
      created.push(toSummary(full));
    }
  } catch {
    return charts;
  }
  return created.length > 0 ? [...created, ...charts] : charts;
}

export interface TreeChartContextValue extends TreeChartState {
  reload: () => Promise<void>;
  selectChart: (chartId: string) => Promise<void>;
  createChart: (name: string, mode: ChartMode) => Promise<void>;
  renameChart: (chartId: string, name: string) => Promise<void>;
  setChartMode: (mode: ChartMode) => Promise<void>;
  deleteChart: (chartId: string) => Promise<void>;
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
    chart: null,
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
      // Ensure the reference examples exist before we pick the chart to show.
      const charts = await seedExamples(await treeDataSource.getCharts());
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
      setState((s) => ({ ...s, charts, chart, loading: false, error: null }));
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

  const selectChart = useCallback(async (chartId: string) => {
    const chart = await treeDataSource.getChart(chartId);
    setState((s) => ({ ...s, chart, error: null }));
  }, []);

  const createChart = useCallback(async (name: string, mode: ChartMode) => {
    const chart = await treeDataSource.createChart({ name, mode });
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

  const setChartMode = useCallback(async (mode: ChartMode) => {
    const chart = requireChart();
    const updated = await treeDataSource.updateChart(chart.id, { mode });
    setState((s) => ({
      ...s,
      charts: s.charts.map((c) =>
        c.id === chart.id
          ? { ...c, mode: updated.mode, updatedAt: updated.updatedAt }
          : c,
      ),
      chart:
        s.chart?.id === chart.id
          ? { ...s.chart, mode: updated.mode, updatedAt: updated.updatedAt }
          : s.chart,
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

  const value = useMemo<TreeChartContextValue>(
    () => ({
      ...state,
      reload,
      selectChart,
      createChart,
      renameChart,
      setChartMode,
      deleteChart,
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
      reload,
      selectChart,
      createChart,
      renameChart,
      setChartMode,
      deleteChart,
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


