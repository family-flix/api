import { log } from "@/logger/log";
import { Result } from "@/types";
import { store_factory } from "@/store";
import { EventHandlers, ExtraUserAndDriveInfo, get_tv_profile_with_tmdb } from "@/domains/walker/utils";

/**
 * 将指定用户、指定网盘下的所有未知影视剧都刮削
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
  let no_more = false;
  let page = 1;
  await (async () => {
    do {
      const parsed_tv_res = await store.find_parsed_tv_list_with_pagination(
        {
          where: {
            tv_id: null,
            can_search: 1,
            user_id,
            drive_id,
          },
        },
        { page, size: 20 }
      );
      if (parsed_tv_res.error) {
        log(["[ERROR]find tvs that tv_profile_id is null failed", parsed_tv_res.error.message]);
        return Result.Err(parsed_tv_res.error);
      }
      log("找到", parsed_tv_res.data.list.length, "个需要搜索的电视剧");
      log(parsed_tv_res.data.list.map((tv) => tv.name || tv.original_name).join("\n"));
      no_more = parsed_tv_res.data.no_more;
      for (let i = 0; i < parsed_tv_res.data.list.length; i += 1) {
        const parsed_tv = parsed_tv_res.data.list[i];
        if (on_stop) {
          const r = await on_stop();
          if (r.data) {
            return;
          }
        }
        log(`[${parsed_tv.name || parsed_tv.original_name}]`, "开始搜索");
        const r = await add_tv_from_parsed_tv(parsed_tv, {
          user_id,
          drive_id,
          store,
          need_upload_image,
          token: process.env.TMDB_TOKEN,
        });
        if (r.error) {
          log(`[${parsed_tv.name || parsed_tv.original_name}]`, "添加电视剧失败", r.error.message);
          continue;
        }
      }
      page += 1;
    } while (no_more === false);
  })();
  return Result.Ok(null);
}

/**
 * 搜索指定 tv 并将搜索到的结果更新到该 tv
 * @param maybe_tv
 * @returns
 */
export async function add_tv_from_parsed_tv(
  maybe_tv: {
    /** tv id */
    id: string;
    /** tv 名字 */
    name: string | null;
    /** tv 外文原名或译名 */
    original_name: string | null;
  },
  extra: {
    user_id: string;
    drive_id: string;
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
    token?: string;
  }
) {
  const { id, name, original_name } = maybe_tv;
  const { user_id, drive_id, store, token } = extra;
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
    return Result.Err(profile_res.error);
  }
  if (profile_res.data === null) {
    store.update_parsed_tv(id, {
      can_search: 0,
    });
    return Result.Err("没有匹配的记录");
  }
  const tv_res = await store.add_tv({
    profile_id: profile_res.data.id,
    user_id,
  });
  if (tv_res.error) {
    return Result.Err(tv_res.error);
  }
  const r2 = await store.update_parsed_tv(id, {
    tv_id: tv_res.data.id,
    can_search: 0,
  });
  if (r2.error) {
    return Result.Err(r2.error);
  }
  return Result.Ok(r2.data);
}
