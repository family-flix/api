export function split_name_and_original_name(name: string) {
  const { name: n, origin_name } = (() => {
    const [n, origin_n, ...rest] = name.split(" ");
    if (!origin_n) {
      // 没有空格
      return {
        name: n,
        origin_name: null,
      };
    }
    if (origin_n.match(/第[一二三四五六七八九十0-9]{1,}季/)) {
      return {
        name: [n, origin_n].join(" "),
        origin_name: rest.length === 0 ? null : rest.join(" "),
      };
    }
    return { name: n, origin_name: [origin_n, ...rest].join(" ") };
  })();
  return {
    name: n,
    origin_name,
  };
}
