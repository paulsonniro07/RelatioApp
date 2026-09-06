import { chartService } from '../service';
import type { TreeDataSource } from './dataSource';

/**
 * Backend-backed implementation — talks to the ASP.NET Core API, which persists
 * everything in PostgreSQL. `chartService` already exposes exactly the
 * TreeDataSource shape, so this is a plain structural assignment.
 */
export const apiDataSource: TreeDataSource = chartService;
