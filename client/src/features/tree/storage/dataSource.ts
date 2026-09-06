import type { CreateChartInput, TreeNodePatch } from '../service';
import type { Chart, ChartMode, ChartSummary, TreeNode, TreeNodeInput } from '../types';

/**
 * Storage seam for chart data.
 *
 * Every read/write operation the UI performs goes through this interface, so a
 * chart can be persisted either on the ASP.NET backend (PostgreSQL) or entirely
 * in the browser (localStorage) without touching the store/components. The two
 * implementations must behave the same from the UI's point of view.
 */
export interface TreeDataSource {
  getCharts(): Promise<ChartSummary[]>;
  getChart(chartId: string): Promise<Chart>;

  createChart(input: CreateChartInput): Promise<Chart>;
  updateChart(
    chartId: string,
    input: { name?: string; mode?: ChartMode },
  ): Promise<Chart>;
  deleteChart(chartId: string): Promise<void>;

  createNode(chartId: string, input: TreeNodeInput): Promise<TreeNode>;
  updateNode(
    chartId: string,
    nodeId: string,
    patch: TreeNodePatch,
  ): Promise<TreeNode>;
  setParent(
    chartId: string,
    nodeId: string,
    parentId: string | null,
  ): Promise<TreeNode>;
  setPosition(
    chartId: string,
    nodeId: string,
    positionX: number,
    positionY: number,
  ): Promise<TreeNode>;
  setPartner(
    chartId: string,
    nodeId: string,
    partnerId: string | null,
  ): Promise<TreeNode>;
  uploadNodePhoto(chartId: string, nodeId: string, file: File): Promise<TreeNode>;
  deleteNodePhoto(chartId: string, nodeId: string): Promise<TreeNode>;

  deleteNode(chartId: string, nodeId: string): Promise<void>;
  deleteNodes(chartId: string, nodeIds: string[]): Promise<void>;
  clearChartNodes(chartId: string): Promise<void>;
}
