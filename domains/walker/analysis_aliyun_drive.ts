/**
 * @file 刮削指定阿里云盘
 */
import { throttle } from "lodash/fp";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { FolderWalker } from "@/domains/walker";

import { Result } from "@/types";
import { store_factory } from "@/store";
import { hidden_empty_tv } from "@/domains/walker/clean_empty_records";
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";
import { log } from "@/logger/log";

import { search_tv_in_tmdb_then_update_tv } from "./search_tv_in_tmdb_then_update_tv";
import { merge_same_tv_and_episodes } from "./merge_same_tv_and_episode";
import {
  adding_folder_when_walk,
  adding_episode_when_walk,
  need_skip_the_file_when_walk,
} from "./utils";

/** 刮削网盘云盘 */
export async function walk_drive(options: {
  /** 用户 id */
  user_id: string;
  /** 网盘 id */
  drive_id: string;
  /** 不全量刮削网盘，仅处理这些文件夹/文件 */
  files?: {
    /** 文件名 */
    name: string;
    /** 文件类型 */
    type: string;
  }[];
  /**
   * 用来遍历文件夹的客户端
   */
  client: AliyunDriveClient;
  /** 存储 */
  store: ReturnType<typeof store_factory>;
  /** 从 TMDB 搜索到匹配的结果后，是否需要将海报等图片上传到 cdn */
  need_upload_image?: boolean;
  /** 是否等待完成（默认都不等待，单测时可以等待） */
  wait_complete?: boolean;
}) {
  const {
    user_id,
    drive_id,
    files = [],
    client,
    store,
    need_upload_image = true,
    wait_complete = false,
  } = options;
  const check_need_stop = throttle(3000, async (id) => {
    const r = await store.find_async_task({ id });
    if (r.error) {
      return Result.Ok(false);
    }
    if (!r.data) {
      return Result.Ok(false);
    }
    const { need_stop } = r.data;
    if (need_stop) {
      return Result.Ok(true);
    }
    return Result.Ok(false);
  });
  function stop_task_and_clear(id: string) {
    return store.update_async_task(id, {
      status: "Pause",
    });
  }
  const drive_resp = await store.find_aliyun_drive({
    id: drive_id,
  });
  if (drive_resp.error) {
    return drive_resp;
  }
  if (!drive_resp.data) {
    return Result.Err("No matched record of drive");
  }
  if (!drive_resp.data.root_folder_id) {
    return Result.Err("请先设置索引目录");
  }
  const { root_folder_id: folder_id } = drive_resp.data;
  const existing_task_resp = await store.find_async_task({
    unique_id: drive_id,
    user_id,
    status: "Running",
  });
  if (existing_task_resp.error) {
    return Result.Err(existing_task_resp.error);
  }
  if (existing_task_resp.data) {
    return Result.Err("任务正在进行中");
  }
  const add_async_task_resp = await store.add_async_task({
    desc: `刮削 ${drive_resp.data.user_name} 云盘${
      files.length ? " - 仅" + files.map((f) => f.name).join("、") : ""
    }`,
    unique_id: drive_id,
    user_id,
    status: "Running",
  });
  if (add_async_task_resp.error) {
    return Result.Err(add_async_task_resp.error);
  }
  const async_task_id = add_async_task_resp.data.id;
  const walker = new FolderWalker();
  let need_stop = false;
  if (files.length) {
    let cloned_files = [...files];
    walker.filter = async (cur_file) => {
      let need_skip_file = true;
      for (let i = 0; i < cloned_files.length; i += 1) {
        const { name: target_file_name, type: target_file_type } =
          cloned_files[i];
        need_skip_file = need_skip_the_file_when_walk({
          target_file_name,
          target_file_type,
          cur_file,
        });
        // log(
        //   "[INFO]need_skip_file_when_walk",
        //   `${cur_file.parent_paths}/${cur_file.name}`,
        //   target_file_name,
        //   target_file_type
        // );
        if (need_skip_file === false) {
          break;
        }
      }
      // console.log("check need filter file", cur_file.name, need_skip_file);
      // console.log("[INFO]need skip", cur_file.name, need_skip_file);
      return need_skip_file;
    };
  }
  walker.on_file = async (folder) => {
    const { name } = folder;
    // console.log('[]walk on file', name);
    await adding_folder_when_walk(folder, { user_id, drive_id }, store);
    await store.delete_tmp_folder({
      name,
      drive_id,
      user_id,
    });
  };
  walker.on_error = (file) => {
    console.log('[]walk on error', file.name);
  };
  walker.on_warning = (file) => {
    console.log('[]walk on warning', file.name);
  };
  let count = 0;
  walker.on_episode = async (tasks) => {
    console.log('[]walk on episode', tasks.episode.file_name);
    const r = await check_need_stop(async_task_id);
    if (r && r.data) {
      need_stop = true;
      walker.stop = true;
      return;
    }
    await adding_episode_when_walk(tasks, { user_id, drive_id }, store);
    count += 1;
    return;
  };
  walker.on_movie = async (tasks) => {
    console.log('[]walk on movie', tasks);
    // const r = await check_need_stop(async_task_id);
    // if (r && r.data) {
    //   need_stop = true;
    //   walker.stop = true;
    //   return;
    // }
    // await adding_episode_when_walk(tasks, { user_id, drive_id }, store);
    // return;
  };
  const folder = new AliyunDriveFolder(folder_id, {
    client,
  });
  await folder.profile();
  async function run() {
    log("[](analysis_aliyun_drive)run");
    // @todo 如果 detect 由于内部调用 folder.next() 报错，这里没有处理会导致一直 pending
    await walker.detect(folder);
    if (count === 0) {
      await stop_task_and_clear(async_task_id);
      return;
    }
    await hidden_empty_tv(
      { user_id, drive_id, async_task_id },
      store.operation
    );
    if (need_stop) {
      await stop_task_and_clear(async_task_id);
      return;
    }
    log("[](analysis_aliyun_drive)before search_tv_in_tmdb_then_update_tv");
    await search_tv_in_tmdb_then_update_tv(
      { user_id, drive_id, need_upload_image, operation: store.operation },
      {
        on_stop() {
          return Result.Ok(need_stop);
        },
      }
    );
    if (need_stop) {
      await stop_task_and_clear(async_task_id);
      return;
    }
    await merge_same_tv_and_episodes({ user_id, drive_id }, store.operation, {
      on_stop() {
        return Result.Ok(need_stop);
      },
    });
    if (need_stop) {
      await stop_task_and_clear(async_task_id);
      return;
    }
    await hidden_empty_tv({ user_id, drive_id }, store.operation);
    await store.update_async_task(async_task_id, {
      status: "Finished",
    });
  }
  if (wait_complete) {
    // 这个是为了单测用的
    await run();
  } else {
    run();
  }
  return Result.Ok({ async_task_id });
}
