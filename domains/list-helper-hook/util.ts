/**
 * 浅比较两个对象
 * @param a
 * @param b
 */
export function shallowEqual<T = any>(objA: T, objB: T) {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  } // Test for A's keys different from B.

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    // console.log(objA[key], objB[key], objA[key] === objB[key]);
    const hasSameKey = Object.prototype.hasOwnProperty.call(objB, key);
    // @ts-ignore
    if (!hasSameKey || !Object.is(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}
