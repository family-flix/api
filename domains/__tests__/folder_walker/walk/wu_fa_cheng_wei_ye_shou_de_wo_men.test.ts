/**
 *  __root/name1/name1.s01.e01.mp4@@正常10
 */
import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { Folder } from "@/domains/folder";
import {
  fetch_files_factory,
  add_parsed_infos_when_walk,
  adding_file_safely,
} from "@/domains/walker/utils";
import {
  data,
  id,
} from "@/domains/__tests__/mock/wu_fa_cheng_wei_ye_shou_de_wo_men";

import { test_store as store } from "../../store";

describe("detect a tv dir", () => {
  const fake_extra = {
    user_id: "123",
    drive_id: "123",
  };
  beforeEach(async () => {
    const tables = ["episode", "season", "tv", "folder"];
    for (let i = 0; i < tables.length; i += 1) {
      const table = tables[i];
      await store.operation.clear_dataset(table);
    }
  });
  test("无法成为野兽的我们", async () => {
    const detector = new FolderWalker();
    const handle_error = vi.fn((v) => v);
    const handle_warning = vi.fn((v) => v);
    const handle_folder = vi.fn((v) => v);
    const handle_episode = vi.fn((v) => v);
    detector.on_error = (file) => {
      handle_error(file);
    };
    detector.on_warning = (file) => {
      handle_warning(file);
    };
    detector.on_file = async (folder) => {
      handle_folder(folder);
      adding_file_safely(folder, fake_extra, store);
      return;
    };
    detector.on_episode = async (task) => {
      handle_episode(task);
      add_parsed_infos_when_walk(task, fake_extra, store);
      return;
    };
    const folder = new Folder(id, {
      client: fetch_files_factory({
        tree: data,
      }),
    });
    await folder.profile();
    const resp = await detector.detect(folder);
    /** ---------------------- 开始断言 ------------------ */
    expect(resp.error).toBe(null);
    if (resp.error) {
      return;
    }
    expect(handle_error).toBeCalledTimes(0);
    expect(handle_warning).toBeCalledTimes(0);
    expect(handle_folder).toBeCalledTimes(8);
    expect(handle_episode).toBeCalledTimes(3);
    /** --------- 查看 episode --------- */
    const episodes_resp = await store.find_episodes();
    expect(episodes_resp.error).toBe(null);
    if (episodes_resp.error) {
      return;
    }
    expect(episodes_resp.data.length).toBe(3);
    expect(
      episodes_resp.data.map((e) => {
        const { file_id, file_name, parent_file_id, episode, season } = e;
        return {
          file_id,
          file_name,
          parent_file_id,
          episode,
          season,
        };
      })
    ).toStrictEqual([
      {
        file_id: "643131e161a29e47bc334dae991ecf0323011734",
        parent_file_id: "643131e161a29e47bc334dae991ecf0323011733",
        file_name: "无法成为野兽的我们.S01.E01.mp4",
        episode: "E01",
        season: "S01",
      },
      {
        file_id: "643131e07a6cf87f51774b3ba3d1325fa200aa94",
        parent_file_id: "643131e07a6cf87f51774b3ba3d1325fa200aa93",
        file_name: "无法成为野兽的我们.S01.E02.mp4",
        episode: "E02",
        season: "S01",
      },
      {
        file_id: "643131e08a07cf8865ce4bebbb6b3641b53d61ac",
        parent_file_id: "643131e08a07cf8865ce4bebbb6b3641b53d61ab",
        file_name: "无法成为野兽的我们.S01.E03.mp4",
        episode: "E03",
        season: "S01",
      },
    ]);
    /** --------- 查看 season --------- */
    const season_resp = await store.find_seasons();
    expect(season_resp.error).toBe(null);
    if (season_resp.error) {
      return;
    }
    expect(season_resp.data.length).toBe(1);
    expect(season_resp.data.map((s) => s.season)).toStrictEqual(["S01"]);
    /** --------- 查看 tv --------- */
    const tvs_resp = await store.find_parsed_tv_list();
    expect(tvs_resp.error).toBe(null);
    if (tvs_resp.error) {
      return;
    }
    expect(tvs_resp.data.length).toBe(1);
    expect(
      tvs_resp.data.map((t) => {
        const { name, original_name } = t;
        return {
          name,
          original_name,
        };
      })
    ).toStrictEqual([
      {
        name: "无法成为野兽的我们",
        original_name: "",
      },
    ]);
    /** --------- 查看文件夹 --------- */
    const folders_resp = await store.find_files({
      drive_id: fake_extra.drive_id,
    });
    expect(folders_resp.error).toBe(null);
    if (folders_resp.error) {
      return;
    }
    expect(folders_resp.data.length).toBe(5);
    expect(
      folders_resp.data.map((f) => {
        const { file_id, name, parent_file_id } = f;
        return {
          file_id,
          name,
          parent_file_id,
        };
      })
    ).toStrictEqual([
      {
        file_id: id,
        parent_file_id: "root",
        name: "tv",
      },
      {
        file_id: "643131e0956c1041ab004484a6fdb2cc97adbc96",
        parent_file_id: id,
        name: "无法成为野兽的我们 蓝光原盘MAX",
      },
      {
        file_id: "643131e161a29e47bc334dae991ecf0323011733",
        parent_file_id: "643131e0956c1041ab004484a6fdb2cc97adbc96",
        name: "第1集",
      },
      {
        file_id: "643131e07a6cf87f51774b3ba3d1325fa200aa93",
        parent_file_id: "643131e0956c1041ab004484a6fdb2cc97adbc96",
        name: "第2集",
      },
      {
        file_id: "643131e08a07cf8865ce4bebbb6b3641b53d61ab",
        parent_file_id: "643131e0956c1041ab004484a6fdb2cc97adbc96",
        name: "第3集",
      },
      {
        file_id: "643131e161a29e47bc334dae991ecf0323011734",
        parent_file_id: "643131e161a29e47bc334dae991ecf0323011733",
        file_name: "无法成为野兽的我们.S01.E01.mp4",
      },
      {
        file_id: "643131e07a6cf87f51774b3ba3d1325fa200aa94",
        parent_file_id: "643131e07a6cf87f51774b3ba3d1325fa200aa93",
        file_name: "无法成为野兽的我们.S01.E02.mp4",
      },
      {
        file_id: "643131e08a07cf8865ce4bebbb6b3641b53d61ac",
        parent_file_id: "643131e08a07cf8865ce4bebbb6b3641b53d61ab",
        file_name: "无法成为野兽的我们.S01.E03.mp4",
      },
    ]);
  });
});
