/**
 * @file 遍历 folder 表进行操作
 */
require("dotenv").config();
import dayjs from "dayjs";

import { EpisodeRecord, RecordCommonPart } from "@/store/types";
import { store } from "@/store";

import { walk_table_with_pagination } from "@/domains/walker/utils";

async function run() {
  await walk_table_with_pagination<EpisodeRecord & RecordCommonPart>(store.find_episodes_with_pagination, {
    async on_handle(episode) {
      let happen_update = false;
      const {
        id,
        tv_id,
        file_id,
        file_name,
        size,
        parent_file_id,
        drive_id: episode_drive_id,
        user_id: episode_user_id,
        created,
        updated,
      } = episode;
      if (created.includes("GMT")) {
        await store.update_episode(id, {
          // @ts-ignore
          created: dayjs(created).toISOString(),
        });
      }
      const tv_res = await store.find_maybe_tv({ id: tv_id });
      if (tv_res.error) {
        console.log("fetch tv of episode error", tv_res.error.message);
        return;
      }
      if (!tv_res.data) {
        console.log("fetch tv of episode error because no data");
        return;
      }
      const { user_id, drive_id } = tv_res.data;
      if (!episode_drive_id) {
        happen_update = true;
        // 补全 episode drive_id 字段
        await store.update_episode(id, { drive_id });
      }
      if (!episode_user_id) {
        happen_update = true;
        // 补全 episode user_id 字段
        await store.update_episode(id, { user_id });
      }
      const existing_res = await store.find_file({ file_id });
      if (existing_res.error) {
        console.log("fetch existing folder failed", existing_res.error.message);
        return;
      }
      if (existing_res.data) {
        if (!existing_res.data.size && size) {
          happen_update = true;
          // 补全 folder 记录中的 size 字段
          await store.update_file(existing_res.data.id, { size });
        }
        console.log("file from episode existing");
        return;
      }
      console.log("add file from episode");
      // 补全缺少的 folder 记录
      const r = await store.add_file({
        file_id,
        name: file_name,
        type: 1,
        parent_file_id,
        size,
        drive_id,
        user_id,
      });
      if (r.error) {
        console.log("add file from episode failed", r.error.message);
        return;
      }
      console.log("add file from episode success");
    },
  });
  console.log("Complete");
}

run();
