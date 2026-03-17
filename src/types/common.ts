export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page (0-based)
  size: number;
}

export interface PaginationParams {
  page?: number;
  size?: number;
}
