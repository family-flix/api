import crypto from "crypto";

import dayjs from "dayjs";

import { Result } from "@/types";
import { MEDIA_COUNTRY_MAP, MEDIA_GENRES_MAP } from "@/constants";

import { YoukuProfilePageInfo } from "./services";

let token = "";
export function update_token(t: string) {
  token = t;
}
export function get_sign(body: { t: number; d: string }) {
  const { t, d } = body;
  const k = 24679788;
  const e = `${token}&${t}&${k}&${d}`;
  const sign = crypto.createHash("md5").update(e).digest("hex");
  return sign;
}

export function format_season_profile(profile: YoukuProfilePageInfo["data"]["data"]) {
  const TYPE_MAP: Record<string, string> = {
    电影: "movie",
    综艺: "season",
  };
  const base_node = profile.nodes.find((n) => n.type === 10001);
  if (!base_node) {
    return Result.Err("缺少 base_node 信息");
  }
  const payload = {
    id: profile.data.extra.showId,
    name: profile.data.extra.showName,
    overview: null as null | string,
    poster_path: profile.data.extra.showImgV,
    air_date: dayjs(profile.data.extra.showReleaseTime).format("YYYY-MM-DD"),
    genres: [profile.data.extra.showCategory].map((n) => MEDIA_GENRES_MAP[n]),
    origin_country: [] as string[],
    persons: [] as {
      id: string;
      name: string;
      avatar: string;
    }[],
  };
  const intro_node = (() => {
    const a = base_node.nodes.find((n) => n.type === 20009);
    if (!a) {
      return null;
    }
    const b = a.nodes.find((n) => n.type === 20010);
    if (!b) {
      return null;
    }
    return b.data;
  })();
  if (intro_node) {
    payload.overview = intro_node.desc;
    payload.origin_country = [intro_node.introSubTitle.split("·")[0]].filter(Boolean).map((n) => MEDIA_COUNTRY_MAP[n]);
  }
  const PERSON_TYPE: Record<string, string> = {
    主持人: "host",
    嘉宾: "guest",
    导演: "director",
    主演: "main_charetors",
    演员: "actor",
  };
  const person_node = (() => {
    const a = base_node.nodes.find((n) => n.type === 20009);
    if (!a) {
      return null;
    }
    const b = a.nodes.filter((n) => n.type === 10011);
    if (!b) {
      return [];
    }
    return b.map((p) => {
      const {
        data: { personId, img, title, subtitle },
      } = p;
      return {
        id: personId,
        name: title,
        avatar: img,
        character: [],
        department: PERSON_TYPE[subtitle],
      };
    });
  })();
  const episode_node = (() => {
    const a = base_node.nodes.find((n) => n.type === 10013);
    if (!a) {
      return null;
    }
    return a.nodes.map((n, i) => {
      const {
        id,
        data: { stage, title, img },
      } = n;
      return {
        id,
        name: title,
        thumbnail: img,
        episode_number: i + 1,
        air_date: String(stage).replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$1-$2-$3"),
      };
    });
  })();
  const seasons = (() => {
    const a = base_node.nodes.find((n) => n.type === 10013);
    if (!a) {
      return [];
    }
    const b = a.data.series;
    if (!b) {
      return [];
    }
    return b.map((s) => {
      const { title, showId, lastEpisodeVideoId } = s;
      return {
        id: showId,
        name: title,
        overview: null,
        poster_path: null,
        air_date: null,
        genres: [],
        origin_country: [],
        persons: [],
      };
    });
  })();
  return {
    type: TYPE_MAP[profile.data.extra.videoCategory] || "season",
    id: payload.id,
    name: payload.name,
    overview: payload.overview,
    poster_path: payload.poster_path,
    backdrop_path: null,
    original_name: null,
    seasons: (() => {
      // 是电影
      if (seasons.length == 0) {
        return [
          {
            id: payload.id,
            name: payload.name,
            overview: payload.overview,
            poster_path: payload.poster_path,
            air_date: null,
            genres: [],
            origin_country: [],
            persons: [],
          },
        ];
      }
      return seasons.map((season) => {
        if (season.id !== payload.id) {
          return {
            ...season,
            genres: [],
            origin_country: [],
            persons: [],
          };
        }
        return {
          ...season,
          name: payload.name,
          overview: payload.overview,
          poster_path: payload.poster_path,
          air_date: payload.air_date,
          episodes: episode_node,
          persons: person_node,
          genres: payload.genres,
          origin_country: payload.origin_country,
        };
      });
    })(),
  };
}
