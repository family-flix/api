import { EventHandlers, ExtraUserAndDriveInfo, upload_tmdb_images } from "@/domains/walker/utils";
import { TMDBClient } from "@/domains/tmdb";
import { store_factory } from "@/store";
import { log } from "@/logger/log";
import { Result, resultify } from "@/types";
import { PartialTVProfile } from "@/domains/tmdb/services";
import { ParsedEpisodeRecord, ParsedSeasonRecord, ParsedTVRecord, TVProfileRecord } from "@/store/types";
import { episode_to_num, season_to_chinese_num, season_to_num } from "@/utils";

/**
 * 将指定用户、指定网盘下的所有未知影视剧在 TMDB 上搜索详情
 * @param options
 * @param event_handlers
 * @returns
 */
export async function add_tv_from_parsed_tv_list(
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
  await (async () => {
    let tv_no_more = false;
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
        skip: (page - 1) * page_size + Number(skip),
        take: Number(page_size),
        orderBy: {
          name: "desc",
        },
      });
      // const parsed_tv_res = await store.find_parsed_tv_list_with_pagination({}, { page, size: 20 });
      // if (parsed_tv_res.error) {
      //   log(["[ERROR]find tvs that tv_profile_id is null failed", parsed_tv_res.error.message]);
      //   return Result.Err(parsed_tv_res.error);
      // }
      log("找到", parsed_tv_list.length, "个需要搜索的电视剧");
      log(parsed_tv_list.map((tv) => tv.name || tv.original_name).join("\n"));
      tv_no_more = parsed_tv_list.length === 0;
      for (let i = 0; i < parsed_tv_list.length; i += 1) {
        const parsed_tv = parsed_tv_list[i];
        const { name, original_name } = parsed_tv;

        if (on_stop) {
          const r = await on_stop();
          if (r.data) {
            return;
          }
        }
        // log(`[${name || original_name}]`, "开始搜索电视剧");
        const r = await add_tv_from_parsed_tv(parsed_tv, {
          user_id,
          // drive_id,
          store,
          need_upload_image,
          token: process.env.TMDB_TOKEN,
        });
        if (r.error) {
          log(`[${name || original_name}]`, "添加电视剧失败", r.error.message);
          continue;
        }
        log(`[${name || original_name}]`, "添加电视剧成功");
      }
      page += 1;
    } while (tv_no_more === false);

    page = 1;
    let season_no_more = false;
    do {
      const parsed_season_list = await store.prisma.parsed_season.findMany({
        where: {
          season_id: null,
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
      season_no_more = parsed_season_list.length === 0;
      log("找到", parsed_season_list.length, "个需要添加的季");
      for (let j = 0; j < parsed_season_list.length; j += 1) {
        const parsed_season = parsed_season_list[j];
        const { parsed_tv, season_number } = parsed_season;
        const name = parsed_tv.name || parsed_tv.original_name;
        const r = await add_season_from_parsed_season(
          {
            parsed_tv,
            parsed_season,
          },
          {
            user_id,
            drive_id,
            store,
            need_upload_image,
            token: process.env.TMDB_TOKEN,
          }
        );
        if (r.error) {
          log(`[${name}/${season_number}]`, "添加剧信息失败", r.error.message);
          continue;
        }
        log(`[${name}/${season_number}]`, "添加剧信息成功");
      }
    } while (season_no_more === false);

    page = 1;
    let episode_no_more = false;
    do {
      const parsed_episode_list = await store.prisma.parsed_episode.findMany({
        where: {
          episode_id: null,
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
      episode_no_more = parsed_episode_list.length === 0;
      log("找到", parsed_episode_list.length, "个需要添加的集");
      for (let j = 0; j < parsed_episode_list.length; j += 1) {
        const parsed_episode = parsed_episode_list[j];
        const { parsed_tv, parsed_season } = parsed_episode;
        const name = parsed_tv.name || parsed_tv.original_name;
        const season_number = parsed_season.season_number;
        const episode_number = parsed_episode.episode_number;
        log(`[${name}/${season_number}/${episode_number}]`, "准备添加剧集信息");
        const r = await add_episode_from_parsed_episode(
          {
            parsed_tv,
            parsed_season,
            parsed_episode,
          },
          {
            user_id,
            drive_id,
            store,
            need_upload_image,
            token: process.env.TMDB_TOKEN,
          }
        );
        if (r.error) {
          log(`[${name}/${season_number}/${episode_number}]`, "添加剧集信息失败", r.error.message);
          continue;
        }
        log(`[${name}/${season_number}/${episode_number}]`, "添加剧集信息成功");
      }
    } while (episode_no_more === false);
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
    // drive_id: string;
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
    token?: string;
  }
) {
  const { id, name, original_name } = parsed_tv;
  const { store, token } = extra;
  if (!token) {
    return Result.Err("缺少 TMDB token");
  }
  const profile_res = await get_tv_profile_with_tmdb(
    {
      name,
      original_name,
    },
    extra
  );
  if (profile_res.error) {
    return Result.Err(profile_res.error, "10001");
  }
  if (profile_res.data === null) {
    store.update_parsed_tv(id, {
      can_search: 0,
    });
    return Result.Err("没有匹配的记录");
  }
  return add_tv_from_parsed_tv_sub(
    {
      profile: profile_res.data,
      parsed_tv,
    },
    extra
  );
}
export async function add_tv_from_parsed_tv_sub(
  body: {
    profile: TVProfileRecord;
    parsed_tv: ParsedTVRecord;
  },
  extra: {
    user_id: string;
    // drive_id: string;
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
    token?: string;
  }
) {
  const { profile, parsed_tv } = body;
  const { store, user_id } = extra;
  // console.log(await store.find_tv({ profile_id: profile_res.data.id }), profile_res.data.id);
  const existing_res = await store.find_tv({
    profile_id: profile.id,
    user_id,
  });
  if (existing_res.error) {
    return Result.Err(existing_res.error);
  }
  if (existing_res.data) {
    const r2 = await store.update_parsed_tv(parsed_tv.id, {
      tv_id: existing_res.data.id,
      can_search: 0,
    });
    if (r2.error) {
      return Result.Err(r2.error, "10003");
    }
    return Result.Ok(r2.data);
  }
  const tv_res = await store.add_tv({
    profile_id: profile.id,
    user_id,
  });
  if (tv_res.error) {
    return Result.Err(tv_res.error, "10002", { id: profile.id });
  }
  const r2 = await store.update_parsed_tv(parsed_tv.id, {
    tv_id: tv_res.data.id,
    can_search: 0,
  });
  if (r2.error) {
    return Result.Err(r2.error, "10003");
  }
  return Result.Ok(r2.data);
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
    drive_id: string;
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
    token?: string;
  }
) {
  const { parsed_tv, parsed_season } = body;
  const { id } = parsed_season;
  const { user_id, drive_id, store, token } = extra;
  if (!token) {
    return Result.Err("缺少 TMDB token");
  }
  if (!parsed_tv) {
    return Result.Err("缺少关联电视剧");
  }
  if (parsed_tv.tv_id === null) {
    return Result.Err("缺少关联电视剧详情");
  }
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
  const existing = await store.prisma.season.findFirst({
    where: {
      profile_id: profile_res.data.id,
    },
  });
  if (existing) {
    const r2 = await store.update_parsed_season(id, {
      season_id: existing.id,
      // can_search: 0,
    });
    if (r2.error) {
      return Result.Err(r2.error, "10003");
    }
    return Result.Ok(r2.data);
  }
  const adding_season_res = await store.add_season({
    season_number: parsed_season.season_number,
    tv_id: parsed_tv.tv_id,
    profile_id: profile_res.data.id,
    user_id,
  });
  if (adding_season_res.error) {
    return Result.Err(adding_season_res.error, "10002", { id: profile_res.data.id });
  }
  const r2 = await store.update_parsed_season(id, {
    season_id: adding_season_res.data.id,
    // can_search: 0,
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
    drive_id: string;
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
    token?: string;
  }
) {
  const { parsed_tv, parsed_season, parsed_episode } = body;
  const { name } = parsed_tv;
  const { id, parsed_tv_id, parsed_season_id, episode_number, season_number } = parsed_episode;
  const { user_id, drive_id, store, token } = extra;
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
  const existing = await store.prisma.episode.findFirst({
    where: {
      profile_id: profile_res.data.id,
    },
  });
  if (existing) {
    log(`${name}/${season_number}/${episode_number}`, "已存在该剧集详情，直接关联");
    const r2 = await store.update_parsed_episode(id, {
      episode_id: existing.id,
      // can_search: 0,
    });
    if (r2.error) {
      return Result.Err(r2.error, "10003");
    }
    return Result.Ok(r2.data);
  }
  log(`${name}/${season_number}/${episode_number}`, "新增剧集详情");
  const adding_episode_res = await store.add_episode({
    episode_number: parsed_episode.episode_number,
    tv_id: parsed_tv.tv_id,
    season_id: parsed_season.season_id,
    profile_id: profile_res.data.id,
    user_id,
  });
  if (adding_episode_res.error) {
    return Result.Err(adding_episode_res.error, "10002", { id: profile_res.data.id });
  }
  const r2 = await store.update_parsed_episode(parsed_episode.id, {
    episode_id: adding_episode_res.data.id,
    // can_search: 0,
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
  tv: {
    name: string | null;
    original_name: string | null;
  },
  option: Partial<{
    store: ReturnType<typeof store_factory>;
    /** TMDB token */
    token: string;
    /** 是否要将 tmdb 的海报等图片上传到 CDN */
    need_upload_image: boolean;
  }> = {}
) {
  const { token, need_upload_image, store } = option;
  if (!token) {
    return Result.Err("缺少 TMDB token");
  }
  if (!store) {
    return Result.Err("缺少数据库实例");
  }
  // log("[](search_tv_in_tmdb)start search", tv.name || tv.original_name);
  const { name, original_name } = tv;
  let tv_profile = null;
  if (name) {
    log(`[${name || original_name}]`, "使用", name, "搜索");
    const r = await find_first_matched_tv_from_tmdb(name, { token, need_upload_image, store });
    if (r.error) {
      return Result.Err(r.error);
    }
    tv_profile = r.data;
  }
  if (tv_profile === null && original_name) {
    log(`[${name || original_name}]`, "使用", original_name, "搜索");
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
  const tv_profile = extra_searched_tv_field(list[0]);
  const { tmdb_id, poster_path, backdrop_path } = tv_profile;
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
  const t = await store.add_tv_profile({
    ...tv_profile,
    poster_path: uploaded_poster_path,
    backdrop_path: uploaded_backdrop_path,
  });
  if (t.error) {
    return Result.Err(t.error);
  }
  store.add_tv_profile_snap({
    name,
    tv_profile_id: t.data.id,
  });
  return Result.Ok(t.data);
}

export function extra_searched_tv_field(tv: PartialTVProfile) {
  const { id: tmdb_id, name, original_name, backdrop_path, original_language, overview, popularity, poster_path, first_air_date, vote_average, vote_count } = tv;
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
