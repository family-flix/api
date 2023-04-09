/**
 * 移除指定字段
 * 这个方法 lodash 中有，但是为了 Pagination 不包含任何依赖，所以这里自己实现了
 * @param data
 * @param keys
 */
export function omit(data: { [key: string]: any }, keys: string[]) {
  const fake = { ...data };
  keys.forEach((key) => {
    delete fake[key];
  });
  return fake;
}

export function noop() {}

function get<T>(obj: T, key: string | number) {
  // @ts-ignore
  return obj[key];
}
export function merge<T extends Record<string, any> = { [key: string]: any }>(
  current: T,
  defaultObj: T,
  override?: boolean
) {
  if (typeof defaultObj !== "object") {
    return current;
  }
  if (current === null || current === undefined) {
    return defaultObj;
  }
  return Object.keys(defaultObj)
    .map((key) => {
      const defaultValue = get(defaultObj, key);

      if (override) {
        return {
          [key]: defaultValue,
        };
      }
      if (get(current, key) === undefined) {
        // current[key] = defaultValue;
        return {
          [key]: defaultValue,
        };
      }
      return {
        [key]: get(current, key),
      };
    })
    .reduce((result, prev) => {
      return {
        ...result,
        ...prev,
      };
    }, current);
}

export const qs = {
  parse(search: string) {
    if (search === "" || search === "?") {
      return {};
    }
    let s = search;
    if (search[0] === "?") {
      s = search.slice(1);
    }
    const keyValues = s.split("&");
    return keyValues
      .map((keyValue) => {
        const [key, value] = keyValue.split("=");
        return {
          [key]: value,
        };
      })
      .reduce((whole, prev) => {
        return { ...whole, ...prev };
      }, {});
  },
  stringify(obj: Record<string, any>) {
    if (typeof obj !== "object") {
      return "";
    }
    return Object.keys(obj)
      .map((key) => {
        return `${key}=${obj[key]}`;
      })
      .join("&");
  },
};
