/**
 * __root/name1/name1.s01.e01.mp4@@正常10
 * @example
 * 鸡毛飞上天 4K 国语内嵌
 *  Season01
 *    鸡毛飞上天.S01E55.mkv
 * @result
 * 鸡毛飞上天
 *  S01
 *    E01
 */

import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { Folder } from "@/domains/folder";
import {
  fetch_files_factory,
  add_parsed_infos_when_walk,
  adding_file_safely,
} from "@/domains/walker/utils";
import { data, id } from "@/mock/ji_mao_fei_shang_tian";

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
  test("鸡毛飞上天", async () => {
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
    const resp = await detector.run(folder);
    /** ---------------------- 开始断言 ------------------ */
    expect(resp.error).toBe(null);
    if (resp.error) {
      return;
    }
    expect(handle_error).toBeCalledTimes(0);
    expect(handle_warning).toBeCalledTimes(0);
    expect(handle_folder).toBeCalledTimes(3);
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
        file_id: "63db407d1cf4ba38c1404fbbaa33b93dc7ad90c7",
        parent_file_id: "63db4079484789bb30a046839df110d89d7aaa93",
        file_name: "鸡毛飞上天 - S01E03 - 第 3 集.mp4",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63db407c2cc2d175e1ba4bac987b3de8af067ea4",
        parent_file_id: "63db4079484789bb30a046839df110d89d7aaa93",
        file_name: "鸡毛飞上天 - S01E02 - 第 2 集.mp4",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63db407c3ab9c3eb27ef491586f0537f110d7584",
        parent_file_id: "63db4079484789bb30a046839df110d89d7aaa93",
        file_name: "鸡毛飞上天 - S01E01 - 第1集.mp4",
        season: "S01",
        episode: "E01",
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
        name: "鸡毛飞上天",
        original_name: "",
      },
    ]);
    /** --------- 查看文件夹 --------- */
    const folders_resp = await store.find_files(
      {
        drive_id: fake_extra.drive_id,
      },
      {
        sorts: [
          {
            key: "file_id",
            order: "ASC",
          },
        ],
      }
    );
    expect(folders_resp.error).toBe(null);
    if (folders_resp.error) {
      return;
    }
    expect(folders_resp.data.length).toBe(3);
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
        file_id: "63db4079484789bb30a046839df110d89d7aaa93",
        parent_file_id: "63db4079da90fead1eb34845ae0e1884fa37bf12",
        name: "Season 1",
      },
      {
        file_id: "63db4079da90fead1eb34845ae0e1884fa37bf12",
        parent_file_id: id,
        name: "鸡毛飞上天.2017.4K.国语内嵌",
      },
      {
        file_id: id,
        parent_file_id: "root",
        name: "tv",
      },
    ]);
  });
});
