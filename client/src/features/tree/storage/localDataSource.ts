import { computeAutoLayout } from '../layout';
import { preparePhotoFile } from '../photo';
import { createSampleChart } from '../sampleData';
import type { CreateChartInput, TreeNodePatch } from '../service';
import type { Chart, ChartMode, ChartSummary, TreeNode, TreeNodeInput } from '../types';
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
    mode: chart.mode,
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
  if (!isBrowser()) return { version: 1, charts: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalDatabase;
      if (parsed && Array.isArray(parsed.charts)) return parsed;
    }
  } catch {
    // Corrupt/missing document — start fresh rather than crash the app.
  }
  return { version: 1, charts: [] };
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
function materializeSampleChart(kind: 'org' | 'family'): Chart {
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
    mode: sample.mode,
    isExample: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    nodes,
  };
}

/** Seeds the two reference examples on the very first run (empty storage). */
function ensureInitialSamples(database: LocalDatabase): boolean {
  if (database.charts.length > 0) return false;
  database.charts = [materializeSampleChart('org'), materializeSampleChart('family')];
  return true;
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
    if (ensureInitialSamples(database)) writeDatabase(database);
    return database.charts.map(toSummary);
  },

  async getChart(chartId: string): Promise<Chart> {
    const database = readDatabase();
    return clone(findChart(database, chartId));
  },

  async createChart(input: CreateChartInput): Promise<Chart> {
    const database = readDatabase();
    const timestamp = nowIso();
    const chart: Chart = {
      id: newId(),
      name: input.name,
      mode: input.mode,
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
    input: { name?: string; mode?: ChartMode },
  ): Promise<Chart> {
    const database = readDatabase();
    const chart = findChart(database, chartId);
    if (input.name !== undefined) chart.name = input.name;
    if (input.mode !== undefined) chart.mode = input.mode;
    chart.updatedAt = nowIso();
    writeDatabase(database);
    return clone(chart);
  },

  async deleteChart(chartId: string): Promise<void> {
    const database = readDatabase();
    database.charts = database.charts.filter((c) => c.id !== chartId);
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
