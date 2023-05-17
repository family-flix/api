/**
 * @file 索引指定云盘
 */
import { throttle } from "lodash/fp";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { FolderWalker } from "@/domains/walker";
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";
import { Result } from "@/types";
import { store_factory } from "@/store";
import { log } from "@/logger/log";

import { add_tv_from_parsed_tv_list } from "./search_tv_in_tmdb_then_update_tv";
import { adding_file_when_walk, create_parsed_episode_and_parsed_tv, need_skip_the_file_when_walk } from "./utils";
import { TaskStatus } from "./constants";

/** 索引云盘 */
export async function walk_drive(options: {
  /** 云盘所属用户 id */
  user_id: string;
  /** 云盘 id */
  drive_id: string;
  /** 不全量索引云盘，仅处理这些文件夹/文件 */
  files?: {
    /** 文件名 */
    name: string;
    /** 文件类型 */
    type: string;
  }[];
  /**
   * 用来对云盘进行 API 请求的客户端实例
   */
  client: AliyunDriveClient;
  /** 数据库实例 */
  store: ReturnType<typeof store_factory>;
  /** 从 TMDB 搜索到匹配的结果后，是否需要将海报等图片上传到 cdn */
  need_upload_image?: boolean;
  /** 是否等待完成（默认都不等待，单测时可以等待） */
  wait_complete?: boolean;
}) {
  const { user_id, drive_id, files = [], client, store, need_upload_image = true, wait_complete = false } = options;
  log("开始索引云盘", drive_id);
  const drive_res = await store.find_drive({
    id: drive_id,
  });
  if (drive_res.error) {
    log(`[${drive_id}]`, "获取云盘失败，中止索引");
    return Result.Err(drive_res.error);
  }
  if (!drive_res.data) {
    log(`[${drive_id}]`, "云盘不存在，中止索引");
    return Result.Err("没有匹配的云盘记录");
  }
  const drive = drive_res.data;
  const { root_folder_id } = drive;
  if (!root_folder_id) {
    log(`[${drive_id}]`, "未设置索引目录，中止索引");
    return Result.Err("请先设置索引目录");
  }
  const check_need_stop = throttle(3000, async (task_id: string) => {
    const r = await store.find_task({ id: task_id });
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
  function set_task_paused(task_id: string) {
    return store.update_task(task_id, {
      status: TaskStatus.Paused,
    });
  }
  const existing_task_res = await store.find_task({
    unique_id: drive_id,
    user_id,
    status: TaskStatus.Running,
  });
  if (existing_task_res.error) {
    log(`[${drive_id}]`, "获取进行中任务失败，中止索引");
    return Result.Err(existing_task_res.error);
  }
  if (existing_task_res.data) {
    log(`[${drive_id}]`, "上一次索引未结束，中止索引");
    return Result.Err("索引正在进行中", undefined, { id: existing_task_res.data.id });
  }
  const add_async_task_res = await store.add_task({
    unique_id: drive_id,
    desc: `索引 ${drive_res.data.user_name} 云盘${files.length ? " - 仅" + files.map((f) => f.name).join("、") : ""}`,
    status: TaskStatus.Running,
    user_id,
  });
  if (add_async_task_res.error) {
    log(`[${drive_id}]`, "新增索引任务失败，中止索引");
    return Result.Err(add_async_task_res.error);
  }
  const { id: task_id } = add_async_task_res.data;
  const walker = new FolderWalker();
  let need_stop = false;
  if (files.length) {
    let cloned_files = [...files];
    walker.filter = async (cur_file) => {
      let need_skip_file = true;
      for (let i = 0; i < cloned_files.length; i += 1) {
        const { name: target_file_name, type: target_file_type } = cloned_files[i];
        need_skip_file = need_skip_the_file_when_walk({
          target_file_name,
          target_file_type,
          cur_file,
        });
        if (need_skip_file === false) {
          break;
        }
      }
      return need_skip_file;
    };
  }
  walker.on_error = (file) => {
    // console.log("[]walk on error", file.name);
  };
  walker.on_warning = (file) => {
    // console.log("[]walk on warning", file.name);
  };
  walker.on_file = async (file) => {
    const { name } = file;
    await adding_file_when_walk(file, { user_id, drive_id }, store);
    await store.delete_tmp_file({
      name,
      drive_id,
      user_id,
    });
  };
  let count = 0;
  walker.on_episode = async (parsed) => {
    const r = await check_need_stop(task_id);
    if (r && r.data) {
      need_stop = true;
      walker.stop = true;
      return;
    }
    await create_parsed_episode_and_parsed_tv(parsed, { user_id, drive_id }, store);
    count += 1;
    return;
  };
  walker.on_movie = async (parsed) => {
    // const r = await check_need_stop(async_task_id);
    // if (r && r.data) {
    //   need_stop = true;
    //   walker.stop = true;
    //   return;
    // }
    // await adding_episode_when_walk(tasks, { user_id, drive_id }, store);
    // return;
  };
  // @todo 如果希望仅索引一个文件夹，是否可以这里直接传目标文件夹，而不是每次都从根文件夹开始索引？
  const folder = new AliyunDriveFolder(root_folder_id, {
    client,
  });
  await folder.profile();

  async function run() {
    // @todo 如果 detect 由于内部调用 folder.next() 报错，这里没有处理会导致一直 pending
    await walker.detect(folder);
    log(`[${drive_id}]`, "索引云盘完成");
    if (count === 0) {
      log(`[${drive_id}]`, "没有索引到任一视频文件，完成索引");
      await store.update_task(task_id, {
        status: TaskStatus.Finished,
      });
      return Result.Ok(null);
    }
    if (need_stop) {
      log(`[${drive_id}]`, "检测到需暂停索引");
      await set_task_paused(task_id);
      return Result.Ok(null);
    }
    log(`[${drive_id}]`, "开始搜索电视剧信息");
    await add_tv_from_parsed_tv_list(
      { user_id, drive_id, need_upload_image, store },
      {
        on_stop() {
          return Result.Ok(need_stop);
        },
      }
    );
    log(`[${drive_id}]`, "完成索引");
    await store.update_task(task_id, {
      status: TaskStatus.Finished,
    });
    return Result.Ok(null);
  }
  if (wait_complete) {
    // 这个是为了单测用的
    await run();
  } else {
    run();
  }
  return Result.Ok({ async_task_id: task_id });
}
