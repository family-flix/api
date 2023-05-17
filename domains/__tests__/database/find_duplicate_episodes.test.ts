require("dotenv").config();
import { describe, test, expect, afterEach, beforeEach } from "vitest";

import { fetch_files_factory, find_duplicate_episodes } from "@/domains/walker/utils";
import { data, id } from "@/domains/__tests__/mock/da_li_si_ri_zhi";
import { walk_drive } from "@/domains/walker/analysis_aliyun_drive";

import { test_store as store } from "../store";
import { FileType } from "@/constants";

describe("detect a tv dir", () => {
  const { user_id, drive_id } = {
    user_id: "123",
    drive_id: "123",
  };
  beforeEach(async () => {
    const tables = ["aliyun_drive", "episode", "season", "tv", "folder", "play_progress", "searched_tv", "async_task"];
    for (let i = 0; i < tables.length; i += 1) {
      const table = tables[i];
      await store.operation.clear_dataset(table);
    }
  });
  test("the duplicate without play histories", async () => {
    const drives_resp = await store.find_drive_list();
    expect(drives_resp.error).toBe(null);
    if (drives_resp.error) {
      return;
    }
    expect(drives_resp.data.length).toBe(0);
    const adding_res = await store.add_drive({
      id: drive_id,
      name: "",
      nick_name: "",
      user_name: "",
      device_id: "",
      user_id,
      drive_id: "",
      app_id: "",
      aliyun_user_id: "",
      avatar: "",
      root_folder_id: id,
    });
    expect(adding_res.error).toBe(null);
    if (adding_res.error) {
      return;
    }
    const r1 = await store.add_episode({
      file_id: "1",
      file_name: "心想事成_01_1080P_Tacit0924.mp4",
      parent_paths: "root",
      parent_file_id: "1",
      episode: "E01",
      season: "S01",
      tv_id: "1",
      size: 0,
      user_id,
      drive_id,
    });
    const r2 = await store.add_episode({
      file_id: "2",
      file_name: "心想事成_01_1080P_Tacit0924.mp4",
      parent_paths: "root",
      parent_file_id: "1",
      episode: "E01",
      season: "S01",
      tv_id: "1",
      size: 0,
      user_id,
      drive_id,
    });
    const r3 = await store.add_episode({
      file_id: "3",
      file_name: "心想事成_01_1080P_Tacit0924.mp4",
      parent_paths: "root",
      parent_file_id: "1",
      episode: "E01",
      season: "S01",
      tv_id: "1",
      size: 0,
      user_id,
      drive_id,
    });
    const folders_res = await store.find_episodes();
    expect(folders_res.error).toBe(null);
    if (folders_res.error) {
      return;
    }
    expect(folders_res.data.length).toBe(3);
    const r = await find_duplicate_episodes(
      {
        user_id,
        drive_id,
      },
      store
    );
    expect(r.error).toBe(null);
    if (r.error) {
      return;
    }
    expect(r.data).toStrictEqual({
      "心想事成_01_1080P_Tacit0924.mp4": [
        {
          id: r1.data?.id,
          file_id: "1",
          first: true,
          file_name: "心想事成_01_1080P_Tacit0924.mp4",
          has_play: false,
        },
        {
          id: r2.data?.id,
          file_id: "2",
          file_name: "心想事成_01_1080P_Tacit0924.mp4",
          has_play: false,
        },
        {
          id: r3.data?.id,
          file_id: "3",
          file_name: "心想事成_01_1080P_Tacit0924.mp4",
          has_play: false,
        },
      ],
    });
  });

  test("the duplicate with the episode that has play histories", async () => {
    const drives_resp = await store.find_drive_list();
    expect(drives_resp.error).toBe(null);
    if (drives_resp.error) {
      return;
    }
    expect(drives_resp.data.length).toBe(0);
    const adding_res = await store.add_drive({
      id: drive_id,
      name: "",
      nick_name: "",
      user_name: "",
      device_id: "",
      user_id,
      drive_id: "",
      app_id: "",
      aliyun_user_id: "",
      avatar: "",
      root_folder_id: id,
    });
    expect(adding_res.error).toBe(null);
    if (adding_res.error) {
      return;
    }
    const r1 = await store.add_episode({
      file_id: "1",
      file_name: "心想事成_01_1080P_Tacit0924.mp4",
      parent_paths: "root",
      parent_file_id: "1",
      episode: "E01",
      season: "S01",
      tv_id: "1",
      size: 0,
      user_id,
      drive_id,
    });
    const r2 = await store.add_episode({
      file_id: "2",
      file_name: "心想事成_01_1080P_Tacit0924.mp4",
      parent_paths: "root",
      parent_file_id: "1",
      episode: "E01",
      season: "S01",
      tv_id: "1",
      size: 0,
      user_id,
      drive_id,
    });
    expect(r2.data).toBeTruthy();
    if (!r2.data) {
      return;
    }
    await store.add_history({
      episode_id: r2.data.id,
      tv_id: "1",
      duration: 0,
      current_time: 0,
    });
    const r3 = await store.add_episode({
      file_id: "3",
      file_name: "心想事成_01_1080P_Tacit0924.mp4",
      parent_paths: "root",
      parent_file_id: "1",
      episode: "E01",
      season: "S01",
      tv_id: "1",
      size: 0,
      user_id,
      drive_id,
    });
    const folders_res = await store.find_episodes();
    expect(folders_res.error).toBe(null);
    if (folders_res.error) {
      return;
    }
    expect(folders_res.data.length).toBe(3);
    const history_res = await store.find_histories();
    expect(history_res.error).toBe(null);
    if (history_res.error) {
      return;
    }
    expect(history_res.data.length).toBe(1);
    const r = await find_duplicate_episodes(
      {
        user_id,
        drive_id,
      },
      store
    );
    expect(r.error).toBe(null);
    if (r.error) {
      return;
    }
    expect(r.data).toStrictEqual({
      "心想事成_01_1080P_Tacit0924.mp4": [
        {
          id: r1.data?.id,
          file_id: "1",
          has_play: false,
          first: true,
          file_name: "心想事成_01_1080P_Tacit0924.mp4",
        },
        {
          id: r2.data?.id,
          file_id: "2",
          has_play: true,
          file_name: "心想事成_01_1080P_Tacit0924.mp4",
        },
        {
          id: r3.data?.id,
          has_play: false,
          file_id: "3",
          file_name: "心想事成_01_1080P_Tacit0924.mp4",
        },
      ],
    });
  });
});
