import api from '@/lib/api';
import type { PaginatedList } from '@/types/common';
import type {
  Chart,
  ChartSummary,
  ChartType,
  ChartTypeInput,
  ChartTypeSummary,
  TreeNode,
  TreeNodeInput,
} from './types';

export interface CreateChartInput {
  name: string;
  chartTypeId: string;
  /** Marks an auto-seeded reference chart so it can be re-seeded if deleted. */
  isExample?: boolean;
}

export type TreeNodePatch = Partial<
  Pick<TreeNode, 'name' | 'role' | 'level' | 'notes' | 'photoUrl' | 'relationshipTypeId'>
>;

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

function toChartTypeSummary(chartType: ChartType): ChartTypeSummary {
  return {
    id: chartType.id,
    name: chartType.name,
    isExample: chartType.isExample,
  };
}

export const chartService = {
  getCharts: async (): Promise<ChartSummary[]> => {
    const response = await api.get<PaginatedList<ChartSummary>>('/charts', {
      params: { pageNumber: 1, pageSize: 100 },
    });
    return response.data.data;
  },

  getChart: async (chartId: string): Promise<Chart> => {
    const response = await api.get<Chart>(`/charts/${chartId}`);
    return response.data;
  },

  createChart: async (input: CreateChartInput): Promise<Chart> => {
    const response = await api.post<Chart>('/charts', input);
    return response.data;
  },

  updateChart: async (
    chartId: string,
    input: { name?: string; chartTypeId?: string },
  ): Promise<Chart> => {
    const response = await api.put<Chart>(`/charts/${chartId}`, input);
    return response.data;
  },

  deleteChart: async (chartId: string): Promise<void> => {
    await api.delete(`/charts/${chartId}`);
  },

  getChartTypes: async (): Promise<ChartType[]> => {
    const response = await api.get<PaginatedList<ChartType>>('/chart-types', {
      params: { pageNumber: 1, pageSize: 100 },
    });
    return response.data.data;
  },

  getChartType: async (chartTypeId: string): Promise<ChartType> => {
    const response = await api.get<ChartType>(`/chart-types/${chartTypeId}`);
    return response.data;
  },

  createChartType: async (input: ChartTypeInput): Promise<ChartType> => {
    const response = await api.post<ChartType>('/chart-types', input);
    return response.data;
  },

  updateChartType: async (
    chartTypeId: string,
    input: ChartTypeInput,
  ): Promise<ChartType> => {
    const response = await api.put<ChartType>(`/chart-types/${chartTypeId}`, input);
    return response.data;
  },

  deleteChartType: async (chartTypeId: string): Promise<void> => {
    await api.delete(`/chart-types/${chartTypeId}`);
  },

  createNode: async (chartId: string, input: TreeNodeInput): Promise<TreeNode> => {
    const response = await api.post<TreeNode>(`/charts/${chartId}/nodes`, input);
    return response.data;
  },

  updateNode: async (
    chartId: string,
    nodeId: string,
    patch: TreeNodePatch,
  ): Promise<TreeNode> => {
    const response = await api.put<TreeNode>(`/charts/${chartId}/nodes/${nodeId}`, patch);
    return response.data;
  },

  setParent: async (
    chartId: string,
    nodeId: string,
    parentId: string | null,
  ): Promise<TreeNode> => {
    const response = await api.put<TreeNode>(
      `/charts/${chartId}/nodes/${nodeId}/parent`,
      { parentId },
    );
    return response.data;
  },

  setPosition: async (
    chartId: string,
    nodeId: string,
    positionX: number,
    positionY: number,
  ): Promise<TreeNode> => {
    const response = await api.put<TreeNode>(
      `/charts/${chartId}/nodes/${nodeId}/position`,
      { positionX, positionY },
    );
    return response.data;
  },

  setPartner: async (
    chartId: string,
    nodeId: string,
    partnerId: string | null,
  ): Promise<TreeNode> => {
    const response = await api.put<TreeNode>(
      `/charts/${chartId}/nodes/${nodeId}/partner`,
      { partnerId },
    );
    return response.data;
  },

  uploadNodePhoto: async (chartId: string, nodeId: string, file: File): Promise<TreeNode> => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post<TreeNode>(`/charts/${chartId}/nodes/${nodeId}/photo`, form);
    return response.data;
  },

  deleteNodePhoto: async (chartId: string, nodeId: string): Promise<TreeNode> => {
    const response = await api.delete<TreeNode>(`/charts/${chartId}/nodes/${nodeId}/photo`);
    return response.data;
  },

  deleteNode: async (chartId: string, nodeId: string): Promise<void> => {
    await api.delete(`/charts/${chartId}/nodes/${nodeId}`);
  },

  clearChartNodes: async (chartId: string): Promise<void> => {
    await api.delete(`/charts/${chartId}/nodes`);
  },

  deleteNodes: async (chartId: string, nodeIds: string[]): Promise<void> => {
    await api.post(`/charts/${chartId}/nodes/batch-delete`, { nodeIds });
  },

  toSummary,
  toChartTypeSummary,
};
