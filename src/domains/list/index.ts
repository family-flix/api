/**
 * @file 分页领域
 */
import { BaseDomain, Handler } from "@/domains/base";
import { RequestCore } from "@/domains/request/index";
import { debounce } from "@/utils/lodash/debounce";
import { Result, UnpackedResult } from "@/types";

import { DEFAULT_RESPONSE, DEFAULT_PARAMS, DEFAULT_CURRENT_PAGE, DEFAULT_PAGE_SIZE, DEFAULT_TOTAL } from "./constants";
import { OriginalResponse, FetchParams, Response, Search, ParamsProcessor, ListProps } from "./typing";
import { omit } from "./utils";

/**
 * 只处理
 * @param originalResponse
 * @returns
 */
const RESPONSE_PROCESSOR = <T>(
  originalResponse: OriginalResponse | null
): {
  dataSource: T[];
  page: number;
  pageSize: number;
  total: number;
  empty: boolean;
  noMore: boolean;
  error: Error | null;
} => {
  if (originalResponse === null) {
    return {
      dataSource: [],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: DEFAULT_TOTAL,
      noMore: false,
      empty: false,
      error: new Error(`process response fail, because response is null`),
    };
  }
  try {
    const data = (() => {
      if (originalResponse.data) {
        return originalResponse.data;
      }
      return originalResponse;
    })();
    const {
      list,
      page = 1,
      pageSize = 10,
      total = 0,
      isEnd,
    } = data as {
      list: T[];
      page?: number;
      pageSize?: number;
      total?: number;
      isEnd?: boolean;
    };
    const result = {
      dataSource: list,
      page,
      pageSize,
      total,
      noMore: false,
      empty: false,
      error: null,
    };
    if (total && pageSize && page && total <= pageSize * page) {
      result.noMore = true;
    }
    if (isEnd !== undefined) {
      result.noMore = isEnd;
    }
    if (pageSize && list.length < pageSize) {
      result.noMore = true;
    }
    if (list.length === 0 && page === 1) {
      result.empty = true;
    }
    return result;
  } catch (error) {
    return {
      dataSource: [],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: DEFAULT_TOTAL,
      noMore: false,
      empty: false,
      error: new Error(`process response fail, because ${(error as Error).message}`),
    };
  }
};
// type ServiceFn = (...args: unknown[]) => Promise<Result<OriginalResponse>>;
enum Events {
  LoadingChange,
  BeforeSearch,
  AfterSearch,
  ParamsChange,
  DataSourceChange,
  DataSourceAdded,
  StateChange,
  Error,
  /** 一次请求结束 */
  Completed,
}
type TheTypesOfEvents<T> = {
  [Events.LoadingChange]: boolean;
  [Events.BeforeSearch]: void;
  [Events.AfterSearch]: { params: Search };
  [Events.ParamsChange]: FetchParams;
  [Events.DataSourceAdded]: unknown[];
  [Events.DataSourceChange]: T[];
  [Events.StateChange]: ListState<T>;
  [Events.Error]: Error;
  [Events.Completed]: void;
};
interface ListState<T> extends Response<T> {}

/**
 * 分页类
 */
export class ListCore<
  S extends RequestCore<any>,
  T extends UnpackedResult<S["response"]>["list"][number]
> extends BaseDomain<TheTypesOfEvents<T>> {
  debug: boolean = false;

  static defaultResponse = <T>() => {
    return { ...DEFAULT_RESPONSE } as Response<T>;
  };
  static commonProcessor = RESPONSE_PROCESSOR;

  /** 原始请求方法 */
  private request: S;
  // private originalFetch: (...args: unknown[]) => Promise<OriginalResponse>;
  /** 支持请求前对参数进行处理（formToBody） */
  private beforeRequest: ParamsProcessor = (currentParams, prevParams) => {
    return { ...prevParams, ...currentParams };
  };
  /** 响应处理器 */
  private processor: (response: OriginalResponse | null) => Response<T>;
  /** 初始查询参数 */
  private initialParams: FetchParams;
  private extraResponse: Record<string, unknown>;
  params: FetchParams = { ...DEFAULT_PARAMS };

  // 响应数据
  response: Response<T> = { ...DEFAULT_RESPONSE };
  rowKey: string;

  constructor(fetch: S, options: ListProps<T> = {}) {
    super();

    if (!(fetch instanceof RequestCore)) {
      throw new Error("fetch must be a instance of RequestCore");
    }

    const {
      debug,
      rowKey = "id",
      beforeRequest,
      processor,
      extraDefaultResponse,
      onLoadingChange,
      onStateChange,
      beforeSearch,
      afterSearch,
    } = options;
    this.debug = !!debug;
    this.rowKey = rowKey;
    this.request = fetch;
    this.processor = (originalResponse): Response<T> => {
      const nextResponse = {
        ...this.response,
        ...ListCore.commonProcessor<T>(originalResponse),
      } as Response<T>;
      if (processor) {
        const r = processor<T>(nextResponse, originalResponse);
        if (r !== undefined) {
          return r;
        }
      }
      return nextResponse;
    };
    if (beforeRequest !== undefined) {
      this.beforeRequest = beforeRequest;
    }
    this.initialParams = { ...DEFAULT_PARAMS } as FetchParams;
    this.extraResponse = {
      ...extraDefaultResponse,
    };
    if (onLoadingChange) {
      this.onLoadingChange(onLoadingChange);
    }
    if (onStateChange) {
      this.onStateChange(onStateChange);
    }
    if (beforeSearch) {
      this.onBeforeSearch(beforeSearch);
    }
    if (afterSearch) {
      this.onAfterSearch(afterSearch);
    }
    this.initialize(options);
  }
  private initialize(options: ListProps<T>) {
    const { search, dataSource, page, pageSize, initial } = options;

    if (search !== undefined) {
      this.initialParams = {
        ...this.initialParams,
        ...search,
      };
      this.extraResponse.search = search;
    }
    if (dataSource !== undefined) {
      this.extraResponse.dataSource = dataSource;
    }
    if (page !== undefined) {
      this.initialParams.page = page;
      this.extraResponse.page = page;
    }
    if (pageSize !== undefined) {
      this.initialParams.pageSize = pageSize;
      this.extraResponse.pageSize = pageSize;
    }
    if (initial !== undefined) {
      this.extraResponse.initial = initial;
    }
    this.params = { ...this.initialParams };
    this.response = {
      ...ListCore.defaultResponse(),
      ...this.extraResponse,
    };
    const { page: p, pageSize: ps, ...restParams } = this.params;
    const responseFromPlugin: Partial<FetchParams> = {
      search: restParams,
    };
    if (p) {
      responseFromPlugin.page = p;
    }
    if (ps) {
      responseFromPlugin.pageSize = ps;
    }
    this.response = {
      ...this.response,
      ...responseFromPlugin,
      search: {
        ...this.response.search,
      },
    };
  }
  /**
   * 手动修改当前实例的查询参数
   * @param {import('./typing').FetchParams} nextParams 查询参数或设置函数
   */
  setParams(nextParams: Partial<FetchParams> | ((p: FetchParams) => FetchParams)) {
    let result = {
      ...this.params,
      ...nextParams,
    };
    if (typeof nextParams === "function") {
      result = nextParams(this.params);
    }
    this.params = result as FetchParams;
    this.emit(Events.ParamsChange, { ...this.params });
  }
  setDataSource(dataSources: T[]) {
    this.response.dataSource = dataSources;
    this.emit(Events.StateChange, { ...this.response });
  }
  /**
   * 调用接口进行请求
   * 外部不应该直接调用该方法
   * @param {import('./typing').FetchParams} nextParams - 查询参数
   */
  async fetch(params: Partial<FetchParams>, ...restArgs: any[]) {
    // const [params, ...restArgs] = args;
    this.response.error = null;
    this.response.loading = true;
    this.emit(Events.LoadingChange, true);
    this.emit(Events.StateChange, { ...this.response });
    const mergedParams = {
      ...this.params,
      ...params,
    };
    let processedParams = this.beforeRequest({ ...mergedParams }, this.params);
    if (processedParams === undefined) {
      processedParams = mergedParams;
    }
    const processedArgs = [processedParams, ...restArgs] as Parameters<S["service"]>;
    const res = await this.request.run(...processedArgs);
    this.response.loading = false;
    this.response.search = omit({ ...mergedParams }, ["page", "pageSize"]);
    if (this.response.initial) {
      this.response.initial = false;
    }
    this.params = { ...processedParams };
    this.emit(Events.LoadingChange, false);
    this.emit(Events.ParamsChange, { ...this.params });
    this.emit(Events.Completed);
    if (res.error) {
      return Result.Err(res.error);
    }
    const originalResponse = res.data;
    let response = this.processor(originalResponse);
    if (params.page === 1 && response.dataSource.length === 0) {
      response.empty = true;
    }
    // console.log(response.next_marker);
    // @ts-ignore
    if (response.next_marker) {
      // @ts-ignore
      this.params.next_marker = response.next_marker;
    }
    // console.log(...this.log('3、afterProcessor', response));
    const responseIsEmpty = response.dataSource === undefined;
    if (responseIsEmpty) {
      response.dataSource = [];
    }
    return Result.Ok(response);
  }
  /**
   * 使用初始参数请求一次，初始化时请调用该方法
   */
  async init(params = {}) {
    const res = await this.fetch({
      ...this.initialParams,
      ...params,
    });
    if (res.error) {
      this.tip({ icon: "error", text: [res.error.message] });
      this.response.error = res.error;
      this.emit(Events.Error, res.error);
      this.emit(Events.StateChange, { ...this.response });
      return Result.Err(res.error);
    }
    this.response = {
      ...this.response,
      ...res.data,
    };
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceAdded, [...res.data.dataSource]);
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
    return Result.Ok({ ...this.response });
  }
  /** 无论如何都会触发一次 state change */
  async initAny() {
    if (!this.response.initial) {
      this.emit(Events.StateChange, { ...this.response });
      return Result.Ok(this.response);
    }
    return this.init();
  }
  /**
   * 下一页
   */
  async next() {
    const { page, ...restParams } = this.params;
    const res = await this.fetch({
      ...restParams,
      page: page + 1,
    });
    if (res.error) {
      this.tip({ icon: "error", text: [res.error.message] });
      this.response.error = res.error;
      this.emit(Events.Error, res.error);
      this.emit(Events.StateChange, { ...this.response });
      return Result.Err(res.error);
    }
    this.response = {
      ...this.response,
      ...res.data,
    };
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
    return Result.Ok({ ...this.response });
  }
  /**
   * 返回上一页
   */
  async prev() {
    const { page, ...restParams } = this.params;
    const res = await this.fetch({
      ...restParams,
      page: (() => {
        if (page <= DEFAULT_CURRENT_PAGE) {
          return DEFAULT_CURRENT_PAGE;
        }
        return page - 1;
      })(),
    });
    if (res.error) {
      this.tip({ icon: "error", text: [res.error.message] });
      this.response.error = res.error;
      this.emit(Events.Error, res.error);
      this.emit(Events.StateChange, { ...this.response });
      return Result.Err(res.error);
    }
    this.response = {
      ...this.response,
      ...res.data,
    };
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
    return Result.Ok({ ...this.response });
  }
  nextWithCursor() {}
  /** 强制请求下一页，如果下一页没有数据，page 不改变 */
  async loadMoreForce() {
    const { page, ...restParams } = this.params;
    const res = await this.fetch({
      ...restParams,
      page: page + 1,
    });
    if (res.error) {
      this.tip({ icon: "error", text: [res.error.message] });
      this.response.error = res.error;
      this.emit(Events.Error, res.error);
      this.emit(Events.StateChange, { ...this.response });
      return Result.Err(res.error);
    }
    if (res.data.dataSource.length === 0) {
      this.params.page -= 1;
    }
    const prevItems = this.response.dataSource;
    this.response = {
      ...this.response,
      ...res.data,
    };
    this.response.dataSource = prevItems.concat(res.data.dataSource);
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceAdded, [...res.data.dataSource]);
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
    return Result.Ok({ ...this.response });
  }
  /**
   * 无限加载时使用的下一页
   */
  async loadMore() {
    if (this.response.loading || this.response.noMore) {
      return;
    }
    const { page, ...restParams } = this.params;
    const res = await this.fetch({
      ...restParams,
      page: page + 1,
    });
    if (res.error) {
      this.tip({ icon: "error", text: [res.error.message] });
      this.response.error = res.error;
      this.emit(Events.Error, res.error);
      this.emit(Events.StateChange, { ...this.response });
      return Result.Err(res.error);
    }
    const prevItems = this.response.dataSource;
    this.response = {
      ...this.response,
      ...res.data,
    };
    this.response.dataSource = prevItems.concat(res.data.dataSource);
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceAdded, [...res.data.dataSource]);
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
    return Result.Ok({ ...this.response });
  }
  /**
   * 前往指定页码
   * @param {number} page - 要前往的页码
   * @param {number} [pageSize] - 每页数量
   */
  async goto(targetPage: number, targetPageSize: number) {
    const { page, pageSize, ...restParams } = this.params;
    const res = await this.fetch({
      ...restParams,
      page: (() => {
        if (targetPage <= DEFAULT_CURRENT_PAGE) {
          return DEFAULT_CURRENT_PAGE;
        }
        return targetPage;
      })(),
      pageSize: (() => {
        if (targetPageSize !== undefined) {
          return targetPageSize;
        }
        return pageSize;
      })(),
    });
    if (res.error) {
      this.tip({ icon: "error", text: [res.error.message] });
      this.response.error = res.error;
      this.emit(Events.Error, res.error);
      this.emit(Events.StateChange, { ...this.response });
      return Result.Err(res.error);
    }
    this.response = {
      ...this.response,
      ...res.data,
    };
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
    return Result.Ok({ ...this.response });
  }
  async search(params: Search) {
    this.emit(Events.BeforeSearch);
    const res = await this.fetch({
      ...this.initialParams,
      ...params,
    });
    this.emit(Events.AfterSearch, { params });
    if (res.error) {
      this.tip({ icon: "error", text: [res.error.message] });
      this.response.error = res.error;
      this.emit(Events.Error, res.error);
      this.emit(Events.StateChange, { ...this.response });
      return Result.Err(res.error);
    }
    this.response = {
      ...this.response,
      ...res.data,
    };
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
    return Result.Ok({ ...this.response });
  }
  searchDebounce = debounce(800, (args: Search) => {
    return this.search(args);
  });
  /**
   * 使用初始参数请求一次，「重置」操作时调用该方法
   */
  async reset(params: Partial<FetchParams> = {}) {
    /** 由于在 fetch 内会合并 this.params 和 params，所以这里先将 this.params 给重置掉 */
    this.params = { ...this.initialParams };
    const res = await this.fetch(params);
    if (res.error) {
      this.tip({ icon: "error", text: [res.error.message] });
      this.response.error = res.error;
      this.emit(Events.Error, res.error);
      this.emit(Events.StateChange, { ...this.response });
      return Result.Err(res.error);
    }
    this.response = {
      ...this.response,
      ...res.data,
    };
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
    return Result.Ok({ ...this.response });
  }
  /**
   * 使用当前参数重新请求一次，PC 端「刷新」操作时调用该方法
   */
  reload() {
    return this.fetch({});
  }
  /**
   * 页码置为 1，其他参数保留，重新请求一次。移动端「刷新」操作时调用该方法
   */
  async refresh() {
    const { page, ...restParams } = this.params;
    this.response.refreshing = true;
    this.emit(Events.StateChange, { ...this.response });
    const res = await this.fetch({
      ...restParams,
      page: 1,
      next_marker: "",
    });
    this.response.refreshing = false;
    if (res.error) {
      this.tip({ icon: "error", text: [res.error.message] });
      this.response.error = res.error;
      this.emit(Events.Error, res.error);
      this.emit(Events.StateChange, { ...this.response });
      return Result.Err(res.error);
    }
    this.response = {
      ...this.response,
      ...res.data,
    };
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
    return Result.Ok({ ...this.response });
  }
  clear() {
    this.response = {
      ...DEFAULT_RESPONSE,
    };
    this.params = { ...DEFAULT_PARAMS };
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
  }
  deleteItem(fn: (item: T) => boolean) {
    const { dataSource } = this.response;
    const nextDataSource = dataSource.filter((item) => {
      return !fn(item);
    });
    this.response.total = nextDataSource.length;
    this.response.dataSource = nextDataSource;
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
  }
  /**
   * 移除列表中的多项（用在删除场景）
   * @param {T[]} items 要删除的元素列表
   */
  async deleteItems(items: T[]) {
    const { dataSource } = this.response;
    const nextDataSource = dataSource.filter((item) => {
      return !items.includes(item);
    });
    this.response.total = nextDataSource.length;
    this.response.dataSource = nextDataSource;
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
  }
  modifyItem(fn: (item: T) => T) {
    const { dataSource } = this.response;
    const nextDataSource: T[] = [];
    for (let i = 0; i < dataSource.length; i += 1) {
      const item = dataSource[i];
      let r = fn(item);
      if (!r) {
        r = item;
      }
      nextDataSource.push(r);
    }
    this.response.dataSource = nextDataSource;
    // console.log("[DOMAIN]list/index - modifyItem", nextDataSource[0]);
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
  }
  replaceDataSource(dataSource: T[]) {
    this.response.dataSource = dataSource;
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
  }
  /**
   * 手动修改当前 dataSource
   * @param fn
   */
  modifyDataSource(fn: (v: T) => T) {
    this.response.dataSource = this.response.dataSource.map((item) => {
      return fn(item);
    });
    this.emit(Events.StateChange, { ...this.response });
    this.emit(Events.DataSourceChange, [...this.response.dataSource]);
  }
  /**
   * 手动修改当前 response
   * @param fn
   */
  modifyResponse(fn: (v: Response<T>) => Response<T>) {
    this.response = fn({ ...this.response });
    this.emit(Events.StateChange, { ...this.response });
    // this.emit(Events.DataSourceChange, [...this.response.dataSource]);
  }
  /**
   * 手动修改当前 params
   */
  modifyParams(fn: (v: FetchParams) => FetchParams) {
    this.params = fn(this.params);
    this.emit(Events.ParamsChange, { ...this.params });
  }
  /**
   * 手动修改当前 search
   */
  modifySearch(fn: (v: FetchParams) => FetchParams) {
    this.params = {
      ...fn(this.params),
      page: this.params.page,
      pageSize: this.params.pageSize,
    };
    this.emit(Events.ParamsChange, { ...this.params });
  }

  onStateChange(handler: Handler<TheTypesOfEvents<T>[Events.StateChange]>) {
    return this.on(Events.StateChange, handler);
  }
  onLoadingChange(handler: Handler<TheTypesOfEvents<T>[Events.LoadingChange]>) {
    return this.on(Events.LoadingChange, handler);
  }
  onBeforeSearch(handler: Handler<TheTypesOfEvents<T>[Events.BeforeSearch]>) {
    return this.on(Events.BeforeSearch, handler);
  }
  onAfterSearch(handler: Handler<TheTypesOfEvents<T>[Events.AfterSearch]>) {
    return this.on(Events.AfterSearch, handler);
  }
  onDataSourceChange(handler: Handler<TheTypesOfEvents<T>[Events.DataSourceChange]>) {
    return this.on(Events.DataSourceChange, handler);
  }
  onDataSourceAdded(handler: Handler<TheTypesOfEvents<T>[Events.DataSourceAdded]>) {
    return this.on(Events.DataSourceAdded, handler);
  }
  onError(handler: Handler<TheTypesOfEvents<T>[Events.Error]>) {
    return this.on(Events.Error, handler);
  }
  onComplete(handler: Handler<TheTypesOfEvents<T>[Events.Completed]>) {
    return this.on(Events.Completed, handler);
  }
}
