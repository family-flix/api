require("dotenv").config();
import { describe, test, expect, beforeEach } from "vitest";

import { id } from "@/domains/__tests__/mock/da_li_si_ri_zhi";

import { test_store as store } from "../../store";
import { sleep } from "@/utils/flow";
import { merge_same_tv_and_episodes } from "@/domains/walker/merge_same_tv_and_episode";
import { hidden_empty_tv } from "@/domains/walker/clean_empty_records";

describe("clean empty record", () => {
  const { user_id, drive_id } = {
    user_id: "123",
    drive_id: "123",
  };
  beforeEach(async () => {
    const tables = [
      "aliyun_drive",
      "episode",
      "season",
      "tv",
      "folder",
      "searched_tv",
      "async_task",
    ];
    for (let i = 0; i < tables.length; i += 1) {
      const table = tables[i];
      await store.operation.clear_dataset(table);
    }
  });
  test("华灯初上", async () => {
    await store.add_aliyun_drive({
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
    const drives_res = await store.find_aliyun_drives();
    if (drives_res.error) {
      return;
    }
    expect(drives_res.error).toBe(null);
    expect(drives_res.data.length).toBe(1);
    const adding_searched_tv_res = await store.add_searched_tv({
      tmdb_id: 130330,
      name: "华灯初上",
      original_name: "華燈初上",
      overview:
        "在 20 世纪 80 年代的台北红灯区，热门日式酒店的小姐们努力应对着嫉妒、心碎、友谊、爱情与背叛。",
      poster_path: "//static.funzm.com/video-static/poster/ClbmcD5X0SFqufMi",
    });
    const searched_tvs_res = await store.find_searched_tvs();
    if (searched_tvs_res.error) {
      return;
    }
    expect(searched_tvs_res.error).toBe(null);
    expect(searched_tvs_res.data.length).toBe(1);
    const adding_tv1_res = await store.add_tv({
      name: "",
      original_name: "Light.The.Night",
      searched_tv_id: adding_searched_tv_res.data
        ? adding_searched_tv_res.data.id
        : "",
      drive_id,
      user_id,
    });
    if (adding_tv1_res.error) {
      return;
    }
    const adding_episode_res = await store.add_episode({
      tv_id: adding_tv1_res.data.id,
      file_id: "1",
      file_name: "E01.mp4",
      parent_file_id: "root",
      size: 0,
      parent_paths: "root",
      season: "S01",
      episode: "E01",
      user_id,
      drive_id,
    });
    if (adding_episode_res.error) {
      return;
    }
    await store.add_history({
      tv_id: adding_tv1_res.data.id,
      duration: 1000,
      current_time: 1,
      episode_id: adding_episode_res.data.id,
    });
    await sleep(1000);
    const adding_tv2_res = await store.add_tv({
      name: "华灯初上",
      original_name: "",
      searched_tv_id: adding_searched_tv_res.data
        ? adding_searched_tv_res.data.id
        : "",
      drive_id,
      user_id,
    });
    if (adding_tv2_res.error) {
      return;
    }
    await store.add_episode({
      tv_id: adding_tv2_res.data.id,
      file_id: "2",
      file_name: "E02.mp4",
      parent_file_id: "root",
      size: 0,
      parent_paths: "root",
      season: "S01",
      episode: "E02",
      user_id,
      drive_id,
    });
    const tvs_res = await store.find_tvs({ user_id, drive_id });
    if (tvs_res.error) {
      return;
    }
    expect(tvs_res.error).toBe(null);
    const tvs = tvs_res.data;
    expect(tvs.length).toBe(2);
    const r = await merge_same_tv_and_episodes(
      { user_id, drive_id },
      store.operation
    );
    if (r.error) {
      return;
    }
    expect(r.error).toBe(null);
    const r2 = await hidden_empty_tv({ user_id, drive_id }, store.operation);
    expect(r2.error).toBe(null);
    if (r2.error) {
      return;
    }
    /** ---------------------- 开始断言 ------------------ */
    /** --------- 查看 tv --------- */
    const hidden_tv_res = await store.find_tv({
      id: adding_tv2_res.data.id,
    });
    expect(hidden_tv_res.error).toBe(null);
    if (hidden_tv_res.error) {
      return;
    }
    if (!hidden_tv_res.data) {
      return;
    }
    expect(hidden_tv_res.data.hidden).toBe(1);
  });
});
