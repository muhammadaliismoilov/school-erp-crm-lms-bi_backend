export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface PageDto<T> {
  items: T[];
  meta: PageMeta;
}

export const createPage = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PageDto<T> => ({
  items,
  meta: {
    page,
    limit,
    total,
    pageCount: Math.ceil(total / limit),
  },
});
