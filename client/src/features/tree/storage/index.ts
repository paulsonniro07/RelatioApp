import { apiDataSource } from './apiDataSource';
import { localDataSource } from './localDataSource';
import type { TreeDataSource } from './dataSource';

export type { TreeDataSource } from './dataSource';
export { localDataSource } from './localDataSource';

/**
 * Active data source, chosen at build time.
 *
 * - `api`   (default) — ASP.NET Core + PostgreSQL backend (Docker/local dev).
 * - `local`           — browser localStorage only; no server or database
 *                       required (Vercel static deployment).
 *
 * Vite bakes `import.meta.env` values at build, so set VITE_DATA_SOURCE per
 * environment: docker-compose/`.env.example` keep `api`; Vercel sets `local`.
 */
function selectDataSource(): TreeDataSource {
  const configured = import.meta.env.VITE_DATA_SOURCE;
  if (configured === 'local') return localDataSource;
  return apiDataSource;
}

export const treeDataSource: TreeDataSource = selectDataSource();
