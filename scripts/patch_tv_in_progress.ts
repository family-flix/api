/**
 * @file 新增连载中的电视剧
 */
import { Result } from "@/types";
import { store_factory } from "@/store";

import { notice_error, notice_push_deer } from "./notice";
import { is_video_file, parse_filename_for_video } from "@/utils";
import { patch_tv_in_progress } from "@/domains/walker/run_tv_sync_task";
import { DiffTypes } from "@/domains/folder_differ";

export async function patch_shared_files(
  store: ReturnType<typeof store_factory>
) {
  if (!process.env.Prod) {
    console.log("非正式环境请不要执行该代码，可能导致重复增加影片");
    return;
  }
  console.log("start compare shared files");
  const in_progress_res = await store.find_shared_file_save_list({
    complete: 0,
    need_update: 0,
    target_file_id: "not null",
  });
  if (in_progress_res.error) {
    return notice_error(in_progress_res);
  }
  const in_progress_list = in_progress_res.data;
  console.log("连载电视剧共", in_progress_list.length);
  // const tv_updated: {
  //   name: string;
  //   addded_episode_count: number;
  // }[] = [];
  for (let i = 0; i < in_progress_list.length; i += 1) {
    const in_progress = in_progress_list[i];
    const { name, original_name, episode_count } = parse_filename_for_video(
      in_progress.name,
      ["name", "original_name", "episode_count"]
    );
    if (!episode_count) {
      console.log(`${in_progress.name} 非连载电视剧`);
      continue;
    }
    if (!name && !original_name) {
      // 这种情况不太可能出现
      console.log(`${in_progress.name} 非电视剧`);
      continue;
    }
    const { url, file_id, target_file_id, user_id } = in_progress;
    if (!target_file_id) {
      console.log(`${in_progress.name} 没有关联网盘文件夹`);
      continue;
    }
    const matched_folder_res = await store.find_file({
      file_id: target_file_id,
      user_id,
    });
    if (matched_folder_res.error) {
      console.log(
        `${in_progress.name} 获取关联文件夹失败 ${matched_folder_res.error.message}`
      );
      continue;
    }
    if (!matched_folder_res.data) {
      console.log(`${in_progress.name} 关联文件夹不存在`);
      continue;
    }
    const { name: target_folder_name, drive_id } = matched_folder_res.data;
    const r4 = await patch_tv_in_progress(
      {
        url,
        file_name: in_progress.name,
        file_id,
        target_folder_id: target_file_id,
        target_folder_name: target_folder_name,
      },
      {
        user_id,
        drive_id,
        store,
        wait_complete: true,
      }
    );
    if (r4.error) {
      notice_error(`${in_progress.name} 转存新增影片失败，因为 ${r4.error}`);
      continue;
    }
    const effects = r4.data;
    const added_video_effects = effects.filter((t) => {
      const { type, payload } = t;
      if (type !== DiffTypes.Adding) {
        return false;
      }
      const { name } = payload;
      if (!is_video_file(name)) {
        return false;
      }
      return true;
    });
    if (added_video_effects.length === 0) {
      console.log(`${in_progress.name} 没有新增影片`);
      continue;
    }
    console.log(
      `${in_progress.name} 新增了影片`,
      added_video_effects.map(
        (e) =>
          `${e.payload.parents.map((c) => c.name).join("/")}/${e.payload.name}`
      )
    );
    notice_push_deer({
      title: `${in_progress.name} 新增影片成功`,
      markdown: added_video_effects.map((e) => e.payload.name).join("\n"),
    });
  }
  return Result.Ok(null);
}

export async function check_tv_in_progress_is_completed(
  store: ReturnType<typeof store_factory>
) {
  // console.log("start compare shared files");
  const in_progress_res = await store.find_shared_file_save_list({
    complete: 0,
    target_file_id: "not null",
  });
  if (in_progress_res.error) {
    return notice_error(in_progress_res);
  }
  const in_progress_list = in_progress_res.data;
  for (let i = 0; i < in_progress_list.length; i += 1) {
    const in_progress = in_progress_list[i];
    const { name, original_name, episode_count } = parse_filename_for_video(
      in_progress.name,
      ["name", "original_name", "episode_count"]
    );
    // console.log("prepare patch tv in progress", in_progress.name);
    if (!episode_count) {
      continue;
    }
    if (!name && !original_name) {
      // 这种情况不太可能出现
      continue;
    }
    const { target_file_id } = in_progress;
    if (!target_file_id) {
      continue;
    }
    // const is_complete = episode_count.match(/完结/);
    // if (is_complete) {
    //   await store.update_shared_files_in_progress(in_progress.id, {
    //     complete: 1,
    //   });
    //   continue;
    // }
    const count = episode_count.match(/[0-9]{1,}/);
    if (!count) {
      continue;
    }
    const r = await store.operation.get<{
      id: string;
    }>(`SELECT searched_tv.poster_path,searched_tv.name,searched_tv.original_name,searched_tv.overview,searched_tv.first_air_date,tv.id 
FROM tv 
INNER JOIN searched_tv 
ON tv.tv_profile_id = searched_tv.id 
WHERE searched_tv.name = '${name}' OR searched_tv.original_name = '${original_name}';`);
    if (r.error) {
      notice_error(r);
      continue;
    }
    if (!r.data) {
      continue;
    }
    const tv_id = r.data.id;
    console.log("matched tv id", in_progress.name, tv_id);
    const sql = `SELECT
    (SELECT COUNT(*) FROM episode WHERE tv_id = '${tv_id}') AS total_videos,
    (SELECT COUNT(*) FROM (SELECT DISTINCT SUBSTR(episode, 1, INSTR(episode, 'E') - 1) AS episode_number FROM episode WHERE tv_id = '${tv_id}')) AS total_episodes,
    (SELECT COUNT(*) FROM (SELECT DISTINCT episode FROM episode WHERE tv_id = '${tv_id}')) AS distinct_videos;`;
    const r2 = await store.operation.get<{
      total_videos: number;
      total_episodes: number;
      /** 不重复影片数 */
      distinct_videos: number;
    }>(sql);
    // console.log("is completed?", in_progress.name, r2);
    if (r2.error) {
      notice_error(r2);
      continue;
    }
    const { distinct_videos } = r2.data;
    if (distinct_videos !== Number(count[0])) {
      continue;
    }
    console.log(`${in_progress.name} 已完结`);
    store.update_shared_file_save(in_progress.id, {
      complete: 1,
    });
  }
}
