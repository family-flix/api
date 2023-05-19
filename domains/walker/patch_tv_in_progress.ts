/**
 * @file 转存连载中新增的影片
 */
import { AliyunDriveFolder } from "@/domains/folder";
import { DiffTypes, DifferEffect, FolderDiffer } from "@/domains/folder_differ";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { log } from "@/logger/log";
import { folder_client, store_factory } from "@/store";
import { Result } from "@/types";
import { is_video_file } from "@/utils";
import { FileType } from "@/constants";
import { Sql } from "@prisma/client/runtime";

/**
 * 执行 folder_diff 产出的 effects
 */
export async function consume_effects_for_shared_file(
  effects: DifferEffect[],
  options: {
    user_id: string;
    url: string;
    store: ReturnType<typeof store_factory>;
  }
) {
  log("应用 diff 的结果，共", effects.length, "个");
  const { user_id, url, store } = options;
  const file_name = "";
  const adding_task: Record<
    string,
    {
      file_id: string;
      name: string;
      type: string;
      parent_paths: string;
      target_folder_id: string;
      target_folder_name: string;
    }[]
  > = {};
  const errors: Error[] = [];
  for (let i = 0; i < effects.length; i += 1) {
    const effect = effects[i];
    const { type: effect_type, payload } = effect;
    const { file_id, name, type, parents } = payload;
    const prefix = name;
    log(`[${name}]`, "是", effect_type === DiffTypes.Deleting ? "删除" : "新增");
    if (effect_type === DiffTypes.Deleting) {
      log(`[${name}]`, "删除文件", file_id);
      await store.prisma.file.deleteMany({ where: { file_id } });
      continue;
    }
    if (effect_type === DiffTypes.Adding) {
      if (type === "file" && !is_video_file(name)) {
        log(`[${name}]`, "非视频文件，跳过");
        continue;
      }
      if (type === "folder") {
        log(`[${name}]`, "新增文件夹");
        const r = await store.add_file({
          file_id,
          name,
          type: FileType.Folder,
          parent_file_id: parents[parents.length - 1].file_id,
          parent_paths: parents.map((p) => p.name).join("/"),
        });
        if (r.error) {
          log(`[${name}]`, "新增文件夹失败", r.error.message);
        }
        continue;
      }
      log(
        parents.map((f) => f.name),
        name,
        "新增",
        type
      );
      const names = parents.map((f) => f.name);
      const parent_paths = names.join("/");
      // const existing_res = await store.find_tmp_file({
      //   name,
      //   parent_paths,
      //   user_id,
      // });
      // if (existing_res.error) {
      //   errors.push(existing_res.error);
      //   continue;
      // }
      // if (existing_res.data) {
      //   continue;
      // }
      const target_name = names[0];
      const parent_names = names.slice(1);
      log(`[${name}]`, "寻找新增文件应该转存到哪个文件夹中");
      const result = await store.prisma.file.findFirst({
        where: {
          parent_paths,
          user_id,
        },
      });
      log(`[${name}]`, "结果是", result);
      if (result === null) {
        continue;
      }
      const { drive_id, file_id: target_folder_id, name: target_folder_name } = result;
      adding_task[drive_id] = adding_task[drive_id] || [];
      adding_task[drive_id].push({
        file_id,
        name,
        parent_paths,
        type,
        target_folder_id,
        target_folder_name,
      });
    }
  }
  const drive_ids = Object.keys(adding_task);
  for (let i = 0; i < drive_ids.length; i += 1) {
    const drive_id = drive_ids[i];
    const client = new AliyunDriveClient({ drive_id, store });
    const files = adding_task[drive_id];
    for (let j = 0; j < files.length; j += 1) {
      const file = files[j];
      const { file_id: shared_file_id, type, target_folder_id, parent_paths, target_folder_name } = file;
      log(
        "[API](shared_files/diff)prepare save file",
        shared_file_id,
        file.name,
        "to",
        target_folder_id,
        target_folder_name
      );
      // console.log("target drive_id is", drive_id);
      // const r1 = await client.save_shared_files({
      //   url,
      //   file_id: shared_file_id,
      //   target_file_id: target_folder_id,
      // });
      // if (r1.error) {
      //   log(`${file_name} save file '${shared_file_id}' to drive folder '${target_folder_id}' failed`);
      //   errors.push(new Error(`${file_name} save file to drive folder failed, because ${r1.error.message}`));
      //   continue;
      // }
      // const r4 = await store.add_tmp_file({
      //   name: file.name,
      //   type: type === "file" ? FileType.File : FileType.Folder,
      //   parent_paths,
      //   user_id,
      //   drive_id,
      // });
      // if (r4.error) {
      //   errors.push(new Error(`${file_name} add tmp folder failed, because ${r4.error.message}`));
      //   continue;
      // }
      // log(
      //   "[API](shared_files/diff)save file",
      //   shared_file_id,
      //   file_name,
      //   "to",
      //   target_folder_id,
      //   target_folder_name,
      //   "success"
      // );
    }
  }
  if (errors.length !== 0) {
    return Result.Err(errors.map((e) => e.message).join("\n"));
  }
  return Result.Ok(effects);
}

/**
 * 对比分享文件夹和分享文件夹关联的网盘文件夹，找出分享文件夹新增的文件
 * @param body
 * @param extra
 * @returns
 */
export async function patch_tv_in_progress(
  body: {
    url: string;
    file_id: string;
    /** 分享文件名称 */
    file_name: string;
    target_folder_id: string;
    target_folder_name: string;
  },
  extra: {
    user_id: string;
    /** 要存到哪个网盘（应该可以从 target_folder_id）获取到的 */
    drive_id: string;
    store: ReturnType<typeof store_factory>;
    wait_complete?: boolean;
  }
) {
  const { url, file_id, file_name, target_folder_id, target_folder_name } = body;
  const { user_id, drive_id, store, wait_complete = false } = extra;
  const client = new AliyunDriveClient({ drive_id, store });
  const prev_folder = new AliyunDriveFolder(target_folder_id, {
    name: target_folder_name,
    client: folder_client({ drive_id }, store),
  });
  const r = await client.fetch_share_profile(url);
  if (r.error) {
    return Result.Err(r.error);
  }
  const { share_id } = r.data;
  // console.log("cur file_id", file_id);
  const folder = new AliyunDriveFolder(file_id, {
    // 这里本应该用 file_name，但是很可能分享文件的名字改变了，但我还要认为它没变。
    // 比如原先名字是「40集更新中」，等更新完了，就变成「40集已完结」，而我已开始存的名字是「40集更新中」，在存文件的时候，根本找不到「40集已完结」这个名字
    // 所以继续用旧的「40集更新中」
    name: target_folder_name,
    client: {
      fetch_files: async (file_id: string, options: Partial<{ marker: string; page_size: number }> = {}) => {
        const r = await client.fetch_shared_files(file_id, {
          ...options,
          share_id,
        });
        if (r.error) {
          return r;
        }
        return r;
      },
    },
  });
  const differ = new FolderDiffer({
    folder,
    prev_folder,
    unique_key: "name",
  });
  await differ.run();
  // if (wait_complete) {
  //   return await consume_effects_for_shared_file(differ.effects, {
  //     user_id,
  //     store,
  //   });
  // }
  // console.log("effect count", differ.effects);
  await consume_effects_for_shared_file(differ.effects, {
    url,
    user_id,
    store,
  });
  return Result.Ok(differ.effects);
}
