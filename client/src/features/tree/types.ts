/**
 * How a relationship type wires two nodes together in the existing
 * parent/`partner` engine. `directional` only controls layout/depth; `link`
 * describes which slot the relationship occupies.
 */
export type RelationshipLink = 'parent' | 'partner' | 'shared-parent';

/** One user-manageable relationship type within a chart type. */
export interface RelationshipTypeDef {
  /** Stable id, unique within the chart type, e.g. "parent-child". */
  id: string;
  /** Dropdown group label, e.g. "Parent / Child". */
  label: string;
  /** Label shown on the "from" (forward) side, e.g. "Parent". */
  forwardLabel: string;
  /** Label shown on the "to" (backward) side, e.g. "Child". */
  backwardLabel: string;
  /** Icon key resolved against the shared icon set (fallback: "user"). */
  icon: string;
  /** true = hierarchical (drives computed depth/layout), false = lateral. */
  directional: boolean;
  /** How the relationship maps onto parentId / partnerId. */
  link: RelationshipLink;
}

/**
 * A named set of relationship types. Not a fixed enum — users create, rename,
 * duplicate and delete these freely. The starter presets are ordinary instances.
 */
export interface ChartType {
  id: string;
  name: string;
  relationships: RelationshipTypeDef[];
  /** Whether this chart type exposes the manual "Rank / tier" field + legend. */
  usesLevels: boolean;
  /** True for the seeded starter presets — used only to keep examples available. */
  isExample: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChartTypeSummary {
  id: string;
  name: string;
  isExample: boolean;
}

export interface ChartTypeInput {
  name: string;
  relationships: RelationshipTypeDef[];
  /** Defaults to false when omitted. */
  usesLevels?: boolean;
  isExample?: boolean;
}

/** A navigation-only reference to a node in another chart. */
export interface LinkedNodeRef {
  chartId: string;
  nodeId: string;
}

export interface TreeNode {
  id: string;
  chartId: string;
  name: string;
  /** null = root node */
  parentId: string | null;
  /** Lateral/partner link (spouse, colleague, …). */
  partnerId: string | null;
  /** Manual level/title label, e.g. "CEO", "Director", "Grandparent". */
  level: string;
  /** Role / relationship label, e.g. "VP Engineering", "Parent". */
  role: string;
  /** Relationship type this node was placed with (null for legacy/manual). */
  relationshipTypeId: string | null;
  /** Cross-chart navigation link. Independent data — never synced. */
  linkedNodeRef: LinkedNodeRef | null;
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
  relationshipTypeId: string | null;
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
  /** References a ChartType by id — drives the relationship vocabulary. */
  chartTypeId: string;
  /** True for the auto-seeded reference charts — the client keeps examples available. */
  isExample: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: TreeNode[];
}

export interface ChartSummary {
  id: string;
  name: string;
  chartTypeId: string;
  /** True for the auto-seeded reference charts — the client keeps examples available. */
  isExample: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A selectable "Add as …" option generated from the active chart type. */
export interface RelationshipOption {
  /** `${relationshipId}:${direction}` — stable value for the form control. */
  value: string;
  relationshipId: string;
  direction: 'forward' | 'backward' | 'lateral';
  label: string;
  link: RelationshipLink;
  directional: boolean;
}
