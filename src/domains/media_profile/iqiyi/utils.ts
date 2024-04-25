import crypto from "crypto";

const w = "howcuteitis";
export function get_sign() {
  var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
    e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
    r = e.splitKey,
    n = void 0 === r ? "&" : r,
    o = e.secretKey,
    c = void 0 === o ? w : o,
    l = e.key,
    d = void 0 === l ? "secret_key" : l,
    f = Object.keys(t).sort(),
    _ = f.map(function (e) {
      return "".concat(e, "=").concat(t[e]);
    });
  const hash = crypto.createHash("md5");
  return _.push("".concat(d, "=").concat(c)), hash.update(_.join(n)).digest("hex").toUpperCase();
}

export function build_iqiyi_query(extra: Record<string, unknown>) {
  const query = {
    ...extra,
    timestamp: new Date().valueOf(),
    src: "pcw_tvg",
    vip_status: 0,
    vip_type: "",
    auth_cookie: "",
    device_id: "4798183996645ebf3163434564f5252c",
    user_id: "",
    app_version: "6.1.0",
    scale: 200,
  };
  // @ts-ignore
  query.sign = get_sign(query);
  return query;
}

/**
 * 格式化影视剧演职员数据
 * @param people
 */
export function format_people(
  people: Record<
    string,
    {
      id: number;
      name: string;
      character?: string[];
      image_url: string;
    }[]
  >
) {
  const orders: Record<string, number> = { main_charactor: 1, director: 2, screen_writer: 3, host: 4, guest: 5 };
  return Object.keys(people)
    .sort((a, b) => orders[a] - orders[b])
    .map((department) => {
      const arr = people[department];
      return arr.map((p) => {
        const { id, name, image_url, character } = p;
        return {
          id,
          name,
          avatar: image_url,
          character: character ? character.filter(Boolean) : [],
          department,
        };
      });
    })
    .reduce((a, b) => a.concat(b), [])
    .map((p, i) => {
      return {
        ...p,
        order: i + 1,
      };
    });
}

export function format_poster_path(url: string) {
  const sizes: {
    s2: string;
    s3: string;
    s4: string;
  } = {
    s2: "_260_360",
    s3: "_405_540",
    s4: "_579_772",
  };
  const last_dot_index = url.lastIndexOf(".");
  let prev_part = url.substring(0, last_dot_index);
  if (!prev_part.match(/m5$/)) {
    prev_part = prev_part.replace(/_[0-9]{3}_[0-9]{3}$/, "");
  }
  const suffix_part = url.substring(last_dot_index);
  return Object.keys(sizes)
    .map((k) => {
      const r = prev_part + sizes[k as keyof typeof sizes] + suffix_part;
      return {
        [k]: r,
      };
    })
    .reduce(
      (a, b) => {
        return {
          ...a,
          ...b,
        };
      },
      {
        s1: url,
      }
    );
}
