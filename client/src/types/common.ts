export interface PaginatedList<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = void> {
  data?: T;
  message?: string;
}

export interface DropdownItem {
  id: string;
  label: string;
}

export interface PaginationFilter {
  pageNumber?: number;
  pageSize?: number;
  searchKeyword?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}
