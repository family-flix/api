export function clean_name(name: string) {
  return name
    .replace(/\u200E/g, "")
    .replace(/&lrm;/g, "")
    .replace(/&#x200e;/g, "");
}

export function split_name_and_original_name(name: string, opt: Partial<{ debug: boolean }> = {}) {
  const { name: n, origin_name } = (() => {
    const [n, origin_n, ...rest] = name.split(" ");
    if (opt.debug) {
      console.log("origin_n", origin_n, rest);
    }
    if (!origin_n) {
      // 没有空格，就认为整个都是中文名
      return {
        name: n,
        origin_name: null,
      };
    }
    if (origin_n.match(/第[一二三四五六七八九十0-9]{1,}季/)) {
      // 第一个空格之后的文本，是 第xx季
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
