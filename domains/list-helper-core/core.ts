/**
 * @file 分页领域
 */
import {
  DEFAULT_RESPONSE,
  DEFAULT_PARAMS,
  DEFAULT_CURRENT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_TOTAL,
} from "./constants";
import { omit } from "./utils";
import {
  RequestResponse,
  FetchParams,
  Response,
  Search,
  ParamsProcessor,
  InitialOptions,
  OriginalResponseProcessor,
  ListHelperPlugin,
} from "./typing";
import PluginAPI from "./plugin";

/**
 * 只处理
 * @param originalResponse
 * @returns
 */
const RESPONSE_PROCESSOR = (originalResponse: RequestResponse) => {
  try {
    const data = originalResponse.data || originalResponse;
    const { list, page, pageSize, total, isEnd } = data;
    const result = {
      dataSource: list,
      page,
      pageSize,
      total,
      noMore: false,
    };
    if (total <= pageSize * page) {
      result.noMore = true;
    }
    if (isEnd !== undefined) {
      result.noMore = isEnd;
    }
    return result;
  } catch (error) {
    return {
      dataSource: [],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: DEFAULT_TOTAL,
      noMore: false,
      error: new Error(
        `process response fail, because ${(error as Error).message}`
      ),
    };
  }
};

/**
 * @deprecated
 */
export function debug() {
  console.warn("[deprecated]该方法已被弃用，请使用 debug 配置项。");
}

const innerPlugins: ListHelperPlugin[] = [];

/**
 * 分页类
 */
class Helper<T> {
  static defaultResponse = { ...DEFAULT_RESPONSE };

  static defaultProcessor = RESPONSE_PROCESSOR;

  static onError: (err: Error) => void;

  static registerPlugins = (plugins: any[]) => {
    innerPlugins.push(...plugins);
  };

  // 原始请求方法
  private originalFetch?: any;

  // 支持请求前对参数进行处理（formToBody）
  private beforeRequest: ParamsProcessor = (currentParams, prevParams) => {
    return { ...prevParams, ...currentParams };
  };

  // 响应处理器
  private combinedProcessor: OriginalResponseProcessor =
    Helper.defaultProcessor;

  debug: boolean = false;

  rowKey: string;

  // 初始查询参数
  private initialParams: FetchParams;
  private extraResponse: Record<string, any>;

  private params: FetchParams = { ...DEFAULT_PARAMS };

  // hooks: { [key: string] };

  api: PluginAPI;

  // 响应数据
  response: Response<T> = { ...DEFAULT_RESPONSE };

  // @ts-ignore
  onChange(data: Response<T>) {}

  // @ts-ignore
  onError(err: Error) {}

  constructor(fetch: any, options: InitialOptions<T> = {}) {
    if (typeof fetch !== "function") {
      throw new Error("fetch must be a function");
    }

    const {
      debug,

      plugins = [],

      rowKey = "id",
      beforeRequest,
      processor,

      extraDefaultResponse,
    } = options;
    this.debug = !!debug;

    this.rowKey = rowKey;

    const api = new PluginAPI();
    this.api = api;

    const allPlugins = innerPlugins.concat(plugins);

    api.applySyncPlugins({
      key: "beforeRegisterPlugins",
      type: api.ApplyPluginsType.event,
      initialValue: { ...options },
    });
    // console.log("[CORE]constructor - all plugins", allPlugins);
    while (allPlugins.length) {
      // umi 是一个插件一个 PluginAPI 实例，暂时没理解原因，这里是一个实例一个插件
      // ?? 是因为单个 PluginAPI 实例，一个插件会被多个 Helper 实例共用，即使只有 A Helper 注册了插件，B Helper 调用 applyPlugins 时，A 的插件仍会响应
      const plugin = allPlugins.shift();
      if (plugin) {
        plugin(api, this);
      }
    }
    this.originalFetch = fetch;
    if (processor) {
      this.combinedProcessor = (originalResponse) => {
        const nextResponse = {
          ...this.response,
          ...RESPONSE_PROCESSOR(originalResponse),
        };
        return processor(nextResponse, originalResponse);
      };
    }
    if (beforeRequest !== undefined) {
      this.beforeRequest = beforeRequest;
    }

    this.initialParams = { ...DEFAULT_PARAMS } as FetchParams;
    this.extraResponse = {
      ...extraDefaultResponse,
    };

    this.initialize(options);
  }

  private initialize = (options: InitialOptions<T>) => {
    const { search, dataSource, page, pageSize } = options;

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
    const extraParams = this.api.applySyncPlugins({
      key: "getExtraParams",
      type: this.api.ApplyPluginsType.modify,
      initialValue: { ...this.initialParams },
    });
    this.params = { ...this.initialParams, ...extraParams };
    this.response = {
      ...Helper.defaultResponse,
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
        ...responseFromPlugin.search,
      },
    };

    // console.log("[CORE]after initialize", fetch.name, this.response);
  };

  log = (...messages: any[]) => {
    if (this.debug) {
      console.log(...messages);
    }
  };

  private setParams = (
    nextParams: FetchParams | ((params: FetchParams) => FetchParams)
  ) => {
    let result = nextParams;
    if (typeof nextParams === "function") {
      result = nextParams(this.params);
    }
    this.params = result as FetchParams;
    // console.log("[CORE]setParams", result, this.api);
    this.api.applyPlugins({
      key: "onParamsChange",
      type: this.api.ApplyPluginsType.event,
      initialValue: this.params,
    });
  };

  /**
   * 调用接口进行请求
   * @param {PaginationParams} nextParams - 查询参数
   */
  fetch = async (...args: any[]) => {
    const [params = {}, options = {}] = args;
    // 这么写就限制死了第一个必须传查询参数
    const userParamsForThisRequest: FetchParams = { ...params };
    try {
      if (this.response.initial === false) {
        this.response.loading = true;
        this.response.error = undefined;
      }
      // 这次请求不是刷新，所以要重置为 undefined，避免影响业务方认为这次是一次刷新请求
      if (this.response.refreshing === false) {
        this.response.refreshing = undefined;
      }
      this.onChange({ ...this.response, loading: true });
      const mergedParams = {
        ...this.params,
        ...userParamsForThisRequest,
      };
      // console.log('[CORE]fetch - beforeRequest', mergedParams, this.params, userParamsForThisRequest);
      await this.api.applyPlugins({
        key: "beforeRequest",
        type: this.api.ApplyPluginsType.event,
        initialValue: mergedParams,
      });
      let processedParams = this.beforeRequest(
        { ...mergedParams },
        this.params
      );
      if (processedParams === undefined) {
        processedParams = mergedParams;
      }
      // this.log(
      //   `%c CORE %c ${this.originalFetch.name} %c 1、beforeRequest `,
      //   "color:white;background:#dfa639;border-top-left-radius:2px;border-bottom-left-radius:2px;",
      //   "color:white;background:#19be6b;border-top-right-radius:2px;border-bottom-right-radius:2px;",
      //   "color:#19be6b;",
      //   tempProcessedParams
      // );

      const originalResponse = await this.originalFetch(processedParams);

      // 这里就赋值是为了在 processor 中能拿到最新的 search 参数
      this.response.search = omit({ ...mergedParams }, ["page", "pageSize"]);
      let response = this.combinedProcessor<T>(originalResponse);
      if (response === undefined) {
        response = Helper.defaultProcessor(originalResponse);
      }
      // this.log(
      //   `%c CORE %c ${this.originalFetch.name} %c 3、afterProcessor `,
      //   "color:white;background:#dfa639;border-top-left-radius:2px;border-bottom-left-radius:2px;",
      //   "color:white;background:#19be6b;border-top-right-radius:2px;border-bottom-right-radius:2px;",
      //   "color:#19be6b;",
      //   response
      // );
      const itemResponseIsEmpty = response.dataSource === undefined;
      if (itemResponseIsEmpty) {
        response.dataSource = [];
      }
      const { concat } = options;
      if (concat === true) {
        const prevItems = this.response.dataSource;
        response.dataSource = prevItems.concat(response.dataSource);
      }

      response = await this.api.applyPlugins({
        key: "afterRequest",
        type: this.api.ApplyPluginsType.modify,
        initialValue: response,
      });
      if (response.error && Helper.onError) {
        Helper.onError(response.error);
      }
      this.response = {
        ...this.response,
        ...response,
      };
    } catch (err) {
      const e = err as Error;
      if (Helper.onError) {
        Helper.onError(e);
      }
      this.onError(e);
      // this.log("[DOMAIN]pagination - fetch failed:", err);
      this.response.error = e;
    }
    if (this.response.initial === true) {
      this.response.initial = false;
    }
    this.response.loading = false;
    const thisInvokeIsRefresh = this.response.refreshing === true;
    if (thisInvokeIsRefresh) {
      this.response.refreshing = false;
    }
    // 最终保存的查询参数，只是简单地合并两个对象
    this.params = { ...this.params, ...userParamsForThisRequest };
    // this.log(
    //   `%c CORE %c ${this.originalFetch.name} %c 4、response `,
    //   "color:white;background:#dfa639;border-top-left-radius:2px;border-bottom-left-radius:2px;",
    //   "color:white;background:#515a6e;border-top-right-radius:2px;border-bottom-right-radius:2px;",
    //   "color:#515a6e;",
    //   this.response
    // );
    return this.resolve();
  };

  /**
   * 使用初始参数请求一次，初始化时可调用该方法
   */
  init = (params: Search = {}) => {
    this.params = { ...this.initialParams, ...params };
    // this.response.initial = true;
    return this.fetch(this.params);
  };

  /**
   * 下一页
   */
  next = () => {
    this.setParams((prevParams) => {
      prevParams.page += 1;
      return prevParams;
    });

    return this.fetch(this.params);
  };

  /**
   * 无限加载时使用的下一页
   */
  loadMore = () => {
    if (this.response.initial) {
      return;
    }
    if (this.response.loading || this.response.noMore) {
      return;
    }
    this.params.page += 1;
    return this.fetch(this.params, { concat: true });
  };

  /**
   * 返回上一页
   */
  prev = () => {
    this.setParams((prevParams) => {
      prevParams.page -= 1;
      if (prevParams.page <= 0) {
        prevParams.page = DEFAULT_CURRENT_PAGE;
      }
      return prevParams;
    });

    return this.fetch(this.params);
  };

  /**
   * 前往指定页码
   * @param {number} page - 要前往的页码
   * @param {number} [pageSize] - 每页数量
   */
  goto = (page: number, pageSize?: number) => {
    this.setParams((prevParams) => {
      prevParams.page = page;
      if (pageSize !== undefined) {
        prevParams.pageSize = pageSize;
      }
      return prevParams;
    });
    return this.fetch({ ...this.params });
  };

  /**
   * 筛选
   */
  search = (params: Search) => {
    return this.fetch({
      ...this.initialParams,
      ...params,
    });
  };
  /**
   * 排序
   */
  sort = (sorter: Record<string, "ascend" | "descend">) => {
    const SORT_TYPE: Record<string, string> = {
      ascend: "asc",
      descend: "desc",
    };
    const params = Object.keys(sorter)
      .map((field) => {
        if (sorter[field] === undefined) {
          return null;
        }
        return {
          field,
          order: SORT_TYPE[sorter[field]],
        };
      })
      .filter(Boolean);
    this.params.sort = params;
    if (params.length === 0) {
      delete this.params.sort;
    }
    return this.fetch();
  };

  /**
   * 使用初始参数请求
   */
  reset = (extraParams: Record<string, any> = {}) => {
    this.setParams((prevParams) => {
      prevParams = { ...this.initialParams, ...extraParams };
      return prevParams;
    });
    return this.fetch(this.params);
  };

  /**
   * 使用当前参数重新请求一次，常用于 PC 端表格「刷新」
   * @param params
   */
  reload = () => {
    return this.fetch(this.params);
  };

  /**
   * 页码置为 1，其他参数保留，重新请求一次，常用于移动端列表「刷新」
   */
  refresh = () => {
    this.params.page = 1;
    this.response.refreshing = true;
    return this.fetch(this.params);
  };

  /**
   * 改变每页数量
   * @param nextPageSize
   */
  changeSize = (nextPageSize: number) => {
    this.setParams((prevParams) => {
      prevParams = {
        ...this.params,
        pageSize: nextPageSize,
      };
      return prevParams;
    });

    return this.fetch(this.params);
  };

  /**
   * 移除列表中的多项（用在删除场景）
   * @param item
   */
  deleteItems = async <T = any>(items: T[]) => {
    const { dataSource, total } = this.response;
    const nextDataSource = dataSource.filter((existingItem) => {
      // @ts-ignore
      return !items.includes(existingItem);
    });
    if (nextDataSource.length >= total - 1) {
      this.response = {
        ...this.response,
        dataSource: nextDataSource,
        total: total - 1,
      };
      return this.resolve();
    }
    const originalResponse: RequestResponse = await this.tempFetch({
      page: dataSource.length,
      pageSize: items.length,
      ...omit(this.params, ["page", "pageSize"]),
    });
    const nextResponse = this.combinedProcessor(originalResponse);
    this.response = {
      ...this.response,
      ...nextResponse,
      dataSource: nextDataSource.concat(nextResponse.dataSource as any),
    };
    return this.resolve();
  };

  /**
   * 使用原始 fetch 进行请求，不会影响已有 page、params 等
   * @param params
   */
  private tempFetch = (...args: any[]) => {
    return this.originalFetch(...args);
  };

  /**
   * 清除所有数据，恢复到默认值
   */
  clean = () => {
    this.response = { ...DEFAULT_RESPONSE, ...this.extraResponse };
    this.params = { ...DEFAULT_PARAMS, ...this.initialParams };
    return this.resolve();
  };

  /**
   * 修改当前 response
   * @param processor
   */
  modifyResponse = (processor: (response: Response<T>) => Response<T>) => {
    this.response = processor(this.response);
    return this.resolve();
  };

  /**
   * 修改当前 params
   */
  modifyParams = (fn: (params: FetchParams) => FetchParams) => {
    this.params = fn(this.params);
    return this.resolve();
  };

  /**
   * 修改当前 search
   */
  modifySearch = (fn: (params: Search) => Search) => {
    this.params = {
      ...fn(omit(this.params, ["page", "pageSize"])),
      page: this.params.page,
      pageSize: this.params.pageSize,
    };
    return this.resolve();
  };

  /**
   * 修改 dataSource 中的指定元素
   * @param index
   * @param newItem
   */
  modifyItem = (newItem: T, index: number | string = this.rowKey) => {
    const { dataSource } = this.response;
    let itemIndexWantToModify = index as number;
    if (typeof index === "string") {
      itemIndexWantToModify = dataSource.findIndex(
        // @ts-ignore
        (data: T) => data[index] === newItem[index]
      );
    }
    // const itemWantToModify = dataSource[itemIndexWantToModify];
    const nextItem = newItem;
    // 支持 newItem 传入函数？
    const nextDataSource = [
      ...dataSource.slice(0, itemIndexWantToModify),
      nextItem as T,
      ...dataSource.slice(itemIndexWantToModify + 1),
    ];
    this.response.dataSource = nextDataSource;
    this.resolve();
  };

  private async resolve() {
    this.onChange({ ...this.response });
    return this.response;
  }
  // private async reject(error: Error) {
  //   if (this.onError) {
  //     this.onError(error);
  //   }
  //   return Promise.reject(error);
  // }
}

export default Helper;
