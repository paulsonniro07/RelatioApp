import { ToastProvider } from '@/components/ui/Toast';
import { TreeChartProvider } from '@/features/tree/store';
import { ThemeProvider } from '@/features/tree/theme/ThemeProvider';
import { TreeChartPage } from '@/pages/TreeChartPage';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <TreeChartProvider>
          <TreeChartPage />
        </TreeChartProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

