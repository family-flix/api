import {
  EpisodeProfileRecord,
  EpisodeRecord,
  FileSyncTaskRecord,
  ParsedEpisodeRecord,
  ParsedTVRecord,
  TVBindTaskRecord,
  TVProfileRecord,
  TVRecord,
} from "@/domains/store/types";
import { bytes_to_size } from "@/utils";

export function format_number_with_3decimals(number: number) {
  let str = number.toString();
  //   const decimal_index = str.indexOf(".");
  //   let decimalPart = "";
  const [inter, decimal] = str.split(".");
  //   if (decimal_index !== -1) {
  //     decimalPart = str.substring(decimal_index + 1);
  //   }
  // 如果小数部分为空，则补充3个0
  if (!decimal) {
    return `${inter}.000`;
  }
  // 如果小数部分超过3位，则截取前3位
  if (decimal && decimal.length > 3) {
    return `${inter}.${decimal.slice(0, 3)}`;
  }
  if (decimal && decimal.length < 3) {
    let d = decimal;
    while (d.length < 3) {
      d += "0";
    }
    return `${inter}.${d}`;
  }
  return `${inter}.${decimal}`;
}

export function normalize_partial_tv(
  tv: TVRecord & {
    profile: TVProfileRecord;
    parsed_tvs: ParsedTVRecord[];
    // episodes: (EpisodeRecord & {
    //   profile: EpisodeProfileRecord;
    //   parsed_episodes: ParsedEpisodeRecord[];
    //   _count: {
    //     parsed_episodes: number;
    //   };
    // })[];
    _count: {
      episodes: number;
      seasons: number;
      // parsed_episodes: number;
    };
  }
) {
  const { id, profile, parsed_tvs, _count } = tv;
  const {
    name,
    original_name,
    overview,
    poster_path,
    first_air_date,
    popularity,
    episode_count,
    season_count,
    in_production,
    genres,
    origin_country,
  } = profile;
  const incomplete = episode_count && episode_count !== _count.episodes;
  // const episode_sources = episodes
  //   .map((episode) => {
  //     return episode._count.parsed_episodes;
  //   })
  //   .reduce((total, cur) => {
  //     return total + cur;
  //   }, 0);
  // const tips: { text: string[] }[] = [];
  const tips: string[] = [];
  // if (binds.length === 0 && incomplete) {
  //   tips.push(`该电视剧集数不全且缺少可同步的分享资源(${_count.episodes}/${episode_count})`);
  // }
  if (!in_production && incomplete) {
    tips.push(`已完结但集数不完整，总集数 ${episode_count}，当前集数 ${_count.episodes}`);
  }
  // const size_count = episodes
  //   .map((episode) => {
  //     return episode.parsed_episodes
  //       .map(({ size }) => {
  //         return size || 0;
  //       })
  //       .reduce((total, cur) => {
  //         return total + cur;
  //       }, 0);
  //   })
  //   .reduce((total, cur) => {
  //     return total + cur;
  //   }, 0);
  return {
    id,
    name,
    original_name,
    overview,
    poster_path,
    first_air_date,
    popularity,
    episode_count,
    season_count,
    cur_episode_count: _count.episodes,
    cur_season_count: _count.seasons,
    genres,
    origin_country,
    binds: [],
    valid_bind: null,
    incomplete,
    need_bind: false,
    sync_task: null,
    tips,
  };
}
