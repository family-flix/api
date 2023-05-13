/**
 * @file 遍历 tv、season 删除没有关联 episode 的记录
 */
import { Result, resultify } from "@/types";
import { store_factory } from "@/store";

import { EventHandlers, ExtraUserAndDriveInfo } from "./utils";
// import { StoreOperation } from "@/store/operations";
import { log } from "@/logger/log";

export async function hidden_empty_tv(
  extra: ExtraUserAndDriveInfo,
  store: ReturnType<typeof store_factory>,
  events: EventHandlers = {}
) {
  const { user_id, drive_id } = extra;
  const r = await resultify(store.prisma.tV.updateMany.bind(store.prisma.tV))({
    where: {
      user_id,
      drive_id,
      hidden: { not: 1 },
      episodes: {
        none: {},
      },
    },
    data: {
      hidden: 1,
    },
  });
  // const r = await operation.run(`UPDATE tv
  // SET hidden = 1
  // WHERE NOT EXISTS (
  //   SELECT 1
  //   FROM episode
  //   WHERE episode.tv_id = tv.id
  // ) AND user_id = '${user_id}' AND drive_id = '${drive_id}' AND hidden != 1;`);
  if (r.error) {
    log("[ERROR]clear_empty_record failed, because", r.error.message);
  }
  return Result.Ok(null);
}
