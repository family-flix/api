import { log } from "@/logger/log";
import { Result } from "@/types";
import { store_factory } from "@/store";
import { StoreOperation } from "@/store/operations";
import {
  EventHandlers,
  ExtraUserAndDriveInfo,
  search_tv_in_tmdb,
} from "@/domains/walker/utils";

export async function search_special_tv_in_tmdb_then_update_tv(options: {
  id: string;
  correct_name?: string;
  name: string;
  original_name: string;
  operation: StoreOperation;
  need_upload_image?: boolean;
  token?: string;
}) {
  const {
    id,
    correct_name,
    name,
    original_name,
    operation,
    need_upload_image = true,
    token,
  } = options;
  if (!token) {
    return Result.Err("Missing TMDB token");
  }
  const store = store_factory(operation);
  const r1 = await search_tv_in_tmdb(
    {
      correct_name,
      name,
      original_name,
    },
    {
      store,
      token,
      need_upload_image,
    }
  );
  if (r1.error) {
    return r1;
  }
  const r2 = await store.update_tv(id, {
    searched_tv_id: r1.data.id,
  });
  if (r2.error) {
    return r2;
  }
  return r2;
}

/**
 * 将指定用户、指定网盘下的所有未知影视剧都刮削
 * @param options
 * @param event_handlers
 * @returns
 */
export async function search_tv_in_tmdb_then_update_tv(
  options: ExtraUserAndDriveInfo & {
    need_upload_image?: boolean;
    operation: StoreOperation;
  },
  event_handlers: EventHandlers = {}
) {
  const { user_id, drive_id, need_upload_image = true, operation } = options;
  const { find_tv_with_pagination } = store_factory(operation);
  const { on_tv, on_stop, on_error } = event_handlers;
  let no_more = false;
  let page = 1;
  await (async () => {
    do {
      log("start find matched tmdb tv");
      const tvs_resp = await find_tv_with_pagination(
        {
          searched_tv_id: "null",
          user_id,
          drive_id,
        },
        { page, size: 20 }
      );
      if (tvs_resp.error) {
        log([
          "[ERROR]find tvs that searched_tv_id is null failed",
          tvs_resp.error.message,
        ]);
        return tvs_resp;
      }
      log("the tv count that no searched_tv_id is", tvs_resp.data.list.length);
      no_more = tvs_resp.data.no_more;
      for (let i = 0; i < tvs_resp.data.list.length; i += 1) {
        const tv = tvs_resp.data.list[i];
        if (on_stop) {
          const r = await on_stop();
          if (r.data) {
            return;
          }
        }
        const r = await search_special_tv_in_tmdb_then_update_tv({
          ...tv,
          operation,
          need_upload_image,
          token: process.env.TMDB_TOKEN,
        });
        if (r.error) {
          log("[ERROR]search matched tv failed, because", r.error.message);
          continue;
        }
      }
      page += 1;
    } while (no_more === false);
  })();
  return Result.Ok(null);
}

export async function find_matched_tmp_tv_in_tmdb(
  extra: ExtraUserAndDriveInfo,
  op: StoreOperation,
  event_handlers: EventHandlers = {}
) {
  const { find_tmp_tv_with_pagination, update_tmp_tv } = store_factory(op);
  const { on_error } = event_handlers;
  let no_more = false;
  let page = 1;
  do {
    log("start find matched tmdb tmp tv", page);
    const tvs_resp = await find_tmp_tv_with_pagination(
      {
        searched_tv_id: "null",
        user_id: extra.user_id,
        async_task_id: extra.async_task_id,
      },
      { page, size: 20 }
    );
    if (tvs_resp.error) {
      return tvs_resp;
    }
    no_more = tvs_resp.data.no_more;
    for (let i = 0; i < tvs_resp.data.list.length; i += 1) {
      const tv = tvs_resp.data.list[i];
      const r1 = await search_tv_in_tmdb(
        {
          name: tv.name,
          original_name: tv.original_name,
        },
        {
          token: process.env.TMDB_TOKEN,
        }
      );
      if (r1.error) {
        log(
          "[ERROR]search_tv_in_tmdb_then_save failed, because",
          r1.error.message
        );
        continue;
      }
      const r2 = await update_tmp_tv(tv.id, {
        searched_tv_id: r1.data.id,
      });
      if (r2.error) {
        return Result.Err(
          ["[ERROR]update tmp tv searched_tv_id failed", r2.error.message].join(
            " "
          )
        );
      }
    }
    page += 1;
  } while (no_more === false);
  return Result.Ok(null);
}
