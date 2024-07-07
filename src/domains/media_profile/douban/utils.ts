import { DOUBAN_GENRE_TEXT_TO_VALUE } from "@/constants";
import { Result } from "@/types/index";

export function parse_profile_page_html(html: string) {
  const fields = html.match(/<div\s+id="info"[^>]*>([\s\S]*?)<\/div>/);
  if (!fields) {
    return Result.Err("匹配不到");
  }
  const content = fields[1];
  const lines = content.split(/<br\/{0,1}>/);
  const data: {
    name: string | null;
    original_name: string | null;
    overview: string | null;
    source_count: number;
    air_date: string | null;
    genres: string[];
    origin_country: string | null;
    alias: string | null;
    type: "tv" | "movie";
    vote_average: number;
    actors: {
      id: string;
      name: string;
      order: number;
    }[];
    director: {
      id: string;
      name: string;
      order: number;
    }[];
    author: {
      id: string;
      name: string;
      order: number;
    }[];
    imdb: string | null;
  } = {
    name: null,
    original_name: null,
    overview: null,
    alias: null,
    source_count: 0,
    air_date: null,
    vote_average: 0,
    origin_country: null,
    type: "tv",
    genres: [],
    actors: [],
    director: [],
    author: [],
    imdb: null,
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] as string;
    (() => {
      if (line.includes("集数")) {
        const r = line.match(/([0-9]{1,})/);
        if (r) {
          data.source_count = Number(r[1]);
        }
        return;
      }
      if (line.includes("首播") || line.includes("上映日期")) {
        const r = line.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})/);
        if (r) {
          data.air_date = r[1];
        }
        return;
      }
      if (line.includes("上映日期")) {
        data.type = "movie";
        return;
      }
      if (line.includes("又名")) {
        const r = line.match(/\/span> {0,1}([\s\S]{1,})$/);
        if (r) {
          data.alias = r[1];
        }
        return;
      }
      if (line.includes("制片国家")) {
        const r = line.match(/\/span> {0,1}([\s\S]{1,})$/);
        if (r) {
          data.origin_country = r[1];
        }
        return;
      }
      if (line.includes("类型")) {
        const genres = line.match(/<span property="v:genre">([^<]{1,})<\/span>/g);
        if (genres) {
          data.genres = genres
            .map((genre) => {
              const r = genre.match(/>([^<]{1,})</);
              if (r) {
                return r[1];
              }
              return null;
            })
            .filter(Boolean) as string[];
        }
        return;
      }
      if (line.includes("IMDb")) {
        const r = line.match(/IMDb:<\/span> {0,1}(tt[0-9]{1,})/);
        if (r) {
          data.imdb = r[1].trim();
        }
        return;
      }
      // const base_regexp1 = `"\/celebrity\/([0-9]{1,})\/"[^>]{0,}>([^<]{1,})<\/a>`;
      // const base_regexp2 = `"\/celebrity\/([0-9]{1,})\/"[^>]{0,}>([^<]{1,})<\/a>`;
      // const regexp1 = new RegExp(base_regexp1, "g");
      // const regexp2 = new RegExp(base_regexp1);
      if (line.includes("主演")) {
        // const regexp = /"v:starring">([^<]{1,})<\/a/g;
        const regexp1 = /<a href="https:\/\/www\.douban\.com\/personage\/([0-9]{1,})\/"[^>]{0,}>([^<]{1,})<\/a>/g;
        const regexp2 = /<a href="https:\/\/www\.douban\.com\/personage\/([0-9]{1,})\/"[^>]{0,}>([^<]{1,})<\/a>/;
        const nodes = line.match(regexp1);
        if (nodes) {
          data.actors = nodes
            .map((actor, i) => {
              const r = actor.match(regexp2);
              if (r) {
                return {
                  id: r[1],
                  name: r[2],
                  order: i + 1,
                };
              }
              return null;
            })
            .filter(Boolean) as {
            id: string;
            name: string;
            order: number;
          }[];
        }
        return;
      }
      if (line.includes("导演")) {
        // const regexp = /"v:directedBy">([^<]{1,})<\/a/g;
        const regexp1 = /<a href="https:\/\/www\.douban\.com\/personage\/([0-9]{1,})\/"[^>]{0,}>([^<]{1,})<\/a>/g;
        const regexp2 = /<a href="https:\/\/www\.douban\.com\/personage\/([0-9]{1,})\/"[^>]{0,}>([^<]{1,})<\/a>/;
        const nodes = line.match(regexp1);
        if (nodes) {
          data.director = nodes
            .map((actor, i) => {
              const r = actor.match(regexp2);
              if (r) {
                return {
                  id: r[1],
                  name: r[2],
                  order: i + 1,
                };
              }
              return null;
            })
            .filter(Boolean) as {
            id: string;
            name: string;
            order: number;
          }[];
        }
        return;
      }
      if (line.includes("编剧")) {
        const regexp1 = /<a href="https:\/\/www\.douban\.com\/personage\/([0-9]{1,})\/"[^>]{0,}>([^<]{1,})<\/a>/g;
        const regexp2 = /<a href="https:\/\/www\.douban\.com\/personage\/([0-9]{1,})\/"[^>]{0,}>([^<]{1,})<\/a>/;
        const nodes = line.match(regexp1);
        if (nodes) {
          data.author = nodes
            .map((actor, i) => {
              const r = actor.match(regexp2);
              if (r) {
                return {
                  id: r[1],
                  name: r[2],
                  order: i + 1,
                };
              }
              return null;
            })
            .filter(Boolean) as {
            id: string;
            name: string;
            order: number;
          }[];
        }
      }
    })();
  }
  const name_r = html.match(/property="v:itemreviewed">([^<]{1,})</);
  if (name_r) {
    const name = name_r[1];
    const { name: n, origin_name } = (() => {
      const [n, origin_n] = name.split(" ");
      if (origin_n) {
        return { name: n, origin_name: origin_n };
      }
      return {
        name,
        origin_name: null,
      };
    })();
    data.name = n;
    data.original_name = origin_name;
  }
  const overview_r = html.match(/<span property="v:summary"[^>]*>([\s\S]*?)<\/span>/);
  if (overview_r) {
    data.overview = overview_r[1]
      .replace(/<br {0,1}\/>/, "\n")
      .replace(/^\s{1,}|\s{1,}$/, "")
      .trim();
  }
  // fs.writeFileSync(path.join(__dirname, "mock", "profile3.html"), html);
  const rating_r = html.match(/v:average[^>]{1,}>([^<]{1,})</);
  if (rating_r) {
    data.vote_average = Number(rating_r[1]);
  }
  const {
    name,
    original_name,
    overview,
    air_date,
    source_count,
    alias,
    type,
    // tagline,
    // status,
    // vote_average,
    // poster_path,
    // backdrop_path,
    // popularity,
    // seasons,
    // number_of_episodes,
    // number_of_seasons,
    genres,
    origin_country,
    actors,
    director,
    author,
    vote_average,
    // in_production,
    imdb,
  } = data;
  return Result.Ok({
    // id,
    type,
    name,
    original_name,
    air_date,
    overview,
    source_count,
    alias,
    actors,
    director,
    author,
    vote_average,
    // tagline,
    // status,
    // vote_average,
    // popularity,
    // number_of_episodes,
    // number_of_seasons,
    // in_production,
    // ...fix_TMDB_image_path({
    //   poster_path,
    //   backdrop_path,
    // }),
    // seasons: seasons.map((season) => {
    //   const { poster_path } = season;
    //   return {
    //     ...season,
    //     ...fix_TMDB_image_path({ poster_path }),
    //   };
    // }),
    genres: genres
      .map((g) => {
        const v = DOUBAN_GENRE_TEXT_TO_VALUE[g];
        if (!v) {
          return null;
        }
        return {
          id: v,
          text: g,
        };
      })
      .filter(Boolean) as { id: number; text: string }[],
    origin_country,
    imdb,
  });
}

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
