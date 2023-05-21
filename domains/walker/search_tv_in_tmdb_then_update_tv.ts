import { EventHandlers, ExtraUserAndDriveInfo, upload_tmdb_images } from "@/domains/walker/utils";
import { TMDBClient } from "@/domains/tmdb";
import { TVProfileItemInTMDB } from "@/domains/tmdb/services";
import { store_factory } from "@/store";
import { ParsedEpisodeRecord, ParsedSeasonRecord, ParsedTVRecord, TVProfileRecord } from "@/store/types";
import { episode_to_num, season_to_num } from "@/utils";
import { Result } from "@/types";
import { log } from "@/logger/log";

/**
 * 将指定用户、指定网盘下的所有未知影视剧在 TMDB 上搜索详情
 * @param options
 * @param event_handlers
 * @returns
 */
export async function add_profile_for_parsed_tv_season_and_episode(
  options: ExtraUserAndDriveInfo & {
    need_upload_image?: boolean;
    store: ReturnType<typeof store_factory>;
  },
  event_handlers: EventHandlers = {}
) {
  const { user_id, drive_id, need_upload_image = true, store } = options;
  const { on_stop } = event_handlers;

  const page_size = 20;
  const skip = 0;
  let page = 1;
  let no_more = false;

  await (async () => {
    do {
      const parsed_tv_list = await store.prisma.parsed_tv.findMany({
        where: {
          tv_id: null,
          can_search: 1,
          user_id,
          drive_id,
        },
        include: {
          parsed_episodes: true,
          parsed_seasons: true,
        },
        skip: (page - 1) * page_size,
        take: page_size,
        orderBy: {
          name: "desc",
        },
      });
      log("找到", parsed_tv_list.length, "个需要搜索的电视剧");
      no_more = parsed_tv_list.length === 0;
      for (let i = 0; i < parsed_tv_list.length; i += 1) {
        const parsed_tv = parsed_tv_list[i];
        const { name, original_name, correct_name } = parsed_tv;
        const prefix = correct_name || name || original_name;
        if (on_stop) {
          const r = await on_stop();
          if (r.data) {
            return;
          }
        }
        const r = await add_tv_from_parsed_tv(parsed_tv, {
          user_id,
          store,
          need_upload_image,
          token: process.env.TMDB_TOKEN,
        });
        if (r.error) {
          log(`[${prefix}]`, "添加电视剧详情失败", r.error.message);
          continue;
        }
        log(`[${prefix}]`, "添加电视剧详情成功");
        await (async () => {
          log(`[${prefix}]`, "检查能否建立同步任务", r.data.profile.in_production, parsed_tv.file_name);
          if (r.data.profile.in_production && parsed_tv.file_name) {
            log(`[${prefix}]`, "处于更新中，建立一个资源同步任务");
            const transfer_res = await store.find_shared_file_save({
              name: parsed_tv.file_name,
              drive_id,
              user_id,
            });
            if (transfer_res.error) {
              return;
            }
            if (!transfer_res.data) {
              return;
            }
            const { url, file_id, name } = transfer_res.data;
            store.add_sync_task({
              url,
              file_id,
              name,
              in_production: 1,
              parsed_tv_id: parsed_tv.id,
              user_id,
            });
          }
        })();
      }
      page += 1;
    } while (no_more === false);

    page = 1;
    no_more = false;
    do {
      const parsed_season_list = await store.prisma.parsed_season.findMany({
        where: {
          season_id: null,
          can_search: 1,
          user_id,
          drive_id,
        },
        include: {
          parsed_tv: true,
        },
        skip: (page - 1) * page_size + Number(skip),
        take: Number(page_size),
        orderBy: {
          parsed_tv: {
            name: "desc",
          },
        },
      });
      page += 1;
      no_more = parsed_season_list.length === 0;
      log("找到", parsed_season_list.length, "个需要添加的季");
      for (let j = 0; j < parsed_season_list.length; j += 1) {
        const parsed_season = parsed_season_list[j];
        const { parsed_tv, season_number } = parsed_season;
        const { name, original_name, correct_name } = parsed_tv;
        const prefix = correct_name || name || original_name;
        const r = await add_season_from_parsed_season(
          {
            parsed_tv,
            parsed_season,
          },
          {
            user_id,
            store,
            need_upload_image,
            token: process.env.TMDB_TOKEN,
          }
        );
        if (r.error) {
          log(`[${prefix}/${season_number}]`, "添加季详情失败", r.error.message);
          continue;
        }
        log(`[${prefix}/${season_number}]`, "添加季详情成功");
      }
    } while (no_more === false);

    page = 1;
    no_more = false;
    do {
      const parsed_episode_list = await store.prisma.parsed_episode.findMany({
        where: {
          episode_id: null,
          can_search: 1,
          user_id,
          drive_id,
        },
        include: {
          parsed_tv: true,
          parsed_season: true,
        },
        skip: (page - 1) * page_size + Number(skip),
        take: Number(page_size),
        orderBy: {
          parsed_tv: {
            name: "desc",
          },
        },
      });
      page += 1;
      no_more = parsed_episode_list.length === 0;
      log("找到", parsed_episode_list.length, "个需要添加的剧集");
      for (let j = 0; j < parsed_episode_list.length; j += 1) {
        const parsed_episode = parsed_episode_list[j];
        const { parsed_tv, parsed_season, season_number, episode_number } = parsed_episode;
        const { name, original_name, correct_name } = parsed_tv;
        const prefix = correct_name || name || original_name;
        log(`[${prefix}/${season_number}/${episode_number}]`, "准备添加剧集信息");
        const r = await add_episode_from_parsed_episode(
          {
            parsed_tv,
            parsed_season,
            parsed_episode,
          },
          {
            user_id,
            store,
            need_upload_image,
            token: process.env.TMDB_TOKEN,
          }
        );
        if (r.error) {
          log(`[${name}/${season_number}/${episode_number}]`, "添加剧集详情失败", r.error.message);
          continue;
        }
        log(`[${name}/${season_number}/${episode_number}]`, "添加剧集详情成功");
      }
    } while (no_more === false);
  })();
  return Result.Ok(null);
}

/**
 * 搜索指定 tv 并将搜索到的结果更新到该 tv
 * @param parsed_tv
 * @returns
 */
export async function add_tv_from_parsed_tv(
  parsed_tv: ParsedTVRecord,
  extra: {
    user_id: string;
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
    token?: string;
  }
) {
  const { id } = parsed_tv;
  const { store, token } = extra;
  if (!token) {
    return Result.Err("缺少 TMDB token");
  }
  const profile_res = await get_tv_profile_with_tmdb(parsed_tv, extra);
  if (profile_res.error) {
    return Result.Err(profile_res.error);
  }
  if (profile_res.data === null) {
    store.update_parsed_tv(id, {
      can_search: 0,
    });
    return Result.Err("没有搜索到详情");
  }
  return add_tv_from_parsed_tv_sub(
    {
      profile: profile_res.data,
      parsed_tv,
    },
    extra
  );
}

/**
 * 根据电视剧详情创建电视剧？
 */
export async function add_tv_from_parsed_tv_sub(
  body: {
    profile: TVProfileRecord;
    parsed_tv: ParsedTVRecord;
  },
  extra: {
    user_id: string;
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
    token?: string;
  }
) {
  const { profile, parsed_tv } = body;
  const { name, original_name, correct_name } = parsed_tv;
  const { store, user_id } = extra;
  const prefix = `${correct_name || name || original_name}`;

  const tv_res = await (async () => {
    const existing_res = await store.find_tv({
      profile_id: profile.id,
      user_id,
    });
    if (existing_res.error) {
      return Result.Err(existing_res.error);
    }
    if (existing_res.data) {
      log(`[${prefix}]`, "已存在电视剧，直接关联");
      return Result.Ok(existing_res.data);
    }
    log(`[${prefix}]`, "新增电视剧并关联");
    const adding_res = await store.add_tv({
      profile_id: profile.id,
      user_id,
    });
    if (adding_res.error) {
      return Result.Err(adding_res.error, "10002", { id: profile.id });
    }
    return Result.Ok(adding_res.data);
  })();
  if (tv_res.error) {
    return Result.Err(tv_res.error);
  }
  const tv = tv_res.data;
  const r2 = await store.update_parsed_tv(parsed_tv.id, {
    tv_id: tv.id,
    can_search: 0,
  });
  if (r2.error) {
    return Result.Err(r2.error, "10003");
  }
  return Result.Ok({
    ...tv,
    profile,
  });
}

/**
 * 根据 parsed season 信息创建 season
 */
export async function add_season_from_parsed_season(
  body: {
    parsed_tv: ParsedTVRecord;
    parsed_season: ParsedSeasonRecord;
  },
  extra: {
    user_id: string;
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
    token?: string;
  }
) {
  const { parsed_tv, parsed_season } = body;
  const { name, original_name, correct_name } = parsed_tv;
  const { id, season_number } = parsed_season;
  const { user_id, store, token } = extra;
  if (!token) {
    return Result.Err("缺少 TMDB token");
  }
  if (!parsed_tv) {
    return Result.Err("缺少关联电视剧");
  }
  if (parsed_tv.tv_id === null) {
    return Result.Err("缺少关联电视剧详情");
  }
  const prefix = `${correct_name || name || original_name}/${season_number}`;
  const profile_res = await get_season_profile_with_tmdb(
    {
      tv: parsed_tv,
      season: parsed_season,
    },
    extra
  );
  if (profile_res.error) {
    return Result.Err(profile_res.error, "10001");
  }
  if (profile_res.data === null) {
    return Result.Err("没有匹配的记录");
  }
  const season_res = await (async () => {
    const existing_res = await store.find_season({
      profile_id: profile_res.data.id,
    });
    if (existing_res.error) {
      return Result.Err(existing_res.error);
    }
    const existing = existing_res.data;
    if (existing) {
      log(`[${prefix}]`, "已存在季详情，直接关联");
      return Result.Ok(existing);
    }
    log(`[${prefix}]`, "新增季详情并关联");
    const adding_res = await store.add_season({
      season_number: parsed_season.season_number,
      tv_id: parsed_tv.tv_id!,
      profile_id: profile_res.data.id,
      user_id,
    });
    if (adding_res.error) {
      return Result.Err(adding_res.error);
    }
    return Result.Ok(adding_res.data);
  })();
  if (season_res.error) {
    return Result.Err(season_res.error);
  }
  const r2 = await store.update_parsed_season(id, {
    season_id: season_res.data.id,
    can_search: 0,
  });
  if (r2.error) {
    return Result.Err(r2.error, "10003");
  }
  return Result.Ok(r2.data);
}

/**
 * 根据 parsed episode 信息创建 episode
 */
export async function add_episode_from_parsed_episode(
  body: {
    parsed_tv: ParsedTVRecord;
    parsed_season: ParsedSeasonRecord;
    parsed_episode: ParsedEpisodeRecord;
  },
  extra: {
    user_id: string;
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
    token?: string;
  }
) {
  const { parsed_tv, parsed_season, parsed_episode } = body;
  const { name, original_name, correct_name } = parsed_tv;
  const { episode_number, season_number } = parsed_episode;
  const { user_id, store, token } = extra;
  if (!token) {
    return Result.Err("缺少 TMDB token");
  }
  if (!parsed_tv) {
    return Result.Err("缺少关联电视剧");
  }
  if (parsed_tv.tv_id === null) {
    return Result.Err("缺少关联电视剧详情");
  }
  if (!parsed_season) {
    return Result.Err("缺少关联季");
  }
  if (parsed_season.season_id === null) {
    return Result.Err("缺少关联季详情");
  }
  const prefix = `${correct_name || name || original_name}/${season_number}/${episode_number}`;
  const profile_res = await get_episode_profile_with_tmdb(
    {
      tv: parsed_tv,
      season: parsed_season,
      episode: parsed_episode,
    },
    extra
  );
  if (profile_res.error) {
    return Result.Err(profile_res.error, "10001");
  }
  if (profile_res.data === null) {
    return Result.Err("没有匹配的记录");
  }
  const episode_res = await (async () => {
    const existing_res = await store.find_episode({
      profile_id: profile_res.data.id,
    });
    if (existing_res.error) {
      return Result.Err(existing_res.error);
    }
    if (existing_res.data) {
      log(`[${prefix}]`, "已存在该剧集详情，直接关联");
      return Result.Ok(existing_res.data);
    }
    log(`[${prefix}]`, "新增剧集详情并关联");
    const adding_res = await store.add_episode({
      season_number: parsed_season.season_number,
      episode_number: parsed_episode.episode_number,
      tv_id: parsed_tv.tv_id!,
      season_id: parsed_season.season_id!,
      profile_id: profile_res.data.id,
      user_id,
    });
    if (adding_res.error) {
      return Result.Err(adding_res.error);
    }
    return Result.Ok(adding_res.data);
  })();
  if (episode_res.error) {
    return Result.Err(episode_res.error);
  }
  const r2 = await store.update_parsed_episode(parsed_episode.id, {
    episode_id: episode_res.data.id,
    can_search: 0,
  });
  if (r2.error) {
    return Result.Err(r2.error, "10003");
  }
  return Result.Ok(r2.data);
}

/**
 * 在 tmdb 根据给定的 name 搜索，并返回第一个匹配的结果
 * @param tv
 * @param option
 * @returns
 */
export async function get_tv_profile_with_tmdb(
  tv: ParsedTVRecord,
  option: Partial<{
    store: ReturnType<typeof store_factory>;
    /** TMDB token */
    token: string;
    /** 是否要将 tmdb 的海报等图片上传到 CDN */
    need_upload_image: boolean;
  }> = {}
) {
  const { token, need_upload_image, store } = option;
  const { name, original_name, correct_name } = tv;
  const prefix = correct_name || name || original_name;
  if (!token) {
    return Result.Err("缺少 TMDB token");
  }
  if (!store) {
    return Result.Err("缺少数据库实例");
  }
  // log("[](search_tv_in_tmdb)start search", tv.name || tv.original_name);
  let tv_profile = null;
  if (correct_name) {
    log(`[${prefix}]`, "使用", correct_name, "搜索");
    const r = await find_first_matched_tv_from_tmdb(correct_name, { token, need_upload_image, store });
    if (r.error) {
      return Result.Err(r.error);
    }
    tv_profile = r.data;
  }
  if (tv_profile === null && name) {
    log(`[${prefix}]`, "使用", name, "搜索");
    const r = await find_first_matched_tv_from_tmdb(name, { token, need_upload_image, store });
    if (r.error) {
      return Result.Err(r.error);
    }
    tv_profile = r.data;
  }
  if (tv_profile === null && original_name) {
    log(`[${prefix}]`, "使用", original_name, "搜索");
    const processed_original_name = original_name.split(".").join(" ");
    const r = await find_first_matched_tv_from_tmdb(processed_original_name, {
      token,
      need_upload_image,
      store,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    tv_profile = r.data;
  }
  if (tv_profile === null) {
    return Result.Ok(null);
  }
  log(`[${prefix}]`, "使用", original_name, "搜索到的结果为", tv_profile.name || tv_profile.original_name);
  return Result.Ok(tv_profile);
}

async function get_season_profile_with_tmdb(
  body: {
    tv: ParsedTVRecord;
    season: ParsedSeasonRecord;
  },
  option: Partial<{
    store: ReturnType<typeof store_factory>;
    /** TMDB token */
    token: string;
  }> = {}
) {
  const { tv: parsed_tv, season: parsed_season } = body;
  const { token, store } = option;
  if (!token) {
    return Result.Err("缺少 TMDB token");
  }
  if (!store) {
    return Result.Err("缺少数据库实例");
  }
  if (parsed_tv.tv_id === null) {
    return Result.Err("电视剧缺少匹配的详情");
  }
  const tv = await store.prisma.tv.findUnique({
    where: {
      id: parsed_tv.tv_id,
    },
    include: {
      profile: true,
    },
  });
  if (tv === null) {
    return Result.Err("没有找到匹配的电视剧");
  }
  const client = new TMDBClient({ token });
  const { season_number } = parsed_season;
  const r = await client.fetch_season_profile({
    tv_id: tv.profile.tmdb_id,
    season_number: season_to_num(season_number),
  });
  if (r.error) {
    return Result.Err(r.error);
  }
  const existing_res = await store.find_season_profile({
    tmdb_id: r.data.id,
  });
  if (existing_res.error) {
    return Result.Err(existing_res.error);
  }
  if (existing_res.data) {
    return Result.Ok(existing_res.data);
  }
  const { id, name, overview, air_date } = r.data;
  const adding_res = await store.add_season_profile({
    tmdb_id: id,
    name,
    overview,
    air_date,
  });
  if (adding_res.error) {
    return Result.Err(adding_res.error);
  }
  return Result.Ok(adding_res.data);
}

async function get_episode_profile_with_tmdb(
  body: {
    tv: ParsedTVRecord;
    season: ParsedSeasonRecord;
    episode: ParsedEpisodeRecord;
  },
  option: Partial<{
    store: ReturnType<typeof store_factory>;
    /** TMDB token */
    token: string;
  }> = {}
) {
  const { tv: parsed_tv, season: parsed_season, episode: parsed_episode } = body;
  const { token, store } = option;
  if (!token) {
    return Result.Err("缺少 TMDB token");
  }
  if (!store) {
    return Result.Err("缺少数据库实例");
  }
  if (parsed_tv.tv_id === null) {
    return Result.Err("电视剧缺少匹配的详情");
  }
  const tv = await store.prisma.tv.findUnique({
    where: {
      id: parsed_tv.tv_id,
    },
    include: {
      profile: true,
    },
  });
  if (tv === null) {
    return Result.Err("没有找到匹配的电视剧");
  }
  const client = new TMDBClient({ token });
  const { season_number, episode_number } = parsed_episode;
  const r = await client.fetch_episode_profile({
    tv_id: tv.profile.tmdb_id,
    season_number: season_to_num(season_number),
    episode_number: episode_to_num(episode_number),
  });
  if (r.error) {
    return Result.Err(r.error);
  }
  const existing_res = await store.find_episode_profile({
    tmdb_id: r.data.id,
  });
  if (existing_res.error) {
    return Result.Err(existing_res.error);
  }
  if (existing_res.data) {
    return Result.Ok(existing_res.data);
  }
  const { id, name, overview, air_date } = r.data;
  const adding_res = await store.add_episode_profile({
    tmdb_id: id,
    name,
    overview,
    air_date,
  });
  if (adding_res.error) {
    return Result.Err(adding_res.error);
  }
  return Result.Ok(adding_res.data);
}

/**
 * 根据关键字在 TMDB 搜索匹配的电视剧，并返回列表中的第一个匹配结果
 * @param name
 * @param options
 * @returns
 */
export async function find_first_matched_tv_from_tmdb(
  name: string,
  options: {
    /** TMDB token */
    token?: string;
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
  }
) {
  const { token, store, need_upload_image = false } = options;
  const snapshot_res = await store.find_tv_profile_snap({
    name,
  });
  if (snapshot_res.data) {
    const t = await store.find_tv_profile({ id: snapshot_res.data.tv_profile_id });
    if (t.data) {
      return Result.Ok(t.data);
    }
  }
  const tmdb_client = new TMDBClient({
    token,
  });
  const r1 = await tmdb_client.search_tv(name);
  if (r1.error) {
    return Result.Err(["[ERROR]tmdbClient.search_tv failed, param is", name, ", because ", r1.error.message].join(" "));
  }
  const { list } = r1.data;
  if (list.length === 0) {
    return Result.Ok(null);
  }
  const tv_item = extra_searched_tv_field(list[0]);
  const r = await get_tv_profile_with_tmdb_id(
    {
      tmdb_id: tv_item.tmdb_id,
      original_language: tv_item.original_language,
    },
    {
      client: tmdb_client,
      store,
      need_upload_image,
    }
  );
  if (r.error) {
    return Result.Err(r.error);
  }
  store.add_tv_profile_snap({
    name,
    tv_profile_id: r.data.id,
  });
  return Result.Ok(r.data);
}

/** 根据 tmdb_id 新增一条电视剧详情 */
export async function get_tv_profile_with_tmdb_id(
  info: {
    tmdb_id: number;
    original_language?: string;
  },
  options: {
    client: TMDBClient;
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
  }
) {
  const { tmdb_id, original_language } = info;
  const { client, store, need_upload_image } = options;

  const profile_res = await client.fetch_tv_profile(tmdb_id);
  if (profile_res.error) {
    return Result.Err(profile_res.error);
  }
  const profile = profile_res.data;
  const {
    name,
    original_name,
    first_air_date,
    overview,
    poster_path,
    backdrop_path,
    popularity,
    vote_average,
    number_of_episodes,
    number_of_seasons,
    status,
    in_production,
  } = profile;
  const { poster_path: uploaded_poster_path, backdrop_path: uploaded_backdrop_path } = await (async () => {
    if (need_upload_image) {
      return await upload_tmdb_images({
        tmdb_id,
        poster_path,
        backdrop_path,
      });
    }
    return {
      poster_path,
      backdrop_path,
    };
  })();
  const existing_res = await store.find_tv_profile({
    tmdb_id,
  });
  if (existing_res.error) {
    return Result.Err(`查找电视剧详情失败 ${existing_res.error.message}`);
  }
  if (existing_res.data) {
    // console.log("电视剧详情已存在", name || original_name, existing_res.data.name);
    return Result.Ok(existing_res.data);
  }
  const t = await store.add_tv_profile({
    tmdb_id,
    name,
    original_name,
    overview: overview ?? null,
    poster_path: uploaded_poster_path ?? null,
    backdrop_path: uploaded_backdrop_path ?? null,
    first_air_date,
    original_language: original_language ?? null,
    popularity,
    vote_average,
    episode_count: number_of_episodes,
    season_count: number_of_seasons,
    status,
    in_production: Number(in_production),
  });
  if (t.error) {
    return Result.Err(t.error);
  }
  return Result.Ok(t.data);
}

export function extra_searched_tv_field(tv: TVProfileItemInTMDB) {
  const {
    id: tmdb_id,
    name,
    original_name,
    backdrop_path,
    original_language,
    overview,
    popularity,
    poster_path,
    first_air_date,
    vote_average,
    vote_count,
    // number_of_episodes,
    // number_of_seasons,
  } = tv;
  return {
    tmdb_id,
    name,
    original_name,
    backdrop_path,
    original_language,
    overview,
    popularity,
    poster_path,
    first_air_date,
    vote_average,
    vote_count,
  };
}
