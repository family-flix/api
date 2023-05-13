/**
 * @file 合并 searched_tv_id 相同的 tv 记录
 */
import { log } from "@/logger/log";
import { Result, resultify } from "@/types";
import { store_factory } from "@/store";
// import { StoreOperation } from "@/store/operations";
import {
  change_episode_tv_id,
  EventHandlers,
  ExtraUserAndDriveInfo,
} from "@/domains/walker/utils";

export async function merge_same_tv_and_episodes(
  extra: ExtraUserAndDriveInfo,
  store: ReturnType<typeof store_factory>,
  event_handlers: EventHandlers = {}
) {
  // console.log("start merge_same_tv_and_episodes");
  const { user_id, drive_id } = extra;
  const { on_error, on_stop } = event_handlers;
  if (!user_id) {
    return Result.Err("Missing user_id");
  }
  const resp = await resultify(store.prisma.tV.findMany.bind(store.prisma.tV))({
    select: {
      id: true,
      name: true,
      file_name: true,
      // poster_path: true,
      // overview: true,
      updated: true,
      searched_tv_id: true,
      drive_id: true,
      user_id: true,
      searched_tv: true,
      play_histories: {
        select: {
          id: true,
        },
        orderBy: {
          updated: "desc",
        },
        take: 1,
      },
    },
    where: {
      searched_tv: {
        // i
        // having: {
        //   count: {
        //     gt: 1,
        //   },
        // },
        // select: {
        //   searched_tv_id: true,
        // },
        // groupBy: ["searched_tv_id"],
      },
      user_id,
      drive_id,
      // searched_tv_id: {
      //   not: "",
      // },
    },
    orderBy: {
      updated: "desc",
    },
  });
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
  const tv_group_by_searched_tv_id: Record<string, (typeof resp.data)[0][]> =
    {};
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
