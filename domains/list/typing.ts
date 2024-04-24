/**
 * 请求原始响应
 */
import { JSONObject } from "@/types";

export type OriginalResponse = {
  list: unknown[];
} & {
  data: {
    list: unknown[];
  };
};
/**
 * 查询参数
 */
export interface Search extends JSONObject {}
/**
 * 请求参数
 */
export interface FetchParams extends Search {
  page: number;
  pageSize: number;
}

/**
 * 对外暴露的响应值
 */
export interface Response<T> {
  /**
   * 列表数据
   */
  dataSource: T[];
  /**
   * 当前页码
   * @default 0
   */
  page: number;
  /**
   * 每页数量
   * @default 10
   */
  pageSize: number;
  /**
   * 记录总数
   * @default 0
   */
  total: number;
  /**
   * 查询参数
   */
  search: Search;
  /**
   * 是否初始化（用于展示骨架屏）
   */
  initial: boolean;
  /**
   * 没有更多数据了
   */
  noMore: boolean;
  /**
   * 是否请求中，initial 时 loading 为 false
   */
  loading: boolean;
  /** 是否为空（用于展示空状态） */
  empty: boolean;
  /**
   * 是否正在刷新（用于移动端下拉刷新）
   */
  refreshing: boolean | null;
  /**
   * 请求是否出错
   */
  error: Error | null;
}

export type OriginalResponseProcessor = <T>(
  originalResponse: OriginalResponse
) => Omit<Response<T>, "dataSource" | "page" | "pageSize" | "noMore" | "error">;
/**
 * 响应处理器
 */
export type ResponseProcessor = <T>(
  response: Omit<Response<T>, "dataSource" | "page" | "pageSize" | "noMore" | "error">,
  originalResponse: OriginalResponse
) => Omit<Response<T>, "dataSource" | "page" | "pageSize" | "noMore" | "error">;
/**
 * 参数处理器
 */
export type ParamsProcessor = (params: FetchParams, currentParams: any) => FetchParams;
export interface ListProps<T> {
  /**
   * 是否打开 debug
   */
  debug?: boolean;
  /**
   * dataSource 中元素唯一 key
   * @default id
   */
  rowKey?: string;
  /**
   * 参数处理器
   * 建议在 service 函数中直接处理
   */
  beforeRequest?: ParamsProcessor;
  /**
   * 响应处理器
   * 建议在 service 函数中直接处理
   */
  processor?: <T>(response: Response<T>, originalResponse: OriginalResponse | null) => Response<T>;
  /**
   * 默认已存在的数据
   */
  dataSource?: T[];
  /**
   * 默认查询条件
   */
  search?: Search;
  /**
   * 默认当前页
   */
  page?: number;
  /**
   * 默认每页数量
   */
  pageSize?: number;
  /**
   * 额外的默认 response
   */
  extraDefaultResponse?: Record<string, unknown>;
  /** 初始状态，默认该值为 true，可以通过该值判断是否展示骨架屏 */
  initial?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onStateChange?: (state: Response<T>) => void;
  beforeSearch?: () => void;
  afterSearch?: () => void;
}
