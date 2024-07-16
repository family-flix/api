/**
 * @file API 请求
 */
import { BaseDomain, Handler } from "@/domains/base";
import { BizError } from "@/domains/error/index";
import { HttpClientCore } from "@/domains/http_client/index";
import { Result } from "@/domains/result/index";
import { UnpackedResult } from "@/types/index";
import { sleep } from "@/utils/index";

import { RequestPayload, UnpackedRequestPayload } from "./utils";

enum Events {
  BeforeRequest,
  AfterRequest,
  LoadingChange,
  Success,
  Failed,
  Completed,
  Canceled,
  StateChange,
  ResponseChange,
}
type TheTypesOfEvents<T> = {
  [Events.LoadingChange]: boolean;
  [Events.BeforeRequest]: void;
  [Events.AfterRequest]: void;
  [Events.Success]: T;
  [Events.Failed]: BizError;
  [Events.Completed]: void;
  [Events.Canceled]: void;
  [Events.StateChange]: RequestState<T>;
  [Events.ResponseChange]: T | null;
};

type RequestState<T> = {
  loading: boolean;
  error: BizError | null;
  response: T | null;
};
type FetchFunction = (...args: any[]) => RequestPayload<any>;
type ProcessFunction<V, P> = (value: V) => Result<P>;
type RequestProps<F extends FetchFunction, P> = {
  client?: HttpClientCore;
  delay?: null | number;
  // defaultResponse?: any;
  defaultResponse?: P;
  // fetch: F;
  process?: ProcessFunction<Result<UnpackedRequestPayload<ReturnType<F>>>, P>;
  onSuccess?: (v: UnpackedResult<P>) => void;
  onFailed?: (error: BizError) => void;
  onCompleted?: () => void;
  onCanceled?: () => void;
  beforeRequest?: () => void;
  onLoading?: (loading: boolean) => void;
};

let handler: null | ((v: RequestCore<any>) => void) = null;
export function onCreate(h: (v: RequestCore<any>) => void) {
  handler = h;
}

/**
 * 用于接口请求的核心类
 */
export class RequestCore<F extends FetchFunction, P = UnpackedRequestPayload<ReturnType<F>>> extends BaseDomain<
  TheTypesOfEvents<any>
> {
  debug = false;

  defaultResponse: P | null = null;

  /**
   * 就是
   *
   * ```js
   * function test() {
   *   return request.post('/api/ping');
   * }
   * ```
   *
   * 函数返回 RequestPayload，描述该次请求的地址、参数等
   */
  service: F;
  process?: ProcessFunction<Result<UnpackedRequestPayload<ReturnType<F>>>, P>;
  client?: HttpClientCore;
  delay: null | number = 800;
  loading = false;
  /** 处于请求中的 promise */
  // pending: Promise<UnpackedRequestPayload<ReturnType<F>>> | null = null;
  pending: Promise<Result<P>> | null = null;
  /** 调用 prepare 方法暂存的参数 */
  // args: Parameters<T> | null = null;
  /** 请求的响应 */
  response: P | null = null;
  /** 请求失败，保存错误信息 */
  error: BizError | null = null;
  id = String(this.uid());

  get state(): RequestState<P> {
    return {
      loading: this.loading,
      error: this.error,
      response: this.response,
    };
  }

  constructor(fn: F, props: RequestProps<F, P> = {}) {
    super();

    const {
      client,
      delay,
      defaultResponse,
      // fetch,
      process,
      onSuccess,
      onFailed,
      onCompleted,
      onCanceled,
      onLoading,
      beforeRequest,
    } = props;
    this.service = fn;
    this.process = process;
    this.client = client;
    // this.method = method;
    if (delay !== undefined) {
      this.delay = delay;
    }
    if (defaultResponse) {
      this.defaultResponse = defaultResponse;
      this.response = defaultResponse;
    }
    // const source = axios.CancelToken.source();
    // this.source = source;
    if (onSuccess) {
      this.onSuccess(onSuccess);
    }
    if (onFailed) {
      this.onFailed(onFailed, { override: true });
    }
    if (onCompleted) {
      this.onCompleted(onCompleted);
    }
    if (onCanceled) {
      this.onCanceled(onCanceled);
    }
    if (onLoading) {
      this.onLoadingChange(onLoading);
    }
    if (beforeRequest) {
      this.beforeRequest(beforeRequest);
    }
    if (handler) {
      handler(this);
    }
  }
  /** 执行 service 函数 */
  async run(...args: Parameters<F>) {
    if (!this.service) {
      return Result.Err("缺少 service");
    }
    if (typeof this.service !== "function") {
      return Result.Err("service 不是函数");
    }
    if (!this.client) {
      return Result.Err("缺少 client");
    }
    if (this.pending !== null) {
      // const r = await this.pending;
      // this.loading = false;
      // const data = r.data as P;
      // this.pending = null;
      // return Result.Ok(data);
      return Result.Err("请勿重复请求");
    }
    // this.args = args;
    this.loading = true;
    this.response = this.defaultResponse;
    this.error = null;
    this.emit(Events.LoadingChange, true);
    this.emit(Events.StateChange, { ...this.state });
    this.emit(Events.BeforeRequest);
    let payloadProcess: null | ((v: any) => any) = null;
    const r2 = (() => {
      const { hostname = "", url, method, query, body, headers, process } = this.service(...(args as unknown as any[]));
      // console.log('[DOMAIN]request/index - after = this.service()', headers);
      if (process) {
        payloadProcess = process;
      }
      if (method === "GET") {
        // const [query, extra = {}] = args;
        const r = this.client.get<P>(hostname + url, query, {
          id: this.id,
          headers,
        });
        return Result.Ok(r) as Result<Promise<Result<P>>>;
        // return Result.Ok(r);
      }
      if (method === "POST") {
        // const [body, extra = {}] = args;
        const r = this.client.post<P>(hostname + url, body, {
          id: this.id,
          headers,
        });
        // return Result.Ok(r);
        return Result.Ok(r) as Result<Promise<Result<P>>>;
      }
      return Result.Err(`未知的 method '${method}'`);
    })();
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    this.pending = r2.data;
    const [r] = await Promise.all([this.pending, this.delay === null ? null : sleep(this.delay)]);
    this.pending = null;
    this.loading = false;
    const rr1 = (() => {
      if (payloadProcess) {
        return payloadProcess(r);
      }
      return r;
    })();
    const rr2 = this.process ? this.process(rr1 as any) : rr1;
    this.emit(Events.LoadingChange, false);
    this.emit(Events.StateChange, { ...this.state });
    this.emit(Events.Completed);
    if (rr2.error) {
      if (rr2.error.code === "CANCEL") {
        this.emit(Events.Canceled);
        return Result.Err(rr2.error);
      }
      this.error = rr2.error;
      this.emit(Events.Failed, rr2.error);
      this.emit(Events.StateChange, { ...this.state });
      return Result.Err(rr2.error.message);
    }
    const data = rr2.data as P;
    this.response = data;
    this.emit(Events.Success, data);
    this.emit(Events.StateChange, { ...this.state });
    this.emit(Events.ResponseChange, data);
    return Result.Ok(data);
  }
  /** 使用当前参数再请求一次 */
  reload() {
    // if (this.args === null) {
    //   return;
    // }
    // this.run(...this.args);
  }
  cancel() {
    if (!this.client) {
      return Result.Err("缺少 client");
    }
    this.client.cancel(this.id);
    // this.source.cancel("主动取消");
  }
  clear() {
    this.response = null;
    this.emit(Events.StateChange, { ...this.state });
    this.emit(Events.ResponseChange, this.response);
  }
  modifyResponse(fn: (resp: P) => P) {
    if (this.response === null) {
      return;
    }
    const nextResponse = fn(this.response);
    this.response = nextResponse;
    this.emit(Events.StateChange, { ...this.state });
    this.emit(Events.ResponseChange, this.response);
  }

  onLoadingChange(handler: Handler<TheTypesOfEvents<UnpackedResult<P>>[Events.LoadingChange]>) {
    return this.on(Events.LoadingChange, handler);
  }
  beforeRequest(handler: Handler<TheTypesOfEvents<UnpackedResult<P>>[Events.BeforeRequest]>) {
    return this.on(Events.BeforeRequest, handler);
  }
  onSuccess(handler: Handler<TheTypesOfEvents<UnpackedResult<P>>[Events.Success]>) {
    return this.on(Events.Success, handler);
  }
  onFailed(
    handler: Handler<TheTypesOfEvents<UnpackedResult<P>>[Events.Failed]>,
    opt: Partial<{
      /** 清除其他 failed 监听 */
      override: boolean;
    }> = {}
  ) {
    if (opt.override) {
      this.offEvent(Events.Failed);
    }
    return this.on(Events.Failed, handler);
  }
  onCanceled(handler: Handler<TheTypesOfEvents<UnpackedResult<P>>[Events.Canceled]>) {
    return this.on(Events.Canceled, handler);
  }
  /** 建议使用 onFailed */
  onError(handler: Handler<TheTypesOfEvents<UnpackedResult<P>>[Events.Failed]>) {
    return this.on(Events.Failed, handler);
  }
  onCompleted(handler: Handler<TheTypesOfEvents<UnpackedResult<P>>[Events.Completed]>) {
    return this.on(Events.Completed, handler);
  }
  onStateChange(handler: Handler<TheTypesOfEvents<UnpackedResult<P>>[Events.StateChange]>) {
    return this.on(Events.StateChange, handler);
  }
  onResponseChange(handler: Handler<TheTypesOfEvents<UnpackedResult<P>>[Events.ResponseChange]>) {
    return this.on(Events.ResponseChange, handler);
  }
}
