/**
 * @file 执行一次指定电视剧的同步任务，将分享资源新增的影片同步到云盘
 */
import { AliyunDriveFolder } from "@/domains/folder";
import { DiffTypes, DifferEffect, FolderDiffer } from "@/domains/folder_differ";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { log } from "@/logger/log";
import { folder_client, store_factory } from "@/store";
import { Result } from "@/types";
import { is_video_file } from "@/utils";
import { FileType } from "@/constants";
import { FileSyncTaskRecord, ParsedTVRecord } from "@/store/types";

/**
 * 执行 folder_diff 产出的 effects
 */
export async function consume_effects_for_shared_file(
  effects: DifferEffect[],
  options: {
    url: string;
    user_id: string;
    drive_id: string;
    client: AliyunDriveClient;
    store: ReturnType<typeof store_factory>;
  }
) {
  const { url, user_id, drive_id, store, client } = options;
  log("应用 diff 的结果，共", effects.length, "个");
  const errors: Error[] = [];
  for (let i = 0; i < effects.length; i += 1) {
    const effect = effects[i];
    const { type: effect_type, payload } = effect;
    const { file_id: shared_file_id, name, type, parents, prev_folder } = payload;
    const parent_paths = parents.map((f) => f.name).join("/");
    const prefix = `${parent_paths}/${name}`;
    log(`[${prefix}]`, "是", effect_type === DiffTypes.Deleting ? "删除" : "新增");
    if (effect_type === DiffTypes.Deleting) {
      log(`[${prefix}]`, "删除文件", shared_file_id);
      // 如果是转存，要同时删除云盘和本地数据库记录
      // await store.prisma.file.deleteMany({ where: { file_id } });
      continue;
    }
    if (effect_type === DiffTypes.Adding) {
      if (type === "file" && !is_video_file(name)) {
        log(`[${prefix}]`, "非视频文件，跳过");
        continue;
      }
      if (type === "folder") {
        log(`[${prefix}]`, "新增文件夹");
        const r = await store.add_file({
          file_id: shared_file_id,
          name,
          type: FileType.Folder,
          parent_file_id: parents[parents.length - 1].file_id,
          parent_paths: parents.map((p) => p.name).join("/"),
        });
        if (r.error) {
          log(`[${prefix}]`, "新增文件夹失败", r.error.message);
          errors.push(new Error(`${prefix} 新增文件夹失败 ${r.error.message}`));
        }
        continue;
      }
      log(`[${prefix}]`, "新增文件", parents.map((f) => f.name).join("/"), name);
      // 避免添加后，还没有索引云盘，本地数据库没有，导致重复转存文件到云盘
      const existing_res = await store.find_tmp_file({
        name,
        parent_paths,
        user_id,
      });
      if (existing_res.error) {
        log(`[${prefix}]`, "查找临时文件失败", existing_res.error.message);
        errors.push(new Error(`${prefix} find_tmp_file failed ${existing_res.error.message}`));
        continue;
      }
      if (existing_res.data) {
        log(`[${prefix}]`, "文件已存在临时文件列表，可能已转存到云盘中");
        errors.push(new Error(`[${prefix}] 文件已存在临时文件列表，可能已转存到云盘中`));
        continue;
      }
      const r1 = await client.save_shared_files({
        url,
        file_id: shared_file_id,
        target_file_id: prev_folder.file_id,
      });
      if (r1.error) {
        log(`[${prefix}]`, `转存文件 '${shared_file_id}' 到云盘文件夹 '${prev_folder.file_id}' 失败`, r1.error.message);
        errors.push(new Error(`${prefix} save file to drive folder failed, because ${r1.error.message}`));
        continue;
      }
      const r4 = await store.add_tmp_file({
        name,
        parent_paths,
        type: type === "file" ? FileType.File : FileType.Folder,
        user_id,
        drive_id,
      });
      if (r4.error) {
        errors.push(new Error(`${prefix} add tmp folder failed, because ${r4.error.message}`));
        log(`[${prefix}]`, "添加临时文件失败", r4.error.message);
        continue;
      }
    }
  }
  if (errors.length !== 0) {
    return Result.Err(errors.map((e) => e.message).join("\n"));
  }
  return Result.Ok(null);
}

/**
 * 对比分享文件夹和分享文件夹关联的网盘文件夹，找出分享文件夹新增的文件
 * @param body
 * @param extra
 * @returns
 */
export async function run_sync_task(
  task: FileSyncTaskRecord & { parsed_tv: ParsedTVRecord },
  extra: {
    user_id: string;
    /** 要存到哪个网盘（应该可以从 target_folder_id）获取到的 */
    drive_id: string;
    store: ReturnType<typeof store_factory>;
    wait_complete?: boolean;
  }
) {
  const { id, url, file_id, parsed_tv } = task;
  const { file_id: target_folder_id, file_name: target_folder_name } = parsed_tv;
  const { user_id, drive_id, store, wait_complete = false } = extra;

  if (target_folder_id === null || target_folder_name === null) {
    return Result.Err("没有关联的云盘文件夹");
  }
  const client = new AliyunDriveClient({ drive_id, store });
  const r1 = await client.fetch_share_profile(url, { force: true });
  if (r1.error) {
    if (["share_link is cancelled by the creator"].includes(r1.error.message)) {
      await store.update_sync_task(id, { invalid: 1 });
      return Result.Err("分享资源失效，请关联新分享资源");
    }
    return Result.Err(r1.error);
  }
  const { share_id } = r1.data;
  const prev_folder = new AliyunDriveFolder(target_folder_id, {
    name: target_folder_name,
    client: folder_client({ drive_id }, store),
  });
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
  const pending = consume_effects_for_shared_file(differ.effects, {
    url,
    user_id,
    drive_id,
    store,
    client,
  });
  if (wait_complete) {
    await pending;
  }
  return Result.Ok(differ.effects);
}
