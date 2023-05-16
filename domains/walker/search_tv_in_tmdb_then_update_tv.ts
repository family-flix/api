import { log } from "@/logger/log";
import { Result } from "@/types";
import { store_factory } from "@/store";
import { EventHandlers, ExtraUserAndDriveInfo, search_tv_in_tmdb } from "@/domains/walker/utils";

/**
 * 搜索指定 tv 并将搜索到的结果更新到该 tv
 * @param maybe_tv
 * @returns
 */
export async function add_tv_from_maybe_tv(
  maybe_tv: {
    /** tv id */
    id: string;
    /** tv 修正后的名字 */
    correct_name: string | null;
    /** tv 名字 */
    name: string | null;
    /** tv 外文原名或译名 */
    original_name: string | null;
  },
  extra: {
    store: ReturnType<typeof store_factory>;
    need_upload_image?: boolean;
    token?: string;
  }
) {
  const { id, correct_name, name, original_name } = maybe_tv;
  const { store, token } = extra;
  if (!token) {
    return Result.Err("缺少 TMDB token");
  }
  const r1 = await search_tv_in_tmdb(
    {
      name,
      original_name,
      correct_name,
    },
    extra
  );
  if (r1.error) {
    return Result.Err(r1.error);
  }
  if (r1.data === null) {
    store.update_maybe_tv(id, {
      can_search: 0,
    });
    return Result.Err("没有匹配的记录");
  }
  const tv_res = await store.add_tv({
    searched_tv_id: r1.data.id,
  });
  if (tv_res.error) {
    return Result.Err("添加电视剧失败");
  }
  const r2 = await store.update_maybe_tv(id, {
    tv_id: tv_res.data.id,
    can_search: 0,
  });
  if (r2.error) {
    return Result.Err(r2.error);
  }
  return Result.Ok(r2.data);
}

/**
 * 将指定用户、指定网盘下的所有未知影视剧都刮削
 * @param options
 * @param event_handlers
 * @returns
 */
export async function add_tv_from_maybe_tvs(
  options: ExtraUserAndDriveInfo & {
    need_upload_image?: boolean;
    store: ReturnType<typeof store_factory>;
  },
  event_handlers: EventHandlers = {}
) {
  const { user_id, drive_id, need_upload_image = true, store } = options;
  const { on_tv, on_stop, on_error } = event_handlers;
  let no_more = false;
  let page = 1;
  await (async () => {
    do {
      // console.log("开始在 TMDB 上搜索匹配的电视剧信息");
      const maybe_tv_res = await store.find_maybe_tv_with_pagination(
        {
          where: {
            searched_tv_id: null,
            can_search: 1,
            user_id,
            drive_id,
          },
        },
        { page, size: 20 }
      );
      if (maybe_tv_res.error) {
        log(["[ERROR]find tvs that searched_tv_id is null failed", maybe_tv_res.error.message]);
        return maybe_tv_res;
      }
      log("找到", maybe_tv_res.data.list.length, "个需要搜索的电视剧");
      log(maybe_tv_res.data.list.map((tv) => tv.name || tv.original_name).join("\n"));
      no_more = maybe_tv_res.data.no_more;
      for (let i = 0; i < maybe_tv_res.data.list.length; i += 1) {
        const maybe_tv = maybe_tv_res.data.list[i];
        if (on_stop) {
          const r = await on_stop();
          if (r.data) {
            return;
          }
        }
        log(`[${maybe_tv.name || maybe_tv.original_name || maybe_tv.correct_name}]`, "开始搜索");
        const r = await add_tv_from_maybe_tv(maybe_tv, {
          store,
          need_upload_image,
          token: process.env.TMDB_TOKEN,
        });
        if (r.error) {
          log(`[${maybe_tv.name || maybe_tv.original_name || maybe_tv.correct_name}]`, "搜索失败", r.error.message);
          continue;
        }
      }
      page += 1;
    } while (no_more === false);
  })();
  return Result.Ok(null);
}
