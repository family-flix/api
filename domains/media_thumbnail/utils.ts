import { ParsedTVRecord, SyncTaskRecord, TVProfileRecord, TVRecord } from "@/domains/store/types";

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
    // parsed_tvs: ParsedTVRecord[];
    sync_tasks: SyncTaskRecord[];
    _count: {
      episodes: number;
      seasons: number;
    };
  }
) {
  const { id, profile, sync_tasks, _count } = tv;
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
  const binds = sync_tasks;
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
  // if (sync_tasks.length === 0 && incomplete) {
  //   tips.push(`该电视剧集数不全且缺少同步任务(${_count.episodes}/${episode_count})`);
  // }
  const valid_bind = (() => {
    if (binds.length === 0) {
      return null;
    }
    const valid_task = binds.find((b) => !b.invalid);
    if (!valid_task) {
      return null;
    }
    return {
      id: valid_task.id,
    };
  })();
  if (binds.length !== 0 && valid_bind === null) {
    tips.push("更新已失效");
  }
  const need_bind = (() => {
    if (!incomplete) {
      return false;
    }
    if (in_production && binds.length === 0) {
      return true;
    }
    if (valid_bind === null) {
      return true;
    }
    return false;
  })();
  if (in_production && incomplete && binds.length === 0) {
    tips.push("未完结但缺少同步任务");
  }
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
    binds: sync_tasks,
    valid_bind,
    incomplete,
    need_bind,
    sync_task: valid_bind,
    tips,
  };
}
