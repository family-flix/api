/**
 * @file 常量
 */
import { Response } from "./typing";

export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_CURRENT_PAGE = 1;
export const DEFAULT_TOTAL = 0;

export const DEFAULT_RESPONSE: Response<any> = {
  dataSource: [],
  page: DEFAULT_CURRENT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
  total: DEFAULT_TOTAL,
  search: {},
  initial: true,
  noMore: false,
  loading: false,
  refreshing: null,
  empty: false,
  error: null,
};

export const DEFAULT_PARAMS = {
  page: DEFAULT_CURRENT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
  next_marker: "",
};
