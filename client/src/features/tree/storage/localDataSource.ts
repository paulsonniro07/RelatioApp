import {
  STARTER_CHART_TYPES,
  chartTypeForLegacyMode,
  inferRelationshipId,
} from '../chartTypes';
import { computeAutoLayout } from '../layout';
import { preparePhotoFile } from '../photo';
import { createSampleChart } from '../sampleData';
import type { CreateChartInput, TreeNodePatch } from '../service';
import type {
  Chart,
  ChartSummary,
  ChartType,
  ChartTypeInput,
  LinkedNodeRef,
  SortDir,
  SortKey,
  TreeNode,
  TreeNodeInput,
} from '../types';
import type { TreeDataSource } from './dataSource';

/**
 * Browser-local implementation of TreeDataSource.
 *
 * Persists the whole workspace (charts + nodes) as one JSON document under a
 * single localStorage key. Photos are downscaled client-side (≤512px WebP) and
 * stored as `data:` URLs so avatars keep working on the canvas, in the node
 * form and in PNG exports without any backend.
 *
 * Concurrency note: every mutation is a synchronous read → mutate → write (no
 * `await` in between), so even batched calls (e.g. auto-layout issuing many
 * `setPosition`s) are applied sequentially on the single JS thread and never
 * clobber each other. The only awaiting operation is photo reading, which
 * happens before its own atomic write.
 */
const STORAGE_KEY = 'relatio:ds:v1';

interface LocalDatabase {
  version: 1;
  charts: Chart[];
  chartTypes: ChartType[];
}

/** A photo bigger than ~1 MB of data-URL text is not worth keeping locally. */
const MAX_PHOTO_DATA_URL_LENGTH = 1024 * 1024;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Deep copy so caller-side mutations can never corrupt the stored document. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toSummary(chart: Chart): ChartSummary {
  return {
    id: chart.id,
    name: chart.name,
    chartTypeId: chart.chartTypeId,
    sortKey: chart.sortKey,
    sortDir: chart.sortDir,
    isExample: chart.isExample,
    createdAt: chart.createdAt,
    updatedAt: chart.updatedAt,
  };
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

function readDatabase(): LocalDatabase {
  if (!isBrowser()) return { version: 1, charts: [], chartTypes: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalDatabase;
      if (parsed && Array.isArray(parsed.charts)) {
        if (!Array.isArray(parsed.chartTypes)) parsed.chartTypes = [];
        return parsed;
      }
    }
  } catch {
    // Corrupt/missing document — start fresh rather than crash the app.
  }
  return { version: 1, charts: [], chartTypes: [] };
}

function writeDatabase(database: LocalDatabase): void {
  if (!isBrowser()) {
    throw new Error('This browser does not support local storage.');
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch (error) {
    if (isQuotaError(error)) {
      throw new Error(
        'Browser storage is full — delete some charts or photos, then try again.',
      );
    }
    throw error;
  }
}

function findChart(database: LocalDatabase, chartId: string): Chart {
  const chart = database.charts.find((c) => c.id === chartId);
  if (!chart) throw new Error('Chart not found.');
  return chart;
}

function findNode(chart: Chart, nodeId: string): TreeNode {
  const node = chart.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error('Node not found.');
  return node;
}

/**
 * Materializes one reference sample as a fully-formed chart with real ids,
 * timestamps and auto-layout positions. Parents/partners are resolved through
 * an id map, so every link points at an existing node in both directions.
 */
function materializeSampleChart(kind: 'org' | 'family', chartType: ChartType): Chart {
  const sample = createSampleChart(kind);
  const positions = computeAutoLayout(sample.nodes);
  const idMap = new Map<string, string>();
  for (const node of sample.nodes) idMap.set(node.id, newId());

  const timestamp = nowIso();
  const chartId = newId();
  const nodes: TreeNode[] = sample.nodes.map((node) => {
    const position = positions.get(node.id);
    return {
      id: idMap.get(node.id) ?? newId(),
      chartId,
      name: node.name,
      parentId: node.parentId ? (idMap.get(node.parentId) ?? null) : null,
      partnerId: node.partnerId ? (idMap.get(node.partnerId) ?? null) : null,
      level: node.level,
      role: node.role,
      relationshipTypeId: inferRelationshipId(chartType, node.role),
      linkedNodeRef: null,
      birthDate: null,
      sequence: null,
      notes: node.notes,
      photoUrl: null,
      positionX: position?.x ?? 0,
      positionY: position?.y ?? 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  return {
    id: chartId,
    name: sample.name,
    chartTypeId: chartType.id,
    sortKey: 'name',
    sortDir: 'asc',
    isExample: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    nodes,
  };
}

function createChartTypeRecord(input: ChartTypeInput): ChartType {
  const timestamp = nowIso();
  return {
    id: newId(),
    name: input.name,
    relationships: input.relationships.map((def) => ({ ...def })),
    usesLevels: input.usesLevels ?? false,
    isExample: input.isExample ?? false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Seeds the starter chart types and reference examples on first run, and
 * migrates legacy documents (charts stored with `mode` but no `chartTypeId`).
 */
function ensureInitialData(database: LocalDatabase): boolean {
  let changed = false;

  if (database.chartTypes.length === 0) {
    database.chartTypes = STARTER_CHART_TYPES.map(createChartTypeRecord);
    changed = true;
  }

  for (const chart of database.charts) {
    const legacy = chart as unknown as { mode?: string };
    if (!chart.chartTypeId) {
      const fallback = chartTypeForLegacyMode(database.chartTypes, legacy.mode);
      if (fallback) chart.chartTypeId = fallback.id;
      delete legacy.mode;
      changed = true;
    }
    if (!chart.sortKey) {
      chart.sortKey = 'name';
      chart.sortDir = 'asc';
      changed = true;
    }
    const chartType = database.chartTypes.find((ct) => ct.id === chart.chartTypeId);
    if (chartType) {
      for (const node of chart.nodes) {
        if (!node.relationshipTypeId) {
          const inferred = inferRelationshipId(chartType, node.role);
          if (inferred) {
            node.relationshipTypeId = inferred;
            changed = true;
          }
        }
        if (node.birthDate === undefined) {
          node.birthDate = null;
          changed = true;
        }
      }
    }
  }

  if (database.charts.length === 0) {
    const family = database.chartTypes.find((ct) => ct.name === 'Family');
    const org = database.chartTypes.find((ct) => ct.name === 'Organization');
    const seeded: Chart[] = [];
    if (org) seeded.push(materializeSampleChart('org', org));
    if (family) seeded.push(materializeSampleChart('family', family));
    database.charts = seeded;
    changed = true;
  }

  return changed;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.readAsDataURL(file);
  });
}

export const localDataSource: TreeDataSource = {
  async getCharts(): Promise<ChartSummary[]> {
    const database = readDatabase();
    if (ensureInitialData(database)) writeDatabase(database);
    return database.charts.map(toSummary);
  },

  async getChart(chartId: string): Promise<Chart> {
    const database = readDatabase();
    if (ensureInitialData(database)) writeDatabase(database);
    return clone(findChart(database, chartId));
  },

  async createChart(input: CreateChartInput): Promise<Chart> {
    const database = readDatabase();
    ensureInitialData(database);
    const timestamp = nowIso();
    const chart: Chart = {
      id: newId(),
      name: input.name,
      chartTypeId: input.chartTypeId,
      sortKey: input.sortKey ?? 'name',
      sortDir: input.sortDir ?? 'asc',
      isExample: input.isExample ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
      nodes: [],
    };
    database.charts = [chart, ...database.charts];
    writeDatabase(database);
    return clone(chart);
  },

  async updateChart(
    chartId: string,
    input: { name?: string; chartTypeId?: string; sortKey?: SortKey; sortDir?: SortDir },
  ): Promise<Chart> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    if (input.name !== undefined) chart.name = input.name;
    if (input.chartTypeId !== undefined) chart.chartTypeId = input.chartTypeId;
    if (input.sortKey !== undefined) chart.sortKey = input.sortKey;
    if (input.sortDir !== undefined) chart.sortDir = input.sortDir;
    chart.updatedAt = nowIso();
    writeDatabase(database);
    return clone(chart);
  },

  async deleteChart(chartId: string): Promise<void> {
    const database = readDatabase();
    database.charts = database.charts.filter((c) => c.id !== chartId);
    writeDatabase(database);
  },

  async getChartTypes(): Promise<ChartType[]> {
    const database = readDatabase();
    if (ensureInitialData(database)) writeDatabase(database);
    return clone(database.chartTypes);
  },

  async createChartType(input: ChartTypeInput): Promise<ChartType> {
    const database = readDatabase();
    ensureInitialData(database);
    const chartType = createChartTypeRecord(input);
    database.chartTypes = [...database.chartTypes, chartType];
    writeDatabase(database);
    return clone(chartType);
  },

  async updateChartType(chartTypeId: string, input: ChartTypeInput): Promise<ChartType> {
    const database = readDatabase();
    const chartType = database.chartTypes.find((ct) => ct.id === chartTypeId);
    if (!chartType) throw new Error('Chart type not found.');
    chartType.name = input.name;
    chartType.relationships = input.relationships.map((def) => ({ ...def }));
    if (input.usesLevels !== undefined) chartType.usesLevels = input.usesLevels;
    if (input.isExample !== undefined) chartType.isExample = input.isExample;
    chartType.updatedAt = nowIso();
    writeDatabase(database);
    return clone(chartType);
  },

  async deleteChartType(chartTypeId: string): Promise<void> {
    const database = readDatabase();
    database.chartTypes = database.chartTypes.filter((ct) => ct.id !== chartTypeId);
    writeDatabase(database);
  },

  async createNode(chartId: string, input: TreeNodeInput): Promise<TreeNode> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    const timestamp = nowIso();
    const node: TreeNode = {
      id: newId(),
      chartId,
      name: input.name,
      parentId: input.parentId,
      partnerId: input.partnerId,
      level: input.level,
      role: input.role,
      relationshipTypeId: input.relationshipTypeId,
      linkedNodeRef: null,
      birthDate: input.birthDate ?? null,
      sequence: input.sequence ?? null,
      notes: input.notes,
      photoUrl: input.photoUrl ?? null,
      positionX: input.positionX ?? 0,
      positionY: input.positionY ?? 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    chart.nodes.push(node);

    // Mirror the partner back-link so the couple appears linked immediately —
    // same behaviour the API applies when creating a node with a partner.
    if (node.partnerId) {
      const partner = chart.nodes.find((n) => n.id === node.partnerId);
      if (partner) {
        partner.partnerId = node.id;
        partner.updatedAt = timestamp;
      }
    }

    chart.updatedAt = timestamp;
    writeDatabase(database);
    return clone(node);
  },

  async updateNode(
    chartId: string,
    nodeId: string,
    patch: TreeNodePatch,
  ): Promise<TreeNode> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    const node = findNode(chart, nodeId);
    if (patch.name !== undefined) node.name = patch.name;
    if (patch.role !== undefined) node.role = patch.role;
    if (patch.level !== undefined) node.level = patch.level;
    if (patch.notes !== undefined) node.notes = patch.notes;
    if (patch.photoUrl !== undefined) node.photoUrl = patch.photoUrl;
    if (patch.relationshipTypeId !== undefined) {
      node.relationshipTypeId = patch.relationshipTypeId;
    }
    if (patch.birthDate !== undefined) {
      node.birthDate = patch.birthDate;
    }
    if (patch.sequence !== undefined) {
      node.sequence = patch.sequence;
    }
    const timestamp = nowIso();
    node.updatedAt = timestamp;
    chart.updatedAt = timestamp;
    writeDatabase(database);
    return clone(node);
  },

  async setParent(
    chartId: string,
    nodeId: string,
    parentId: string | null,
  ): Promise<TreeNode> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    const node = findNode(chart, nodeId);
    const timestamp = nowIso();
    node.parentId = parentId;
    node.updatedAt = timestamp;
    chart.updatedAt = timestamp;
    writeDatabase(database);
    return clone(node);
  },

  async setPosition(
    chartId: string,
    nodeId: string,
    positionX: number,
    positionY: number,
  ): Promise<TreeNode> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    const node = findNode(chart, nodeId);
    const timestamp = nowIso();
    node.positionX = positionX;
    node.positionY = positionY;
    node.updatedAt = timestamp;
    chart.updatedAt = timestamp;
    writeDatabase(database);
    return clone(node);
  },

  async setPartner(
    chartId: string,
    nodeId: string,
    partnerId: string | null,
  ): Promise<TreeNode> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    const node = findNode(chart, nodeId);
    const timestamp = nowIso();

    // Unlink the previous partner (both directions).
    if (node.partnerId && node.partnerId !== partnerId) {
      const previous = chart.nodes.find((n) => n.id === node.partnerId);
      if (previous && previous.partnerId === node.id) {
        previous.partnerId = null;
        previous.updatedAt = timestamp;
      }
    }

    if (partnerId) {
      node.partnerId = partnerId;
      const partner = chart.nodes.find((n) => n.id === partnerId);
      if (partner) {
        partner.partnerId = node.id;
        partner.updatedAt = timestamp;
      }
    } else {
      // Dropping the partner: clear this node's link and any back-links to it.
      node.partnerId = null;
      for (const other of chart.nodes) {
        if (other.id !== nodeId && other.partnerId === nodeId) {
          other.partnerId = null;
          other.updatedAt = timestamp;
        }
      }
    }

    node.updatedAt = timestamp;
    chart.updatedAt = timestamp;
    writeDatabase(database);
    return clone(node);
  },

  async setNodeLink(
    chartId: string,
    nodeId: string,
    ref: LinkedNodeRef | null,
  ): Promise<TreeNode> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    const node = findNode(chart, nodeId);
    const timestamp = nowIso();
    node.linkedNodeRef = ref ? { chartId: ref.chartId, nodeId: ref.nodeId } : null;
    node.updatedAt = timestamp;
    chart.updatedAt = timestamp;
    writeDatabase(database);
    return clone(node);
  },

  async uploadNodePhoto(
    chartId: string,
    nodeId: string,
    file: File,
  ): Promise<TreeNode> {
    // Downscale first (existing shared helper → ≤512px WebP), then read as a
    // data URL. Awaiting here is fine: the mutation below is still atomic.
    const prepared = await preparePhotoFile(file);
    const dataUrl = await fileToDataUrl(prepared);
    if (dataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
      throw new Error(
        'That photo is too large to store in this browser — try a smaller image.',
      );
    }

    const database = readDatabase();
    const chart = findChart(database, chartId);
    const node = findNode(chart, nodeId);
    const timestamp = nowIso();
    node.photoUrl = dataUrl;
    node.updatedAt = timestamp;
    chart.updatedAt = timestamp;
    writeDatabase(database);
    return clone(node);
  },

  async deleteNodePhoto(chartId: string, nodeId: string): Promise<TreeNode> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    const node = findNode(chart, nodeId);
    const timestamp = nowIso();
    node.photoUrl = null;
    node.updatedAt = timestamp;
    chart.updatedAt = timestamp;
    writeDatabase(database);
    return clone(node);
  },

  async deleteNode(chartId: string, nodeId: string): Promise<void> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    const timestamp = nowIso();
    chart.nodes = chart.nodes
      .filter((n) => n.id !== nodeId)
      .map((n) => {
        if (n.parentId === nodeId || n.partnerId === nodeId) {
          return {
            ...n,
            parentId: n.parentId === nodeId ? null : n.parentId,
            partnerId: n.partnerId === nodeId ? null : n.partnerId,
            updatedAt: timestamp,
          };
        }
        return n;
      });
    chart.updatedAt = timestamp;
    writeDatabase(database);
  },

  async deleteNodes(chartId: string, nodeIds: string[]): Promise<void> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    const removed = new Set(nodeIds);
    const timestamp = nowIso();
    chart.nodes = chart.nodes
      .filter((n) => !removed.has(n.id))
      .map((n) => {
        if (n.parentId && removed.has(n.parentId)) {
          return { ...n, parentId: null, updatedAt: timestamp };
        }
        if (n.partnerId && removed.has(n.partnerId)) {
          return { ...n, partnerId: null, updatedAt: timestamp };
        }
        return n;
      });
    chart.updatedAt = timestamp;
    writeDatabase(database);
  },

  async clearChartNodes(chartId: string): Promise<void> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    const timestamp = nowIso();
    chart.nodes = [];
    chart.updatedAt = timestamp;
    writeDatabase(database);
  },
};
