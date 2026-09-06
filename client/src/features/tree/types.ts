export type ChartMode = 'org' | 'family';

export interface TreeNode {
  id: string;
  chartId: string;
  name: string;
  /** null = root node */
  parentId: string | null;
  /** Spouse/partner link — used in family mode, ignored in org mode. */
  partnerId: string | null;
  /** Manual level/title label, e.g. "CEO", "Director", "Grandparent". */
  level: string;
  /** Role / relationship label, e.g. "VP Engineering", "Parent". */
  role: string;
  notes: string;
  photoUrl: string | null;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
}

export interface TreeNodeInput {
  name: string;
  parentId: string | null;
  partnerId: string | null;
  level: string;
  role: string;
  notes: string;
  photoUrl: string | null;
  /** If omitted, the store picks a sensible insert position. */
  positionX?: number;
  positionY?: number;
}

/**
 * Photo intent collected by the node form. Files are uploaded to the node AFTER
 * it has been created/updated (the API owns the storage), so the form only
 * reports what should happen to the photo.
 */
export interface NodePhotoDraft {
  /** New image the user picked (already resized/validated client-side). */
  file: File | null;
  /** Whether the node's existing photo should be removed on save. */
  remove: boolean;
}

export interface Chart {
  id: string;
  name: string;
  mode: ChartMode;
  /** True for the auto-seeded reference charts — the client keeps examples available. */
  isExample: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: TreeNode[];
}

export interface ChartSummary {
  id: string;
  name: string;
  mode: ChartMode;
  /** True for the auto-seeded reference charts — the client keeps examples available. */
  isExample: boolean;
  createdAt: string;
  updatedAt: string;
}
