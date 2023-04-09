/**
 * 请求原始响应
 */
export interface RequestResponse {
  [key: string]: any;
}
/**
 * 查询参数
 */
export interface Search {
  [key: string]: any;
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
  /**
   * 是否正在刷新（用于移动端下拉刷新）
   */
  refreshing?: boolean;
  /**
   * 请求是否出错
   */
  error?: Error;
  /**
   * 额外参数
   */
  [key: string]: any;
}

export type OriginalResponseProcessor = <T>(
  originalResponse: RequestResponse
) => Omit<Response<T>, "dataSource" | "page" | "pageSize" | "noMore" | "error">;
/**
 * 响应处理器
 */
export type ResponseProcessor = <T>(
  response: Omit<
    Response<T>,
    "dataSource" | "page" | "pageSize" | "noMore" | "error"
  >,
  originalResponse: RequestResponse
) => Omit<Response<T>, "dataSource" | "page" | "pageSize" | "noMore" | "error">;
/**
 * 参数处理器
 */
export type ParamsProcessor = (
  params: FetchParams,
  currentParams: any
) => FetchParams;
/**
 * 请求参数
 */
export interface FetchParams extends Search {
  page: number;
  pageSize: number;
}

/**
 * 插件
 */
export type ListHelperPlugin<T = any> = (
  api: PluginAPI,
  helper: Helper<T>
) => void;

export interface InitialOptions<T> {
  /**
   * 是否打开 debug
   */
  debug?: boolean;
  /**
   * 插件
   */
  plugins?: ListHelperPlugin[];
  /**
   * dataSource 中元素唯一 key
   * @default id
   */
  rowKey?: string;
  /**
   * 参数处理器
   * @deprecated 建议在 service 函数中直接处理
   */
  beforeRequest?: ParamsProcessor;
  /**
   * 响应处理器
   * @deprecated 建议在 service 函数中直接处理
   */
  processor?: ResponseProcessor;
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
  extraDefaultResponse?: Record<string, any>;
  [key: string]: any;
}
export interface IExtraOptions {
  /**
   * 是否初始化请求
   */
  init?: boolean;
  /**
   * 是否是无限加载请求
   */
  concat?: boolean;
}

import { EnableBy } from "./enums";
import PluginAPI from "./plugin";
import Helper from "./core";

export type IServicePathKeys =
  | "cwd"
  | "absNodeModulesPath"
  | "absOutputPath"
  | "absSrcPath"
  | "absPagesPath"
  | "absTmpPath";

export type IServicePaths = {
  [key in IServicePathKeys]: string;
};

export interface IDep {
  [name: string]: string;
}

export interface IPackage {
  name?: string;
  dependencies?: IDep;
  devDependencies?: IDep;
  [key: string]: any;
}

export interface IPlugin {
  id: string;
  // Currently only used for config
  key: string;
  path: string;
  apply: Function;

  config?: IPluginConfig;
  isPreset?: boolean;
  enableBy?: EnableBy | Function;
}

export interface IPluginConfig {
  default?: any;
  // schema?: {
  //   (joi: joi.Root): joi.Schema;
  // };
  onChange?: string | Function;
}

export interface IPreset extends IPlugin {}

export interface IHook {
  /**
   * PluginName 标志来源
   */
  name?: string;
  key: string;
  fn: Function;
  pluginId?: string;
  before?: string;
  stage?: number;
}

export interface ICommand {
  name: string;
  alias?: string;
  description?: string;
  details?: string;
  // fn: {
  //   ({ args }: { args: yargs.Arguments }): void;
  // };
}
