import { useContext } from 'react';

import { TreeChartContext } from '@/features/tree/store';

export function useTreeChart() {
  const context = useContext(TreeChartContext);
  if (!context) {
    throw new Error('useTreeChart must be used within a TreeChartProvider');
  }
  return context;
}
