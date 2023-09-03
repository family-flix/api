/**
 * 将一个值转成数字类型
 * 如果是 undefined、null 就返回 null
 * 如果是非数字，也返回 null
 * 也就是说，只有真正的「数字」或者「数字字符串」，才回返回数字
 * @param v
 * @returns
 */
export function toNumber<R extends any>(v: any, defaultValue: R): number | R {
  if (typeof v !== "string" && typeof v !== "number") {
    return defaultValue;
  }
  const n = Number(v);
  if (Number.isNaN(n)) {
    return defaultValue;
  }
  return n;
}
