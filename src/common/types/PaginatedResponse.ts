export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const toPaginatedResponse = <T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> => ({
  items,
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
});
