export function map_season_number(num: string) {
  const NUMBER_TEXT_MAP: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
    十一: 11,
    十二: 12,
    十三: 13,
    十四: 14,
    十五: 15,
    十六: 16,
    十七: 17,
    十八: 18,
    十九: 19,
    二十: 20,
    二十一: 21,
    二十二: 22,
    二十三: 23,
    二十四: 24,
    二十五: 25,
    二十六: 26,
    二十七: 27,
    二十八: 28,
    二十九: 29,
    三十: 30,
  };
  if (num.match(/[0-9]{1,}/)) {
    return Number(num);
  }
  const n = NUMBER_TEXT_MAP[num];
  if (n) {
    return n;
  }
  return null;
}
export function format_season_name(name: string, tv: { name: string }) {
  // console.log("format_season_name", name, tv.name);
  const regexps = [
    {
      regexp: /^[第全] {0,1}([0-9]{1,}) {0,1}[季部]$/,
      render(match: RegExpMatchArray, num: number | null) {
        if (num === 1) {
          return null;
        }
        return match[0].replace(/ /g, "").replace(/^全/, "第").replace(/部$/, "季");
      },
    },
    {
      regexp: /^[第全] {0,1}([一二三四五六七八九十]{1,}) {0,1}[季部]$/,
      render(match: RegExpMatchArray, num: number | null) {
        if (num === 1) {
          return null;
        }
        return match[0].replace(/ /g, "").replace(/^全/, "第").replace(/部$/, "季");
      },
    },
    {
      regexp: /特别[季篇]/,
      render(match: RegExpMatchArray, num: number | null) {
        return match[0];
      },
    },
    {
      regexp: /^Season {0,1}([0-9]{1,})$/,
      render(match: RegExpMatchArray, num: number | null) {
        if (num === 1) {
          return null;
        }
        return `第${num}季`;
      },
    },
    {
      regexp: /^[季] {0,1}([0-9]{1,})$/,
      render(match: RegExpMatchArray, num: number | null) {
        if (num === 1) {
          return null;
        }
        return `第${num}季`;
      },
    },
    {
      regexp: /^Series {0,1}([0-9]{1,})$/,
      render(match: RegExpMatchArray, num: number | null) {
        if (num === 1) {
          return null;
        }
        return `第${num}季`;
      },
    },
  ];
  for (let i = 0; i < regexps.length; i += 1) {
    const { regexp, render } = regexps[i];
    const r = name.match(regexp);
    if (r) {
      const season_text = r[1];
      const season_number = season_text ? map_season_number(season_text) : null;
      const season_name = render(r, season_number);
      return [tv.name, season_name].filter(Boolean).join(" ");
    }
  }
  return name;
}
