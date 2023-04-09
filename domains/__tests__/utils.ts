function simple_folder(
  item: string | boolean | number | null | object
): string | boolean | number | null {
  if (typeof item === "object" && item !== null) {
    const keys = Object.keys(item);
    const result: Record<string, unknown> = keys
      .map((k) => {
        // @ts-ignore
        const v = item[k];
        return {
          [k]: simple_folder(v),
        };
      })
      .reduce((res, cur) => {
        return {
          ...res,
          ...cur,
        };
      }, {});
    return JSON.stringify(result, null, 2);
  }
  return item;
}

export function simple_folders(arr: Parameters<typeof simple_folder>[0][]) {
  return arr
    .map((item) => {
      return simple_folder(item);
    })
    .sort();
}
