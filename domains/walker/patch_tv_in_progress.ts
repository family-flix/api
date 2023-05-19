/**
 * @file 转存连载中新增的影片
 */
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";
import { DiffTypes, DifferEffect, FolderDiffer } from "@/domains/folder_differ";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { log } from "@/logger/log";
import { folder_client, store_factory } from "@/store";
import { Result } from "@/types";
import { is_video_file } from "@/utils";

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
  async function consume_effects(effects: DifferEffect[]) {
    const adding_task: Record<
      string,
      {
        file_id: string;
        name: string;
        type: string;
        parent_path: string;
        target_folder_id: string;
        target_folder_name: string;
      }[]
    > = {};
    const errors: Error[] = [];
    for (let i = 0; i < effects.length; i += 1) {
      const effect = effects[i];
      const { type, payload } = effect;
      // console.log(payload.name);
      if (type === DiffTypes.Adding) {
        const { file_id: shared_file_id, name, type, context } = payload;
        if (type === "file" && !is_video_file(name)) {
          continue;
        }
        const paths = context.map((f) => f.name).join("/");
        const existing_res = await store.find_tmp_file({
          name,
          parent_paths: paths,
          user_id,
        });
        if (existing_res.error) {
          errors.push(existing_res.error);
          continue;
        }
        if (existing_res.data) {
          continue;
        }
        const names = context.map((f) => f.name);
        const target_name = names[0];
        const parent_names = names.slice(1);
        log("[API](shared_files/diff)find target folder", names);
        const parent_names_str = parent_names
          .map((n) => {
            return `'${n}'`;
          })
          .join(", ");
        const sql = `WITH RECURSIVE cte AS (
SELECT *, 0 AS level
FROM folder
WHERE name = '${target_name}'
UNION ALL
	SELECT f.*, c.level + 1
	FROM folder f
	JOIN cte c ON f.parent_file_id = c.file_id
	WHERE c.level < ${names.length - 1} AND f.name IN (${parent_names_str})
)
SELECT * FROM cte WHERE level = ${names.length - 1};`;
        const result = await store.operation.get<{
          drive_id: string;
          name: string;
          file_id: string;
        }>(sql);
        if (result.error) {
          log("find target folder failed", result.error.message);
          errors.push(new Error(`${file_name} find target folder failed because ${result.error.message}`));
          continue;
        }
        if (!result.data) {
          log("there is no target folder");
          continue;
        }
        const { drive_id, file_id: target_folder_id, name: target_folder_name } = result.data;
        adding_task[drive_id] = adding_task[drive_id] || [];
        adding_task[drive_id].push({
          file_id: shared_file_id,
          name,
          parent_path: names.join("/"),
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
        const { file_id: shared_file_id, type, target_folder_id, parent_path, target_folder_name } = file;
        log(
          "[API](shared_files/diff)prepare save file",
          shared_file_id,
          file.name,
          "to",
          target_folder_id,
          target_folder_name
        );
        // console.log("target drive_id is", drive_id);
        const r1 = await client.save_shared_files({
          url,
          file_id: shared_file_id,
          target_file_id: target_folder_id,
        });
        // const r1 = await client.save_multiple_shared_files({
        //   url,
        //   files: [{ file_id: shared_file_id }],
        //   target_file_id: target_folder_id,
        // });
        if (r1.error) {
          log(`${file_name} save file '${shared_file_id}' to drive folder '${target_folder_id}' failed`);
          errors.push(new Error(`${file_name} save file to drive folder failed, because ${r1.error.message}`));
          continue;
        }
        const r4 = await store.add_tmp_file({
          name: file.name,
          type: type === "file" ? 1 : 0,
          parent_paths: parent_path,
          user_id,
          drive_id,
        });
        if (r4.error) {
          errors.push(new Error(`${file_name} add tmp folder failed, because ${r4.error.message}`));
          continue;
        }
        log(
          "[API](shared_files/diff)save file",
          shared_file_id,
          file_name,
          "to",
          target_folder_id,
          target_folder_name,
          "success"
        );
      }
    }
    if (errors.length !== 0) {
      return Result.Err(errors.map((e) => e.message).join("\n"));
    }
    return Result.Ok(effects);
  }
  // if (wait_complete) {
  //   return await consume_effects(differ.effects);
  // }
  // consume_effects(differ.effects);
  return Result.Ok(differ.effects);
}
