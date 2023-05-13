export type Resp<T> = {
  data: T extends null ? null : T;
  error: T extends null ? Error : null;
};
export type Result<T> = Resp<T> | Resp<null>;
export type UnpackedResult<T> = NonNullable<
  T extends Resp<infer U> ? (U extends null ? U : U) : T
>;
/** 构造一个结果对象 */
export const Result = {
  /** 构造成功结果 */
  Ok: <T>(value: T) => {
    const result = {
      data: value,
      error: null,
    } as Result<T>;
    return result;
  },
  /** 构造失败结果 */
  Err: <T>(message: string | Error | Result<null>, code?: string) => {
    const result = {
      data: null,
      error: (() => {
        if (typeof message === "string") {
          const e = new Error(message);
          // @ts-ignore
          e.code = code;
          return e;
        }
        if (typeof message === "object") {
          // @ts-ignore
          message.code = code;
          return message;
        }
        const r = message as Result<null>;
        // @ts-ignore
        r.error.code = code;
        return r.error;
      })(),
    } as Result<null>;
    return result;
  },
};

/** 将一个返回 promise 的函数转换成返回 Result 的函数 */
export function resultify<F extends (...args: any[]) => Promise<any>>(fn: F) {
  return async (...args: Parameters<F>) => {
    try {
      const data = await fn(...args);
      const r = Result.Ok(data) as Result<Unpacked<ReturnType<F>>>;
      return r;
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  };
}

export type Unpacked<T> = T extends (infer U)[]
  ? U
  : T extends (...args: any[]) => infer U
  ? U
  : T extends Promise<infer U>
  ? U
  : T extends Result<infer U>
  ? U
  : T;

export type BaseApiResp<T> = {
  code: number;
  msg: string;
  data: T;
};

export type ListResponse<T> = {
  total: number;
  page: number;
  page_size: number;
  list: T[];
};

export type RequestedResource<T extends (...args: any[]) => any> =
  UnpackedResult<Unpacked<ReturnType<T>>>;

export interface JSONArray extends Array<JSONValue> {}
export type JSONValue =
  | string
  | number
  | boolean
  | JSONObject
  | JSONArray
  | null;
export type JSONObject = { [Key in string]?: JSONValue };
