/**
 * @file 遍历给定的分享链接，并索引、保存影片
 */
import { throttle } from "lodash/fp";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { FolderWalker } from "@/domains/walker";
import {
  AliyunDriveFile,
  AliyunDriveFolder,
} from "@/domains/aliyundrive/folder";
import { Result } from "@/types";
import { store_factory } from "@/store";
import { StoreOperation } from "@/store/operations";
import { clean_empty_tmp_tv_and_episode_records } from "@/domains/walker/clean_empty_records";
import { ExtraUserAndDriveInfo } from "@/domains/walker/utils";

import { find_matched_tmp_tv_in_tmdb } from "./search_tv_in_tmdb_then_update_tv";
import { merge_same_tmp_tv_and_episodes } from "./merge_same_tv_and_episode";

/**
 * 分析分享的文件
 * @param url
 * @param extra
 * @returns
 */
export async function analysis_shared_files(
  url: string,
  extra: Omit<ExtraUserAndDriveInfo, "async_task_id">,
  op: StoreOperation
) {
  // const { adding_tmp_episode_from_tasks } = extra_store_factory(op);
  // const {
  //   add_async_task,
  //   delete_async_task,
  //   find_async_task,
  //   update_async_task,
  // } = store_factory(op);
  // const check_need_stop = throttle(3000, async (id) => {
  //   const r = await find_async_task({ id });
  //   if (r.error) {
  //     return Result.Ok(false);
  //   }
  //   if (!r.data) {
  //     return Result.Ok(false);
  //   }
  //   const { need_stop } = r.data;
  //   if (need_stop) {
  //     return Result.Ok(true);
  //   }
  //   return Result.Ok(false);
  // });
  // function stop_task_and_clear(id: string) {
  //   // return delete_async_task({ id });
  //   return update_async_task(id, {
  //     status: "Pause",
  //   });
  // }
  // const { user_id, drive_id } = extra;
  // const existing_task_resp = await find_async_task({
  //   unique_id: url,
  //   user_id,
  // });
  // if (existing_task_resp.error) {
  //   return Result.Err(existing_task_resp.error.message);
  // }
  // if (existing_task_resp.data) {
  //   if (existing_task_resp.data.status === "Running") {
  //     return Result.Err("Task is running");
  //   }
  //   return Result.Err("Task is completed, please goto task list");
  // }
  // const client = new AliyunDriveClient({ drive_id, store: store_factory(op) });
  // const r1 = await client.prepare_fetch_shared_files(url);
  // if (r1.error) {
  //   return r1;
  // }
  // const { share_id, share_title } = r1.data;
  // const root_folder = new AliyunDriveFolder("root", {
  //   name: "root",
  //   client: {
  //     fetch_files: (
  //       file_id: string,
  //       options: Partial<{ marker: string; page_size: number }> = {}
  //     ) => {
  //       return client.fetch_shared_files(file_id, {
  //         ...options,
  //         share_id,
  //       });
  //     },
  //   },
  // });
  // const add_async_task_resp = await add_async_task({
  //   desc: share_title,
  //   unique_id: url,
  //   user_id,
  //   status: "Running",
  // });
  // if (add_async_task_resp.error) {
  //   return Result.Err(add_async_task_resp.error.message);
  // }
  // const async_task_id = add_async_task_resp.data.id;
  // const walker = new FolderWalker();
  // let need_stop = false;
  // walker.on_episode = async (tasks) => {
  //   const r = await check_need_stop(async_task_id);
  //   if (r && r.data) {
  //     need_stop = true;
  //   }
  //   await adding_tmp_episode_from_tasks(tasks, {
  //     user_id,
  //     drive_id,
  //     async_task_id,
  //   });
  // };
  // async function run() {
  //   do {
  //     if (need_stop) {
  //       break;
  //     }
  //     const r2 = await root_folder.next();
  //     if (r2.error) {
  //       continue;
  //     }
  //     for (let i = 0; i < r2.data.length; i += 1) {
  //       const file_or_folder = r2.data[i];
  //       if (file_or_folder instanceof AliyunDriveFile) {
  //         // @todo maybe is movie
  //         // const file = file_or_folder as AliyunDriveFile;
  //         i += 1;
  //         continue;
  //       }
  //       const folder = file_or_folder as AliyunDriveFolder;
  //       await walker.detect(folder);
  //       i += 1;
  //     }
  //   } while (root_folder.next_marker);
  //   await clean_empty_tmp_tv_and_episode_records(
  //     { user_id, drive_id, async_task_id },
  //     op,
  //     {
  //       on_error(msgs) {
  //         console.log(msgs.join(" "));
  //       },
  //     }
  //   );
  //   if (need_stop) {
  //     await stop_task_and_clear(async_task_id);
  //     return Result.Err("interrupt");
  //   }
  //   await find_matched_tmp_tv_in_tmdb(
  //     { user_id, drive_id, async_task_id },
  //     op,
  //     {
  //       on_error(msgs) {
  //         console.log(msgs.join(" "));
  //       },
  //     }
  //   );
  //   if (need_stop) {
  //     await stop_task_and_clear(async_task_id);
  //   }
  //   await merge_same_tmp_tv_and_episodes(
  //     {
  //       user_id,
  //       drive_id,
  //       async_task_id,
  //     },
  //     op
  //   );
  //   if (need_stop) {
  //     await stop_task_and_clear(async_task_id);
  //     return Result.Err("interrupt");
  //   }
  //   await clean_empty_tmp_tv_and_episode_records(
  //     {
  //       user_id,
  //       drive_id,
  //       async_task_id,
  //     },
  //     op
  //   );
  //   await update_async_task(async_task_id, {
  //     status: "Finished",
  //   });
  // }
  // run();
  return Result.Ok({});
}
