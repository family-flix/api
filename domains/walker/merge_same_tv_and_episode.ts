/**
 * @file 合并 searched_tv_id 相同的 tv 记录
 */
import { log } from "@/logger/log";
import { Result } from "@/types";
import { store_factory } from "@/store";
import { StoreOperation } from "@/store/operations";
import {
  change_episode_tv_id,
  EventHandlers,
  ExtraUserAndDriveInfo,
} from "@/domains/walker/utils";

export async function merge_same_tv_and_episodes(
  extra: ExtraUserAndDriveInfo,
  op: StoreOperation,
  event_handlers: EventHandlers = {}
) {
  // console.log("start merge_same_tv_and_episodes");
  const store = store_factory(op);
  const { all } = op;
  const { user_id, drive_id } = extra;
  const { on_error, on_stop } = event_handlers;
  if (!user_id) {
    return Result.Err("Missing user_id");
  }
  // const tmp_res = await all(
  //   "SELECT searched_tv_id FROM tv WHERE searched_tv_id != '' GROUP BY searched_tv_id HAVING COUNT(*) > 1;"
  // );
  // if (tmp_res.error) {
  //   log(tmp_res.error.message);
  // }
  // if (tmp_res.data) {
  //   log("duplicated searched_tv_id is", tmp_res.data);
  // }
  const resp = await all<
    {
      id: string;
      created: string;
      updated: string;
      name: string;
      original_name: string;
      file_id: string;
      file_name: string;
      play_history_id: null | string;
      searched_tv_id: string;
    }[]
  >(
    `SELECT t.*,pp.id AS play_history_id
    FROM tv t
    LEFT JOIN (
      SELECT tv_id, MAX(updated) AS max_updated
      FROM play_progress
      GROUP BY tv_id
    ) pp_latest ON t.id = pp_latest.tv_id
    LEFT JOIN play_progress pp ON pp_latest.tv_id = pp.tv_id AND pp_latest.max_updated = pp.updated
    WHERE searched_tv_id IN (
      SELECT searched_tv_id
      FROM tv
      GROUP BY searched_tv_id HAVING COUNT(*) > 1
    )
    AND t.searched_tv_id != '' AND t.user_id = '${user_id}' AND t.drive_id = '${drive_id}'
    ORDER BY t.updated DESC;`
  );
  if (resp.error) {
    log(
      "[ERROR]find tv that have same searched_tv_id failed",
      resp.error.message
    );
    if (on_error) {
      on_error([
        "[ERROR]find tv that have same searched_tv_id failed",
        resp.error.message,
      ]);
    }
    return resp;
  }
  log("the tv count that has same searched_tv_id is", resp.data.length);
  const tvs = resp.data;
  const tv_group_by_searched_tv_id: Record<string, typeof resp.data[0][]> = {};
  for (let i = 0; i < tvs.length; i += 1) {
    const tv = tvs[i];
    const { searched_tv_id } = tv;
    tv_group_by_searched_tv_id[searched_tv_id] =
      tv_group_by_searched_tv_id[searched_tv_id] || [];
    tv_group_by_searched_tv_id[searched_tv_id].push(tv);
  }
  const keys = Object.keys(tv_group_by_searched_tv_id);
  await (async () => {
    for (let j = 0; j < keys.length; j += 1) {
      const searched_tv_id = keys[j];
      const tvs_has_same_searched_tv_id =
        tv_group_by_searched_tv_id[searched_tv_id];
      log("[](merge_same_tv)searched_tv_id is", searched_tv_id);
      if (!tvs_has_same_searched_tv_id) {
        continue;
      }
      // 将已经有观看记录的 tv 作为基准，去合并新增且没有观看记录的（如果两个重复的 tv 都有观看记录那就没办法，只能后面再处理了）
      let base_tv = tvs_has_same_searched_tv_id.find((tv) => {
        // log("[](merge_same_tv)the tv has play_progress id ?", tv);
        return tv.play_history_id;
      });
      if (!base_tv) {
        base_tv = tvs_has_same_searched_tv_id.find((tv) => {
          return tv.name;
        });
      }
      if (!base_tv) {
        base_tv = tvs_has_same_searched_tv_id.find((tv) => {
          return tv.original_name;
        });
      }
      if (!base_tv) {
        base_tv = tvs_has_same_searched_tv_id[0];
      }
      log("base tv is", base_tv.name || base_tv.original_name);
      for (let i = 0; i < tvs_has_same_searched_tv_id.length; i += 1) {
        const tv = tvs_has_same_searched_tv_id[i];
        if (tv.id === base_tv.id) {
          continue;
        }
        log("[]change episodes that tv_id is", tv.id);
        const episodes_resp = await store.find_episodes({ tv_id: tv.id });
        if (episodes_resp.error) {
          log("[ERROR]find episodes failed", episodes_resp.error.message);
          return episodes_resp;
        }
        for (let m = 0; m < episodes_resp.data.length; m += 1) {
          if (on_stop) {
            const r = on_stop();
            if (r.data) {
              return;
            }
          }
          const changing_resp = await change_episode_tv_id(
            base_tv,
            episodes_resp.data[m],
            store
          );
          if (changing_resp.error) {
            return changing_resp;
          }
        }
      }
    }
  })();
  log("Merge same tv and episodes completed.");
  return Result.Ok(null);
}

export async function merge_same_tmp_tv_and_episodes(
  extra: ExtraUserAndDriveInfo,
  op: StoreOperation,
  event_handlers: EventHandlers = {}
) {
  const { all } = op;
  const { find_tmp_episodes, update_tmp_episode } = store_factory(op);
  const { user_id, async_task_id } = extra;
  const { on_error } = event_handlers;
  if (!user_id) {
    return Result.Err("Missing user_id");
  }
  if (!async_task_id) {
    return Result.Err(
      "Missing async_task_id in merge_same_tmp_tv_and_episodes"
    );
  }
  const resp = await all<
    {
      id: string;
      created: string;
      updated: string;
      name: string;
      original_name: string;
      file_id: string;
      file_name: string;
      searched_tv_id: string;
    }[]
  >(
    `SELECT * FROM tmp_tv WHERE searched_tv_id IN (SELECT searched_tv_id FROM tv GROUP BY searched_tv_id HAVING COUNT(*) > 1) AND searched_tv_id != '' AND user_id = '${user_id}' AND async_task_id = '${async_task_id}';`
  );
  if (resp.error) {
    if (on_error) {
      on_error([
        "[ERROR]find tmp tv that have same searched_tv_id failed",
        resp.error.message,
      ]);
    }
    return resp;
  }
  const tvs = resp.data;
  const tv_group_by_searched_tv_id: Record<string, typeof resp.data[0][]> = {};
  for (let i = 0; i < tvs.length; i += 1) {
    const tv = tvs[i];
    const { searched_tv_id } = tv;
    tv_group_by_searched_tv_id[searched_tv_id] =
      tv_group_by_searched_tv_id[searched_tv_id] || [];
    tv_group_by_searched_tv_id[searched_tv_id].push(tv);
  }
  const keys = Object.keys(tv_group_by_searched_tv_id);
  for (let j = 0; j < keys.length; j += 1) {
    const searched_tv_id = keys[j];
    const tvs_has_same_searched_tv_id =
      tv_group_by_searched_tv_id[searched_tv_id];
    if (!tvs_has_same_searched_tv_id) {
      continue;
    }
    let base_tv = tvs_has_same_searched_tv_id.find((tv) => {
      return tv.name;
    });
    if (!base_tv) {
      base_tv = tvs_has_same_searched_tv_id.find((tv) => {
        return tv.original_name;
      });
    }
    if (!base_tv) {
      base_tv = tvs_has_same_searched_tv_id[0];
    }
    for (let i = 0; i < tvs_has_same_searched_tv_id.length; i += 1) {
      const tv = tvs_has_same_searched_tv_id[i];
      if (tv.id === base_tv.id) {
        continue;
      }
      log("[]change episodes tv_id of", tv, "the base tv is", base_tv);
      const episodes_resp = await find_tmp_episodes({ tv_id: tv.id });
      if (episodes_resp.error) {
        log("[ERROR]find episodes failed", episodes_resp.error.message);
        if (on_error) {
          on_error([
            "[ERROR]find episodes when merge same tv failed",
            tv.id,
            episodes_resp.error.message,
          ]);
        }
        return episodes_resp;
      }
      for (let m = 0; m < episodes_resp.data.length; m += 1) {
        const { id } = episodes_resp.data[i];
        const changing_resp = await update_tmp_episode(id, {
          tv_id: base_tv.id,
        });
        if (changing_resp.error) {
          if (on_error) {
            on_error([
              "[ERROR]change episode's tv_id failed",
              changing_resp.error.message,
            ]);
          }
          return changing_resp;
        }
      }
    }
  }
  log("Merge same tv and episodes completed.");
  return Result.Ok(null);
}
