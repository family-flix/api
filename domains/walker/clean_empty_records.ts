/**
 * @file 遍历 tv、season 删除没有关联 episode 的记录
 */
import { Result } from "@/types";
import { store_factory } from "@/store";

import { EventHandlers, ExtraUserAndDriveInfo } from "./utils";
import { StoreOperation } from "@/store/operations";
import { log } from "@/logger/log";

export async function hidden_empty_tv(
  extra: ExtraUserAndDriveInfo,
  operation: StoreOperation,
  events: EventHandlers = {}
) {
  const { user_id, drive_id } = extra;
  const r = await operation.run(`UPDATE tv
  SET hidden = 1
  WHERE NOT EXISTS (
    SELECT 1
    FROM episode
    WHERE episode.tv_id = tv.id
  ) AND user_id = '${user_id}' AND drive_id = '${drive_id}' AND hidden != 1;`);
  if (r.error) {
    log("[ERROR]clear_empty_record failed, because", r.error.message);
  }
  return Result.Ok(null);
}

export async function clean_empty_tmp_tv_and_episode_records(
  extra: ExtraUserAndDriveInfo,
  op: StoreOperation,
  events: EventHandlers = {}
) {
  const {
    find_tmp_episodes_with_pagination,
    delete_tmp_tv,
    find_tmp_tv_with_pagination,
  } = store_factory(op);
  const { on_error } = events;
  let no_more = false;
  let page = 1;
  do {
    const resp = await find_tmp_tv_with_pagination(
      {
        user_id: extra.user_id,
        async_task_id: extra.async_task_id,
      },
      { page, size: 20 }
    );
    if (resp.error) {
      if (on_error) {
        on_error([
          "[ERROR]fetch tmp tv with pagination failed",
          resp.error.message,
        ]);
      }
      return resp;
    }
    no_more = resp.data.no_more;
    for (let i = 0; i < resp.data.list.length; i += 1) {
      const tv = resp.data.list[i];
      const r1 = await find_tmp_episodes_with_pagination({ tv_id: tv.id });
      if (r1.error) {
        // console.log("search episode failed", tv.name, r1.error.message);
        if (on_error) {
          on_error([
            "[ERROR]search tmp episode of tv failed",
            tv.id,
            r1.error.message,
          ]);
        }
        continue;
      }
      if (r1.data.list.length !== 0) {
        continue;
      }
      const r3 = await delete_tmp_tv({ id: tv.id });
      if (r3.error) {
        if (on_error) {
          on_error(["[ERROR]delete tmp tv failed", tv.id, r3.error.message]);
        }
        continue;
      }
    }
    page += 1;
  } while (no_more === false);
  return Result.Ok(null);
}
